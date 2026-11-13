import assert from "node:assert/strict";
import test from "node:test";

import { pool } from "../db/client";
import * as delivery from "./notification-delivery";
import { listSchedulableSlackIntegrations } from "./notification-dispatcher";
import { handler } from "./notification-worker";
import { getNotificationSmokeIntegrationId } from "./notification-isolation";

const fixture = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const deliveryId = "33333333-3333-4333-8333-333333333333";
const statements: Array<{ text: string; values: unknown[] }> = [];
const originalQuery = pool.query;
const originalConnect = pool.connect;
const names = [
  "NOTIFICATION_SCHEDULE_NOT_BEFORE",
  "PATHLENS_NOTIFICATION_SMOKE_TEST",
  "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID",
  "PATHLENS_NOTIFICATION_MOCK_SLACK",
];
const previous = names.map((name) => process.env[name]);

test.beforeEach(() => {
  statements.length = 0;
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "true";
  delete process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE;
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = fixture;
  process.env.PATHLENS_NOTIFICATION_MOCK_SLACK = "true";
  const query = async (
    config: string | { text: string; values?: unknown[] },
    values?: unknown[]
  ) => {
    const text = typeof config === "string" ? config : config.text;
    const params =
      values ?? (typeof config === "string" ? [] : config.values) ?? [];
    statements.push({ text, values: params });
    // Pure in-memory fake. No socket or database connection is used.
    const rows = text.includes("SELECT EXISTS")
      ? [{ exists: params[0] === deliveryId }]
      : [];
    return { rows, rowCount: rows.length };
  };
  pool.query = query as typeof pool.query;
  pool.connect = (async () => ({
    query,
    release() {},
  })) as unknown as typeof pool.connect;
});
test.afterEach(() => {
  pool.query = originalQuery;
  pool.connect = originalConnect;
  names.forEach((name, i) => {
    if (previous[i] === undefined) delete process.env[name];
    else process.env[name] = previous[i];
  });
});

