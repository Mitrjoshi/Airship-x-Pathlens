import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import type { Pool, PoolClient } from "pg";

import {
  createNotificationTestPool,
  getNotificationTestTarget,
} from "./notification-test-target";

const isolatedMarker = process.env.PATHLENS_NOTIFICATION_TEST_ISOLATED;
const fixtureWorkspaceId = process.env.PATHLENS_NOTIFICATION_TEST_WORKSPACE_ID;
const fixtureProjectId = process.env.PATHLENS_NOTIFICATION_TEST_PROJECT_ID;
const fixtureIntegrationId =
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID;
const testLabel = process.env.PATHLENS_NOTIFICATION_TEST_LABEL;

function getSkipReason() {
  const target = getNotificationTestTarget();
  if ("reason" in target) return target.reason;
  if (isolatedMarker !== "true") {
    return "PATHLENS_NOTIFICATION_TEST_ISOLATED=true is required.";
  }
  if (!fixtureWorkspaceId || !fixtureProjectId || !fixtureIntegrationId) {
    return "Dedicated workspace, project, and integration fixture IDs are required.";
  }
  if (!testLabel?.startsWith("phase5c3-")) {
    return "PATHLENS_NOTIFICATION_TEST_LABEL must start with phase5c3-.";
  }
  return undefined;
}

const skipReason = getSkipReason();

function createPool() {
  return createNotificationTestPool();
}

function id() {
  return randomUUID();
}

function period() {
  const start = new Date(Date.now() - 60_000);
  return {
    start,
    end: new Date(start.getTime() + 1_000),
  };
}

async function assertReady(client: PoolClient) {
  const result = await client.query<{ relation: string | null }>(
    `SELECT to_regclass('public.integration_notification_deliveries')::text AS relation`
  );
  assert.equal(
    result.rows[0]?.relation,
    "integration_notification_deliveries",
    "Apply the reviewed migration to the isolated test database before running integration tests."
  );
}

async function cleanup(client: PoolClient) {
  await client.query(
    `DELETE FROM integration_notification_deliveries WHERE channel_id LIKE $1`,
    [`${testLabel}-%`]
  );
}

async function insertDelivery(
  client: PoolClient,
  input: {
    status?: string;
    lockedUntil?: Date | null;
    lockToken?: string | null;
    channelSuffix?: string;
    nextAttemptAt?: Date | null;
  } = {}
) {
  const range = period();
  const result = await client.query<{ id: string }>(
    `INSERT INTO integration_notification_deliveries
      (workspace_id, project_id, project_integration_id, provider, report_type,
       reporting_period_start, reporting_period_end, reporting_timezone,
       channel_id, scheduled_for, ready_at, status, next_attempt_at,
       locked_until, lock_token)
     VALUES ($1, $2, $3, 'slack', 'daily', $4, $5, 'UTC', $6, $4, $4,
       $7, $8, $9, $10)
     RETURNING id`,
    [
      fixtureWorkspaceId,
      fixtureProjectId,
      fixtureIntegrationId,
      range.start,
      range.end,
      `${testLabel}-${input.channelSuffix ?? id()}`,
      input.status ?? "queued",
      input.nextAttemptAt ?? null,
      input.lockedUntil ?? null,
      input.lockToken ?? null,
    ]
  );
  return result.rows[0]!.id;
}

async function withIsolatedPool(callback: (pool: Pool) => Promise<void>) {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query("SET default_transaction_read_only = off");
    await assertReady(client);
    await cleanup(client);
    await callback(pool);
    await cleanup(client);
  } finally {
    client.release();
    await pool.end();
  }
}

test(
  "notification delivery integration target is explicitly isolated",
  { skip: skipReason },
  async () => {
    const pool = createPool();
    try {
      const result = await pool.query<{ database: string; host: string }>(
        `SELECT current_database() AS database, inet_server_addr()::text AS host`
      );
      assert.ok(result.rows[0]?.database);
      assert.ok(result.rows[0]?.host);
    } finally {
      await pool.end();
    }
  }
);

