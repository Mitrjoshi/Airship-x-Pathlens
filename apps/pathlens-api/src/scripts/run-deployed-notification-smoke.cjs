// Explicitly authorized staging runner. Never contacts Slack over the network.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const https = require("node:https");
const cp = require("node:child_process");
const assert = require("node:assert/strict");
const { Pool } = require("pg");
const sqsModule = require("@aws-sdk/client-sqs");
const { SignatureV4 } = require(
  require.resolve("@smithy/signature-v4", {
    paths: [require.resolve("@aws-sdk/client-sqs")],
  })
);
const region = "ap-south-1";
const account = "176246209215";
const prefix = "pathlens-notification-staging";
const digest =
  "sha256:b963a00e1647b78f71d11624646665bc045c14b240bfd447f5c7a51f2c1705eb";
const queueUrl = `https://sqs.${region}.amazonaws.com/${account}/${prefix}-queue`;
const dlqUrl = `https://sqs.${region}.amazonaws.com/${account}/${prefix}-dlq`;
const sqs = new sqsModule.SQSClient({ region, maxAttempts: 1 });
const aws = (args) => {
  const raw = cp.execFileSync(
    "aws.exe",
    [...args, "--region", region, "--output", "json"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  return raw.trim() ? JSON.parse(raw) : undefined;
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fingerprint = (v) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(Object.entries(v).sort()))
    .digest("hex");
class Sha256 {
  constructor(key) {
    this.hash = key
      ? crypto.createHmac("sha256", key)
      : crypto.createHash("sha256");
  }
  update(data) {
    this.hash.update(data);
  }
  async digest() {
    return this.hash.digest();
  }
}
const signer = new SignatureV4({
  service: "lambda",
  region,
  credentials: sqs.config.credentials,
  sha256: Sha256,
});
async function lambda(method, resource, data) {
  const hostname = `lambda.${region}.amazonaws.com`;
  const body = data === undefined ? undefined : JSON.stringify(data);
  const signed = await signer.sign({
    method,
    hostname,
    protocol: "https:",
    path: resource,
    headers: {
      host: hostname,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body,
  });
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        method,
        path: resource,
        headers: signed.headers,
        timeout: 150000,
      },
      (res) => {
        let raw = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          if (res.statusCode < 200 || res.statusCode >= 300)
            return reject(new Error(`Lambda HTTP ${res.statusCode}`));
          if (res.headers["x-amz-function-error"])
            return reject(
              new Error("Lambda function error; stop without retry")
            );
          try {
            resolve(raw.trim() ? JSON.parse(raw) : null);
          } catch {
            reject(new Error("Invalid Lambda response"));
          }
        });
      }
    );
    req.on("timeout", () =>
      req.destroy(new Error("Lambda outcome uncertain; no invocation retry"))
    );
    req.on("error", () =>
      reject(new Error("Lambda connection failure; no invocation retry"))
    );
    if (body) req.write(body);
    req.end();
  });
}
const configPath = (kind) =>
  `/2015-03-31/functions/${prefix}-${kind}/configuration`;
const invoke = (kind, payload) =>
  lambda(
    "POST",
    `/2015-03-31/functions/${prefix}-${kind}/invocations`,
    payload
  );
