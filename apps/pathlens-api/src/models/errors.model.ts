import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import type {
  ErrorBreakdown,
  ErrorGroup,
  ErrorOccurrence,
  ErrorsData,
  ErrorsDevice,
  ErrorsRange,
} from "@workspace/contracts/errors";
import { db } from "../db/client";

export type { ErrorsDevice, ErrorsRange } from "@workspace/contracts/errors";

export interface ErrorsFilters {
  workspaceId: string;
  projectId: string;
  range: ErrorsRange;
  device: ErrorsDevice;
  browser?: string;
  url?: string;
  search?: string;
  page: number;
  pageSize: number;
}

interface ErrorRow extends Record<string, unknown> {
  event_id: string;
  type: string;
  visitor_id: string;
  session_id: string;
  path: string | null;
  url: string | null;
  browser: string | null;
  device: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: Date | string | null;
  replay_available: boolean | null;
}

interface SessionCountRow extends Record<string, unknown> {
  total_sessions: number | string | null;
}

interface ErrorAggregate {
  fingerprint: string;
  type: "javascript_error" | "promise_rejection";
  message: string;
  stackTrace: string | null;
  errorCount: number;
  visitors: Set<string>;
  sessions: Set<string>;
  firstSeen: string;
  lastSeen: string;
  browsers: Map<string, number>;
  devices: Map<string, number>;
  urls: Map<string, number>;
  sample: ErrorOccurrence | null;
}

const RANGE_DAYS: Record<ErrorsRange, number> = {
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

function getPayloadString(
  payload: Record<string, unknown> | null,
  keys: string[],
  maximum = 16384
): string | null {
  for (const key of keys) {
    const value = payload?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, maximum);
    }
  }

  return null;
}

