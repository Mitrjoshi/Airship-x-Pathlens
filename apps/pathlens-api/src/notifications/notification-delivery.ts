import { randomUUID } from "node:crypto";
import { and, eq, inArray, lte, or, sql } from "drizzle-orm";

import { db, pool } from "../db/client";
import { UNKNOWN_PROVIDER_CODE } from "./notification-send-safety";
import { getNotificationScheduleNotBefore } from "./notification-activation";
import {
  integrationNotificationDeliveries,
  projectIntegrations,
} from "../db/schema";
import type { NotificationCandidate } from "./scheduling";
import type { NotificationDeliveryRow } from "./notification-types";
import {
  assertNotificationIntegrationScope,
  getNotificationSmokeIntegrationId,
} from "./notification-isolation";

function smokeDeliveryFilter() {
  const id = getNotificationSmokeIntegrationId();
  const cutoff = getNotificationScheduleNotBefore();
  return and(
    id
      ? eq(integrationNotificationDeliveries.projectIntegrationId, id)
      : undefined,
    cutoff
      ? sql`${integrationNotificationDeliveries.scheduledFor} >= ${cutoff.toISOString()}::timestamptz`
      : undefined
  );
}

export async function createNotificationDelivery(input: {
  workspaceId: string;
  projectId: string;
  projectIntegrationId: string;
  channelId: string;
  candidate: NotificationCandidate;
}) {
  assertNotificationIntegrationScope(input.projectIntegrationId);
  const [row] = await db
    .insert(integrationNotificationDeliveries)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      projectIntegrationId: input.projectIntegrationId,
      provider: "slack",
      reportType: input.candidate.reportType,
      reportingPeriodStart: input.candidate.period.start,
      reportingPeriodEnd: input.candidate.period.end,
      reportingTimezone: input.candidate.period.timezone,
      channelId: input.channelId,
      scheduledFor: input.candidate.scheduledFor,
      readyAt: input.candidate.readyAt,
      status: "scheduled",
    })
    .onConflictDoNothing({
      target: [
        integrationNotificationDeliveries.provider,
        integrationNotificationDeliveries.projectIntegrationId,
        integrationNotificationDeliveries.reportType,
        integrationNotificationDeliveries.reportingPeriodStart,
        integrationNotificationDeliveries.reportingPeriodEnd,
      ],
    })
    .returning({ id: integrationNotificationDeliveries.id });
  return row?.id ?? null;
}

export async function getLatestNotificationSchedule(
  projectIntegrationId: string,
  reportType: "daily" | "weekly"
) {
  assertNotificationIntegrationScope(projectIntegrationId);
  const result = await db.execute<{ scheduled_for: Date | null }>(sql`
    SELECT MAX(scheduled_for) AS scheduled_for
    FROM integration_notification_deliveries
    WHERE project_integration_id = ${projectIntegrationId}
      AND report_type = ${reportType}
  `);
  return result.rows[0]?.scheduled_for
    ? new Date(result.rows[0].scheduled_for)
    : null;
}

export async function listNotificationDeliveryIdsToEnqueue(limit = 100) {
  const scope = smokeDeliveryFilter();
  const rows = await db
    .select({ id: integrationNotificationDeliveries.id })
    .from(integrationNotificationDeliveries)
    .where(
      and(
        scope,
        or(
          inArray(integrationNotificationDeliveries.status, [
            "scheduled",
            "queued",
            "retryable_failed",
          ]),
          and(
            eq(integrationNotificationDeliveries.status, "processing"),
            sql`${integrationNotificationDeliveries.lockedUntil} < NOW()`
          )
        ),
        lte(integrationNotificationDeliveries.readyAt, new Date()),
        or(
          sql`${integrationNotificationDeliveries.enqueuedAt} IS NULL`,
          sql`${integrationNotificationDeliveries.enqueuedAt} < NOW() - INTERVAL '5 minutes'`
        ),
        sql`(${integrationNotificationDeliveries.nextAttemptAt} IS NULL OR ${integrationNotificationDeliveries.nextAttemptAt} <= NOW())`
      )
    )
    .orderBy(
      integrationNotificationDeliveries.readyAt,
      integrationNotificationDeliveries.createdAt,
      integrationNotificationDeliveries.id
    )
    .limit(limit);
  return rows.map((row) => row.id);
}

