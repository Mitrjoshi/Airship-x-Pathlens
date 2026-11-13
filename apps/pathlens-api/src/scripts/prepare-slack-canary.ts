import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  CANARY_TARGET,
  prepareSlackCanary,
} from "../notifications/slack-canary";

function aws(args: string[]) {
  return JSON.parse(
    execFileSync(
      process.platform === "win32" ? "aws.exe" : "aws",
      [...args, "--region", "ap-south-1", "--output", "json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    )
  );
}

export async function prepareCanary(
  integrationId: string,
  destinationChannel: string,
  now?: Date
) {
  if (integrationId !== CANARY_TARGET.integrationId) {
    throw new Error("Explicit approved integration ID is required.");
  }
  if (aws(["sts", "get-caller-identity"]).Account !== "176246209215") {
    throw new Error("AWS account mismatch.");
  }
  const worker = aws([
    "lambda",
    "get-function-configuration",
    "--function-name",
    "pathlens-notification-staging-worker",
  ]);
  const env = worker.Environment?.Variables;
  const url = new URL(env.DATABASE_URL);
  if (
    !url.hostname.endsWith(".pooler.supabase.com") ||
    url.port !== "5432" ||
    env.DATABASE_SSL_REQUIRED !== "true" ||
    env.PATHLENS_NOTIFICATION_SMOKE_TEST !== "true"
  )
    throw new Error("Staging configuration check failed.");
  // All database connections, including analytics, are read-only.
  url.searchParams.set("options", "-c default_transaction_read_only=on");
  process.env.DATABASE_URL = url.toString();
  process.env.DATABASE_SSL_REQUIRED = "true";
  process.env.DATABASE_SSL_CA = path.resolve("certs/supabase-ca.crt");
  process.env.INTEGRATION_ENCRYPTION_KEY = env.INTEGRATION_ENCRYPTION_KEY;

  const { pool } = await import("../db/client");
  try {
    const result = await pool.query(
      `SELECT pi.*, p.name AS project_name, p.workspace_id, w.usage_status
       FROM project_integrations pi JOIN projects p ON p.id=pi.project_id
       JOIN workspaces w ON w.id=p.workspace_id
       JOIN integrations i ON i.id=pi.integration_id AND i.slug='slack'
       WHERE pi.id=$1 AND pi.project_id=$2 AND p.workspace_id=$3`,
      [integrationId, CANARY_TARGET.projectId, CANARY_TARGET.workspaceId]
    );
    const row = result.rows[0];
    if (!row || row.status !== "connected" || row.usage_status !== "active") {
      throw new Error("Connected integration ownership check failed.");
    }
    const { parseNotificationSettings } =
      await import("../notifications/notification-settings");
    const settings = parseNotificationSettings(
      row.settings,
      row.notification_preferences
    );
    if (!settings?.dailyEnabled)
      throw new Error("Daily reporting unavailable.");
    if (!destinationChannel) {
      console.log(
        JSON.stringify({
          configuredChannel: settings.channelId,
          preparationOnly: true,
        })
      );
      return;
    }
    if (destinationChannel !== settings.channelId)
      throw new Error("Destination mismatch.");
    const { decryptIntegrationCredentials } =
      await import("../lib/credential-encryption");
    const credentials = decryptIntegrationCredentials<{ accessToken?: string }>(
      row.encrypted_credentials
    );
    if (!credentials.accessToken) throw new Error("Credentials unavailable.");
    const { getSlackCanaryIdentity, getSlackChannel } =
      await import("../lib/slack-api");
    const identity = await getSlackCanaryIdentity(credentials.accessToken);
    if (identity.team_id !== row.provider_workspace_id)
      throw new Error("Slack workspace mismatch.");
    const channel = await getSlackChannel(
      credentials.accessToken,
      destinationChannel
    );
    if (
      !channel ||
      channel.id !== destinationChannel ||
      !channel.is_member ||
      channel.is_archived
    ) {
      throw new Error("Bot channel access check failed.");
    }
    const { getAnalyticsSummaryModel } =
      await import("../models/analytics-summary.model");
    const report = await getAnalyticsSummaryModel({
      workspaceId: CANARY_TARGET.workspaceId,
      projectId: CANARY_TARGET.projectId,
      reportType: "daily",
      timezone: settings.timezone,
      now,
    });
    const prepared = prepareSlackCanary({
      integrationId,
      projectId: CANARY_TARGET.projectId,
      workspaceId: CANARY_TARGET.workspaceId,
      configuredChannel: settings.channelId,
      destinationChannel,
      report,
      projectName: row.project_name,
      applicationUrl: env.FRONTEND_URL,
    });
    return {
      preparationOnly: true,
      workspace: identity.team,
      slackWorkspaceId: identity.team_id,
      channel: channel.name,
      project: row.project_name,
      period: report.period,
      ...prepared,
      accessToken: credentials.accessToken,
      actorUserId: row.connected_by_user_id as string,
    };
  } finally {
    await pool.end();
  }
}

if (require.main === module)
  prepareCanary(process.argv[2] ?? "", process.argv[3] ?? "")
    .then((result) => {
      if (result) {
        const { accessToken: _token, actorUserId: _actor, ...preview } = result;
        console.log(JSON.stringify(preview, null, 2));
      }
    })
    .catch(() => {
      // Do not print upstream errors, responses, tokens, or connection strings.
      console.error("Canary preparation failed; no message was sent.");
      process.exitCode = 1;
    });
