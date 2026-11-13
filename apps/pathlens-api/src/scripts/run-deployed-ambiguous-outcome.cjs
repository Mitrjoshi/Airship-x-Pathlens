// Explicitly authorized staging-only runner. It never contacts Slack.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const https = require("node:https");
const cp = require("node:child_process");
const assert = require("node:assert/strict");
const { Pool } = require("pg");
const sqs = require("@aws-sdk/client-sqs");
const { SignatureV4 } = require(
  require.resolve("@smithy/signature-v4", {
    paths: [require.resolve("@aws-sdk/client-sqs")],
  })
);

const region = "ap-south-1";
const account = "176246209215";
const prefix = "pathlens-notification-staging";
const digest =
  "sha256:89975975eb3b2891df8d2115111d515c9ab46af575cba1ea08c474b5be77d260";
const queueUrl = `https://sqs.${region}.amazonaws.com/${account}/${prefix}-queue`;
const dlqUrl = `https://sqs.${region}.amazonaws.com/${account}/${prefix}-dlq`;
const client = new sqs.SQSClient({ region, maxAttempts: 1 });
const signer = new SignatureV4({
  service: "lambda",
  region,
  credentials: client.config.credentials,
  sha256: class Sha256 {
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
  },
});
const aws = (args) =>
  JSON.parse(
    cp.execFileSync(
      "aws.exe",
      [...args, "--region", region, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
  );
const configPath = (kind) =>
  `/2015-03-31/functions/${prefix}-${kind}/configuration`;
const lambda = async (method, resource, body) => {
  const hostname = `lambda.${region}.amazonaws.com`;
  const encoded = body === undefined ? undefined : JSON.stringify(body);
  const signed = await signer.sign({
    method,
    hostname,
    protocol: "https:",
    path: resource,
    headers: {
      host: hostname,
      ...(encoded ? { "content-type": "application/json" } : {}),
    },
    body: encoded,
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
      req.destroy(new Error("Lambda outcome uncertain; no retry"))
    );
    req.on("error", () =>
      reject(new Error("Lambda connection failure; no retry"))
    );
    if (encoded) req.write(encoded);
    req.end();
  });
};
const invoke = (kind, body) =>
  lambda("POST", `/2015-03-31/functions/${prefix}-${kind}/invocations`, body);
const config = (kind) => lambda("GET", configPath(kind));
const fingerprint = (value) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(Object.entries(value).sort()))
    .digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const tables = [
  "users",
  "workspaces",
  "projects",
  "project_integrations",
  "integration_notification_deliveries",
  "notifications",
];
let pool;
let fixture;
let baseline;
let original;
let touched = new Set();
let receipts = new Map();
let startedAt = Date.now();