test("fixture enqueue SQL scopes every pending, retryable and expired-lease branch", async () => {
  await delivery.listNotificationDeliveryIdsToEnqueue();
  const q = statements[0];
  assert.ok(q.values.includes(fixture));
  assert.match(q.text, /"project_integration_id" = \$/);
  for (const status of [
    "scheduled",
    "queued",
    "retryable_failed",
    "processing",
  ])
    assert.ok(q.values.includes(status));
  assert.match(
    q.text,
    /\("integration_notification_deliveries"\."next_attempt_at" IS NULL OR .* <= NOW\(\)\)/
  );
});
test("production SQL omits fixture filter and preserves retry eligibility", async () => {
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "false";
  process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE = "2026-01-01T00:00:00.000Z";
  await delivery.listNotificationDeliveryIdsToEnqueue();
  assert.ok(!statements[0].values.includes(fixture));
  assert.ok(statements[0].values.includes("retryable_failed"));
});
test("claim SQL has fixture predicate, SKIP LOCKED and bounded retry expression", async () => {
  await delivery.claimNotificationDelivery(deliveryId);
  const q = statements.find((q) => q.text.startsWith("select"))!;
  assert.ok(q.values.includes(fixture));
  assert.ok(q.values.includes(deliveryId));
  assert.match(q.text, /for update skip locked/i);
  assert.match(
    q.text,
    /\("integration_notification_deliveries"\."next_attempt_at" IS NULL OR/
  );
});
test("success/failure fencing and enqueue writes all include fixture scope", async () => {
  await delivery.markNotificationEnqueued([deliveryId, other]);
  await delivery.updateNotificationSuccess(deliveryId, "lease", "mock:1");
  await delivery.updateNotificationFailure({
    deliveryId,
    lockToken: "lease",
    status: "retryable_failed",
    code: "mock",
    message: "mock",
  });
  for (const q of statements) {
    assert.ok(q.values.includes(fixture));
    assert.match(q.text, /"project_integration_id" = \$/);
  }
  for (const q of statements.slice(-2)) {
    assert.ok(q.values.includes("lease"));
    assert.ok(
      q.values.includes("processing") ||
        q.values.includes("provider_outcome_unknown")
    );
  }
});
test("dispatcher integration selection and worker context are scoped in SQL", async () => {
  await listSchedulableSlackIntegrations();
  await delivery.getNotificationDeliveryContext(deliveryId);
  assert.ok(statements.every((q) => q.values.includes(fixture)));
  assert.match(statements[0].text, /AND pi.id = \$/);
  assert.match(statements[1].text, /AND d.project_integration_id = \$/);
});
test("unrelated create/latest/invalidation operations fail before any SQL", async () => {
  await assert.rejects(
    delivery.getLatestNotificationSchedule(other, "daily"),
    /scope/
  );
  await assert.rejects(delivery.markSlackIntegrationInvalid(other), /scope/);
  await assert.rejects(
    delivery.createNotificationDelivery({
      projectIntegrationId: other,
    } as Parameters<typeof delivery.createNotificationDelivery>[0]),
    /scope/
  );
  assert.equal(statements.length, 0);
});
test("mixed SQS batch rejects unrelated record without claiming it", async () => {
  const result = await handler({
    Records: [
      { messageId: "other", body: JSON.stringify({ deliveryId: other }) },
      { messageId: "fixture", body: JSON.stringify({ deliveryId }) },
    ],
  });
  assert.deepEqual(result.batchItemFailures, [{ itemIdentifier: "other" }]);
  const claims = statements.filter((q) =>
    /for update skip locked/i.test(q.text)
  );
  assert.equal(claims.length, 1);
  assert.ok(claims[0].values.includes(deliveryId));
  assert.ok(!claims[0].values.includes(other));
});
for (const id of ["", "not-a-uuid"]) {
  test(`missing/invalid fixture fails before SQL: ${id}`, async () => {
    process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = id;
    assert.throws(getNotificationSmokeIntegrationId);
    await assert.rejects(delivery.listNotificationDeliveryIdsToEnqueue());
    await assert.rejects(delivery.claimNotificationDelivery(deliveryId));
    await assert.rejects(listSchedulableSlackIntegrations());
    assert.equal(statements.length, 0);
  });
}
test("smoke worker refuses non-mocked transport before any query", async () => {
  delete process.env.PATHLENS_NOTIFICATION_MOCK_SLACK;
  const result = await handler({
    Records: [{ messageId: "fixture", body: JSON.stringify({ deliveryId }) }],
  });
  assert.equal(result.batchItemFailures.length, 1);
  assert.equal(statements.length, 0);
});

test("concurrent claims and duplicate reclaims retain one lease in isolated mock storage", async () => {
  let locked = false;
  const query = async (
    config: string | { text: string },
    values?: unknown[]
  ) => {
    const text = typeof config === "string" ? config : config.text;
    if (/for update skip locked/i.test(text)) {
      if (locked) return { rows: [], rowCount: 0 };
      locked = true;
    } else if (!text.startsWith("update")) return { rows: [], rowCount: 0 };
    const projection = text.startsWith("select")
      ? text.split(" from ")[0]
      : text.split(" returning ")[1];
    const columns = [...projection.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
    const row: Record<string, unknown> = {
      id: deliveryId,
      project_integration_id: fixture,
      status: "processing",
      attempts: 1,
      lock_token: "current-lease",
    };
    return { rows: [columns.map((c) => row[c] ?? null)], rowCount: 1 };
  };
  pool.connect = (async () => ({
    query,
    release() {},
  })) as unknown as typeof pool.connect;
  const results = await Promise.all([
    delivery.claimNotificationDelivery(deliveryId),
    delivery.claimNotificationDelivery(deliveryId),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(await delivery.claimNotificationDelivery(deliveryId), null);
});

test("duplicate insertion preserves unique reporting-period conflict target", async () => {
  const now = new Date("2026-11-12T00:00:00Z");
  const result = await delivery.createNotificationDelivery({
    workspaceId: other,
    projectId: other,
    projectIntegrationId: fixture,
    channelId: "mock",
    candidate: {
      reportType: "daily",
      scheduledFor: now,
      readyAt: now,
      period: {
        timezone: "UTC",
        start: now,
        end: now,
        previousStart: now,
        previousEnd: now,
      },
    },
  });
  assert.equal(result, null);
  assert.match(
    statements[0].text,
    /on conflict \("provider","project_integration_id","report_type","reporting_period_start","reporting_period_end"\) do nothing/i
  );
});
