import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { events } from "../db/schema";
import type {
  EventsData,
  IncomingEvent,
  ProjectEvent,
} from "@workspace/contracts";
import { getProjectIDByApiKeyModel } from "./projects.model";

export type EventsRange = "24h" | "7d" | "30d" | "90d";

export interface EventsFilters {
  workspaceId: string;
  projectId: string;
  range: EventsRange;
  search?: string;
  page: number;
  pageSize: number;
}

interface EventRow extends Record<string, unknown> {
  event_id: string;
  type: string;
  path: string | null;
  visitor_id: string;
  device: string | null;
  country: string | null;
  country_code: string | null;
  event_tag: string | null;
  event_text: string | null;
  occurred_at: Date | string | null;
}

interface CountRow extends Record<string, unknown> {
  total_count: number | string | null;
}

interface SummaryRow extends Record<string, unknown> {
  total_events: number | string | null;
  total_sessions: number | string | null;
  total_visitors: number | string | null;
}

const RANGE_DAYS: Record<EventsRange, number> = {
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

function formatDevice(value: string | null): ProjectEvent["device"] {
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
  return country?.trim() || countryCode?.trim().toUpperCase() || "Unknown";
}

function getReferrerDomain(referrer?: string | null): string | null {
  if (!referrer) return null;

  try {
    const hostname = new URL(referrer).hostname.toLowerCase();

    return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
  } catch {
    return null;
  }
}

export async function createEvents(
  incomingEvents: IncomingEvent[],
  ip?: string
) {
  // Cache API key -> project/workspace
  const projectCache = new Map<
    string,
    {
      projectId: string;
      workspaceId: string;
    }
  >();

  const rows: Array<typeof events.$inferInsert> = [];

  for (const event of incomingEvents) {
    let project = projectCache.get(event.projectId);

    if (!project) {
      const [dbProject] = await getProjectIDByApiKeyModel(event.projectId);

      if (!dbProject) {
        throw new Error(`Invalid API key: ${event.projectId}`);
      }

      project = {
        projectId: dbProject.id,
        workspaceId: dbProject.workspace_id,
      };

      projectCache.set(event.projectId, project);
    }

    const occurredAt = new Date(event.timestamp);

    if (Number.isNaN(occurredAt.getTime())) {
      throw new Error("Invalid event timestamp.");
    }

    rows.push({
      projectId: project.projectId,
      workspaceId: project.workspaceId,

      visitorId: event.visitorId,
      sessionId: event.sessionId,

      type: event.type,

      occurredAt,

      url: event.url,
      path: event.path,
      title: event.title,
      referrer: event.referrer,
      referrerDomain: getReferrerDomain(event.referrer),

      device: event.device,
      browser: event.browser,
      browserVersion: event.browserVersion,
      os: event.os,
      osVersion: event.osVersion,

      country: event.country ?? event.countryCode,
      countryCode: event.countryCode,
      region: event.region,
      city: event.city,

      timezone: event.timezone,
      language: event.language,
      userAgent: event.userAgent,

      ip,

      screenWidth: event.screen?.width,
      screenHeight: event.screen?.height,
      viewportWidth: event.viewport?.width,
      viewportHeight: event.viewport?.height,

      sessionDurationMs:
        event.type === "session_end" ? event.duration : undefined,

      payload: Object.fromEntries(Object.entries(event)),
    });
  }

  await db.insert(events).values(rows);
}

export async function getEventsModel(
  filters: EventsFilters
): Promise<EventsData> {
  const rangeDays = RANGE_DAYS[filters.range];
  const search = filters.search?.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;
  const searchFilter = searchPattern
    ? sql` AND (
        LOWER(COALESCE(type, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(path, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(visitor_id, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(device, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(country, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(country_code, '')) LIKE ${searchPattern}
        OR LOWER(payload::text) LIKE ${searchPattern}
      )`
    : sql``;
  const eventWhere = sql`
    workspace_id = ${filters.workspaceId}
    AND project_id = ${filters.projectId}
    AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ${searchFilter}
  `;
  const offset = (filters.page - 1) * filters.pageSize;

  const [eventsResult, countResult, summaryResult] = await Promise.all([
    db.execute<EventRow>(sql`
      SELECT
        id::text AS event_id,
        type,
        path,
        visitor_id,
        device,
        country,
        country_code,
        payload->>'tag' AS event_tag,
        payload->>'text' AS event_text,
        occurred_at
      FROM events
      WHERE ${eventWhere}
      ORDER BY occurred_at DESC, id DESC
      LIMIT ${filters.pageSize}
      OFFSET ${offset};
    `),
    db.execute<CountRow>(sql`
      SELECT COUNT(*)::int AS total_count
      FROM events
      WHERE ${eventWhere};
    `),
    db.execute<SummaryRow>(sql`
      SELECT
        COUNT(*)::int AS total_events,
        COUNT(DISTINCT session_id)::int AS total_sessions,
        COUNT(DISTINCT visitor_id)::int AS total_visitors
      FROM events
      WHERE ${eventWhere};
    `),
  ]);

  const total = toNumber(countResult.rows[0]?.total_count);
  const summary = summaryResult.rows[0];
  const totalPages = Math.ceil(total / filters.pageSize);

  return {
    events: eventsResult.rows.map((event) => ({
      id: event.event_id,
      type: event.type,
      path: event.path?.trim() || "/",
      visitorId: event.visitor_id,
      device: formatDevice(event.device),
      country: formatCountry(event.country, event.country_code),
      tag: event.event_tag,
      text: event.event_text,
      occurredAt: toIso(event.occurred_at),
    })),
    summary: {
      totalEvents: toNumber(summary?.total_events),
      totalSessions: toNumber(summary?.total_sessions),
      totalVisitors: toNumber(summary?.total_visitors),
    },
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages,
      hasNextPage: filters.page < totalPages,
    },
  };
}
