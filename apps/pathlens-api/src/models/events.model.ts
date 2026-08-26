import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { events, visitorCampaignAttribution } from "../db/schema";
import type {
  EventsCategory,
  EventsDevice,
  EventsData,
  IncomingEvent,
  ProjectEvent,
  ProjectEventCategory,
  ProjectEventDetailValue,
} from "@workspace/contracts";
import type { GeoLocation } from "../lib/geoip";
import { getProjectIDByApiKeyModel } from "./projects.model";

export type EventsRange = "24h" | "7d" | "30d" | "90d";

export interface EventsFilters {
  workspaceId: string;
  projectId: string;
  range: EventsRange;
  category: EventsCategory;
  device: EventsDevice;
  path?: string;
  search?: string;
  page: number;
  pageSize: number;
}

interface EventRow extends Record<string, unknown> {
  event_id: string;
  type: string;
  session_id: string;
  path: string | null;
  url: string | null;
  title: string | null;
  referrer: string | null;
  referrer_domain: string | null;
  visitor_id: string;
  device: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  country: string | null;
  country_code: string | null;
  event_tag: string | null;
  event_text: string | null;
  payload: Record<string, unknown> | null;
  replay_available: boolean | null;
  occurred_at: Date | string | null;
}

interface CountRow extends Record<string, unknown> {
  total_count: number | string | null;
}

interface SummaryRow extends Record<string, unknown> {
  total_events: number | string | null;
  total_sessions: number | string | null;
  total_visitors: number | string | null;
  high_signal_actions: number | string | null;
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

function getEventCategory(type: string): ProjectEventCategory {
  if (["click"].includes(type)) return "action";
  if (["form_submit", "form_success", "form_error"].includes(type)) {
    return "form";
  }
  if (type === "page_view") return "navigation";
  if (["javascript_error", "promise_rejection"].includes(type)) {
    return "error";
  }
  if (type === "performance") return "performance";
  if (type === "custom") return "custom";

  return "system";
}

function getStringDetail(
  payload: Record<string, unknown> | null,
  key: string,
  maximum = 512
): string | null {
  const value = payload?.[key];

  return typeof value === "string" ? value.slice(0, maximum) : null;
}

function getNumberDetail(
  payload: Record<string, unknown> | null,
  key: string
): number | null {
  const value = payload?.[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;

  return null;
}

function getEventDetails(
  type: string,
  payload: Record<string, unknown> | null
): Record<string, ProjectEventDetailValue> {
  const details: Record<string, ProjectEventDetailValue> = {};
  const addString = (key: string, sourceKey = key) => {
    const value = getStringDetail(payload, sourceKey);

    if (value) details[key] = value;
  };
  const addNumber = (key: string, sourceKey = key) => {
    const value = getNumberDetail(payload, sourceKey);

    if (value !== null) details[key] = value;
  };

  if (type === "click") {
    addString("element", "tag");
    addString("elementId", "id");
    addString("buttonText");
    addString("text");
    addString("className");
    addNumber("x");
    addNumber("y");
    addNumber("pageX");
    addNumber("pageY");
  } else if (
    type === "form_submit" ||
    type === "form_success" ||
    type === "form_error"
  ) {
    addString("formId", "id");
    addString("action");
    addString("method");
    addString("errorType");
    addString("message");
  } else if (type === "javascript_error") {
    addString("message");
    addString("file");
    addNumber("line");
    addNumber("column");
  } else if (type === "promise_rejection") {
    addString("reason", "reason");
  } else if (type === "performance") {
    for (const key of ["dns", "tcp", "ttfb", "domLoaded", "load"]) {
      addNumber(key);
    }
  } else if (type === "custom" && payload) {
    const ignoredKeys = new Set([
      "projectId",
      "visitorId",
      "sessionId",
      "timestamp",
      "url",
      "path",
      "title",
    ]);

    for (const [key, value] of Object.entries(payload)) {
      if (ignoredKeys.has(key) || key in details) continue;
      if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        let detailValue: ProjectEventDetailValue;

        if (typeof value === "string") detailValue = value.slice(0, 512);
        else if (typeof value === "number" || typeof value === "boolean") {
          detailValue = value;
        } else {
          detailValue = null;
        }

        details[key] = detailValue;
      }
    }
  }

  return details;
}

function getEventDescription(
  type: string,
  path: string,
  payload: Record<string, unknown> | null
): string {
  const text = getStringDetail(payload, "text");
  const buttonText = getStringDetail(payload, "buttonText");
  const formId = getStringDetail(payload, "id");

  if (type === "click") {
    const target = buttonText || text;

    return target ? `Clicked "${target}"` : "Clicked an element";
  }
  if (type === "form_submit") {
    return formId ? `Submitted "${formId}"` : "Submitted a form";
  }
  if (type === "form_success") {
    return formId ? `Form "${formId}" succeeded` : "Form succeeded";
  }
  if (type === "form_error") {
    return formId ? `Form "${formId}" failed` : "Form failed";
  }
  if (type === "page_view") return `Viewed ${path}`;
  if (type === "javascript_error") return "JavaScript error occurred";
  if (type === "promise_rejection") return "Unhandled promise rejection";
  if (type === "performance") return "Performance measured";
  if (type === "custom") return "Custom event recorded";

  return type
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCategoryFilter(category: EventsCategory) {
  if (category === "actions") {
    return sql` AND type IN ('click', 'page_view', 'custom')`;
  }
  if (category === "forms") {
    return sql` AND type IN ('form_submit', 'form_success', 'form_error')`;
  }
  if (category === "high_signal") {
    return sql` AND type IN (
      'click', 'page_view', 'form_submit', 'form_success', 'form_error',
      'custom', 'javascript_error', 'promise_rejection', 'performance'
    )`;
  }

  return sql``;
}

function normalizeCampaignValue(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().slice(0, 512);

  return normalized || null;
}

function getLandingUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);

    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0] || null;
  }
}

