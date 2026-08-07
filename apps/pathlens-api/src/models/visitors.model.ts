import { sql } from "drizzle-orm";
import { db } from "../db/client";

export type VisitorsRange = "24h" | "7d" | "30d" | "90d";
export type VisitorStatus = "all" | "online" | "offline";

export interface VisitorsFilters {
  workspaceId: string;
  projectId: string;
  range: VisitorsRange;
  status: VisitorStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export interface VisitorSummary {
  totalVisitors: number;
  newVisitors: number;
  returningVisitors: number;
  liveVisitors: number;
  avgDuration: string;
}

export interface Visitor {
  id: string;
  location: string;
  countryCode: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  browser: string;
  sessions: number;
  pageViews: number;
  duration: string;
  status: "online" | "offline";
  lastSeen: string;
}

export interface VisitorsResponse {
  summary: VisitorSummary;
  visitors: Visitor[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

interface VisitorRow extends Record<string, unknown> {
  visitor_id: string;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  device: string | null;
  browser: string | null;
  sessions: number | string | null;
  page_views: number | string | null;
  duration_seconds: number | string | null;
  last_seen: Date | string | null;
  status: "online" | "offline";
}

interface CountRow extends Record<string, unknown> {
  total_count: number | string | null;
}

interface SummaryRow extends Record<string, unknown> {
  total_visitors: number | string | null;
  new_visitors: number | string | null;
  returning_visitors: number | string | null;
  live_visitors: number | string | null;
  avg_duration_seconds: number | string | null;
}

const RANGE_DAYS: Record<VisitorsRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function toIso(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string") return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${remaining}s`;
  if (minutes > 0) return `${minutes}m ${remaining}s`;
  return `${remaining}s`;
}

function formatLocation(row: VisitorRow): string {
  const locality = row.city?.trim() || row.region?.trim();
  const country = row.country_code?.trim().toUpperCase() || row.country?.trim();

  return (
    [locality, country]
      .filter((value): value is string => Boolean(value))
      .join(", ") || "Unknown location"
  );
}

function formatDevice(value: string | null): Visitor["device"] {
  switch (value?.toLowerCase()) {
    case "desktop":
      return "Desktop";
    case "mobile":
      return "Mobile";
    case "tablet":
      return "Tablet";
    default:
      return "Unknown";
  }
}

export async function getVisitorsModel(
  filters: VisitorsFilters
): Promise<VisitorsResponse> {
  const rangeDays = RANGE_DAYS[filters.range];
  const search = filters.search?.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;
  const statusFilter =
    filters.status === "online"
      ? sql` AND vr.last_seen >= NOW() - INTERVAL '5 minutes'`
      : filters.status === "offline"
        ? sql` AND vr.last_seen < NOW() - INTERVAL '5 minutes'`
        : sql``;
  const searchFilter = searchPattern
    ? sql` AND (
        LOWER(vr.visitor_id) LIKE ${searchPattern}
        OR LOWER(COALESCE(lv.city, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(lv.region, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(lv.country, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(lv.country_code, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(lv.device, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(lv.browser, '')) LIKE ${searchPattern}
      )`
    : sql``;
  const eventWhere = sql`
    workspace_id = ${filters.workspaceId}
    AND project_id = ${filters.projectId}
    AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
  `;
  const visitorCtes = sql`
    WITH filtered_events AS (
      SELECT
        visitor_id,
        session_id,
        occurred_at,
        type,
        session_duration_ms,
        country_code,
        country,
        region,
        city,
        device,
        browser
      FROM events
      WHERE ${eventWhere}
    ),
    session_rollups AS (
      SELECT
        visitor_id,
        session_id,
        COUNT(*) FILTER (WHERE type = 'page_view')::int AS page_views,
        MIN(occurred_at) AS started_at,
        MAX(occurred_at) AS ended_at,
        MAX(session_duration_ms) AS session_duration_ms
      FROM filtered_events
      GROUP BY visitor_id, session_id
    ),
    visitor_rollups AS (
      SELECT
        visitor_id,
        COUNT(*)::int AS sessions,
        COALESCE(SUM(page_views), 0)::int AS page_views,
        COALESCE(
          AVG(
            CASE
              WHEN session_duration_ms IS NOT NULL
                THEN session_duration_ms / 1000.0
              ELSE EXTRACT(EPOCH FROM (ended_at - started_at))
            END
          ),
          0
        )::float AS duration_seconds,
        MAX(ended_at) AS last_seen
      FROM session_rollups
      GROUP BY visitor_id
    ),
    latest_visitors AS (
      SELECT DISTINCT ON (visitor_id)
        visitor_id,
        country_code,
        country,
        region,
        city,
        device,
        browser
      FROM filtered_events
      ORDER BY visitor_id, occurred_at DESC
    )
  `;
  const offset = (filters.page - 1) * filters.pageSize;

  const [visitorResult, countResult, summaryResult] = await Promise.all([
    db.execute<VisitorRow>(sql`
      ${visitorCtes}
      SELECT
        vr.visitor_id,
        lv.country_code,
        lv.country,
        lv.region,
        lv.city,
        lv.device,
        lv.browser,
        vr.sessions,
        vr.page_views,
        vr.duration_seconds,
        vr.last_seen,
        CASE
          WHEN vr.last_seen >= NOW() - INTERVAL '5 minutes'
            THEN 'online'
          ELSE 'offline'
        END AS status
      FROM visitor_rollups vr
      INNER JOIN latest_visitors lv ON lv.visitor_id = vr.visitor_id
      WHERE TRUE
        ${statusFilter}
        ${searchFilter}
      ORDER BY vr.last_seen DESC
      LIMIT ${filters.pageSize}
      OFFSET ${offset};
    `),
    db.execute<CountRow>(sql`
      ${visitorCtes}
      SELECT COUNT(*)::int AS total_count
      FROM visitor_rollups vr
      INNER JOIN latest_visitors lv ON lv.visitor_id = vr.visitor_id
      WHERE TRUE
        ${statusFilter}
        ${searchFilter};
    `),
    db.execute<SummaryRow>(sql`
      WITH filtered_events AS (
        SELECT
          visitor_id,
          session_id,
          occurred_at,
          type,
          session_duration_ms
        FROM events
        WHERE ${eventWhere}
      ),
      session_rollups AS (
        SELECT
          visitor_id,
          session_id,
          MIN(occurred_at) AS started_at,
          MAX(occurred_at) AS ended_at,
          MAX(session_duration_ms) AS session_duration_ms
        FROM filtered_events
        GROUP BY visitor_id, session_id
      ),
      current_visitors AS (
        SELECT DISTINCT visitor_id
        FROM filtered_events
      ),
      classified_visitors AS (
        SELECT
          current_visitors.visitor_id,
          EXISTS (
            SELECT 1
            FROM events previous
            WHERE previous.workspace_id = ${filters.workspaceId}
              AND previous.project_id = ${filters.projectId}
              AND previous.visitor_id = current_visitors.visitor_id
              AND previous.occurred_at < NOW() - make_interval(days => ${rangeDays})
          ) AS is_returning
        FROM current_visitors
      )
      SELECT
        (SELECT COUNT(*) FROM current_visitors)::int AS total_visitors,
        (SELECT COUNT(*) FROM classified_visitors WHERE NOT is_returning)::int
          AS new_visitors,
        (SELECT COUNT(*) FROM classified_visitors WHERE is_returning)::int
          AS returning_visitors,
        (
          SELECT COUNT(DISTINCT visitor_id)
          FROM filtered_events
          WHERE occurred_at >= NOW() - INTERVAL '5 minutes'
        )::int AS live_visitors,
        COALESCE(
          (
            SELECT AVG(
              CASE
                WHEN session_duration_ms IS NOT NULL
                  THEN session_duration_ms / 1000.0
                ELSE EXTRACT(EPOCH FROM (ended_at - started_at))
              END
            )
            FROM session_rollups
          ),
          0
        )::float AS avg_duration_seconds;
    `),
  ]);

  const total = toNumber(countResult.rows[0]?.total_count);
  const summary = summaryResult.rows[0];
  const totalPages = Math.ceil(total / filters.pageSize);

  return {
    summary: {
      totalVisitors: toNumber(summary?.total_visitors),
      newVisitors: toNumber(summary?.new_visitors),
      returningVisitors: toNumber(summary?.returning_visitors),
      liveVisitors: toNumber(summary?.live_visitors),
      avgDuration: formatDuration(toNumber(summary?.avg_duration_seconds)),
    },
    visitors: visitorResult.rows.map((row) => ({
      id: row.visitor_id,
      location: formatLocation(row),
      countryCode: row.country_code?.toUpperCase() ?? "--",
      device: formatDevice(row.device),
      browser: row.browser?.trim() || "Unknown browser",
      sessions: toNumber(row.sessions),
      pageViews: toNumber(row.page_views),
      duration: formatDuration(toNumber(row.duration_seconds)),
      status: row.status,
      lastSeen: toIso(row.last_seen) ?? new Date(0).toISOString(),
    })),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
      hasNextPage: filters.page < totalPages,
    },
  };
}
