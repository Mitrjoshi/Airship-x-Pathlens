import { and, count, countDistinct, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/client";
import { events, projectSnapshots, projects } from "../db/schema";
import { createSnapshotSignedUrl } from "../lib/supabase";

interface I_CreateProjectPayload {
  name: string;
  description: string | null;
  api_key: string;
  workspace_id: string;
  domain: string | null;
  capture_replay: boolean;
  capture_performance: boolean;
  capture_errors: boolean;
}

export interface ProjectPerformanceMetric {
  label: string;
  value: string | null;
  samples: number;
}

export interface ProjectActivity {
  id: string;
  label: string;
  meta: string;
  occurredAt: string;
}

export interface ProjectStats {
  visitors: number;
  sessions: number;
  pageViews: number;
  events: number;
  conversion: number;
  status: "active" | "inactive";
  lastActivityAt: string | null;
  performance: ProjectPerformanceMetric[];
  recentActivity: ProjectActivity[];
}

export type ProjectSnapshotStatus =
  "pending" | "processing" | "ready" | "stale" | "failed";

export interface ProjectSnapshot {
  status: ProjectSnapshotStatus;
  url: string | null;
  capturedAt: string | null;
  isStale: boolean;
}

interface ProjectSnapshotRow {
  projectId: string;
  status: string;
  storagePath: string | null;
  capturedAt: Date | string | null;
}

interface PerformanceRow extends Record<string, unknown> {
  dns: number | string | null;
  tcp: number | string | null;
  ttfb: number | string | null;
  dom_loaded: number | string | null;
  page_load: number | string | null;
  samples: number | string | null;
}

interface ActivityRow extends Record<string, unknown> {
  id: number | string;
  event_type: string | null;
  path: string | null;
  browser: string | null;
  country_code: string | null;
  city: string | null;
  occurred_at: Date | string | null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  const number = toNumber(value);

  return Number.isFinite(number) ? number : null;
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTiming(value: unknown): string | null {
  const milliseconds = toNullableNumber(value);

  if (milliseconds === null) return null;
  if (milliseconds >= 1000) return `${(milliseconds / 1000).toFixed(2)}s`;

  return `${Math.round(milliseconds)}ms`;
}

function formatEventLabel(type: string): string {
  const labels: Record<string, string> = {
    click: "Element clicked",
    form_submit: "Form submitted",
    input_change: "Input changed",
    javascript_error: "JavaScript error",
    page_view: "Page viewed",
    performance: "Performance measured",
    promise_rejection: "Promise rejected",
    resize: "Viewport resized",
    scroll: "Page scrolled",
    session_end: "Session ended",
    session_start: "Session started",
  };

  if (labels[type]) return labels[type];

  return type
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActivityMeta(event: ActivityRow): string {
  const location = [event.city, event.country_code]
    .filter((value): value is string => Boolean(value))
    .join(", ");

  return [
    location || "Unknown location",
    event.browser || "Unknown browser",
    event.path || "/",
  ].join(" · ");
}

export const createProjectModel = async (
  data: I_CreateProjectPayload
): Promise<{ id: string }[]> => {
  return await db.transaction(async (transaction) => {
    const createdProjects = await transaction
      .insert(projects)
      .values({
        apiKey: data.api_key,
        name: data.name,
        description: data.description,
        workspaceId: data.workspace_id,
        domain: data.domain,
        captureReplay: data.capture_replay,
        capturePerformance: data.capture_performance,
        captureErrors: data.capture_errors,
      })
      .returning({ id: projects.id });
    const project = createdProjects[0];

    if (project) {
      const now = new Date();

      await transaction.insert(projectSnapshots).values({
        projectId: project.id,
        workspaceId: data.workspace_id,
        sourceDomain: data.domain,
        status: data.domain ? "pending" : "stale",
        requestedAt: data.domain ? now : null,
        nextAttemptAt: data.domain ? now : null,
      });
    }

    return createdProjects;
  });
};

function getSnapshotStatus(value: string): ProjectSnapshotStatus {
  if (
    value === "processing" ||
    value === "ready" ||
    value === "stale" ||
    value === "failed"
  ) {
    return value;
  }

  return "pending";
}

export function getEmptyProjectSnapshot(): ProjectSnapshot {
  return {
    status: "pending",
    url: null,
    capturedAt: null,
    isStale: false,
  };
}

export async function getProjectSnapshotsModel(
  projectIds: string[]
): Promise<Map<string, ProjectSnapshot>> {
  if (projectIds.length === 0) return new Map();

  const rows = await db
    .select({
      projectId: projectSnapshots.projectId,
      status: projectSnapshots.status,
      storagePath: projectSnapshots.storagePath,
      capturedAt: projectSnapshots.capturedAt,
    })
    .from(projectSnapshots)
    .where(inArray(projectSnapshots.projectId, projectIds));

  const snapshots = await Promise.all(
    (rows as ProjectSnapshotRow[]).map(async (row) => {
      const status = getSnapshotStatus(row.status);
      const url =
        row.storagePath && (status === "ready" || status === "stale")
          ? await createSnapshotSignedUrl(row.storagePath)
          : null;

      return [
        row.projectId,
        {
          status,
          url,
          capturedAt: toIso(row.capturedAt),
          isStale: status === "stale" || status === "failed",
        },
      ] as const;
    })
  );

  return new Map(snapshots);
}

export const getProjectsModel = async (
  workspace_id: string,
  project_id?: string
) => {
  return await db
    .select()
    .from(projects)
    .where(
      project_id
        ? and(
            eq(projects.workspaceId, workspace_id),
            eq(projects.id, project_id)
          )
        : eq(projects.workspaceId, workspace_id)
    )
    .orderBy(desc(projects.createdAt));
};

export const getProjectStatsModel = async (
  projectId: string,
  includeDetails = false
): Promise<ProjectStats> => {
  const [stats] = await db
    .select({
      visitors: countDistinct(events.visitorId),
      sessions: countDistinct(events.sessionId),
      events: count(events.id),

      pageViews: sql<number>`
        COUNT(*) FILTER (WHERE ${events.type} = 'page_view')
      `,
      conversion: sql<number>`
        COALESCE(
          100.0 * COUNT(DISTINCT ${events.sessionId}) FILTER (
            WHERE ${events.type} IN ('form_submit', 'custom')
          ) / NULLIF(COUNT(DISTINCT ${events.sessionId}), 0),
          0
        )
      `,
      lastActivityAt: sql<Date | null>`MAX(${events.occurredAt})`,
    })
    .from(events)
    .where(eq(events.projectId, projectId));

  const lastActivityAt = toIso(stats?.lastActivityAt);
  const lastActivityTime = lastActivityAt
    ? new Date(lastActivityAt).getTime()
    : 0;
  const status: ProjectStats["status"] =
    lastActivityTime >= Date.now() - 24 * 60 * 60 * 1000
      ? "active"
      : "inactive";

  const projectStats: ProjectStats = {
    visitors: Number(stats?.visitors ?? 0),
    sessions: Number(stats?.sessions ?? 0),
    pageViews: Number(stats?.pageViews ?? 0),
    events: Number(stats?.events ?? 0),
    conversion: Number(toNumber(stats?.conversion).toFixed(1)),
    status,
    lastActivityAt,
    performance: [],
    recentActivity: [],
  };

  if (!includeDetails) return projectStats;

  const [performanceResult, activityResult] = await Promise.all([
    db.execute<PerformanceRow>(sql`
      SELECT
        AVG(NULLIF(payload->>'dns', '')::double precision) AS dns,
        AVG(NULLIF(payload->>'tcp', '')::double precision) AS tcp,
        AVG(NULLIF(payload->>'ttfb', '')::double precision) AS ttfb,
        AVG(NULLIF(payload->>'domLoaded', '')::double precision) AS dom_loaded,
        AVG(NULLIF(payload->>'load', '')::double precision) AS page_load,
        COUNT(*)::int AS samples
      FROM events
      WHERE project_id = ${projectId}
        AND type = 'performance'
        AND occurred_at >= NOW() - INTERVAL '7 days';
    `),
    db.execute<ActivityRow>(sql`
      SELECT
        id,
        type AS event_type,
        path,
        browser,
        country_code,
        city,
        occurred_at
      FROM events
      WHERE project_id = ${projectId}
        AND type NOT IN ('mousemove', 'scroll', 'resize')
      ORDER BY occurred_at DESC
      LIMIT 5;
    `),
  ]);

  const performance = performanceResult.rows[0];
  const samples = toNumber(performance?.samples);

  projectStats.performance = [
    {
      label: "DNS Lookup",
      value: formatTiming(performance?.dns),
      samples,
    },
    {
      label: "TCP Connection",
      value: formatTiming(performance?.tcp),
      samples,
    },
    {
      label: "Time to First Byte",
      value: formatTiming(performance?.ttfb),
      samples,
    },
    {
      label: "DOM Content Loaded",
      value: formatTiming(performance?.dom_loaded),
      samples,
    },
    {
      label: "Page Load",
      value: formatTiming(performance?.page_load),
      samples,
    },
  ];

  projectStats.recentActivity = activityResult.rows.map((activity) => ({
    id: String(activity.id),
    label: formatEventLabel(activity.event_type ?? "event"),
    meta: formatActivityMeta(activity),
    occurredAt: toIso(activity.occurred_at) ?? new Date(0).toISOString(),
  }));

  return projectStats;
};

export const getProjectIDByApiKeyModel = async (apiKey: string) => {
  return await db
    .select({ id: projects.id, workspace_id: projects.workspaceId })
    .from(projects)
    .where(eq(projects.apiKey, apiKey))
    .orderBy(desc(projects.createdAt));
};

export const getProjectWorkspaceIdModel = async (projectId: string) => {
  const [project] = await db
    .select({ workspaceId: projects.workspaceId })
    .from(projects)
    .where(eq(projects.id, projectId));

  return project?.workspaceId ?? null;
};

export const deleteProjectModel = async (project_id: string) => {
  await db.delete(projects).where(eq(projects.id, project_id));
};
