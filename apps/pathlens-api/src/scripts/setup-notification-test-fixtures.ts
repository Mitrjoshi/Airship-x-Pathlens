import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { encryptIntegrationCredentials } from "../lib/credential-encryption";
import {
  createNotificationTestPool,
  getNotificationTestTarget,
} from "../notifications/notification-test-target";

const label =
  process.env.PATHLENS_NOTIFICATION_TEST_LABEL?.trim() ||
  `phase5c3-${Date.now()}-${randomUUID().slice(0, 8)}`;
const manifestPath =
  process.env.PATHLENS_NOTIFICATION_FIXTURE_FILE ||
  path.join(os.tmpdir(), `${label}-fixtures.json`);

if (!/^phase5c3-[a-z0-9-]+$/.test(label)) {
  throw new Error(
    "PATHLENS_NOTIFICATION_TEST_LABEL must be a phase5c3-* value."
  );
}

const target = getNotificationTestTarget();
if ("reason" in target) throw new Error(target.reason);
const verifiedTarget = target.target;

const ids = {
  userId: randomUUID(),
  workspaceId: randomUUID(),
  projectId: randomUUID(),
  projectIntegrationId: randomUUID(),
};
const email = `${label}@pathlens.test`;

async function main() {
  const pool = createNotificationTestPool();
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const integration = await client.query<{ id: string }>(
        `SELECT id FROM integrations WHERE slug = 'slack' LIMIT 1`
      );
      if (!integration.rows[0])
        throw new Error("The global Slack integration is missing.");

      await client.query(
        `INSERT INTO users (id, name, email) VALUES ($1, $2, $3)`,
        [ids.userId, `${label} test user`, email]
      );
      await client.query(
        `INSERT INTO workspaces (id, user_id, name, is_default, usage_status)
       VALUES ($1, $2, $3, false, 'active')`,
        [ids.workspaceId, ids.userId, `${label} test workspace`]
      );
      await client.query(
        `INSERT INTO projects (id, workspace_id, name)
       VALUES ($1, $2, $3)`,
        [ids.projectId, ids.workspaceId, `${label} test project`]
      );
      await client.query(
        `INSERT INTO project_integrations
       (id, project_id, integration_id, provider_workspace_id,
        provider_workspace_name, encrypted_credentials, credential_key_version,
        granted_scopes, settings, notification_preferences, status,
        connected_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, 1, ARRAY[]::text[], $7::jsonb, $8::jsonb,
        'connected', $9)`,
        [
          ids.projectIntegrationId,
          ids.projectId,
          integration.rows[0].id,
          `${label}-provider-workspace`,
          `${label} mock Slack`,
          encryptIntegrationCredentials({ accessToken: `${label}-fake-token` }),
          JSON.stringify({
            channelId: `${label}-mock-channel`,
            dailyHour: 0,
            weeklyDay: 1,
            weeklyHour: 0,
            timezone: "UTC",
            weeklyDayConfirmed: true,
          }),
          JSON.stringify({ dailyEnabled: true, weeklyEnabled: true }),
          ids.userId,
        ]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }

  const manifest = {
    label,
    email,
    ...ids,
    sharedStaging: verifiedTarget.sharedStaging,
    projectReference: verifiedTarget.projectReference,
    createdAt: new Date().toISOString(),
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  console.log(JSON.stringify({ ...manifest, manifestPath }, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Fixture setup failed."
  );
  process.exitCode = 1;
});
