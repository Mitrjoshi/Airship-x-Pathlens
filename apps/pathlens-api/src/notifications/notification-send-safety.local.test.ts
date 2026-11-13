import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { sendNotificationOnce } from "./notification-send-safety";

const url = process.env.PATHLENS_NOTIFICATION_LOCAL_DATABASE_URL;
if (url) {
  const u = new URL(url);
  if (
    u.hostname !== "127.0.0.1" ||
    u.pathname !== "/pathlens_notification_phase7k"
  )
    throw new Error("Local-only disposable database required.");
}
const fixture = "11111111-1111-4111-8111-111111111111";
const names = [
  "DATABASE_URL",
  "DATABASE_SSL_REQUIRED",
  "DATABASE_SSL_CA",
  "PATHLENS_NOTIFICATION_SMOKE_TEST",
  "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID",
  "NOTIFICATION_SCHEDULE_NOT_BEFORE",
];
const previous = names.map((k) => process.env[k]);
let control: Pool;
let appPool: Pool;
let delivery: typeof import("./notification-delivery");
test.before(async () => {
  if (!url) return;
  process.env.DATABASE_URL = url;
  process.env.DATABASE_SSL_REQUIRED = "false";
  process.env.DATABASE_SSL_CA = "";
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "true";
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = fixture;
  delete process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE;
  control = new Pool({ connectionString: url });
  // Reuse the actual reviewed delivery DDL and unique index in a disposable local DB.
  const migration = fs.readFileSync(
    path.resolve(__dirname, "../../drizzle/0063_smooth_the_santerians.sql"),
    "utf8"
  );
  await control.query(
    migration
      .split("--> statement-breakpoint")[0]
      .replace("CREATE TABLE", "CREATE TABLE IF NOT EXISTS")
  );
  await control.query(
    migration
      .match(/CREATE UNIQUE INDEX[^;]+;/)![0]
      .replace("CREATE UNIQUE INDEX", "CREATE UNIQUE INDEX IF NOT EXISTS")
  );
  delivery = await import("./notification-delivery");
  appPool = (await import("../db/client")).pool;
});
test.beforeEach(async () => {
  if (!url) return;
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "true";
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = fixture;
  delete process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE;
  await control.query("TRUNCATE integration_notification_deliveries");
});
test.after(async () => {
  if (appPool) await appPool.end();
  if (control) await control.end();
  names.forEach((k, i) => {
    if (previous[i] === undefined) delete process.env[k];
    else process.env[k] = previous[i];
  });
});
const options = {
  skip: !url ? "Requires explicitly isolated localhost PostgreSQL" : false,
};
async function seed() {
  const id = randomUUID();
  await control.query(
    `INSERT INTO integration_notification_deliveries
    (id,workspace_id,project_id,project_integration_id,provider,report_type,reporting_period_start,reporting_period_end,reporting_timezone,channel_id,scheduled_for,ready_at)
    VALUES($1,$2,$2,$2,'slack','daily',NOW()-INTERVAL '2 days',NOW()-INTERVAL '1 day','UTC','C1',NOW()-INTERVAL '1 hour',NOW()-INTERVAL '1 hour')`,
    [id, fixture]
  );
  return id;
}
async function state(id: string) {
  return (
    await control.query(
      "SELECT * FROM integration_notification_deliveries WHERE id=$1",
      [id]
    )
  ).rows[0];
}

