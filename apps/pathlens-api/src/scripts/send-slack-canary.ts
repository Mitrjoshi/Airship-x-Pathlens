import { execFileSync } from "node:child_process";
import { Pool } from "pg";

import { prepareCanary } from "./prepare-slack-canary";
import { CANARY_TARGET } from "../notifications/slack-canary";
import {
  APPROVED_CHANNEL,
  APPROVED_HASH,
  CANARY_OPERATION_ID,
  executeCanary,
} from "../notifications/slack-canary-send";
import { postSlackMessage, readSlackCanaryMessage } from "../lib/slack-api";
import {
  createCanaryStore,
  CanaryPersistenceError,
} from "../notifications/slack-canary-store";

function aws(args: string[]) {
  return JSON.parse(
    execFileSync(
      process.platform === "win32" ? "aws.exe" : "aws",
      [...args, "--region", "ap-south-1", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
  );
}

async function main() {
  if (
    JSON.stringify(process.argv.slice(2)) !==
    JSON.stringify([
      CANARY_TARGET.integrationId,
      CANARY_TARGET.projectId,
      CANARY_TARGET.workspaceId,
      APPROVED_CHANNEL,
      APPROVED_HASH,
    ])
  )
    throw new Error("Exact approved command arguments required.");
  if (process.env.PATHLENS_NOTIFICATION_MOCK_SLACK === "true")
    throw new Error("Mock transport active.");
  const prepared = await prepareCanary(
    CANARY_TARGET.integrationId,
    APPROVED_CHANNEL,
    new Date("2026-11-12T00:00:00.000Z")
  );
  if (!prepared?.actorUserId)
    throw new Error("Preparation or audit actor unavailable.");
  const rule = aws([
    "events",
    "describe-rule",
    "--name",
    "pathlens-notification-staging-schedule",
  ]);
  const mappings = aws([
    "lambda",
    "list-event-source-mappings",
    "--function-name",
    "pathlens-notification-staging-worker",
  ]);
  if (
    rule.State !== "DISABLED" ||
    mappings.EventSourceMappings.length !== 1 ||
    mappings.EventSourceMappings[0].State !== "Disabled"
  )
    throw new Error("Triggers not disabled.");
  for (const kind of ["dispatcher", "worker"]) {
    const c = aws([
      "lambda",
      "get-function-configuration",
      "--function-name",
      `pathlens-notification-staging-${kind}`,
    ]);
    if (
      c.State !== "Active" ||
      c.LastUpdateStatus !== "Successful" ||
      c.Environment?.Variables?.PATHLENS_NOTIFICATION_SMOKE_TEST !== "true"
    )
      throw new Error("Lambda safety check failed.");
  }
  const { getDatabasePoolOptions } = await import("../db/connection-options");
  const options = getDatabasePoolOptions();
  const url = new URL(options.connectionString);
  url.searchParams.set("options", "-c default_transaction_read_only=off");
  const pool = new Pool({
    ...options,
    connectionString: url.toString(),
    max: 1,
    connectionTimeoutMillis: 10000,
    statement_timeout: 15000,
  });
  try {
    const result = await executeCanary(
      {
        ...CANARY_TARGET,
        slackWorkspace: prepared.workspace,
        projectName: prepared.project,
        period: prepared.period,
        message: prepared.message,
        accessToken: prepared.accessToken,
      },
      createCanaryStore(pool, prepared.actorUserId),
      () =>
        postSlackMessage(
          prepared.accessToken,
          APPROVED_CHANNEL,
          prepared.message.text,
          prepared.message.blocks,
          true
        )
    );
    console.log(
      JSON.stringify({
        operationId: CANARY_OPERATION_ID,
        payloadHash: APPROVED_HASH,
        ...result,
      })
    );
    if (result.status === "SUCCEEDED" && result.ts) {
      try {
        const readback = await readSlackCanaryMessage(
          prepared.accessToken,
          APPROVED_CHANNEL,
          result.ts
        );
        const matches =
          readback.messages?.filter(
            (m) => m.ts === result.ts && m.text === prepared.message.text
          ) ?? [];
        console.log(JSON.stringify({ readbackVerified: matches.length === 1 }));
      } catch {
        console.log(
          JSON.stringify({
            readbackVerified: false,
            verificationLimitedToSendResponse: true,
          })
        );
      }
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operationId: CANARY_OPERATION_ID,
      ...(error instanceof CanaryPersistenceError
        ? {
            phase: error.phase,
            databaseCode: error.databaseCode,
          }
        : {}),
      error:
        "Canary stopped. Check durable audit state before interpreting outcome. Never retry.",
    })
  );
  process.exitCode = 1;
});