function getCampaignAttribution(
  event: IncomingEvent,
  workspaceId: string,
  projectId: string,
  occurredAt: Date
): typeof visitorCampaignAttribution.$inferInsert | null {
  const attribution = {
    utmSource: normalizeCampaignValue(event.utmSource),
    utmMedium: normalizeCampaignValue(event.utmMedium),
    utmCampaign: normalizeCampaignValue(event.utmCampaign),
    utmTerm: normalizeCampaignValue(event.utmTerm),
    utmContent: normalizeCampaignValue(event.utmContent),
  };

  if (!Object.values(attribution).some(Boolean)) return null;

  return {
    workspaceId,
    projectId,
    visitorId: event.visitorId,
    ...attribution,
    landingUrl: getLandingUrl(event.url),
    firstSeenAt: occurredAt,
  };
}

export async function createEvents(
  incomingEvents: IncomingEvent[],
  ip?: string | null,
  geo?: GeoLocation | null
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
  const attributionRows = new Map<
    string,
    typeof visitorCampaignAttribution.$inferInsert
  >();

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

    const attribution = getCampaignAttribution(
      event,
      project.workspaceId,
      project.projectId,
      occurredAt
    );

    if (attribution) {
      const attributionKey = `${project.projectId}:${event.visitorId}`;
      const existingAttribution = attributionRows.get(attributionKey);

      if (
        !existingAttribution ||
        occurredAt.getTime() <
          new Date(existingAttribution.firstSeenAt).getTime()
      ) {
        attributionRows.set(attributionKey, attribution);
      }
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

      country: geo?.country ?? event.country ?? event.countryCode,
      countryCode: geo?.countryCode ?? event.countryCode,
      region: geo?.region ?? event.region,
      city: geo?.city ?? event.city,

      timezone: event.timezone ?? geo?.timezone,
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

  await db.transaction(async (transaction) => {
    await transaction.insert(events).values(rows);

    if (attributionRows.size > 0) {
      await transaction
        .insert(visitorCampaignAttribution)
        .values(Array.from(attributionRows.values()))
        .onConflictDoUpdate({
          target: [
            visitorCampaignAttribution.workspaceId,
            visitorCampaignAttribution.projectId,
            visitorCampaignAttribution.visitorId,
          ],
          set: {
            utmSource: sql`excluded.utm_source`,
            utmMedium: sql`excluded.utm_medium`,
            utmCampaign: sql`excluded.utm_campaign`,
            utmTerm: sql`excluded.utm_term`,
            utmContent: sql`excluded.utm_content`,
            landingUrl: sql`excluded.landing_url`,
            firstSeenAt: sql`excluded.first_seen_at`,
          },
          setWhere: sql`
            excluded.first_seen_at < ${visitorCampaignAttribution.firstSeenAt}
          `,
        });
    }
  });
}

export async function getEventsModel(
  filters: EventsFilters
): Promise<EventsData> {
  const rangeDays = RANGE_DAYS[filters.range];
  const search = filters.search?.trim().toLowerCase();
  const searchPattern = search ? `%${search}%` : null;
  const searchFilter = searchPattern
    ? sql` AND (
        LOWER(COALESCE(events.type, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(events.path, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(events.visitor_id, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(events.device, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(events.country, '')) LIKE ${searchPattern}
        OR LOWER(COALESCE(events.country_code, '')) LIKE ${searchPattern}
        OR LOWER(events.payload::text) LIKE ${searchPattern}
      )`
    : sql``;
  const categoryFilter = getCategoryFilter(filters.category);
  const deviceFilter =
    filters.device !== "all"
      ? sql` AND LOWER(COALESCE(events.device, 'unknown')) = ${filters.device}`
      : sql``;
  const pathFilter = filters.path
    ? sql` AND COALESCE(NULLIF(events.path, ''), '/') = ${filters.path.trim()}`
    : sql``;
  const eventWhere = sql`
    events.workspace_id = ${filters.workspaceId}
    AND events.project_id = ${filters.projectId}
    AND events.occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ${categoryFilter}
    ${deviceFilter}
    ${pathFilter}
    ${searchFilter}
  `;
  const offset = (filters.page - 1) * filters.pageSize;

  const [eventsResult, countResult, summaryResult] = await Promise.all([
    db.execute<EventRow>(sql`
      SELECT
        events.id::text AS event_id,
        events.type,
        events.session_id,
        events.path,
        events.url,
        events.title,
        events.referrer,
        events.referrer_domain,
        events.visitor_id,
        events.device,
        events.browser,
        events.browser_version,
        events.os,
        events.os_version,
        events.country,
        events.country_code,
        events.payload->>'tag' AS event_tag,
        events.payload->>'text' AS event_text,
        events.payload,
        replay.id IS NOT NULL
          AND replay.event_count >= 2
          AND EXISTS (
            SELECT 1
            FROM replay_chunks replay_chunk
            WHERE replay_chunk.session_id = replay.id
              AND replay_chunk.events @> '[{"type": 2}]'::jsonb
          ) AS replay_available,
        events.occurred_at
      FROM events
      LEFT JOIN replay_sessions replay
        ON replay.id = events.session_id
        AND replay.workspace_id = ${filters.workspaceId}
        AND replay.project_id = ${filters.projectId}
      WHERE ${eventWhere}
      ORDER BY events.occurred_at DESC, events.id DESC
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
        COUNT(DISTINCT events.session_id)::int AS total_sessions,
        COUNT(DISTINCT events.visitor_id)::int AS total_visitors,
        COUNT(*) FILTER (
          WHERE events.type IN (
            'click', 'form_submit', 'form_success', 'form_error', 'custom'
          )
        )::int AS high_signal_actions
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
      category: getEventCategory(event.type),
      description: getEventDescription(
        event.type,
        event.path?.trim() || "/",
        event.payload
      ),
      sessionId: event.session_id,
      path: event.path?.trim() || "/",
      url: event.url,
      title: event.title,
      referrer: event.referrer,
      referrerDomain: event.referrer_domain,
      visitorId: event.visitor_id,
      device: formatDevice(event.device),
      country: formatCountry(event.country, event.country_code),
      countryCode: event.country_code?.trim().toUpperCase() || "--",
      browser: event.browser,
      browserVersion: event.browser_version,
      os: event.os,
      osVersion: event.os_version,
      tag: event.event_tag,
      text: event.event_text,
      details: getEventDetails(event.type, event.payload),
      replayAvailable: Boolean(event.replay_available),
      occurredAt: toIso(event.occurred_at),
    })),
    summary: {
      totalEvents: toNumber(summary?.total_events),
      totalSessions: toNumber(summary?.total_sessions),
      totalVisitors: toNumber(summary?.total_visitors),
      highSignalActions: toNumber(summary?.high_signal_actions),
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
