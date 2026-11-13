// Authorized staging-only success runner. Never contacts Slack.
const fs = require("node:fs");
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
const sqsClient = new sqs.SQSClient({ region, maxAttempts: 1 });
const aws = (args) =>
  JSON.parse(
    cp.execFileSync(
      "aws.exe",
      [...args, "--region", region, "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
  );
const signer = new SignatureV4({
  service: "lambda",
  region,
  credentials: sqsClient.config.credentials,
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
const configPath = (kind) =>
  `/2015-03-31/functions/${prefix}-${kind}/configuration`;
const lambda = async (method, resource, data) => {
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
      req.destroy(new Error("Lambda outcome uncertain; no retry"))
    );
    req.on("error", () =>
      reject(new Error("Lambda connection failure; no retry"))
    );
    if (body) req.write(body);
    req.end();
  });
};
const config = (kind) => lambda("GET", configPath(kind));
const invoke = (kind, body) =>
  lambda("POST", `/2015-03-31/functions/${prefix}-${kind}/invocations`, body);
const fingerprint = (value) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(Object.entries(value).sort()))
    .digest("hex");
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
let original;
let baseline;
let touched = new Set();
let message;
let startedAt = Date.now();

async function snapshot() {
  const result = {};
  for (const table of tables)
    result[table] = (
      await pool.query(
        `SELECT count(*)::int AS count, md5(COALESCE(string_agg(md5(row_to_json(t)::text),'' ORDER BY id),'')) AS fingerprint FROM ${table} t`
      )
    ).rows[0];
  return result;
}
async function queuesEmpty() {
  for (const QueueUrl of [queueUrl, dlqUrl]) {
    const r = await sqsClient.send(
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
      Object.values(r.Attributes ?? {}).every((value) => value === "0"),
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
async function setFixture(kind, integrationId) {
  touched.add(kind);
  const current = await config(kind);
  const variables = { ...current.Environment.Variables };
  delete variables.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID;
  delete variables.PATHLENS_NOTIFICATION_MOCK_OUTCOME;
  assert.equal(
    fingerprint(variables),
    fingerprint(original[kind].Environment.Variables),
    `${kind} environment drift`
  );
  if (integrationId)
    variables.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID = integrationId;
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
async function receive(deliveryId) {
  const r = await sqsClient.send(
    new sqs.ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
      VisibilityTimeout: 180,
      MessageSystemAttributeNames: ["ApproximateReceiveCount"],
    })
  );
  assert.equal((r.Messages ?? []).length, 1, "Expected one SQS message");
  message = r.Messages[0];
  assert.equal(JSON.parse(message.Body).deliveryId, deliveryId);
  return message;
}
function eventFor(m) {
  return {
    Records: [
      {
        messageId: m.MessageId,
        receiptHandle: m.ReceiptHandle,
        body: m.Body,
        attributes: m.Attributes ?? {},
        messageAttributes: m.MessageAttributes ?? {},
        md5OfBody: m.MD5OfBody,
        eventSource: "aws:sqs",
        eventSourceARN: `arn:aws:sqs:${region}:${account}:${prefix}-queue`,
        awsRegion: region,
      },
    ],
  };
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
  if (message) {
    try {
      await sqsClient.send(
        new sqs.DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        })
      );
      message = null;
    } catch {
      errors.push("message_delete");
    }
  }
  if (fixture && pool) {
    try {
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
      await pool.query("DELETE FROM users WHERE id=$1", [fixture.userId]);
      assert.deepEqual(await snapshot(), baseline);
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
    assert.equal(
      aws(["lambda", "get-function", "--function-name", `${prefix}-${kind}`])
        .Code.ResolvedImageUri,
      `${account}.dkr.ecr.${region}.amazonaws.com/pathlens/api@${digest}`
    );
  }
  triggersDisabled();
  await queuesEmpty();
  const workerEnv = original.worker.Environment.Variables;
  const dispatcherEnv = original.dispatcher.Environment.Variables;
  const dbUrl = new URL(workerEnv.DATABASE_URL);
  assert.equal(dbUrl.hostname, new URL(dispatcherEnv.DATABASE_URL).hostname);
  assert.equal(dbUrl.port, "5432");
  assert.equal(workerEnv.DATABASE_SSL_REQUIRED, "true");
  assert.equal(workerEnv.DATABASE_SSL_CA, "/var/task/certs/supabase-ca.crt");
  assert.equal(dispatcherEnv.NOTIFICATION_QUEUE_URL, queueUrl);
  for (const key of ["sslmode", "sslrootcert", "sslcert", "sslkey", "options"])
    dbUrl.searchParams.delete(key);
  pool = new Pool({
    connectionString: dbUrl.toString(),
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
  for (let i = 0; i < 100; i++) {
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
  const label = `phase7r-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  fixture = {
    label,
    userId: crypto.randomUUID(),
    workspaceId: crypto.randomUUID(),
    projectId: crypto.randomUUID(),
    integrationId,
    targetMinute,
  };
  process.env.INTEGRATION_ENCRYPTION_KEY = workerEnv.INTEGRATION_ENCRYPTION_KEY;
  const {
    encryptIntegrationCredentials,
  } = require("../../dist/lib/credential-encryption");
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const catalog = await db.query(
      "SELECT id FROM integrations WHERE slug='slack'"
    );
    assert.equal(catalog.rowCount, 1);
    await db.query("INSERT INTO users(id,name,email) VALUES($1,$2,$3)", [
      fixture.userId,
      `${label} test user`,
      `${label}@pathlens.test`,
    ]);
    await db.query(
      "INSERT INTO workspaces(id,user_id,name,is_default,usage_status) VALUES($1,$2,$3,false,'active')",
      [fixture.workspaceId, fixture.userId, `${label} test workspace`]
    );
    await db.query(
      "INSERT INTO projects(id,workspace_id,name) VALUES($1,$2,$3)",
      [fixture.projectId, fixture.workspaceId, `${label} test project`]
    );
    const settings = {
      channelId: `${label}-mock-channel`,
      dailyHour: 0,
      weeklyDay: 1,
      weeklyHour: 0,
      timezone: "UTC",
      weeklyDayConfirmed: true,
    };
    await db.query(
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
        JSON.stringify(settings),
        JSON.stringify({ dailyEnabled: true, weeklyEnabled: false }),
        fixture.userId,
      ]
    );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
  }
  await setFixture("dispatcher", integrationId);
  await setFixture("worker", integrationId);
  const scheduledAt = targetMinute * 60000 + 10000;
  assert.ok(Date.now() < scheduledAt, "Selected dispatch minute missed");
  await new Promise((resolve) => setTimeout(resolve, scheduledAt - Date.now()));
  await invoke("dispatcher", {});
  const rows = (
    await pool.query(
      "SELECT * FROM integration_notification_deliveries WHERE project_integration_id=$1 AND report_type='daily'",
      [integrationId]
    )
  ).rows;
  assert.equal(
    rows.length,
    1,
    "Expected exactly one dispatcher-created daily delivery"
  );
  const deliveryId = rows[0].id;
  const first = await receive(deliveryId);
  const firstResponse = await invoke("worker", eventFor(first));
  assert.deepEqual(firstResponse.batchItemFailures, []);
  const delivered = (
    await pool.query(
      "SELECT * FROM integration_notification_deliveries WHERE id=$1 AND project_integration_id=$2",
      [deliveryId, integrationId]
    )
  ).rows[0];
  assert.equal(delivered.status, "succeeded");
  assert.equal(delivered.last_error_code, null);
  assert.match(delivered.provider_message_id, /:smoke-/);
  await sqsClient.send(
    new sqs.ChangeMessageVisibilityCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: first.ReceiptHandle,
      VisibilityTimeout: 0,
    })
  );
  const second = await receive(deliveryId);
  const secondResponse = await invoke("worker", eventFor(second));
  assert.deepEqual(secondResponse.batchItemFailures, []);
  const redelivered = (
    await pool.query(
      "SELECT * FROM integration_notification_deliveries WHERE id=$1 AND project_integration_id=$2",
      [deliveryId, integrationId]
    )
  ).rows[0];
  assert.equal(redelivered.status, "succeeded");
  assert.equal(redelivered.attempts, delivered.attempts);
  await sqsClient.send(
    new sqs.DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: second.ReceiptHandle,
    })
  );
  message = null;
  const logs = [];
  for (let poll = 0; poll < 12; poll += 1) {
    logs.length = 0;
    for (const kind of ["worker", "dispatcher"]) {
      const entries =
        aws([
          "logs",
          "filter-log-events",
          "--log-group-name",
          `/aws/lambda/${prefix}-${kind}`,
          "--start-time",
          String(startedAt),
        ]).events ?? [];
      logs.push(...entries.map((entry) => entry.message));
    }
    const matchingNow = logs.filter((line) => line.includes(deliveryId));
    if (
      matchingNow.some((line) =>
        line.includes('"event":"notification_delivered"')
      )
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const matching = logs.filter((line) => line.includes(deliveryId));
  assert.equal(
    matching.filter((line) => line.includes('"event":"notification_delivered"'))
      .length,
    1
  );
  assert.equal(
    matching.filter((line) =>
      line.includes('"event":"notification_provider_outcome_unknown"')
    ).length,
    0
  );
  console.log(
    JSON.stringify({
      label,
      userId: fixture.userId,
      workspaceId: fixture.workspaceId,
      projectId: fixture.projectId,
      integrationId,
      deliveryId,
      dispatcherCreatedDelivery: true,
      providerAttemptCount: 1,
      redeliveryProviderAttemptCount: 0,
      providerMessageIdPersisted: true,
      deliveryStatus: redelivered.status,
    })
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Success smoke failed"
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    const errors = fixture ? await cleanup() : [];
    if (errors.length) {
      console.error(`Cleanup failed: ${errors.join(",")}`);
      process.exitCode = 1;
    }
    if (pool) await pool.end().catch(() => {});
    sqsClient.destroy();
  });