test(
  "committed guard visible independently; expired lease/redelivery cannot reclaim or enqueue",
  options,
  async () => {
    const id = await seed();
    const claims = await Promise.all([
      delivery.claimNotificationDelivery(id),
      delivery.claimNotificationDelivery(id),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    const claim = claims.find(Boolean)!;
    assert.equal(
      await delivery.beginNotificationProviderSend(id, claim.lockToken!),
      true
    );
    assert.equal((await state(id)).last_error_code, "provider_outcome_unknown");
    await control.query(
      "UPDATE integration_notification_deliveries SET locked_until=NOW()-INTERVAL '1 second' WHERE id=$1",
      [id]
    );
    assert.equal(await delivery.claimNotificationDelivery(id), null);
    assert.deepEqual(await delivery.listNotificationDeliveryIdsToEnqueue(), []);
    assert.equal(
      await delivery.beginNotificationProviderSend(id, claim.lockToken!),
      false
    );
  }
);
test(
  "valid Slack result finalizes guard, preserving duplicate prevention",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    let calls = 0;
    const result = await sendNotificationOnce({
      channel: "C1",
      smoke: false,
      reserve: () =>
        delivery.beginNotificationProviderSend(id, claim!.lockToken!),
      send: async () => {
        calls++;
        return { channel: "C1", ts: "123.456" };
      },
      persistSuccess: (pid) =>
        delivery.updateNotificationSuccess(id, claim!.lockToken!, pid),
    });
    assert.equal(result.status, "succeeded");
    assert.equal(calls, 1);
    assert.equal((await state(id)).status, "succeeded");
    assert.equal(await delivery.claimNotificationDelivery(id), null);
  }
);
test(
  "Slack accepted plus failed DB persistence leaves permanent UNKNOWN guard",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    const result = await sendNotificationOnce({
      channel: "C1",
      smoke: false,
      reserve: () =>
        delivery.beginNotificationProviderSend(id, claim!.lockToken!),
      send: async () => ({ channel: "C1", ts: "123.456" }),
      persistSuccess: async () => {
        throw Error("lost DB response");
      },
    });
    assert.equal(result.status, "unknown");
    assert.equal(await delivery.claimNotificationDelivery(id), null);
    assert.equal(
      await delivery.updateNotificationFailure({
        deliveryId: id,
        lockToken: claim!.lockToken!,
        status: "retryable_failed",
        code: "temporary",
        message: "must not reopen",
      }),
      false
    );
  }
);
test(
  "only a proven rejection may reopen for a safe retry",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    await delivery.beginNotificationProviderSend(id, claim!.lockToken!);
    assert.equal(
      await delivery.updateNotificationFailure({
        deliveryId: id,
        lockToken: randomUUID(),
        status: "retryable_failed",
        code: "ratelimited",
        message: "stale",
        providerRejectionProven: true,
      }),
      false
    );
    assert.equal(
      await delivery.updateNotificationFailure({
        deliveryId: id,
        lockToken: claim!.lockToken!,
        status: "retryable_failed",
        code: "ratelimited",
        message: "known rejection",
        providerRejectionProven: true,
      }),
      true
    );
    assert.ok(await delivery.claimNotificationDelivery(id));
  }
);
test(
  "failure before provider reservation remains safely retryable",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    assert.equal(
      await delivery.updateNotificationFailure({
        deliveryId: id,
        lockToken: claim!.lockToken!,
        status: "retryable_failed",
        code: "context_load_failed",
        message: "before HTTP",
      }),
      true
    );
    assert.ok(await delivery.claimNotificationDelivery(id));
  }
);
test(
  "ambiguous COMMIT response: no send, persisted guard survives rollback cleanup",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    const connect = appPool.connect;
    appPool.connect = (async () => {
      const client = await connect.call(appPool);
      return {
        async query(sql: string, params?: unknown[]) {
          const r = await client.query(sql, params);
          if (sql === "COMMIT") throw Error("response lost after commit");
          return r;
        },
        release() {
          client.release();
        },
      };
    }) as unknown as typeof appPool.connect;
    try {
      await assert.rejects(
        delivery.beginNotificationProviderSend(id, claim!.lockToken!)
      );
    } finally {
      appPool.connect = connect;
    }
    assert.equal((await state(id)).last_error_code, "provider_outcome_unknown");
    assert.equal(await delivery.claimNotificationDelivery(id), null);
  }
);
test(
  "expired pre-send lease cannot reserve an outbound attempt",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    await control.query(
      "UPDATE integration_notification_deliveries SET locked_until=NOW()-INTERVAL '1 second' WHERE id=$1",
      [id]
    );
    assert.equal(
      await delivery.beginNotificationProviderSend(id, claim!.lockToken!),
      false
    );
  }
);
test(
  "unknown crash backlog is visible to dispatcher monitoring",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    await delivery.beginNotificationProviderSend(id, claim!.lockToken!);
    await control.query(
      "UPDATE integration_notification_deliveries SET last_attempt_at=NOW()-INTERVAL '3 minutes' WHERE id=$1",
      [id]
    );
    assert.equal(await delivery.countUnknownNotificationOutcomes(), 1);
  }
);
test(
  "normal-mode initial cutoff excludes historical enqueue and claims",
  options,
  async () => {
    const id = await seed();
    process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "false";
    delete process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID;
    process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE = new Date().toISOString();
    assert.deepEqual(await delivery.listNotificationDeliveryIdsToEnqueue(), []);
    assert.equal(await delivery.claimNotificationDelivery(id), null);
  }
);

test(
  "concurrent provider reservations authorize exactly one outbound request",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id);
    const reservations = await Promise.all([
      delivery.beginNotificationProviderSend(id, claim!.lockToken!),
      delivery.beginNotificationProviderSend(id, claim!.lockToken!),
    ]);
    assert.deepEqual(reservations.sort(), [false, true]);
  }
);
test(
  "failed post-commit verification never resets the committed guard",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id),
      connect = appPool.connect;
    appPool.connect = (async () => {
      const client = await connect.call(appPool);
      return {
        async query(sql: string, params?: unknown[]) {
          if (sql.startsWith("SELECT id FROM"))
            return { rows: [], rowCount: 0 };
          return client.query(sql, params);
        },
        release() {
          client.release();
        },
      };
    }) as unknown as typeof appPool.connect;
    try {
      await assert.rejects(
        delivery.beginNotificationProviderSend(id, claim!.lockToken!)
      );
    } finally {
      appPool.connect = connect;
    }
    assert.equal((await state(id)).last_error_code, "provider_outcome_unknown");
    assert.equal(await delivery.claimNotificationDelivery(id), null);
  }
);
test(
  "pre-commit reservation failure rolls back without an authorized send",
  options,
  async () => {
    const id = await seed(),
      claim = await delivery.claimNotificationDelivery(id),
      connect = appPool.connect;
    appPool.connect = (async () => {
      const client = await connect.call(appPool);
      return {
        async query(sql: string, params?: unknown[]) {
          const r = await client.query(sql, params);
          if (sql.startsWith("UPDATE integration_notification_deliveries"))
            throw Error("failure before commit");
          return r;
        },
        release() {
          client.release();
        },
      };
    }) as unknown as typeof appPool.connect;
    try {
      await assert.rejects(
        delivery.beginNotificationProviderSend(id, claim!.lockToken!)
      );
    } finally {
      appPool.connect = connect;
    }
    assert.equal((await state(id)).status, "processing");
  }
);