test(
  "concurrent inserts enforce delivery uniqueness",
  { skip: skipReason },
  async () => {
    await withIsolatedPool(async (pool) => {
      const range = period();
      const values = [
        fixtureWorkspaceId,
        fixtureProjectId,
        fixtureIntegrationId,
        range.start,
        range.end,
        `${testLabel}-unique`,
      ];
      const insert = () =>
        pool.query(
          `INSERT INTO integration_notification_deliveries
            (workspace_id, project_id, project_integration_id, provider,
             report_type, reporting_period_start, reporting_period_end,
             reporting_timezone, channel_id, scheduled_for, ready_at)
           VALUES ($1, $2, $3, 'slack', 'daily', $4, $5, 'UTC', $6, $4, $4)
           ON CONFLICT DO NOTHING`,
          values
        );
      await Promise.all([insert(), insert()]);
      const result = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM integration_notification_deliveries WHERE channel_id = $1`,
        [values[5]]
      );
      assert.equal(result.rows[0]?.count, "1");
    });
  }
);

test(
  "concurrent claims allow only one worker through SKIP LOCKED",
  { skip: skipReason },
  async () => {
    await withIsolatedPool(async (pool) => {
      const seed = await pool.connect();
      let deliveryId: string;
      try {
        deliveryId = await insertDelivery(seed, { channelSuffix: "claim" });
      } finally {
        seed.release();
      }

      const claim = async () => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const selected = await client.query<{ id: string }>(
            `SELECT id FROM integration_notification_deliveries
             WHERE id = $1 AND status = 'queued'
             FOR UPDATE SKIP LOCKED`,
            [deliveryId]
          );
          if (!selected.rows[0]) {
            await client.query("ROLLBACK");
            return false;
          }
          await client.query(
            `UPDATE integration_notification_deliveries
             SET status = 'processing', lock_token = $2, locked_until = NOW() + INTERVAL '10 minutes'
             WHERE id = $1`,
            [deliveryId, id()]
          );
          await client.query("COMMIT");
          return true;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      };

      const claims = await Promise.all([claim(), claim()]);
      assert.equal(claims.filter(Boolean).length, 1);
    });
  }
);

test(
  "dispatcher enqueue cannot overwrite a reclaimed worker lease",
  { skip: skipReason },
  async () => {
    await withIsolatedPool(async (pool) => {
      const client = await pool.connect();
      try {
        const oldToken = id();
        const newToken = id();
        const deliveryId = await insertDelivery(client, {
          status: "processing",
          lockedUntil: new Date(Date.now() - 1_000),
          lockToken: oldToken,
          channelSuffix: "lease-race",
        });
        await client.query(
          `UPDATE integration_notification_deliveries
           SET locked_until = NOW() + INTERVAL '10 minutes', lock_token = $2
           WHERE id = $1 AND status = 'processing' AND lock_token = $3`,
          [deliveryId, newToken, oldToken]
        );
        await client.query(
          `UPDATE integration_notification_deliveries
           SET status = 'queued', enqueued_at = NOW()
           WHERE id = $1 AND status IN ('scheduled', 'queued', 'retryable_failed')`,
          [deliveryId]
        );
        const afterEnqueue = await client.query<{
          status: string;
          lock_token: string;
        }>(
          `SELECT status, lock_token FROM integration_notification_deliveries WHERE id = $1`,
          [deliveryId]
        );
        assert.equal(afterEnqueue.rows[0]?.status, "processing");
        assert.equal(afterEnqueue.rows[0]?.lock_token, newToken);

        const success = await client.query(
          `UPDATE integration_notification_deliveries
           SET status = 'succeeded', provider_message_id = $3,
               locked_until = NULL, lock_token = NULL
           WHERE id = $1 AND status = 'processing' AND lock_token = $2`,
          [deliveryId, newToken, `${testLabel}-provider`]
        );
        assert.equal(success.rowCount, 1);
      } finally {
        client.release();
      }
    });
  }
);

test(
  "fenced retry and permanent transitions require the current lock token",
  { skip: skipReason },
  async () => {
    await withIsolatedPool(async (pool) => {
      const client = await pool.connect();
      try {
        const token = id();
        const staleToken = id();
        const deliveryId = await insertDelivery(client, {
          status: "processing",
          lockToken: token,
          lockedUntil: new Date(Date.now() + 600_000),
          channelSuffix: "fencing",
        });
        const stale = await client.query(
          `UPDATE integration_notification_deliveries
           SET status = 'permanent_failed'
           WHERE id = $1 AND status = 'processing' AND lock_token = $2`,
          [deliveryId, staleToken]
        );
        assert.equal(stale.rowCount, 0);
        const retry = await client.query(
          `UPDATE integration_notification_deliveries
           SET status = 'retryable_failed', next_attempt_at = NOW() + INTERVAL '1 minute',
               locked_until = NULL, lock_token = NULL
           WHERE id = $1 AND status = 'processing' AND lock_token = $2`,
          [deliveryId, token]
        );
        assert.equal(retry.rowCount, 1);
      } finally {
        client.release();
      }
    });
  }
);