export async function markNotificationEnqueued(ids: string[]) {
  const scope = smokeDeliveryFilter();
  if (!ids.length) return;
  const now = new Date();
  await db
    .update(integrationNotificationDeliveries)
    .set({
      status: "queued",
      enqueuedAt: new Date(),
      updatedAt: now,
    })
    .where(
      and(
        scope,
        inArray(integrationNotificationDeliveries.id, ids),
        inArray(integrationNotificationDeliveries.status, [
          "scheduled",
          "retryable_failed",
          "queued",
        ])
      )
    );
  await db
    .update(integrationNotificationDeliveries)
    .set({ enqueuedAt: now, updatedAt: now })
    .where(
      and(
        scope,
        inArray(integrationNotificationDeliveries.id, ids),
        eq(integrationNotificationDeliveries.status, "processing"),
        sql`${integrationNotificationDeliveries.lockedUntil} < NOW()`
      )
    );
}

export async function claimNotificationDelivery(
  deliveryId: string,
  leaseMs = 10 * 60 * 1000
) {
  const scope = smokeDeliveryFilter();
  const lockToken = randomUUID();
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(integrationNotificationDeliveries)
      .where(
        and(
          scope,
          eq(integrationNotificationDeliveries.id, deliveryId),
          or(
            inArray(integrationNotificationDeliveries.status, [
              "scheduled",
              "queued",
              "retryable_failed",
            ]),
            and(
              eq(integrationNotificationDeliveries.status, "processing"),
              sql`${integrationNotificationDeliveries.lockedUntil} < NOW()`
            )
          ),
          sql`${integrationNotificationDeliveries.readyAt} <= NOW()`,
          sql`(${integrationNotificationDeliveries.nextAttemptAt} IS NULL OR ${integrationNotificationDeliveries.nextAttemptAt} <= NOW())`
        )
      )
      .for("update", { skipLocked: true })
      .limit(1);
    if (!row) return null;
    const lockedUntil = new Date(Date.now() + leaseMs);
    const [claimed] = await tx
      .update(integrationNotificationDeliveries)
      .set({
        status: "processing",
        attempts: sql`${integrationNotificationDeliveries.attempts} + 1`,
        lockedUntil,
        lockToken,
        lastAttemptAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(scope, eq(integrationNotificationDeliveries.id, deliveryId)))
      .returning();
    return claimed ?? null;
  });
}

