import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { getReplayDataModel, type ReplayData } from "./replay.model";

export type SessionReplayRange = "24h" | "7d" | "30d" | "90d";
export type SessionReplayDevice = "all" | "desktop" | "mobile" | "tablet";

export interface SessionReplayFilters {
  workspaceId: string;
  projectId: string;
  range: SessionReplayRange;
  device: SessionReplayDevice;
  search?: string;
  page: number;
  pageSize: number;
}

export interface SessionReplayStats {
  recordedSessions: number;
  replayAvailable: number;
  liveSessions: number;
  avgSession: string;
  storageUsed: string;
}

export interface SessionReplaySession {
  id: string;
  visitorId: string;
  country: string;
  countryCode: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  duration: string;
  pages: number;
  source: string;
  recordedAt: string;
  eventCount: number;
  isReplayAvailable: boolean;
  isLive: boolean;
}

export interface SessionReplayResponse {
  stats: SessionReplayStats;
  sessions: SessionReplaySession[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface SessionReplayDetailFilters {
  workspaceId: string;
  projectId: string;
  sessionId: string;
}

export interface SessionReplayEvent {
  id: string;
  type: string;
  occurredAt: string;
  elapsedMs: number;
  path: string | null;
  url: string | null;
  title: string | null;
  payload: Record<string, unknown>;
}

export interface SessionReplayDetail {
  id: string;
  visitorId: string;
  country: string;
  countryCode: string;
  device: "Desktop" | "Mobile" | "Tablet" | "Unknown";
  duration: string;
  startedAt: string;
  endedAt: string;
  screen: {
    width: number;
    height: number;
  } | null;
  viewport: {
    width: number;
    height: number;
  } | null;
  totalEvents: number;
  hasMoreEvents: boolean;
  events: SessionReplayEvent[];
  replay: ReplayData;
}

interface SessionReplayRow extends Record<string, unknown> {
  session_id: string;
  visitor_id: string;
  country: string | null;
  country_code: string | null;
  device: string | null;
  duration_seconds: number | string | null;
  pages: number | string | null;
  source: string | null;
  recorded_at: Date | string | null;
  event_count: number | string | null;
  is_replay_available: boolean | null;
  is_live: boolean | null;
}

interface CountRow extends Record<string, unknown> {
  total_count: number | string | null;
}

interface StatsRow extends Record<string, unknown> {
  recorded_sessions: number | string | null;
  replay_available: number | string | null;
  live_sessions: number | string | null;
  avg_session_seconds: number | string | null;
  storage_bytes: number | string | null;
}

interface SessionReplayDetailRow extends Record<string, unknown> {
  session_id: string;
  visitor_id: string;
  country: string | null;
  country_code: string | null;
  device: string | null;
  started_at: Date | string | null;
  ended_at: Date | string | null;
  duration_seconds: number | string | null;
  screen_width: number | string | null;
  screen_height: number | string | null;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
  total_events: number | string | null;
}

interface SessionReplayEventRow extends Record<string, unknown> {
  event_id: string;
  type: string;
  occurred_at: Date | string | null;
  elapsed_ms: number | string | null;
  path: string | null;
  url: string | null;
  title: string | null;
  payload: Record<string, unknown> | null;
}

const RANGE_DAYS: Record<SessionReplayRange, number> = {
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

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return new Date(0).toISOString();
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${Number(value.toFixed(value < 10 ? 1 : 0))} ${units[unitIndex]}`;
}

function formatDevice(value: string | null): SessionReplaySession["device"] {
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

function formatCountry(country: string | null, countryCode: string | null) {
  const normalizedCountry = country?.trim();
  const normalizedCode = countryCode?.trim().toUpperCase();

  if (normalizedCountry && normalizedCountry !== normalizedCode) {
    return normalizedCountry;
  }

  return normalizedCode || normalizedCountry || "Unknown location";
}

function formatSource(source: string | null): string {
  const normalizedSource = source?.trim().toLowerCase();

  if (!normalizedSource) return "Direct";
  if (normalizedSource.includes("google.")) return "Google";
  if (normalizedSource.includes("linkedin.")) return "LinkedIn";
  if (normalizedSource.includes("twitter.") || normalizedSource === "x.com") {
    return "Twitter";
  }

  return normalizedSource.startsWith("www.")
    ? normalizedSource.slice(4)
    : normalizedSource;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  return toNumber(value);
}

const REPLAY_PAYLOAD_KEYS = new Set([
  "x",
  "y",
  "tag",
  "id",
  "className",
  "text",
  "scrollY",
  "percentage",
  "width",
  "height",
  "action",
  "method",
  "message",
  "file",
  "line",
  "column",
  "reason",
  "dns",
  "tcp",
  "ttfb",
  "domLoaded",
  "load",
  "duration",
  "totalEvents",
]);

function sanitizeReplayPayload(
  payload: Record<string, unknown> | null
): Record<string, unknown> {
  if (!payload) return {};

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => REPLAY_PAYLOAD_KEYS.has(key))
  );
}

export async function getSessionReplayModel(
  filters: SessionReplayFilters
): Promise<SessionReplayResponse> {
  const rangeDays = RANGE_DAYS[filters.range];
  const search = filters.search?.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;
  const deviceFilter =
    filters.device !== "all"
      ? sql` AND LOWER(device) = ${filters.device}`
      : sql``;
  const eventWhere = sql`
    workspace_id = ${filters.workspaceId}
    AND project_id = ${filters.projectId}
    AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ${deviceFilter}
  `;
  const sessionCtes = sql`
    WITH filtered_events AS (
      SELECT
        session_id,
        visitor_id,
        occurred_at,
        type,
        path,
        country,
        country_code,
        device,
        referrer_domain,
        session_duration_ms,
        payload
      FROM events
      WHERE ${eventWhere}
    ),
    session_rollups AS (
      SELECT
        session_id,
        visitor_id,
        COUNT(*)::int AS event_count,
        COUNT(*) FILTER (
          WHERE type IN (
            'page_view',
            'click',
            'scroll',
            'mousemove',
            'resize',
            'form_submit',
            'input_change'
          )
        )::int AS replay_event_count,
        COUNT(DISTINCT path) FILTER (
          WHERE type = 'page_view' AND path IS NOT NULL
        )::int AS pages,
        MIN(occurred_at) AS started_at,
        MAX(occurred_at) AS ended_at,
        MAX(session_duration_ms) AS duration_ms
      FROM filtered_events
      GROUP BY session_id, visitor_id
    ),
    latest_session_events AS (
      SELECT DISTINCT ON (session_id)
        session_id,
        country,
        country_code,
        device,
        referrer_domain
      FROM filtered_events
      ORDER BY session_id, occurred_at DESC
    )
  `;
  const searchFilter = searchPattern
    ? sql` AND (
        LOWER(sr.visitor_id) LIKE ${searchPattern}
        OR LOWER(COALESCE(le.country, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(le.country_code, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(le.device, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(le.referrer_domain, '')) LIKE ${searchPattern}
        OR EXISTS (
          SELECT 1
          FROM filtered_events search_event
          WHERE search_event.session_id = sr.session_id
            AND LOWER(COALESCE(search_event.path, '')) LIKE ${searchPattern}
        )
      )`
    : sql``;
  const offset = (filters.page - 1) * filters.pageSize;

  const [sessionResult, countResult, statsResult] = await Promise.all([
    db.execute<SessionReplayRow>(sql`
      ${sessionCtes}
      SELECT
        sr.session_id,
        sr.visitor_id,
        le.country,
        le.country_code,
        le.device,
        CASE
          WHEN sr.duration_ms IS NOT NULL
            THEN sr.duration_ms / 1000.0
          ELSE EXTRACT(EPOCH FROM (sr.ended_at - sr.started_at))
        END::float AS duration_seconds,
        sr.pages,
        COALESCE(NULLIF(le.referrer_domain, ''), 'Direct') AS source,
        sr.ended_at AS recorded_at,
        sr.event_count,
         replay.id IS NOT NULL
           AND replay.event_count >= 2
           AND EXISTS (
             SELECT 1
             FROM replay_chunks replay_chunk
             WHERE replay_chunk.session_id = replay.id
               AND replay_chunk.events @> '[{"type": 2}]'::jsonb
           ) AS is_replay_available,
        replay.ended_at IS NULL
          AND replay.last_seen_at >= NOW() - INTERVAL '15 seconds' AS is_live
      FROM session_rollups sr
      INNER JOIN latest_session_events le ON le.session_id = sr.session_id
      LEFT JOIN replay_sessions replay
        ON replay.id = sr.session_id
        AND replay.workspace_id = ${filters.workspaceId}
        AND replay.project_id = ${filters.projectId}
      WHERE sr.replay_event_count > 0
        ${searchFilter}
      ORDER BY sr.ended_at DESC
      LIMIT ${filters.pageSize}
      OFFSET ${offset};
    `),
    db.execute<CountRow>(sql`
      ${sessionCtes}
      SELECT COUNT(*)::int AS total_count
      FROM session_rollups sr
      INNER JOIN latest_session_events le ON le.session_id = sr.session_id
      WHERE sr.replay_event_count > 0
        ${searchFilter};
    `),
    db.execute<StatsRow>(sql`
      ${sessionCtes}
      SELECT
        COUNT(*)::int AS recorded_sessions,
         COUNT(replay.id) FILTER (
           WHERE replay.event_count >= 2
             AND EXISTS (
               SELECT 1
               FROM replay_chunks replay_chunk
               WHERE replay_chunk.session_id = replay.id
                 AND replay_chunk.events @> '[{"type": 2}]'::jsonb
             )
         )::int AS replay_available,
        COUNT(replay.id) FILTER (
          WHERE replay.ended_at IS NULL
            AND replay.last_seen_at >= NOW() - INTERVAL '15 seconds'
        )::int AS live_sessions,
        COALESCE(
          AVG(
            CASE
              WHEN session_rollups.duration_ms IS NOT NULL
                THEN session_rollups.duration_ms / 1000.0
              ELSE EXTRACT(
                EPOCH FROM (session_rollups.ended_at - session_rollups.started_at)
              )
            END
          ),
          0
        )::float AS avg_session_seconds,
        COALESCE(
          (SELECT SUM(pg_column_size(payload)) FROM filtered_events),
          0
        )::bigint AS storage_bytes
      FROM session_rollups
      LEFT JOIN replay_sessions replay
        ON replay.id = session_rollups.session_id
        AND replay.workspace_id = ${filters.workspaceId}
        AND replay.project_id = ${filters.projectId};
    `),
  ]);

  const total = toNumber(countResult.rows[0]?.total_count);
  const stats = statsResult.rows[0];
  const totalPages = Math.ceil(total / filters.pageSize);

  return {
    stats: {
      recordedSessions: toNumber(stats?.recorded_sessions),
      replayAvailable: toNumber(stats?.replay_available),
      liveSessions: toNumber(stats?.live_sessions),
      avgSession: formatDuration(toNumber(stats?.avg_session_seconds)),
      storageUsed: formatBytes(toNumber(stats?.storage_bytes)),
    },
    sessions: sessionResult.rows.map((row) => ({
      id: row.session_id,
      visitorId: row.visitor_id,
      country: formatCountry(row.country, row.country_code),
      countryCode: row.country_code?.trim().toUpperCase() || "--",
      device: formatDevice(row.device),
      duration: formatDuration(toNumber(row.duration_seconds)),
      pages: toNumber(row.pages),
      source: formatSource(row.source),
      recordedAt: toIso(row.recorded_at),
      eventCount: toNumber(row.event_count),
      isReplayAvailable: Boolean(row.is_replay_available),
      isLive: Boolean(row.is_live),
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

export async function getSessionReplayDetailModel(
  filters: SessionReplayDetailFilters
): Promise<SessionReplayDetail | null> {
  const [summaryResult, replay] = await Promise.all([
    db.execute<SessionReplayDetailRow>(sql`
      SELECT
        session_id,
        visitor_id,
        MAX(country) AS country,
        MAX(country_code) AS country_code,
        MAX(device) AS device,
        MIN(occurred_at) AS started_at,
        MAX(occurred_at) AS ended_at,
        CASE
          WHEN MAX(session_duration_ms) IS NOT NULL
            THEN MAX(session_duration_ms) / 1000.0
          ELSE EXTRACT(EPOCH FROM (MAX(occurred_at) - MIN(occurred_at)))
        END::float AS duration_seconds,
        MAX(screen_width)::int AS screen_width,
        MAX(screen_height)::int AS screen_height,
        MAX(viewport_width)::int AS viewport_width,
        MAX(viewport_height)::int AS viewport_height,
        COUNT(*)::int AS total_events
      FROM events
      WHERE workspace_id = ${filters.workspaceId}
        AND project_id = ${filters.projectId}
        AND session_id = ${filters.sessionId}
      GROUP BY session_id, visitor_id
      LIMIT 1;
    `),
    getReplayDataModel(
      filters.workspaceId,
      filters.projectId,
      filters.sessionId
    ),
  ]);
  const summary = summaryResult.rows[0];

  if (!summary) return null;

  const eventResult = await db.execute<SessionReplayEventRow>(sql`
    WITH session_events AS (
      SELECT
        id::text AS event_id,
        type,
        occurred_at,
        path,
        url,
        title,
        payload,
        MIN(occurred_at) OVER () AS session_started_at
      FROM events
      WHERE workspace_id = ${filters.workspaceId}
        AND project_id = ${filters.projectId}
        AND session_id = ${filters.sessionId}
    )
    SELECT
      event_id,
      type,
      occurred_at,
      EXTRACT(EPOCH FROM (occurred_at - session_started_at)) * 1000
        AS elapsed_ms,
      path,
      url,
      title,
      payload
    FROM session_events
    ORDER BY occurred_at ASC, event_id ASC
    LIMIT 5000;
  `);
  const events = eventResult.rows.map((event) => ({
    id: event.event_id,
    type: event.type,
    occurredAt: toIso(event.occurred_at),
    elapsedMs: toNumber(event.elapsed_ms),
    path: event.path,
    url: event.url,
    title: event.title,
    payload: sanitizeReplayPayload(event.payload),
  }));

  const screenWidth = toNullableNumber(summary.screen_width);
  const screenHeight = toNullableNumber(summary.screen_height);
  const viewportWidth = toNullableNumber(summary.viewport_width);
  const viewportHeight = toNullableNumber(summary.viewport_height);
  const totalEvents = toNumber(summary.total_events);

  return {
    id: summary.session_id,
    visitorId: summary.visitor_id,
    country: formatCountry(summary.country, summary.country_code),
    countryCode: summary.country_code?.trim().toUpperCase() || "--",
    device: formatDevice(summary.device),
    duration: formatDuration(toNumber(summary.duration_seconds)),
    startedAt: toIso(summary.started_at),
    endedAt: toIso(summary.ended_at),
    screen:
      screenWidth !== null && screenHeight !== null
        ? { width: screenWidth, height: screenHeight }
        : null,
    viewport:
      viewportWidth !== null && viewportHeight !== null
        ? { width: viewportWidth, height: viewportHeight }
        : null,
    totalEvents,
    hasMoreEvents: totalEvents > events.length,
    events,
    replay,
  };
}