const config = (kind) => lambda("GET", configPath(kind));
const report = {};
const startedAt = Date.now();
let stage = "preflight";
let pool;
let baseline;
let original;
let fixture;
let appPool;
let created = false;
const receipts = new Map();
const touched = new Set();
const tables = [
  "users",
  "workspaces",
  "projects",
  "project_integrations",
  "integration_notification_deliveries",
  "notifications",
];
async function snapshot() {
  const out = {};
  for (const table of tables) {
    const r = await pool.query(`SELECT count(*)::int AS count,
      md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY id),'')) AS fingerprint FROM ${table} t`);
    out[table] = r.rows[0];
  }
  return out;
}
async function queuesEmpty() {
  for (const url of [queueUrl, dlqUrl]) {
    const r = await sqs.send(
      new sqsModule.GetQueueAttributesCommand({
        QueueUrl: url,
        AttributeNames: [
          "ApproximateNumberOfMessages",
          "ApproximateNumberOfMessagesNotVisible",
          "ApproximateNumberOfMessagesDelayed",
        ],
      })
    );
    assert.ok(
      Object.values(r.Attributes).every((x) => x === "0"),
      "Queue not empty"
    );
  }
}
function triggersDisabled() {
  assert.equal(
    aws(["events", "describe-rule", "--name", `${prefix}-schedule`]).State,
    "DISABLED"
  );
  const mappings = aws([
    "lambda",
    "list-event-source-mappings",
    "--function-name",
    `${prefix}-worker`,
  ]).EventSourceMappings;
  assert.equal(mappings.length, 1);
  assert.equal(mappings[0].State, "Disabled");
}
async function setFixture(kind, id) {
  touched.add(kind); // Also clean up after an uncertain configuration response.
  const c = await config(kind);
  assert.equal(
    c.Environment.Variables.PATHLENS_NOTIFICATION_SMOKE_TEST,
    "true"
  );
  const current = { ...c.Environment.Variables };
  delete current.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID;
  assert.equal(
    fingerprint(current),
    fingerprint(original[kind].Environment.Variables),
    "Unexpected environment drift"
  );
  const v = { ...current };
  if (id) v.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = id;
  await lambda("PUT", configPath(kind), {
    RevisionId: c.RevisionId,
    Environment: { Variables: v },
  });
  aws([
    "lambda",
    "wait",
    "function-updated",
    "--function-name",
    `${prefix}-${kind}`,
  ]);
  const updated = await config(kind);
  assert.equal(updated.State, "Active");
  assert.equal(updated.LastUpdateStatus, "Successful");
  assert.equal(fingerprint(updated.Environment.Variables), fingerprint(v));
}
async function owned(id) {
  const r = await pool.query(
    "SELECT * FROM integration_notification_deliveries WHERE id=$1 AND project_integration_id=$2 AND project_id=$3 AND workspace_id=$4",
    [id, fixture.integrationId, fixture.projectId, fixture.workspaceId]
  );
  assert.equal(r.rowCount, 1, "Unexpected delivery ownership");
  return r.rows[0];
}
async function receive(expectedIds) {
  // Exactly one receive per call; save the complete result before interpretation.
  const r = await sqs.send(
    new sqsModule.ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 180,
      MessageSystemAttributeNames: ["ApproximateReceiveCount", "SentTimestamp"],
    })
  );
  const messages = r.Messages ?? [];
  for (const m of messages) receipts.set(m.MessageId, m);
  assert.equal(
    messages.length,
    expectedIds.length,
    "Unexpected message count; do not receive repeatedly"
  );
  for (const m of messages) {
    const body = JSON.parse(m.Body);
    assert.ok(
      expectedIds.includes(body.deliveryId),
      "Unexpected queue message"
    );
    await owned(body.deliveryId);
  }
  return messages;
}
function event(messages) {
  return {
    Records: messages.map((m) => ({
      messageId: m.MessageId,
      receiptHandle: m.ReceiptHandle,
      body: m.Body,
      attributes: m.Attributes ?? {},
      messageAttributes: m.MessageAttributes ?? {},
      md5OfBody: m.MD5OfBody,
      eventSource: "aws:sqs",
      eventSourceARN: `arn:aws:sqs:${region}:${account}:${prefix}-queue`,
      awsRegion: region,
    })),
  };
}
async function acknowledge(messages) {
  for (const m of messages) {
    const row = await owned(JSON.parse(m.Body).deliveryId);
    assert.equal(
      row.status,
      "succeeded",
      "Never delete an unsuccessful message"
    );
    await sqs.send(
      new sqsModule.DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: m.ReceiptHandle,
      })
    );
    receipts.delete(m.MessageId);
  }
}
async function main() {
  assert.equal(aws(["sts", "get-caller-identity"]).Account, account);
  original = {};
  for (const kind of ["dispatcher", "worker"]) {
    const c = await config(kind);
    original[kind] = c;
    assert.equal(c.State, "Active");
    assert.equal(c.LastUpdateStatus, "Successful");
    assert.equal(
      c.Environment.Variables.PATHLENS_NOTIFICATION_SMOKE_TEST,
      "true"
    );
    assert.ok(
      !Object.hasOwn(
        c.Environment.Variables,
        "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID"
      )
    );
    const f = aws([
      "lambda",
      "get-function",
      "--function-name",
      `${prefix}-${kind}`,
    ]);
    assert.equal(
      f.Code.ResolvedImageUri,
      `${account}.dkr.ecr.${region}.amazonaws.com/pathlens/api@${digest}`
    );
  }
  triggersDisabled();
  await queuesEmpty();
  const w = original.worker.Environment.Variables,
    d = original.dispatcher.Environment.Variables;
  const url = new URL(w.DATABASE_URL),
    dispatcherUrl = new URL(d.DATABASE_URL);
  assert.equal(url.hostname, dispatcherUrl.hostname);
  assert.equal(url.username, dispatcherUrl.username);
  assert.ok(url.hostname.endsWith(".pooler.supabase.com"));
  assert.equal(url.port, "5432");
  assert.equal(w.DATABASE_SSL_REQUIRED, "true");
  assert.equal(d.DATABASE_SSL_REQUIRED, "true");
  assert.equal(w.DATABASE_SSL_CA, "/var/task/certs/supabase-ca.crt");
  assert.equal(d.NOTIFICATION_QUEUE_URL, queueUrl);
  for (const p of ["sslmode", "sslrootcert", "sslcert", "sslkey", "options"])
    url.searchParams.delete(p);
  pool = new Pool({
    connectionString: url.toString(),
    ssl: {
      ca: fs.readFileSync("certs/supabase-ca.crt", "utf8"),
      rejectUnauthorized: true,
    },
    max: 4,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  });
  await pool.query("SELECT 1");
  if (process.argv[2] === "--preflight") {
    console.log(
      JSON.stringify({
        signedInMemoryLambdaAccess: true,
        preflightPassed: true,
        noWrites: true,
      })
    );
    return;
  }
  assert.equal(
    process.argv[2],
    "--execute",
    "Explicit execution flag required"
  );
  baseline = await snapshot();
  const targetMinute = Math.floor(Date.now() / 60000) + 2;
  let integrationId;
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = crypto.randomUUID();
    const b = await pool.query(
      "SELECT MOD(ABS(HASHTEXT($1::text)),8) AS bucket",
      [candidate]
    );
    if (Number(b.rows[0].bucket) === targetMinute % 8) {
      integrationId = candidate;
      break;
    }
  }
  assert.ok(integrationId, "No fixture hash bucket selected");
  const label = `phase7i-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  fixture = {
    label,
    userId: crypto.randomUUID(),
    workspaceId: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    integrationId,
    targetMinute,
  };
  const manifest = path.join(
    process.env.LOCALAPPDATA,
    "Temp",
    "opencode",
    `${label}.json`
  );
  fs.writeFileSync(manifest, JSON.stringify({ fixture, baseline }, null, 2), {
    mode: 0o600,
    flag: "wx",
  });
  report.fixture = fixture;
  report.baselineCounts = Object.fromEntries(
    Object.entries(baseline).map(([k, v]) => [k, v.count])
  );
  stage = "fixture_creation";
  process.env.DATABASE_URL = url.toString();
  process.env.DATABASE_SSL_REQUIRED = "true";
  process.env.DATABASE_SSL_CA = path.resolve("certs/supabase-ca.crt");
  process.env.INTEGRATION_ENCRYPTION_KEY = w.INTEGRATION_ENCRYPTION_KEY;
  process.env.FRONTEND_URL = w.FRONTEND_URL;
  process.env.NOTIFICATION_GRACE_PERIOD_MS = d.NOTIFICATION_GRACE_PERIOD_MS;
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "true";
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = integrationId;
  process.env.PATHLENS_NOTIFICATION_MOCK_SLACK = "true";
  const {
    encryptIntegrationCredentials,
  } = require("../../dist/lib/credential-encryption");
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ WRITE");
    const catalog = await client.query(
      "SELECT id FROM integrations WHERE slug='slack'"
    );
    assert.equal(catalog.rowCount, 1);
    await client.query("INSERT INTO users(id,name,email) VALUES($1,$2,$3)", [
      fixture.userId,
      `${label} test user`,
      `${label}@pathlens.test`,
    ]);
    await client.query(
      "INSERT INTO workspaces(id,user_id,name,is_default,usage_status) VALUES($1,$2,$3,false,'active')",
      [fixture.workspaceId, fixture.userId, `${label} test workspace`]
    );
    await client.query(
      "INSERT INTO projects(id,workspace_id,name) VALUES($1,$2,$3)",
      [fixture.projectId, fixture.workspaceId, `${label} test project`]
    );
    const settings = {
      channelId: `${label}-mock-channel`,
      dailyHour: 0,
      weeklyDay: new Date(targetMinute * 60000).getUTCDay() || 7,
      weeklyHour: 0,
      timezone: "UTC",
      weeklyDayConfirmed: true,
    };
    fixture.settings = settings;
    await client.query(
      `INSERT INTO project_integrations(id,project_id,integration_id,provider_workspace_id,provider_workspace_name,encrypted_credentials,credential_key_version,granted_scopes,settings,notification_preferences,status,connected_by_user_id)
      VALUES($1,$2,$3,$4,$5,$6,1,ARRAY[]::text[],$7::jsonb,$8::jsonb,'connected',$9)`,
      [
        integrationId,
        fixture.projectId,
        catalog.rows[0].id,
        `${label}-provider`,
        `${label} mock Slack`,
        encryptIntegrationCredentials({
          accessToken: `${label}-synthetic-token`,
        }),
        JSON.stringify(settings),
        JSON.stringify({ dailyEnabled: true, weeklyEnabled: true }),
        fixture.userId,
      ]
    );
    // Track even an ambiguous commit for exact-ID cleanup.
    created = true;
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
  fs.writeFileSync(manifest, JSON.stringify({ fixture, baseline }, null, 2), {
    mode: 0o600,
  });
  console.log(JSON.stringify({ stage: "fixture_created", fixture }));
  stage = "lambda_configuration";
  await setFixture("dispatcher", integrationId);
  await setFixture("worker", integrationId);
  stage = "dispatcher";
  const scheduledAt = targetMinute * 60000 + 10000;
  assert.ok(
    Date.now() < scheduledAt,
    "Missed selected schedule minute; do not invoke"
  );
  await wait(scheduledAt - Date.now());
  triggersDisabled();
  assert.equal(Math.floor(Date.now() / 60000) % 8, targetMinute % 8);
  await invoke("dispatcher", {});
  const rows = (
    await pool.query(
      "SELECT * FROM integration_notification_deliveries WHERE project_integration_id=$1 ORDER BY report_type",
      [integrationId]
    )
  ).rows;
  assert.equal(rows.length, 2, "Expected one daily and one weekly delivery");
  assert.deepEqual(
    rows.map((r) => r.report_type),
    ["daily", "weekly"]
  );
  for (const row of rows) {
    assert.equal(row.status, "queued");
    await owned(row.id);
  }
  const {
    getNotificationCandidates,
  } = require("../../dist/notifications/scheduling");
  const settings = {
    ...fixture.settings,
    dailyEnabled: true,
    weeklyEnabled: true,
  };
  const candidates = getNotificationCandidates(settings, new Date(scheduledAt));
  for (const row of rows) {
    const expected = candidates
      .filter((c) => c.reportType === row.report_type)
      .at(-1);
    assert.equal(
      new Date(row.reporting_period_start).toISOString(),
      expected.period.start.toISOString()
    );
    assert.equal(
      new Date(row.reporting_period_end).toISOString(),
      expected.period.end.toISOString()
    );
  }
  report.dispatcher = {
    invokedOnce: true,
    deliveries: rows.map((r) => ({
      id: r.id,
      type: r.report_type,
      start: r.reporting_period_start,
      end: r.reporting_period_end,
    })),
  };
  const messages = await receive(rows.map((r) => r.id));
  report.initialPublished = messages.length;
  stage = "deployed_worker";
  const response = await invoke("worker", event(messages));
  assert.deepEqual(response.batchItemFailures, []);
  for (const row of rows) {
    const current = await owned(row.id);
    assert.equal(current.status, "succeeded");
    assert.ok(current.provider_message_id.includes(":smoke-"));
  }
  await acknowledge(messages);
  report.deployedWorker = { success: true, mockedProviderIds: true };
  stage = "summary_and_formatter";
  const appDb = require("../../dist/db/client");
  appPool = appDb.pool;
  const {
    getAnalyticsSummaryModel,
  } = require("../../dist/models/analytics-summary.model");
  const {
    formatSlackAnalyticsReport,
  } = require("../../dist/notifications/slack-report-formatter");
  for (const row of rows) {
    const expected = candidates
      .filter((c) => c.reportType === row.report_type)
      .at(-1);
    const summary = await getAnalyticsSummaryModel({
      workspaceId: fixture.workspaceId,
      projectId: fixture.projectId,
      reportType: row.report_type,
      timezone: "UTC",
      period: expected.period,
    });
    const formatted = formatSlackAnalyticsReport({
      report: summary,
      workspaceId: fixture.workspaceId,
      projectName: `${label} test project`,
      applicationUrl: w.FRONTEND_URL,
    });
    assert.ok(formatted.blocks.length > 0);
  }
  report.summaryAndBlockKit = {
    locallyReconstructed: true,
    deployedSuccessRequiresFormatter: true,
    payloadCaptureUnavailable: true,
  };
  stage = "failure_and_retry";
  const delivery = require("../../dist/notifications/notification-delivery");
  const worker = require("../../dist/notifications/notification-worker");
  const slack = require("../../dist/lib/slack-api");
  const oldDaily = candidates.find((c) => c.reportType === "daily");
  const retryId = await delivery.createNotificationDelivery({
    workspaceId: fixture.workspaceId,
    projectId: fixture.projectId,
    projectIntegrationId: integrationId,
    channelId: settings.channelId,
    candidate: oldDaily,
  });
  assert.ok(retryId, "Expected distinct historical daily period");
  const claims = await Promise.all([
    delivery.claimNotificationDelivery(retryId),
    delivery.claimNotificationDelivery(retryId),
  ]);
  assert.equal(claims.filter(Boolean).length, 1);
  const lease = claims.find(Boolean);
  assert.equal(
    await delivery.updateNotificationSuccess(
      retryId,
      crypto.randomUUID(),
      "mock-stale"
    ),
    false
  );
  await pool.query(
    "UPDATE integration_notification_deliveries SET locked_until=NOW()-INTERVAL '1 second' WHERE id=$1 AND project_integration_id=$2 AND lock_token=$3",
    [retryId, integrationId, lease.lockToken]
  );
  await sqs.send(
    new sqsModule.SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ deliveryId: retryId }),
    })
  );
  const first = await receive([retryId]);
  let mockedFailures = 0;
  slack.setSlackMessageTransportForTests(async () => {
    mockedFailures++;
    throw new slack.SlackApiError("ratelimited", 1, 429);
  });
  const failed = await worker.handler(event(first));
  assert.equal(failed.batchItemFailures.length, 1);
  assert.equal(mockedFailures, 1);
  assert.equal((await owned(retryId)).status, "retryable_failed");
  await pool.query(
    "UPDATE integration_notification_deliveries SET next_attempt_at=NOW()-INTERVAL '1 second' WHERE id=$1 AND project_integration_id=$2 AND status='retryable_failed'",
    [retryId, integrationId]
  );
  await sqs.send(
    new sqsModule.ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: first[0].ReceiptHandle,
      VisibilityTimeout: 0,
    })
  );
  const redelivered = await receive([retryId]);
  assert.equal(redelivered[0].MessageId, first[0].MessageId);
  assert.ok(Number(redelivered[0].Attributes.ApproximateReceiveCount) >= 2);
  const retryResponse = await invoke("worker", event(redelivered));
  assert.deepEqual(retryResponse.batchItemFailures, []);
  const succeeded = await owned(retryId);
  assert.equal(succeeded.status, "succeeded");
  assert.ok(succeeded.provider_message_id.includes(":smoke-"));
  assert.equal(
    await delivery.updateNotificationSuccess(
      retryId,
      lease.lockToken,
      "mock-stale"
    ),
    false
  );
  await acknowledge(redelivered);
  assert.equal(
    await delivery.createNotificationDelivery({
      workspaceId: fixture.workspaceId,
      projectId: fixture.projectId,
      projectIntegrationId: integrationId,
      channelId: settings.channelId,
      candidate: oldDaily,
    }),
    null
  );
  await sqs.send(
    new sqsModule.SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ deliveryId: retryId }),
    })
  );
  const duplicate = await receive([retryId]);
  assert.deepEqual(
    (await invoke("worker", event(duplicate))).batchItemFailures,
    []
  );
  assert.equal((await owned(retryId)).attempts, succeeded.attempts);
  await acknowledge(duplicate);
  const oldWeekly = candidates.find((c) => c.reportType === "weekly");
  const permanentId = await delivery.createNotificationDelivery({
    workspaceId: fixture.workspaceId,
    projectId: fixture.projectId,
    projectIntegrationId: integrationId,
    channelId: settings.channelId,
    candidate: oldWeekly,
  });
  assert.ok(permanentId);
  slack.setSlackMessageTransportForTests(async () => {
    throw new slack.SlackApiError("channel_not_found", undefined, 200);
  });
  await worker.processNotificationDelivery(permanentId);
  assert.equal((await owned(permanentId)).status, "permanent_failed");
  report.retry = {
    localInjectedRateLimit: true,
    deployedRedeliverySucceeded: true,
    duplicateIgnored: true,
    concurrentClaimsOneWinner: true,
    staleLeaseRejected: true,
    localPermanentFailure: true,
  };
  stage = "completed";
}
async function cleanup() {
  const errors = [];
  for (const kind of touched) {
    try {
      await setFixture(kind, null);
    } catch {
      errors.push(`configuration_${kind}`);
    }
  }
  if (created && fixture && pool) {
    // Never delete queue messages without success. A failed test leaves them for operator recovery.
    try {
      assert.equal(
        receipts.size,
        0,
        "Unacknowledged test messages remain; retain fixture rows"
      );
      await queuesEmpty();
      const c = await pool.connect();
      try {
        await c.query("BEGIN READ WRITE");
        await c.query(
          "DELETE FROM integration_notification_deliveries WHERE project_integration_id=$1 AND project_id=$2 AND workspace_id=$3",
          [fixture.integrationId, fixture.projectId, fixture.workspaceId]
        );
        await c.query(
          "DELETE FROM project_integrations WHERE id=$1 AND project_id=$2",
          [fixture.integrationId, fixture.projectId]
        );
        await c.query("DELETE FROM projects WHERE id=$1 AND workspace_id=$2", [
          fixture.projectId,
          fixture.workspaceId,
        ]);
        await c.query("DELETE FROM workspaces WHERE id=$1 AND user_id=$2", [
          fixture.workspaceId,
          fixture.userId,
        ]);
        await c.query("DELETE FROM users WHERE id=$1 AND email=$2", [
          fixture.userId,
          `${fixture.label}@pathlens.test`,
        ]);
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
      assert.deepEqual(
        await snapshot(),
        baseline,
        "Nonfixture baseline changed"
      );
      report.cleanup = {
        fixtureRowsRemoved: true,
        baselineCountsAndFingerprintsRestored: true,
      };
    } catch {
      errors.push("database_or_queue_cleanup");
    }
  }
  try {
    triggersDisabled();
    await queuesEmpty();
  } catch {
    errors.push("trigger_or_queue_verification");
  }
  if (original) {
    for (const kind of ["dispatcher", "worker"]) {
      try {
        const c = await config(kind);
        assert.equal(
          fingerprint(c.Environment.Variables),
          fingerprint(original[kind].Environment.Variables)
        );
        assert.equal(c.State, "Active");
        assert.equal(c.LastUpdateStatus, "Successful");
      } catch {
        errors.push(`environment_verification_${kind}`);
      }
    }
  }
  report.cleanupErrors = errors;
  report.alarms = aws([
    "cloudwatch",
    "describe-alarms",
    "--alarm-name-prefix",
    prefix,
  ]).MetricAlarms.map((a) => ({ name: a.AlarmName, state: a.StateValue }));
  report.logs = [];
  for (const kind of ["dispatcher", "worker"]) {
    const events =
      aws([
        "logs",
        "filter-log-events",
        "--log-group-name",
        `/aws/lambda/${prefix}-${kind}`,
        "--start-time",
        String(startedAt),
      ]).events ?? [];
    const messages = events.map((e) => e.message);
    const sensitive = messages.some((m) =>
      /postgres(?:ql)?:\/\/|xox[baprs]-|password=/.test(m)
    );
    report.logs.push({
      function: kind,
      events: events.length,
      sensitiveValuePatternsFound: sensitive,
    });
    if (sensitive) {
      errors.push("log_secret_pattern");
      process.exitCode = 1;
    }
  }
  if (errors.length) process.exitCode = 1;
}
main()
  .catch((e) => {
    report.failedStage = stage;
    report.error = "Stopped safely; no further test invocation";
    report.databaseCode = /^[A-Z0-9]{5}$/.test(e.code ?? "")
      ? e.code
      : undefined;
    report.failureLocation = e.stack
      ?.split("\n")
      .find(
        (line) =>
          line.includes("run-deployed-notification-smoke.cjs") &&
          line.includes("at ")
      )
      ?.trim();
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      if (process.argv[2] === "--execute") await cleanup();
    } catch {
      report.cleanupErrors = ["cleanup_aborted"];
      process.exitCode = 1;
    }
    if (appPool) await appPool.end().catch(() => {});
    if (pool) await pool.end().catch(() => {});
    sqs.destroy();
    if (process.argv[2] === "--execute")
      console.log(JSON.stringify(report, null, 2));
  });
