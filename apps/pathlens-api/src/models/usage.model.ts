import { sql } from "drizzle-orm";
import { db } from "../db/client";

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
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export interface WorkspaceUsage {
  period: {
    start: string;
    end: string;
  };
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
  };
}

export async function getWorkspaceUsageModel(
  workspaceId: string,
  userId: string
): Promise<WorkspaceUsage> {
  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);

  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const result = await db.execute<WorkspaceUsageRow>(sql`
    SELECT
      (SELECT COUNT(*) FROM events
        WHERE workspace_id = ${workspaceId}
          AND type = 'page_view'
          AND occurred_at >= date_trunc('month', now()))::int AS page_views,
      (SELECT COUNT(*) FROM events
        WHERE workspace_id = ${workspaceId}
          AND occurred_at >= date_trunc('month', now()))::int AS event_count,
      (SELECT COUNT(*) FROM replay_sessions
        WHERE workspace_id = ${workspaceId}
          AND started_at >= date_trunc('month', now()))::int AS recordings,
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
      (SELECT COUNT(*) FROM workspace_members
        WHERE user_id = ${userId})::int AS workspaces
  `);

  const row = result.rows[0];

  return {
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
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
    },
  };
}
