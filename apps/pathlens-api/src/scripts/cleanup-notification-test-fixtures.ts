import fs from "node:fs";

import {
  createNotificationTestPool,
  getNotificationTestTarget,
} from "../notifications/notification-test-target";

const manifestPath = process.env.PATHLENS_NOTIFICATION_FIXTURE_FILE;
if (!manifestPath)
  throw new Error("PATHLENS_NOTIFICATION_FIXTURE_FILE is required.");
const fixture = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as {
  label: string;
  email: string;
  userId: string;
  workspaceId: string;
  projectId: string;
  projectIntegrationId: string;
};
if (!/^phase5c3-[a-z0-9-]+$/.test(fixture.label)) {
  throw new Error("Fixture manifest label is invalid.");
}
const target = getNotificationTestTarget();
if ("reason" in target) throw new Error(target.reason);
async function main() {
  const pool = createNotificationTestPool();
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM integration_notification_deliveries
       WHERE project_integration_id = $1 OR project_id = $2 OR workspace_id = $3
          OR channel_id LIKE $4`,
        [
          fixture.projectIntegrationId,
          fixture.projectId,
          fixture.workspaceId,
          `${fixture.label}-%`,
        ]
      );
      await client.query(
        `DELETE FROM project_integrations WHERE id = $1 AND project_id = $2`,
        [fixture.projectIntegrationId, fixture.projectId]
      );
      await client.query(
        `DELETE FROM projects WHERE id = $1 AND workspace_id = $2`,
        [fixture.projectId, fixture.workspaceId]
      );
      await client.query(
        `DELETE FROM workspaces WHERE id = $1 AND user_id = $2`,
        [fixture.workspaceId, fixture.userId]
      );
      await client.query(`DELETE FROM users WHERE id = $1 AND email = $2`, [
        fixture.userId,
        fixture.email,
      ]);
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
  console.log(
    JSON.stringify({
      cleaned: true,
      label: fixture.label,
      projectIntegrationId: fixture.projectIntegrationId,
    })
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Fixture cleanup failed."
  );
  process.exitCode = 1;
});
