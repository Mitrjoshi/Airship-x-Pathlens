import { sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  WORKSPACE_USAGE_LIMITS,
  WorkspaceUsageLimitError,
  type WorkspaceUsageMetric,
} from "../lib/usage-limits";

const GRACE_PERIOD_MS = 14 * 24 * 60 * 60 * 1000;

interface WorkspaceUsageRow extends Record<string, unknown> {
  page_views: number | string | null;
  event_count: number | string | null;
  recordings: number | string | null;
  storage_bytes: number | string | null;
  projects: number | string | null;
  members: number | string | null;
  funnels: number | string | null;
  goals: number | string | null;
  workspaces: number | string | null;
  heatmap_pages: number | string | null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export interface WorkspaceUsage {
  period: { start: string; end: string };
  limits: typeof WORKSPACE_USAGE_LIMITS;
  status: "active" | "warning" | "paused";
  warningAt: string | null;
  pauseAt: string | null;
  pausedAt: string | null;
  accountLifetimeAccess: boolean;
  usage: {
    pageViews: number;
    events: number;
    recordings: number;
    storageBytes: number;
    projects: number;
    members: number;
    funnels: number;
    goals: number;
    workspaces: number;
    heatmapPages: number;
  };
  projectBreakdown: Array<{
    projectId: string;
    pageViews: number;
    events: number;
    recordings: number;
    heatmapPages: number;
    funnels: number;
    goals: number;
  }>;
}

export async function getWorkspaceUsageCounts(workspaceId: string) {
  const result = await db.execute<WorkspaceUsageRow>(sql`
    SELECT
      (SELECT COUNT(*) FROM events WHERE workspace_id = ${workspaceId} AND type = 'page_view')::int AS page_views,
      (SELECT COUNT(*) FROM events WHERE workspace_id = ${workspaceId})::int AS event_count,
      (SELECT COUNT(*) FROM replay_sessions WHERE workspace_id = ${workspaceId})::int AS recordings,
      (SELECT COUNT(DISTINCT COALESCE(NULLIF(path, ''), '/')) FROM events WHERE workspace_id = ${workspaceId} AND type = 'page_view')::int AS heatmap_pages,
      (SELECT COUNT(*) FROM projects WHERE workspace_id = ${workspaceId})::int AS projects,
      (SELECT COUNT(*) FROM funnels WHERE workspace_id = ${workspaceId})::int AS funnels,
      (SELECT COUNT(*) FROM goals WHERE workspace_id = ${workspaceId})::int AS goals
  `);

  const row = result.rows[0];
  return {
    pageViews: toNumber(row?.page_views),
    events: toNumber(row?.event_count),
    recordings: toNumber(row?.recordings),
    heatmapPages: toNumber(row?.heatmap_pages),
    projects: toNumber(row?.projects),
    funnels: toNumber(row?.funnels),
    goals: toNumber(row?.goals),
  };
}

export async function assertWorkspaceUsageLimit(
  workspaceId: string,
  metric: WorkspaceUsageMetric,
  increment = 1,
  allowGracePeriod = true
) {
  const state = await db.execute<{
    usage_status: string;
    usage_warning_at: Date | string | null;
  }>(sql`
    SELECT usage_status, usage_warning_at
    FROM workspaces
    WHERE id = ${workspaceId}
  `);
  const workspace = state.rows[0];

  const warningAt = workspace?.usage_warning_at
    ? new Date(workspace.usage_warning_at)
    : null;
  const graceExpired =
    warningAt && Date.now() >= warningAt.getTime() + GRACE_PERIOD_MS;

  if (workspace?.usage_status === "paused" || graceExpired) {
    await pauseWorkspace(workspaceId);
    throw new WorkspaceUsageLimitError(metric);
  }

  const usage = await getWorkspaceUsageCounts(workspaceId);
  const value = usage[metric];
  const limit = WORKSPACE_USAGE_LIMITS[metric];

  if (value + increment > limit) {
    if (!allowGracePeriod) {
      throw new WorkspaceUsageLimitError(metric);
    }

    await db.execute(sql`
      UPDATE workspaces
      SET usage_status = CASE WHEN usage_status = 'active' THEN 'warning' ELSE usage_status END,
          usage_warning_at = COALESCE(usage_warning_at, NOW())
      WHERE id = ${workspaceId}
    `);
    await createLimitNotification(workspaceId, metric);
  }
}

export async function assertWorkspaceHeatmapPages(
  workspaceId: string,
  paths: string[]
) {
  const newPaths = [...new Set(paths.map((path) => path.trim() || "/"))];
  if (newPaths.length === 0) return;

  const result = await db.execute<{ page_count: number | string | null }>(sql`
    SELECT COUNT(DISTINCT COALESCE(NULLIF(path, ''), '/'))::int AS page_count
    FROM events
    WHERE workspace_id = ${workspaceId} AND type = 'page_view'
  `);
  const current = toNumber(result.rows[0]?.page_count);
  const existing = await db.execute<{ path: string | null }>(sql`
    SELECT DISTINCT COALESCE(NULLIF(path, ''), '/') AS path
    FROM events
    WHERE workspace_id = ${workspaceId} AND type = 'page_view'
      AND COALESCE(NULLIF(path, ''), '/') IN (${sql.join(
        newPaths.map((path) => sql`${path}`),
        sql`, `
      )})
  `);

  const existingPaths = new Set(existing.rows.map((row) => row.path));
  const additional = newPaths.filter((path) => !existingPaths.has(path)).length;
  if (current + additional > WORKSPACE_USAGE_LIMITS.heatmapPages) {
    await db.execute(sql`
      UPDATE workspaces
      SET usage_status = CASE WHEN usage_status = 'active' THEN 'warning' ELSE usage_status END,
          usage_warning_at = COALESCE(usage_warning_at, NOW())
      WHERE id = ${workspaceId}
    `);
    await createLimitNotification(workspaceId, "heatmapPages");
  }
}

async function createLimitNotification(
  workspaceId: string,
  metric: WorkspaceUsageMetric
) {
  await db.execute(sql`
    INSERT INTO notifications (
      recipient_user_id,
      sender_user_id,
      workspace_id,
      type,
      role
    )
    SELECT user_id, user_id, id, ${`usage_limit_exceeded:${metric}`}, 'owner'
    FROM workspaces
    WHERE id = ${workspaceId}
      AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE workspace_id = ${workspaceId}
          AND type = ${`usage_limit_exceeded:${metric}`}
      )
  `);
}

async function pauseWorkspace(workspaceId: string) {
  const result = await db.execute(sql`
    UPDATE workspaces
    SET usage_status = 'paused', usage_paused_at = COALESCE(usage_paused_at, NOW())
    WHERE id = ${workspaceId} AND usage_status <> 'paused'
    RETURNING id
  `);

  if (result.rows.length === 0) return;

  await db.execute(sql`
    INSERT INTO notifications (
      recipient_user_id,
      sender_user_id,
      workspace_id,
      type,
      role
    )
    SELECT user_id, user_id, id, 'workspace_paused', 'owner'
    FROM workspaces
    WHERE id = ${workspaceId}
      AND NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE workspace_id = ${workspaceId}
          AND type = 'workspace_paused'
      )
  `);
}

export async function pauseExpiredWorkspacesModel() {
  const result = await db.execute<{ id: string }>(sql`
    SELECT id
    FROM workspaces
    WHERE usage_status = 'warning'
      AND usage_warning_at <= NOW() - INTERVAL '14 days'
  `);

  await Promise.all(
    result.rows.map((workspace) => pauseWorkspace(workspace.id))
  );
  return result.rows.length;
}

export async function getWorkspaceUsageModel(
  workspaceId: string,
  userId: string,
  projectId?: string
): Promise<WorkspaceUsage> {
  const periodStart = new Date(0);
  const periodEnd = new Date();

  const result = await db.execute<WorkspaceUsageRow>(sql`
    SELECT
      (SELECT COUNT(*) FROM events WHERE workspace_id = ${workspaceId} AND type = 'page_view')::int AS page_views,
      (SELECT COUNT(*) FROM events WHERE workspace_id = ${workspaceId})::int AS event_count,
      (SELECT COUNT(*) FROM replay_sessions WHERE workspace_id = ${workspaceId})::int AS recordings,
      (SELECT COUNT(DISTINCT COALESCE(NULLIF(path, ''), '/')) FROM events WHERE workspace_id = ${workspaceId} AND type = 'page_view')::int AS heatmap_pages,
      (SELECT COALESCE(SUM(rc.byte_count), 0) FROM replay_chunks rc
        INNER JOIN replay_sessions rs ON rs.id = rc.session_id
        WHERE rs.workspace_id = ${workspaceId})::bigint AS storage_bytes,
      (SELECT COUNT(*) FROM projects
        WHERE workspace_id = ${workspaceId})::int AS projects,
      (SELECT COUNT(*) FROM workspace_members
        WHERE workspace_id = ${workspaceId})::int AS members,
      (SELECT COUNT(*) FROM funnels
        WHERE workspace_id = ${workspaceId})::int AS funnels,
      (SELECT COUNT(*) FROM goals
        WHERE workspace_id = ${workspaceId})::int AS goals,
      (SELECT COUNT(*) FROM workspace_members WHERE user_id = ${userId})::int AS workspaces
  `);

  const row = result.rows[0];

  const projectFilter = projectId ? sql`AND p.id = ${projectId}` : sql``;
  const breakdownResult = await db.execute<Record<string, unknown>>(sql`
    SELECT p.id AS project_id,
      COUNT(e.id) FILTER (WHERE e.type = 'page_view')::int AS page_views,
      COUNT(e.id)::int AS event_count,
      (SELECT COUNT(*) FROM replay_sessions r WHERE r.project_id = p.id)::int AS recordings,
      COUNT(DISTINCT COALESCE(NULLIF(e.path, ''), '/')) FILTER (WHERE e.type = 'page_view')::int AS heatmap_pages,
      (SELECT COUNT(*) FROM funnels f WHERE f.project_id = p.id)::int AS funnels,
      (SELECT COUNT(*) FROM goals g WHERE g.project_id = p.id)::int AS goals
    FROM projects p LEFT JOIN events e ON e.project_id = p.id
    WHERE p.workspace_id = ${workspaceId} ${projectFilter}
    GROUP BY p.id ORDER BY p.id
  `);
  const workspaceResult = await db.execute<Record<string, unknown>>(sql`
    SELECT
      w.usage_status,
      w.usage_warning_at,
      w.usage_paused_at,
      u.lifetime_access
    FROM workspaces w
    INNER JOIN users u ON u.id = w.user_id
    WHERE w.id = ${workspaceId}
  `);
  const workspace = workspaceResult.rows[0];
  const warningAt = toIsoDate(workspace?.usage_warning_at);
  const pauseAt = warningAt
    ? new Date(new Date(warningAt).getTime() + GRACE_PERIOD_MS).toISOString()
    : null;
  const shouldPause =
    workspace?.usage_status === "warning" &&
    pauseAt !== null &&
    Date.now() >= new Date(pauseAt).getTime();

  if (shouldPause) {
    await pauseWorkspace(workspaceId);
  }

  return {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
    limits: WORKSPACE_USAGE_LIMITS,
    status: shouldPause
      ? "paused"
      : ((workspace?.usage_status as "active" | "warning" | "paused") ??
        "active"),
    warningAt,
    pauseAt,
    pausedAt: shouldPause
      ? new Date().toISOString()
      : toIsoDate(workspace?.usage_paused_at),
    accountLifetimeAccess: workspace?.lifetime_access === true,
    usage: {
      pageViews: toNumber(row?.page_views),
      events: toNumber(row?.event_count),
      recordings: toNumber(row?.recordings),
      storageBytes: toNumber(row?.storage_bytes),
      projects: toNumber(row?.projects),
      members: toNumber(row?.members),
      funnels: toNumber(row?.funnels),
      goals: toNumber(row?.goals),
      workspaces: toNumber(row?.workspaces),
      heatmapPages: toNumber(row?.heatmap_pages),
    },
    projectBreakdown: breakdownResult.rows.map((breakdown) => ({
      projectId: String(breakdown.project_id),
      pageViews: toNumber(breakdown.page_views),
      events: toNumber(breakdown.event_count),
      recordings: toNumber(breakdown.recordings),
      heatmapPages: toNumber(breakdown.heatmap_pages),
      funnels: toNumber(breakdown.funnels),
      goals: toNumber(breakdown.goals),
    })),
  };
}