export async function isDeliveryForIntegration(
  deliveryId: string,
  projectIntegrationId: string
) {
  assertNotificationIntegrationScope(projectIntegrationId);
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS(
      SELECT 1
      FROM integration_notification_deliveries
      WHERE id = ${deliveryId}
        AND project_integration_id = ${projectIntegrationId}
    ) AS exists
  `);
  return result.rows[0]?.exists === true;
}

export async function getNotificationDeliveryContext(deliveryId: string) {
  const fixtureId = getNotificationSmokeIntegrationId();
  const result = await db.execute<
    NotificationDeliveryRow & {
      project_name: string;
      integration_status: string;
      usage_status: string;
      encrypted_credentials: string;
      settings: unknown;
      notification_preferences: unknown;
    }
  >(sql`
    SELECT d.*, p.name AS project_name,
      pi.status AS integration_status,
      w.usage_status,
      pi.encrypted_credentials,
      pi.settings,
      pi.notification_preferences
    FROM integration_notification_deliveries d
    INNER JOIN projects p ON p.id = d.project_id
      AND p.workspace_id = d.workspace_id
    INNER JOIN project_integrations pi ON pi.id = d.project_integration_id
      AND pi.project_id = d.project_id
    INNER JOIN integrations i ON i.id = pi.integration_id AND i.slug = 'slack'
    INNER JOIN workspaces w ON w.id = d.workspace_id
    WHERE d.id = ${deliveryId}
      ${fixtureId ? sql`AND d.project_integration_id = ${fixtureId}` : sql``}
    LIMIT 1
  `);
  return result.rows[0] ?? null;
}

export async function updateNotificationSuccess(
  deliveryId: string,
  lockToken: string,
  providerMessageId: string
) {
  const scope = smokeDeliveryFilter();
  const result = await db
    .update(integrationNotificationDeliveries)
    .set({
      status: "succeeded",
      providerMessageId,
      lockedUntil: null,
      lockToken: null,
      nextAttemptAt: null,
      lastErrorCode: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        scope,
        eq(integrationNotificationDeliveries.id, deliveryId),
        eq(integrationNotificationDeliveries.lockToken, lockToken),
        eq(integrationNotificationDeliveries.status, "permanent_failed"),
        eq(
          integrationNotificationDeliveries.lastErrorCode,
          UNKNOWN_PROVIDER_CODE
        )
      )
    )
    .returning({ id: integrationNotificationDeliveries.id });
  return result.length > 0;
}

export async function updateNotificationFailure(input: {
  deliveryId: string;
  lockToken: string;
  status: "retryable_failed" | "permanent_failed" | "cancelled";
  code: string;
  message: string;
  nextAttemptAt?: Date | null;
  providerRejectionProven?: boolean;
}) {
  const scope = smokeDeliveryFilter();
  const result = await db
    .update(integrationNotificationDeliveries)
    .set({
      status: input.status,
      nextAttemptAt: input.nextAttemptAt ?? null,
      lockedUntil: null,
      lockToken: null,
      lastErrorCode: input.code,
      lastError: input.message.slice(0, 1000),
      updatedAt: new Date(),
    })
    .where(
      and(
        scope,
        eq(integrationNotificationDeliveries.id, input.deliveryId),
        eq(integrationNotificationDeliveries.lockToken, input.lockToken),
        input.providerRejectionProven
          ? and(
              eq(integrationNotificationDeliveries.status, "permanent_failed"),
              eq(
                integrationNotificationDeliveries.lastErrorCode,
                UNKNOWN_PROVIDER_CODE
              )
            )
          : eq(integrationNotificationDeliveries.status, "processing")
      )
    )
    .returning({ id: integrationNotificationDeliveries.id });
  return result.length > 0;
}

// Existing terminal status + explicit error code represent UNKNOWN without a schema change.
// Claims/enqueue exclude permanent_failed regardless of lease expiry.
export async function beginNotificationProviderSend(
  deliveryId: string,
  lockToken: string
) {
  const fixtureId = getNotificationSmokeIntegrationId();
  const cutoff = getNotificationScheduleNotBefore();
  const client = await pool.connect();
  let committed = false;
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL synchronous_commit = on");
    const result = await client.query(
      `UPDATE integration_notification_deliveries
       SET status='permanent_failed', last_error_code=$3,
           last_error='Provider attempt reserved; outcome unconfirmed. Manual reconciliation required.',
           next_attempt_at=NULL, last_attempt_at=NOW(), updated_at=NOW()
       WHERE id=$1::uuid AND lock_token=$2::uuid AND status='processing'
         AND locked_until > NOW()
         AND ($4::uuid IS NULL OR project_integration_id=$4::uuid)
         AND ($5::timestamptz IS NULL OR scheduled_for >= $5::timestamptz)
       RETURNING id`,
      [
        deliveryId,
        lockToken,
        UNKNOWN_PROVIDER_CODE,
        fixtureId ?? null,
        cutoff?.toISOString() ?? null,
      ]
    );
    await client.query("COMMIT");
    committed = true;
    if (result.rowCount !== 1) return false;
    // Outside the transaction: require a visible, committed guard before outbound I/O.
    const verify = await client.query(
      `SELECT id FROM integration_notification_deliveries WHERE id=$1::uuid AND lock_token=$2::uuid
       AND status='permanent_failed' AND last_error_code=$3`,
      [deliveryId, lockToken, UNKNOWN_PROVIDER_CODE]
    );
    if (verify.rowCount !== 1)
      throw new Error("Provider attempt reservation could not be verified.");
    return true;
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function countUnknownNotificationOutcomes() {
  const fixtureId = getNotificationSmokeIntegrationId();
  const result = await db.execute<{ count: string }>(sql`
    SELECT COUNT(*)::text AS count FROM integration_notification_deliveries
    WHERE status='permanent_failed' AND last_error_code=${UNKNOWN_PROVIDER_CODE}
      AND last_attempt_at < NOW() - INTERVAL '2 minutes'
      ${fixtureId ? sql`AND project_integration_id=${fixtureId}` : sql``}
  `);
  return Number(result.rows[0]?.count ?? 0);
}

export async function markSlackIntegrationInvalid(
  projectIntegrationId: string
) {
  assertNotificationIntegrationScope(projectIntegrationId);
  await db
    .update(projectIntegrations)
    .set({ status: "error", updatedAt: new Date() })
    .where(
      and(
        eq(projectIntegrations.id, projectIntegrationId),
        eq(projectIntegrations.status, "connected")
      )
    );
}
