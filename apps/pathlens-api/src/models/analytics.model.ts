import { sql } from "drizzle-orm";
import { db } from "../db/client";

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d";
export type AnalyticsDevice = "all" | "desktop" | "mobile" | "tablet";

export interface AnalyticsFilters {
  workspaceId: string;
  projectId?: string;
  range: AnalyticsRange;
  device: AnalyticsDevice;
}

export interface AnalyticsResponse {
  summary: {
    visitors: number;
    sessions: number;
    pageViews: number;
    bounceRate: number;
    avgDuration: string;
  };
  traffic: {
    day: string;
    visitors: number;
    sessions: number;
  }[];
  devices: {
    name: string;
    value: number;
  }[];
  referrers: {
    name: string;
    visitors: number;
  }[];
  countries: {
    name: string;
    code: string;
    visitors: number;
  }[];
  browsers: {
    name: string;
    visitors: number;
  }[];
  pages: {
    page: string | null;
    views: number;
    duration: string;
  }[];
  visitorBreakdown: {
    new: number;
    returning: number;
  };
}

interface SummaryRow extends Record<string, unknown> {
  visitors: number | string | null;
  sessions: number | string | null;
  page_views: number | string | null;
  bounce_rate: number | string | null;
  avg_duration_seconds: number | string | null;
}

interface PageRow extends Record<string, unknown> {
  page: string | null;
  views: number | string | null;
  avg_duration_seconds: number | string | null;
}

interface VisitorBreakdownRow extends Record<string, unknown> {
  new_visitors: number | string | null;
  returning_visitors: number | string | null;
}

interface TrafficRow extends Record<string, unknown> {
  day: string;
  visitors: number | string | null;
  sessions: number | string | null;
}

interface DeviceRow extends Record<string, unknown> {
  name: string | null;
  sessions: number | string | null;
}

interface ReferrerRow extends Record<string, unknown> {
  name: string | null;
  visitors: number | string | null;
}

interface CountryRow extends Record<string, unknown> {
  code: string | null;
  name: string | null;
  visitors: number | string | null;
}

interface BrowserRow extends Record<string, unknown> {
  name: string | null;
  visitors: number | string | null;
}

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const COUNTRY_NAMES: Record<string, string> = {
  CA: "Canada",
  DE: "Germany",
  GB: "United Kingdom",
  IN: "India",
  US: "United States",
};

interface RegionDisplayNames {
  of(code: string): string | undefined;
}

interface IntlWithDisplayNames {
  DisplayNames?: new (
    locales: string | string[],
    options: { type: "region" }
  ) => RegionDisplayNames;
}

const displayNamesConstructor = (Intl as unknown as IntlWithDisplayNames)
  .DisplayNames;
const regionDisplayNames = displayNamesConstructor
  ? new displayNamesConstructor(["en"], { type: "region" })
  : null;

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
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

function getCountryName(code: string, fallback: string): string {
  if (COUNTRY_NAMES[code]) return COUNTRY_NAMES[code];
  if (!/^[A-Z]{2}$/.test(code)) return fallback;

  return regionDisplayNames?.of(code) ?? fallback;
}

function formatReferrerName(name: string): string {
  const domain = name.toLowerCase();

  if (domain === "direct") return "Direct";
  if (domain.includes("google.")) return "Google";
  if (domain.includes("linkedin.")) return "LinkedIn";
  if (domain.includes("twitter.") || domain === "x.com") return "Twitter";
  if (domain.includes("github.")) return "GitHub";

  return name;
}

