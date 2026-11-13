import { SendMessageBatchCommand, SQSClient } from "@aws-sdk/client-sqs";

import { db } from "../db/client";
import { sql } from "drizzle-orm";
import {
  createNotificationDelivery,
  getLatestNotificationSchedule,
  listNotificationDeliveryIdsToEnqueue,
  markNotificationEnqueued,
  countUnknownNotificationOutcomes,
} from "./notification-delivery";
import { parseNotificationSettings } from "./notification-settings";
import { getNotificationCandidates } from "./scheduling";
import { logNotification } from "./notification-logging";
import { getNotificationSmokeIntegrationId } from "./notification-isolation";
import { getNotificationScheduleNotBefore } from "./notification-activation";

const sqs = new SQSClient({});
const MAX_INTEGRATIONS_PER_RUN = 500;
const MAX_ENQUEUES_PER_RUN = 100;

type IntegrationRow = {
  integration_id: string;
  project_id: string;
  workspace_id: string;
  project_name: string;
  settings: unknown;
  notification_preferences: unknown;
};

function getQueueUrl() {
  const value = process.env.NOTIFICATION_QUEUE_URL?.trim();
  if (!value) throw new Error("NOTIFICATION_QUEUE_URL is required");
  return value;
}

export async function listSchedulableSlackIntegrations(
  limit = MAX_INTEGRATIONS_PER_RUN,
  bucket = 0,
  bucketCount = 1
) {
  const testIntegrationId = getNotificationSmokeIntegrationId();
  const result = await db.execute<IntegrationRow>(sql`
    SELECT pi.id AS integration_id,
      pi.project_id,
      p.workspace_id,
      p.name AS project_name,
      pi.settings,
      pi.notification_preferences
    FROM project_integrations pi
    INNER JOIN integrations i ON i.id = pi.integration_id AND i.slug = 'slack'
    INNER JOIN projects p ON p.id = pi.project_id AND p.workspace_id IS NOT NULL
    INNER JOIN workspaces w ON w.id = p.workspace_id AND w.usage_status = 'active'
    WHERE pi.status = 'connected'
      ${testIntegrationId ? sql`AND pi.id = ${testIntegrationId}` : sql``}
      AND MOD(ABS(HASHTEXT(pi.id::text)), ${Math.max(1, bucketCount)}) = ${Math.max(0, bucket) % Math.max(1, bucketCount)}
    ORDER BY pi.updated_at ASC, pi.id ASC
    LIMIT ${Math.max(1, Math.min(limit, MAX_INTEGRATIONS_PER_RUN))}
  `);
  return result.rows;
}

async function enqueueDeliveryIds(ids: string[]) {
  const queueUrl = getQueueUrl();
  for (let offset = 0; offset < ids.length; offset += 10) {
    const batch = ids.slice(offset, offset + 10);
    const result = await sqs.send(
      new SendMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: batch.map((id) => ({
          Id: id,
          MessageBody: JSON.stringify({ deliveryId: id }),
        })),
      })
    );
    const failed = new Set((result.Failed ?? []).map((entry) => entry.Id));
    const succeeded = batch.filter((id) => !failed.has(id));
    await markNotificationEnqueued(succeeded);
    if (failed.size) {
      logNotification("error", "notification_enqueue_partial_failure", {
        failedCount: failed.size,
      });
    }
  }
}

export async function runNotificationDispatcher(now = new Date()) {
  const cutoff = getNotificationScheduleNotBefore();
  // Persisted guards survive process death, even if the worker never logged UNKNOWN.
  logNotification("info", "notification_unknown_backlog", {
    unknownCount: await countUnknownNotificationOutcomes(),
  });
  const bucketCount = 8;
  const bucket = Math.floor(now.getTime() / 60000) % bucketCount;
  const integrations = await listSchedulableSlackIntegrations(
    MAX_INTEGRATIONS_PER_RUN,
    bucket,
    bucketCount
  );
  let created = 0;
  for (const integration of integrations) {
    const settings = parseNotificationSettings(
      integration.settings,
      integration.notification_preferences
    );
    if (!settings) continue;
    try {
      const candidates = getNotificationCandidates(settings, now).filter(
        (candidate) => !cutoff || candidate.scheduledFor >= cutoff
      );
      const latestByType = new Map<"daily" | "weekly", Date | null>();
      for (const reportType of ["daily", "weekly"] as const) {
        latestByType.set(
          reportType,
          await getLatestNotificationSchedule(
            integration.integration_id,
            reportType
          )
        );
      }
      const candidatesByType = new Map<"daily" | "weekly", typeof candidates>();
      for (const candidate of candidates) {
        const current = candidatesByType.get(candidate.reportType) ?? [];
        current.push(candidate);
        candidatesByType.set(candidate.reportType, current);
      }
      const candidatesToCreate = [...candidatesByType.entries()].flatMap(
        ([reportType, typeCandidates]) => {
          const latest = latestByType.get(reportType) ?? null;
          return latest
            ? typeCandidates.filter(
                (candidate) => candidate.scheduledFor > latest
              )
            : typeCandidates.slice(-1);
        }
      );
      for (const candidate of candidatesToCreate) {
        const id = await createNotificationDelivery({
          workspaceId: integration.workspace_id,
          projectId: integration.project_id,
          projectIntegrationId: integration.integration_id,
          channelId: settings.channelId,
          candidate,
        });
        if (id) created += 1;
      }
    } catch (error) {
      logNotification("error", "notification_schedule_failed", {
        integrationId: integration.integration_id,
        projectId: integration.project_id,
        error: "schedule_operation_failed",
      });
    }
  }

  const ids = await listNotificationDeliveryIdsToEnqueue(MAX_ENQUEUES_PER_RUN);
  await enqueueDeliveryIds(ids);
  logNotification("info", "notification_dispatch_completed", {
    integrationCount: integrations.length,
    createdCount: created,
    enqueuedCount: ids.length,
  });
}

export async function handler() {
  await runNotificationDispatcher();
}