async function snapshot() {
  const result = {};
  for (const table of tables) {
    const row = (
      await pool.query(
        `SELECT count(*)::int AS count, md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY id),'')) AS fingerprint FROM ${table} t`
      )
    ).rows[0];
    result[table] = row;
  }
  return result;
}
async function queuesEmpty() {
  for (const QueueUrl of [queueUrl, dlqUrl]) {
    const result = await client.send(
      new sqs.GetQueueAttributesCommand({
        QueueUrl,
        AttributeNames: [
          "ApproximateNumberOfMessages",
          "ApproximateNumberOfMessagesNotVisible",
          "ApproximateNumberOfMessagesDelayed",
        ],
      })
    );
    assert.ok(
      Object.values(result.Attributes ?? {}).every((value) => value === "0"),
      "Queue is not empty"
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
async function setFixture(kind, integrationId, outcome) {
  touched.add(kind);
  const current = await config(kind);
  assert.equal(
    current.Environment.Variables.PATHLENS_NOTIFICATION_SMOKE_TEST,
    "true"
  );
  const originalVariables = original[kind].Environment.Variables;
  const variables = { ...current.Environment.Variables };
  delete variables.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID;
  delete variables.PATHLENS_NOTIFICATION_MOCK_OUTCOME;
  assert.equal(
    fingerprint(variables),
    fingerprint(originalVariables),
    `${kind} environment drift before fixture update`
  );
  if (integrationId)
    variables.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = integrationId;
  if (outcome) variables.PATHLENS_NOTIFICATION_MOCK_OUTCOME = outcome;
  await lambda("PUT", configPath(kind), {
    RevisionId: current.RevisionId,
    Environment: { Variables: variables },
  });
  cp.execFileSync(
    "aws.exe",
    [
      "lambda",
      "wait",
      "function-updated",
      "--function-name",
      `${prefix}-${kind}`,
      "--region",
      region,
    ],
    { stdio: "ignore" }
  );
  const updated = await config(kind);
  assert.equal(updated.State, "Active");
  assert.equal(updated.LastUpdateStatus, "Successful");
  assert.equal(
    fingerprint(updated.Environment.Variables),
    fingerprint(variables)
  );
}
async function owned(id) {
  const row = (
    await pool.query(
      "SELECT * FROM integration_notification_deliveries WHERE id=$1 AND project_integration_id=$2 AND project_id=$3 AND workspace_id=$4",
      [id, fixture.integrationId, fixture.projectId, fixture.workspaceId]
    )
  ).rows;
  assert.equal(row.length, 1, "Delivery ownership mismatch");
  return row[0];
}
function sqsEvent(message) {
  return {
    Records: [
      {
        messageId: message.MessageId,
        receiptHandle: message.ReceiptHandle,
        body: message.Body,
        attributes: message.Attributes ?? {},
        messageAttributes: message.MessageAttributes ?? {},
        md5OfBody: message.MD5OfBody,
        eventSource: "aws:sqs",
        eventSourceARN: `arn:aws:sqs:${region}:${account}:${prefix}-queue`,
        awsRegion: region,
      },
    ],
  };
}
async function receive(expectedId) {
  const response = await client.send(
    new sqs.ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 180,
      MessageSystemAttributeNames: ["ApproximateReceiveCount", "SentTimestamp"],
    })
  );
  const messages = response.Messages ?? [];
  assert.equal(messages.length, 1, "Expected exactly one SQS message");
  const body = JSON.parse(messages[0].Body);
  assert.equal(body.deliveryId, expectedId);
  await owned(expectedId);
  receipts.set(messages[0].MessageId, messages[0]);
  return messages[0];
}
async function makeDelivery(candidate) {
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = fixture.integrationId;
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "true";
  const delivery = require("../../dist/notifications/notification-delivery");
  const id = await delivery.createNotificationDelivery({
    workspaceId: fixture.workspaceId,
    projectId: fixture.projectId,
    projectIntegrationId: fixture.integrationId,
    channelId: fixture.settings.channelId,
    candidate,
  });
  assert.ok(id);
  await delivery.markNotificationEnqueued([id]);
  await client.send(
    new sqs.SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ deliveryId: id }),
    })
  );
  return id;
}
async function readLogs(deliveryId) {
  const events = [];
  for (let i = 0; i < 6; i++) {
    for (const kind of ["worker", "dispatcher"]) {
      const result = aws([
        "logs",
        "filter-log-events",
        "--log-group-name",
        `/aws/lambda/${prefix}-${kind}`,
        "--start-time",
        String(startedAt),
      ]);
      events.push(...(result.events ?? []).map((entry) => entry.message));
    }
    if (events.some((line) => line.includes(deliveryId))) break;
    await sleep(2000);
  }
  const matching = events.filter((line) => line.includes(deliveryId));
  return {
    unknownEvents: matching.filter((line) =>
      line.includes('"event":"notification_provider_outcome_unknown"')
    ).length,
    successEvents: matching.filter((line) =>
      line.includes('"event":"notification_delivered"')
    ).length,
    deliveryFailedEvents: matching.filter((line) =>
      line.includes('"event":"notification_delivery_failed"')
    ).length,
    secretPatterns: matching.some((line) =>
      /postgres(?:ql)?:\/\/|xox[baprs]-|password=/.test(line)
    ),
  };
}