function getPayloadNumber(
  payload: Record<string, unknown> | null,
  key: string
): number | null {
  const value = payload?.[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function normalizeForFingerprint(value: string | null): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getErrorMessage(
  type: string,
  payload: Record<string, unknown> | null
): string {
  return (
    getPayloadString(
      payload,
      type === "promise_rejection" ? ["reason", "message"] : ["message"],
      2048
    ) ??
    (type === "promise_rejection"
      ? "Unhandled promise rejection"
      : "JavaScript error")
  );
}

function getErrorStack(payload: Record<string, unknown> | null): string | null {
  return getPayloadString(payload, ["stack"]);
}

function getFingerprint(message: string, stackTrace: string | null): string {
  return createHash("sha256")
    .update(
      `${normalizeForFingerprint(message)}\n${normalizeForFingerprint(stackTrace)}`
    )
    .digest("hex");
}

function formatDevice(value: string | null): string {
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

function formatBrowser(value: string | null): string {
  return value?.trim() || "Unknown";
}

function formatUrl(url: string | null, path: string | null): string {
  return url?.trim() || path?.trim() || "/";
}

function getOccurrence(
  row: ErrorRow,
  message: string,
  stackTrace: string | null
): ErrorOccurrence {
  const type =
    row.type === "promise_rejection" ? "promise_rejection" : "javascript_error";

  return {
    id: row.event_id,
    type,
    message,
    stackTrace,
    file: getPayloadString(row.payload, ["file"], 2048),
    line: getPayloadNumber(row.payload, "line"),
    column: getPayloadNumber(row.payload, "column"),
    path: row.path?.trim() || "/",
    url: row.url?.trim() || null,
    browser: formatBrowser(row.browser),
    device: formatDevice(row.device),
    visitorId: row.visitor_id,
    sessionId: row.session_id,
    occurredAt: toIso(row.occurred_at),
    replayAvailable: Boolean(row.replay_available),
  };
}

function incrementBreakdown(map: Map<string, number>, value: string) {
  map.set(value, (map.get(value) ?? 0) + 1);
}

function getBreakdowns(map: Map<string, number>): ErrorBreakdown[] {
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.name.localeCompare(right.name)
    )
    .slice(0, 5);
}

function toErrorGroup(aggregate: ErrorAggregate): ErrorGroup {
  return {
    fingerprint: aggregate.fingerprint,
    type: aggregate.type,
    message: aggregate.message,
    stackTrace: aggregate.stackTrace,
    errorCount: aggregate.errorCount,
    affectedUsers: aggregate.visitors.size,
    affectedSessions: aggregate.sessions.size,
    firstSeen: aggregate.firstSeen,
    lastSeen: aggregate.lastSeen,
    browsers: getBreakdowns(aggregate.browsers),
    devices: getBreakdowns(aggregate.devices),
    urls: getBreakdowns(aggregate.urls),
    sample: aggregate.sample,
  };
}

export async function getErrorsModel(
  filters: ErrorsFilters
): Promise<ErrorsData> {
  const rangeDays = RANGE_DAYS[filters.range];
  const deviceFilter =
    filters.device === "all"
      ? sql``
      : sql` AND LOWER(COALESCE(events.device, 'unknown')) = ${filters.device}`;
  const browserValue = filters.browser?.trim().toLowerCase();
  const browserFilter = browserValue
    ? sql` AND LOWER(COALESCE(events.browser, '')) LIKE ${`%${browserValue}%`}`
    : sql``;
  const urlValue = filters.url?.trim().toLowerCase();
  const urlFilter = urlValue
    ? sql` AND LOWER(COALESCE(events.url, events.path, '')) LIKE ${`%${urlValue}%`}`
    : sql``;
  const baseFilter = sql`
    events.workspace_id = ${filters.workspaceId}
    AND events.project_id = ${filters.projectId}
    AND events.occurred_at >= NOW() - make_interval(days => ${rangeDays})
    AND events.occurred_at <= NOW()
    ${deviceFilter}
    ${browserFilter}
    ${urlFilter}
  `;
  const searchValue = filters.search?.trim().toLowerCase();
  const searchFilter = searchValue
    ? sql` AND (
        LOWER(COALESCE(events.type, '')) LIKE ${`%${searchValue}%`}
        OR LOWER(COALESCE(events.path, '')) LIKE ${`%${searchValue}%`}
        OR LOWER(COALESCE(events.url, '')) LIKE ${`%${searchValue}%`}
        OR LOWER(COALESCE(events.browser, '')) LIKE ${`%${searchValue}%`}
        OR LOWER(COALESCE(events.device, '')) LIKE ${`%${searchValue}%`}
        OR LOWER(events.payload::text) LIKE ${`%${searchValue}%`}
      )`
    : sql``;

  const [errorResult, sessionCountResult] = await Promise.all([
    db.execute<ErrorRow>(sql`
      SELECT
        events.id::text AS event_id,
        events.type,
        events.visitor_id,
        events.session_id,
        events.path,
        events.url,
        events.browser,
        events.device,
        events.payload,
        events.occurred_at,
        replay.id IS NOT NULL
          AND replay.event_count >= 2
          AND EXISTS (
            SELECT 1
            FROM replay_chunks replay_chunk
            WHERE replay_chunk.session_id = replay.id
              AND replay_chunk.events @> '[{"type": 2}]'::jsonb
          ) AS replay_available
      FROM events
      LEFT JOIN replay_sessions replay
        ON replay.id = events.session_id
        AND replay.workspace_id = ${filters.workspaceId}
        AND replay.project_id = ${filters.projectId}
      WHERE ${baseFilter}
        AND events.type IN ('javascript_error', 'promise_rejection')
        ${searchFilter}
      ORDER BY events.occurred_at DESC, events.id DESC;
    `),
    db.execute<SessionCountRow>(sql`
      SELECT COUNT(DISTINCT events.session_id)::int AS total_sessions
      FROM events
      WHERE ${baseFilter};
    `),
  ]);

  const aggregates = new Map<string, ErrorAggregate>();
  const affectedUsers = new Set<string>();
  const affectedSessions = new Set<string>();

  for (const row of errorResult.rows) {
    const type =
      row.type === "promise_rejection"
        ? "promise_rejection"
        : "javascript_error";
    const message = getErrorMessage(type, row.payload);
    const stackTrace = getErrorStack(row.payload);
    const fingerprint = getFingerprint(message, stackTrace);
    const occurredAt = toIso(row.occurred_at);
    const occurrence = getOccurrence(row, message, stackTrace);
    const aggregate = aggregates.get(fingerprint);

    affectedUsers.add(row.visitor_id);
    affectedSessions.add(row.session_id);

    if (aggregate) {
      aggregate.errorCount += 1;
      aggregate.visitors.add(row.visitor_id);
      aggregate.sessions.add(row.session_id);
      aggregate.firstSeen =
        occurredAt < aggregate.firstSeen ? occurredAt : aggregate.firstSeen;
      aggregate.lastSeen =
        occurredAt > aggregate.lastSeen ? occurredAt : aggregate.lastSeen;
      incrementBreakdown(aggregate.browsers, occurrence.browser);
      incrementBreakdown(aggregate.devices, occurrence.device);
      incrementBreakdown(aggregate.urls, formatUrl(row.url, row.path));
      if (!aggregate.sample) aggregate.sample = occurrence;
      continue;
    }

    aggregates.set(fingerprint, {
      fingerprint,
      type,
      message,
      stackTrace,
      errorCount: 1,
      visitors: new Set([row.visitor_id]),
      sessions: new Set([row.session_id]),
      firstSeen: occurredAt,
      lastSeen: occurredAt,
      browsers: new Map([[occurrence.browser, 1]]),
      devices: new Map([[occurrence.device, 1]]),
      urls: new Map([[formatUrl(row.url, row.path), 1]]),
      sample: occurrence,
    });
  }

  const groups = Array.from(aggregates.values())
    .map(toErrorGroup)
    .sort(
      (left, right) =>
        right.lastSeen.localeCompare(left.lastSeen) ||
        right.errorCount - left.errorCount ||
        left.message.localeCompare(right.message)
    );
  const offset = (filters.page - 1) * filters.pageSize;
  const totalSessions = toNumber(sessionCountResult.rows[0]?.total_sessions);
  const totalPages = Math.ceil(groups.length / filters.pageSize);
  const errors = groups.slice(offset, offset + filters.pageSize);

  return {
    summary: {
      errorCount: errorResult.rows.length,
      affectedUsers: affectedUsers.size,
      affectedSessions: affectedSessions.size,
      errorRate:
        totalSessions > 0
          ? Number(((affectedSessions.size / totalSessions) * 100).toFixed(1))
          : 0,
    },
    errors,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: groups.length,
      totalPages,
      hasNextPage: filters.page < totalPages,
    },
  };
}