export async function getAnalyticsModel(
  filters: AnalyticsFilters
): Promise<AnalyticsResponse> {
  const rangeDays = RANGE_DAYS[filters.range];
  const projectFilter = filters.projectId
    ? sql` AND project_id = ${filters.projectId}`
    : sql``;
  const deviceFilter =
    filters.device !== "all"
      ? sql` AND LOWER(device) = ${filters.device}`
      : sql``;
  const eventWhere = sql`
    workspace_id = ${filters.workspaceId}
    AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ${projectFilter}
    ${deviceFilter}
  `;

  const [
    summaryResult,
    trafficResult,
    devicesResult,
    referrersResult,
    countriesResult,
    browsersResult,
    pagesResult,
    visitorBreakdownResult,
  ] = await Promise.all([
    db.execute<SummaryRow>(sql`
        WITH filtered_events AS (
          SELECT
            visitor_id,
            session_id,
            type,
            occurred_at,
            session_duration_ms
          FROM events
          WHERE ${eventWhere}
        ),
        session_stats AS (
          SELECT
            session_id,
            COUNT(*) FILTER (WHERE type = 'page_view') AS page_views,
            MIN(occurred_at) AS started_at,
            MAX(occurred_at) AS ended_at,
            MAX(session_duration_ms) AS session_duration_ms
          FROM filtered_events
          GROUP BY session_id
        )
        SELECT
          (SELECT COUNT(DISTINCT visitor_id) FROM filtered_events)::int AS visitors,
          (SELECT COUNT(DISTINCT session_id) FROM filtered_events)::int AS sessions,
          COALESCE(SUM(page_views), 0)::int AS page_views,
          COALESCE(
            100.0 * COUNT(*) FILTER (WHERE page_views = 1)
              / NULLIF(COUNT(*), 0),
            0
          )::float AS bounce_rate,
          COALESCE(
            AVG(
              CASE
                WHEN session_duration_ms IS NOT NULL
                  THEN session_duration_ms / 1000.0
                ELSE EXTRACT(EPOCH FROM (ended_at - started_at))
              END
            ),
            0
          )::float AS avg_duration_seconds
        FROM session_stats;
      `),
    db.execute<TrafficRow>(sql`
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - make_interval(days => ${rangeDays - 1}),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        )
        SELECT
          TO_CHAR(days.day, 'Dy') AS day,
          COUNT(DISTINCT e.visitor_id)::int AS visitors,
          COUNT(DISTINCT e.session_id)::int AS sessions
        FROM days
        LEFT JOIN events e
          ON e.occurred_at >= NOW() - make_interval(days => ${rangeDays})
          AND e.occurred_at >= days.day
          AND e.occurred_at < days.day + INTERVAL '1 day'
          AND e.workspace_id = ${filters.workspaceId}
          ${projectFilter}
          ${deviceFilter}
        GROUP BY days.day
        ORDER BY days.day;
      `),
    db.execute<DeviceRow>(sql`
        SELECT
          COALESCE(NULLIF(LOWER(device), ''), 'unknown') AS name,
          COUNT(DISTINCT session_id)::int AS sessions
        FROM events
        WHERE ${eventWhere}
        GROUP BY COALESCE(NULLIF(LOWER(device), ''), 'unknown')
        ORDER BY sessions DESC;
      `),
    db.execute<ReferrerRow>(sql`
        SELECT
          COALESCE(NULLIF(referrer_domain, ''), 'Direct') AS name,
          COUNT(DISTINCT visitor_id)::int AS visitors
        FROM events
        WHERE ${eventWhere}
        GROUP BY COALESCE(NULLIF(referrer_domain, ''), 'Direct')
        ORDER BY visitors DESC
        LIMIT 5;
      `),
    db.execute<CountryRow>(sql`
        SELECT
          NULLIF(country_code, '') AS code,
          NULLIF(country, '') AS name,
          COUNT(DISTINCT visitor_id)::int AS visitors
        FROM events
        WHERE ${eventWhere}
        GROUP BY country_code, country
        ORDER BY visitors DESC
        LIMIT 5;
      `),
    db.execute<BrowserRow>(sql`
        SELECT
          COALESCE(NULLIF(browser, ''), 'Other') AS name,
          COUNT(DISTINCT visitor_id)::int AS visitors
        FROM events
        WHERE ${eventWhere}
        GROUP BY COALESCE(NULLIF(browser, ''), 'Other')
        ORDER BY visitors DESC
        LIMIT 5;
      `),
    db.execute<PageRow>(sql`
        WITH page_visits AS (
          SELECT
            session_id,
            path,
            occurred_at AS page_enter,
            LEAD(occurred_at) OVER (
              PARTITION BY session_id
              ORDER BY occurred_at
            ) AS next_event_at
          FROM events
          WHERE ${eventWhere}
            AND type = 'page_view'
        ),
        page_stats AS (
          SELECT
            path AS page,
            COUNT(*)::int AS views,
            AVG(
              EXTRACT(
                EPOCH FROM (
                  COALESCE(next_event_at, page_enter) - page_enter
                )
              )
            )::int AS avg_duration_seconds
          FROM page_visits
          GROUP BY path
        )
        SELECT page, views, avg_duration_seconds
        FROM page_stats
        ORDER BY views DESC
        LIMIT 5;
      `),
    db.execute<VisitorBreakdownRow>(sql`
        WITH current_visitors AS (
          SELECT DISTINCT visitor_id
          FROM events
          WHERE ${eventWhere}
        )
        SELECT
          COUNT(*) FILTER (
            WHERE NOT EXISTS (
              SELECT 1
              FROM events previous
              WHERE previous.workspace_id = ${filters.workspaceId}
                AND previous.visitor_id = current_visitors.visitor_id
                AND previous.occurred_at < NOW() - make_interval(days => ${rangeDays})
                ${projectFilter}
            )
          )::int AS new_visitors,
          COUNT(*) FILTER (
            WHERE EXISTS (
              SELECT 1
              FROM events previous
              WHERE previous.workspace_id = ${filters.workspaceId}
                AND previous.visitor_id = current_visitors.visitor_id
                AND previous.occurred_at < NOW() - make_interval(days => ${rangeDays})
                ${projectFilter}
            )
          )::int AS returning_visitors
        FROM current_visitors;
      `),
  ]);

  const summary = summaryResult.rows[0];
  const devicesTotal = devicesResult.rows.reduce(
    (total, row) => total + toNumber(row.sessions),
    0
  );

  const devices = devicesResult.rows.map((row) => {
    const name = row.name ?? "unknown";
    const label =
      name === "desktop"
        ? "Desktop"
        : name === "mobile"
          ? "Mobile"
          : name === "tablet"
            ? "Tablet"
            : "Unknown";

    return {
      name: label,
      value:
        devicesTotal > 0
          ? Number(((toNumber(row.sessions) / devicesTotal) * 100).toFixed(1))
          : 0,
    };
  });

  const countries = countriesResult.rows.map((row) => {
    const code = row.code?.toUpperCase() ?? "--";
    const fallbackName = row.name ?? (code === "--" ? "Unknown" : code);

    return {
      code,
      name: getCountryName(code, fallbackName),
      visitors: toNumber(row.visitors),
    };
  });

  const visitorBreakdown = visitorBreakdownResult.rows[0];

  return {
    summary: {
      visitors: toNumber(summary?.visitors),
      sessions: toNumber(summary?.sessions),
      pageViews: toNumber(summary?.page_views),
      bounceRate: Number(toNumber(summary?.bounce_rate).toFixed(1)),
      avgDuration: formatDuration(toNumber(summary?.avg_duration_seconds)),
    },
    traffic: trafficResult.rows.map((row) => ({
      day: row.day,
      visitors: toNumber(row.visitors),
      sessions: toNumber(row.sessions),
    })),
    devices,
    referrers: referrersResult.rows.map((row) => ({
      name: formatReferrerName(row.name ?? "Direct"),
      visitors: toNumber(row.visitors),
    })),
    countries,
    browsers: browsersResult.rows.map((row) => ({
      name: row.name ?? "Other",
      visitors: toNumber(row.visitors),
    })),
    pages: pagesResult.rows.map((row) => {
      const seconds = toNumber(row.avg_duration_seconds);
      const minutes = Math.floor(seconds / 60);
      const remaining = seconds % 60;

      return {
        page: row.page,
        views: toNumber(row.views),
        duration: minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`,
      };
    }),
    visitorBreakdown: {
      new: toNumber(visitorBreakdown?.new_visitors),
      returning: toNumber(visitorBreakdown?.returning_visitors),
    },
  };
}