async function runAdditionalOutcomes() {
  const delivery = require("../../dist/notifications/notification-delivery");
  const {
    getNotificationCandidates,
  } = require("../../dist/notifications/scheduling");
  const outcomes = [];
  for (const [outcome, daysAgo] of [
    ["connection_reset", 1],
    ["unreadable_response", 2],
  ]) {
    await setFixture("worker", fixture.integrationId, outcome);
    const candidate = getNotificationCandidates(
      { ...fixture.settings, dailyEnabled: true, weeklyEnabled: false },
      new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
    ).find((item) => item.reportType === "daily");
    assert.ok(candidate, `No candidate for ${outcome}`);
    const id = await makeDelivery(candidate);
    const first = await receive(id);
    assert.deepEqual(
      (await invoke("worker", sqsEvent(first))).batchItemFailures,
      []
    );
    const firstRow = await owned(id);
    assert.equal(firstRow.status, "permanent_failed");
    assert.equal(firstRow.last_error_code, "provider_outcome_unknown");
    await client.send(
      new sqs.ChangeMessageVisibilityCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: first.ReceiptHandle,
        VisibilityTimeout: 0,
      })
    );
    const second = await receive(id);
    assert.deepEqual(
      (await invoke("worker", sqsEvent(second))).batchItemFailures,
      []
    );
    const secondRow = await owned(id);
    assert.equal(secondRow.attempts, firstRow.attempts);
    const logs = await readLogs(id);
    assert.equal(logs.unknownEvents, 1);
    await client.send(
      new sqs.DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: second.ReceiptHandle,
      })
    );
    receipts.delete(second.MessageId);
    outcomes.push({
      outcome,
      deliveryId: id,
      firstProviderAttempt: 1,
      redeliveryProviderAttempt: 0,
      unknownLogEvents: logs.unknownEvents,
    });
  }

  await setFixture("worker", fixture.integrationId, null);
  const successCandidate = getNotificationCandidates(
    { ...fixture.settings, dailyEnabled: true, weeklyEnabled: false },
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  ).find((item) => item.reportType === "daily");
  assert.ok(successCandidate);
  const successId = await makeDelivery(successCandidate);
  const successFirst = await receive(successId);
  assert.deepEqual(
    (await invoke("worker", sqsEvent(successFirst))).batchItemFailures,
    []
  );
  const successRow = await owned(successId);
  assert.equal(successRow.status, "succeeded");
  assert.match(successRow.provider_message_id, /:smoke-/);
  await client.send(
    new sqs.ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: successFirst.ReceiptHandle,
      VisibilityTimeout: 0,
    })
  );
  const successSecond = await receive(successId);
  assert.deepEqual(
    (await invoke("worker", sqsEvent(successSecond))).batchItemFailures,
    []
  );
  const successAfterRedelivery = await owned(successId);
  assert.equal(successAfterRedelivery.attempts, successRow.attempts);
  const successLogs = await readLogs(successId);
  assert.equal(successLogs.successEvents, 1);
  await client.send(
    new sqs.DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: successSecond.ReceiptHandle,
    })
  );
  receipts.delete(successSecond.MessageId);
  return {
    outcomes,
    success: {
      deliveryId: successId,
      providerAttempt: 1,
      redeliveryProviderAttempt: 0,
      successLogEvents: successLogs.successEvents,
    },
  };
}
async function cleanup() {
  const errors = [];
  for (const kind of touched) {
    try {
      await setFixture(kind, null, null);
    } catch {
      errors.push(`configuration_${kind}`);
    }
  }
  if (fixture && pool) {
    try {
      assert.equal(receipts.size, 0, "Unacknowledged SQS messages remain");
      await queuesEmpty();
      await pool.query(
        "DELETE FROM integration_notification_deliveries WHERE project_integration_id=$1 AND project_id=$2 AND workspace_id=$3",
        [fixture.integrationId, fixture.projectId, fixture.workspaceId]
      );
      await pool.query(
        "DELETE FROM project_integrations WHERE id=$1 AND project_id=$2",
        [fixture.integrationId, fixture.projectId]
      );
      await pool.query("DELETE FROM projects WHERE id=$1 AND workspace_id=$2", [
        fixture.projectId,
        fixture.workspaceId,
      ]);
      await pool.query("DELETE FROM workspaces WHERE id=$1 AND user_id=$2", [
        fixture.workspaceId,
        fixture.userId,
      ]);
      await pool.query("DELETE FROM users WHERE id=$1 AND email=$2", [
        fixture.userId,
        `${fixture.label}@pathlens.test`,
      ]);
      assert.deepEqual(
        await snapshot(),
        baseline,
        "Baseline database fingerprint mismatch"
      );
    } catch {
      errors.push("database_cleanup");
    }
  }
  try {
    triggersDisabled();
    await queuesEmpty();
  } catch {
    errors.push("trigger_or_queue_verification");
  }
  return errors;
}
async function main() {
  assert.equal(aws(["sts", "get-caller-identity"]).Account, account);
  original = {
    dispatcher: await config("dispatcher"),
    worker: await config("worker"),
  };
  for (const kind of ["dispatcher", "worker"]) {
    assert.equal(original[kind].State, "Active");
    assert.equal(original[kind].LastUpdateStatus, "Successful");
    assert.equal(
      original[kind].Environment.Variables.PATHLENS_NOTIFICATION_SMOKE_TEST,
      "true"
    );
    assert.ok(
      !Object.hasOwn(
        original[kind].Environment.Variables,
        "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID"
      )
    );
    assert.ok(
      !Object.hasOwn(
        original[kind].Environment.Variables,
        "PATHLENS_NOTIFICATION_MOCK_OUTCOME"
      )
    );
    const functionInfo = aws([
      "lambda",
      "get-function",
      "--function-name",
      `${prefix}-${kind}`,
    ]);
    assert.equal(
      functionInfo.Code.ResolvedImageUri,
      `${account}.dkr.ecr.${region}.amazonaws.com/pathlens/api@${digest}`
    );
  }
  triggersDisabled();
  await queuesEmpty();
  const workerEnv = original.worker.Environment.Variables;
  const dispatcherEnv = original.dispatcher.Environment.Variables;
  const databaseUrl = new URL(workerEnv.DATABASE_URL);
  const dispatcherUrl = new URL(dispatcherEnv.DATABASE_URL);
  assert.equal(databaseUrl.hostname, dispatcherUrl.hostname);
  assert.equal(databaseUrl.username, dispatcherUrl.username);
  assert.ok(databaseUrl.hostname.endsWith(".pooler.supabase.com"));
  assert.equal(databaseUrl.port, "5432");
  assert.equal(workerEnv.DATABASE_SSL_REQUIRED, "true");
  assert.equal(workerEnv.DATABASE_SSL_CA, "/var/task/certs/supabase-ca.crt");
  assert.equal(dispatcherEnv.NOTIFICATION_QUEUE_URL, queueUrl);
  for (const parameter of [
    "sslmode",
    "sslrootcert",
    "sslcert",
    "sslkey",
    "options",
  ])
    databaseUrl.searchParams.delete(parameter);
  pool = new Pool({
    connectionString: databaseUrl.toString(),
    ssl: {
      ca: fs.readFileSync("certs/supabase-ca.crt", "utf8"),
      rejectUnauthorized: true,
    },
    max: 4,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  });
  await pool.query("SELECT 1");
  baseline = await snapshot();
  const targetMinute = Math.floor(Date.now() / 60000) + 2;
  let integrationId;
  for (let attempt = 0; attempt < 100; attempt++) {
    const candidate = crypto.randomUUID();
    const bucket = (
      await pool.query("SELECT MOD(ABS(HASHTEXT($1::text)),8) AS bucket", [
        candidate,
      ])
    ).rows[0].bucket;
    if (Number(bucket) === targetMinute % 8) {
      integrationId = candidate;
      break;
    }
  }
  assert.ok(integrationId);
  const label = `phase7o-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  fixture = {
    label,
    userId: crypto.randomUUID(),
    workspaceId: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    integrationId,
    targetMinute,
    settings: {
      channelId: `${label}-mock-channel`,
      dailyHour: 0,
      weeklyDay: 1,
      weeklyHour: 0,
      timezone: "UTC",
      weeklyDayConfirmed: true,
    },
  };
  const {
    encryptIntegrationCredentials,
  } = require("../../dist/lib/credential-encryption");
  process.env.INTEGRATION_ENCRYPTION_KEY = workerEnv.INTEGRATION_ENCRYPTION_KEY;
  const clientDb = await pool.connect();
  try {
    await clientDb.query("BEGIN");
    const catalog = await clientDb.query(
      "SELECT id FROM integrations WHERE slug='slack'"
    );
    assert.equal(catalog.rowCount, 1);
    await clientDb.query("INSERT INTO users(id,name,email) VALUES($1,$2,$3)", [
      fixture.userId,
      `${label} test user`,
      `${label}@pathlens.test`,
    ]);
    await clientDb.query(
      "INSERT INTO workspaces(id,user_id,name,is_default,usage_status) VALUES($1,$2,$3,false,'active')",
      [fixture.workspaceId, fixture.userId, `${label} test workspace`]
    );
    await clientDb.query(
      "INSERT INTO projects(id,workspace_id,name) VALUES($1,$2,$3)",
      [fixture.projectId, fixture.workspaceId, `${label} test project`]
    );
    await clientDb.query(
      `INSERT INTO project_integrations(id,project_id,integration_id,provider_workspace_id,provider_workspace_name,encrypted_credentials,credential_key_version,granted_scopes,settings,notification_preferences,status,connected_by_user_id) VALUES($1,$2,$3,$4,$5,$6,1,ARRAY[]::text[],$7::jsonb,$8::jsonb,'connected',$9)`,
      [
        fixture.integrationId,
        fixture.projectId,
        catalog.rows[0].id,
        `${label}-provider`,
        `${label} mock Slack`,
        encryptIntegrationCredentials({
          accessToken: `${label}-synthetic-token`,
        }),
        JSON.stringify(fixture.settings),
        JSON.stringify({ dailyEnabled: true, weeklyEnabled: false }),
        fixture.userId,
      ]
    );
    await clientDb.query("COMMIT");
  } catch (error) {
    await clientDb.query("ROLLBACK");
    throw error;
  } finally {
    clientDb.release();
  }
  await setFixture("dispatcher", integrationId, null);
  await setFixture("worker", integrationId, "timeout");
  const scheduledAt = targetMinute * 60000 + 10000;
  assert.ok(Date.now() < scheduledAt, "Selected schedule minute was missed");
  await sleep(scheduledAt - Date.now());
  triggersDisabled();
  await invoke("dispatcher", {});
  const daily = (
    await pool.query(
      "SELECT * FROM integration_notification_deliveries WHERE project_integration_id=$1 AND report_type='daily'",
      [integrationId]
    )
  ).rows;
  assert.equal(daily.length, 1);
  const deliveryId = daily[0].id;
  const first = await receive(deliveryId);
  const firstWorker = await invoke("worker", sqsEvent(first));
  assert.deepEqual(firstWorker.batchItemFailures, []);
  const unknown = await owned(deliveryId);
  assert.equal(unknown.status, "permanent_failed");
  assert.equal(unknown.last_error_code, "provider_outcome_unknown");
  const attemptsAfterFirst = unknown.attempts;
  process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = integrationId;
  process.env.PATHLENS_NOTIFICATION_MOCK_OUTCOME = "timeout";
  const delivery = require("../../dist/notifications/notification-delivery");
  assert.equal(await delivery.claimNotificationDelivery(deliveryId), null);
  await client.send(
    new sqs.ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: first.ReceiptHandle,
      VisibilityTimeout: 0,
    })
  );
  const second = await receive(deliveryId);
  const secondWorker = await invoke("worker", sqsEvent(second));
  assert.deepEqual(secondWorker.batchItemFailures, []);
  const afterRedelivery = await owned(deliveryId);
  assert.equal(afterRedelivery.status, "permanent_failed");
  assert.equal(afterRedelivery.last_error_code, "provider_outcome_unknown");
  assert.equal(afterRedelivery.attempts, attemptsAfterFirst);
  const logEvidence = await readLogs(deliveryId);
  assert.equal(logEvidence.unknownEvents, 1);
  assert.equal(logEvidence.secretPatterns, false);
  await client.send(
    new sqs.DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: second.ReceiptHandle,
    })
  );
  receipts.delete(second.MessageId);
  const additional = await runAdditionalOutcomes();
  console.log(
    JSON.stringify({
      label,
      integrationId,
      workspaceId: fixture.workspaceId,
      projectId: fixture.projectId,
      deliveryId,
      ambiguousOutcome: "timeout",
      durableUnknown: true,
      firstProviderAttempt: 1,
      redeliveryProviderAttempt: 0,
      unknownLogEvents: logEvidence.unknownEvents,
      additional,
    })
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Deployed test failed"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    let cleanupErrors = [];
    if (process.argv[2] === "--execute" && fixture)
      cleanupErrors = await cleanup();
    if (cleanupErrors.length) {
      console.error(`Cleanup failed: ${cleanupErrors.join(",")}`);
      process.exitCode = 1;
    }
    if (pool) await pool.end().catch(() => {});
    client.destroy();
  });
