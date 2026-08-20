import { sql } from "drizzle-orm";
import { db } from "../db/client";

export type DashboardRange = "24h" | "7d" | "30d" | "90d";
export type DashboardDevice = "all" | "desktop" | "mobile" | "tablet";

export interface DashboardFilters {
  workspaceId: string;
  projectId?: string;
  range: DashboardRange;
  device: DashboardDevice;
}

const RANGE_DAYS: Record<DashboardRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export interface DashboardDifference {
  value: number;
  positive: boolean;
}

export interface DashboardResponse {
  visitors: number;
  sessions: number;
  events: number;
  pageViews: number;
  avgSessionDuration: string;
  weeklyChange: {
    visitors: DashboardDifference;
    sessions: DashboardDifference;
    pageViews: DashboardDifference;
    events: DashboardDifference;
  };
  pages: {
    page: string | null;
    views: number;
    duration: string;
  }[];
  visitorsChart: {
    day: string;
    visitors: number;
    sessions: number;
  }[];
  trafficSources: {
    name: string;
    value: number;
    visitors: number;
  }[];
  devices: {
    name: string;
    value: number;
    sessions: number;
  }[];
  visitorBreakdown: {
    new: number;
    returning: number;
  };
  topEvents: {
    name: string;
    count: number;
  }[];
  insights: string[];
  liveVisitors: number;
  avgSessionDurationChange: DashboardDifference;
  bounceRate: number;
  bounceRateChange: DashboardDifference;
  conversionRate: number;
  conversionRateChange: DashboardDifference;
}

interface StatsRow extends Record<string, unknown> {
  visitors: number | string | null;
  sessions: number | string | null;
  event_count: number | string | null;
  page_views: number | string | null;
  avg_session_duration_seconds: number | string | null;
  avg_session_duration_this_week: number | string | null;
  avg_session_duration_last_week: number | string | null;
  bounce_rate_this_week: number | string | null;
  bounce_rate_last_week: number | string | null;
  visitors_this_week: number | string | null;
  visitors_last_week: number | string | null;
  sessions_this_week: number | string | null;
  sessions_last_week: number | string | null;
  page_views_this_week: number | string | null;
  page_views_last_week: number | string | null;
  events_this_week: number | string | null;
  events_last_week: number | string | null;
  converted_sessions_this_week: number | string | null;
  converted_sessions_last_week: number | string | null;
}

interface PageRow extends Record<string, unknown> {
  page: string | null;
  views: number | string | null;
  avg_duration_seconds: number | string | null;
}

interface VisitorChartRow extends Record<string, unknown> {
  day: string;
  visitors: number | string | null;
  sessions: number | string | null;
}

interface SourceRow extends Record<string, unknown> {
  name: string | null;
  visitors: number | string | null;
}

interface DeviceRow extends Record<string, unknown> {
  name: string | null;
  sessions: number | string | null;
}

interface VisitorBreakdownRow extends Record<string, unknown> {
  new_visitors: number | string | null;
  returning_visitors: number | string | null;
}

interface TopEventRow extends Record<string, unknown> {
  event_type: string | null;
  count: number | string | null;
}

interface LiveVisitorsRow extends Record<string, unknown> {
  live_visitors: number | string | null;
}

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

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatEventName(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatReferrerName(value: string): string {
  const domain = value.toLowerCase();

  if (domain === "direct") return "Direct";
  if (domain.includes("google.")) return "Google";
  if (domain.includes("linkedin.")) return "LinkedIn";
  if (domain.includes("twitter.") || domain === "x.com") return "Twitter";
  if (domain.includes("github.")) return "GitHub";

  return value;
}

function getChange(current: number, previous: number): DashboardDifference {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      positive: current >= previous,
    };
  }

  const change = ((current - previous) / previous) * 100;

  return {
    value: Number(change.toFixed(1)),
    positive: change >= 0,
  };
}

function getDifference(current: number, previous: number): DashboardDifference {
  const difference = Number((current - previous).toFixed(1));

  return {
    value: difference,
    positive: difference >= 0,
  };
}

function getRate(convertedSessions: number, sessions: number): number {
  if (sessions === 0) return 0;

  return Number(((convertedSessions / sessions) * 100).toFixed(1));
}

function buildInsights(data: {
  bounceRate: number;
  trafficSources: DashboardResponse["trafficSources"];
  devices: DashboardResponse["devices"];
  pages: DashboardResponse["pages"];
}): string[] {
  const insights: string[] = [];

  const topSource = data.trafficSources[0];
  if (topSource) {
    insights.push(
      `${topSource.name} is the top traffic source with ${formatCount(topSource.visitors)} visitors this week.`
    );
  }

  const topPage = data.pages[0];
  if (topPage?.page) {
    insights.push(
      `${topPage.page} is the most viewed page with ${formatCount(topPage.views)} views this week.`
    );
  }

  const topDevice = data.devices[0];
  if (topDevice) {
    insights.push(
      `${topDevice.name} accounts for ${topDevice.value}% of sessions this week.`
    );
  }

  if (data.pages.length > 0 || data.trafficSources.length > 0) {
    insights.push(`Bounce rate is ${data.bounceRate}% this week.`);
  }

  return insights.slice(0, 4);
}

export async function getDashboardModel(
  filters: DashboardFilters
): Promise<DashboardResponse> {
  const rangeDays = RANGE_DAYS[filters.range];
  const previousRangeDays = rangeDays;
  const projectFilter = filters.projectId
    ? sql` AND project_id = ${filters.projectId}`
    : sql``;
  const deviceFilter =
    filters.device !== "all"
      ? sql` AND LOWER(device) = ${filters.device}`
      : sql``;
  const baseFilter = sql`
    workspace_id = ${filters.workspaceId}
    ${projectFilter}
    ${deviceFilter}
  `;

  const [
    statsResult,
    pagesResult,
    visitorsChartResult,
    sourcesResult,
    devicesResult,
    visitorBreakdownResult,
    topEventsResult,
    liveVisitorsResult,
  ] = await Promise.all([
    db.execute<StatsRow>(sql`
        WITH filtered_events AS (
          SELECT
            visitor_id,
            session_id,
            type,
            occurred_at,
            session_duration_ms
          FROM events
          WHERE ${baseFilter}
        ),
        session_stats AS (
          SELECT
            session_id,
            COUNT(*) AS event_count,
            MAX(occurred_at) AS last_event_at,
            MAX(session_duration_ms) AS session_duration_ms,
            EXTRACT(EPOCH FROM (MAX(occurred_at) - MIN(occurred_at))) AS fallback_duration
          FROM filtered_events
          GROUP BY session_id
        ),
        period_session_stats AS (
          SELECT
            session_id,
            COUNT(*) FILTER (WHERE type = 'page_view') AS page_views
          FROM filtered_events
          WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays})
          GROUP BY session_id
        ),
        period_session_stats_last_week AS (
          SELECT
            session_id,
            COUNT(*) FILTER (WHERE type = 'page_view') AS page_views
          FROM filtered_events
          WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
            AND occurred_at < NOW() - make_interval(days => ${rangeDays})
          GROUP BY session_id
        )
        SELECT
          (SELECT COUNT(DISTINCT visitor_id) FROM filtered_events
           WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays}))::int AS visitors,
          (SELECT COUNT(DISTINCT session_id) FROM filtered_events
           WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays}))::int AS sessions,
          (SELECT COUNT(*) FROM filtered_events
           WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays}))::int AS event_count,
          (SELECT COUNT(*) FROM filtered_events WHERE type = 'page_view'
           AND occurred_at >= NOW() - make_interval(days => ${rangeDays}))::int AS page_views,
          COALESCE(
            (
              SELECT AVG(
                CASE
                  WHEN session_duration_ms IS NOT NULL
                    THEN session_duration_ms / 1000.0
                  ELSE fallback_duration
                END
              )
              FROM session_stats
              WHERE event_count > 1 OR session_duration_ms IS NOT NULL
            ),
            0
          )::float AS avg_session_duration_seconds,
          COALESCE(
            (
              SELECT AVG(
                CASE
                  WHEN session_duration_ms IS NOT NULL
                    THEN session_duration_ms / 1000.0
                  ELSE fallback_duration
                END
              )
              FROM session_stats
              WHERE (event_count > 1 OR session_duration_ms IS NOT NULL)
                AND last_event_at >= NOW() - make_interval(days => ${rangeDays})
            ),
            0
          )::float AS avg_session_duration_this_week,
          COALESCE(
            (
              SELECT AVG(
                CASE
                  WHEN session_duration_ms IS NOT NULL
                    THEN session_duration_ms / 1000.0
                  ELSE fallback_duration
                END
              )
              FROM session_stats
              WHERE (event_count > 1 OR session_duration_ms IS NOT NULL)
                AND last_event_at >= NOW() - make_interval(days => ${rangeDays * 2})
                AND last_event_at < NOW() - make_interval(days => ${rangeDays})
            ),
            0
          )::float AS avg_session_duration_last_week,
          COALESCE(
            100.0 * (
              SELECT COUNT(*) FILTER (WHERE page_views = 1)
              FROM period_session_stats
            ) / NULLIF((SELECT COUNT(*) FROM period_session_stats), 0),
            0
          )::float AS bounce_rate_this_week,
          COALESCE(
            100.0 * (
              SELECT COUNT(*) FILTER (WHERE page_views = 1)
              FROM period_session_stats_last_week
            ) / NULLIF((SELECT COUNT(*) FROM period_session_stats_last_week), 0),
            0
          )::float AS bounce_rate_last_week,
          COUNT(DISTINCT visitor_id) FILTER (
            WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays})
          )::int AS visitors_this_week,
          COUNT(DISTINCT visitor_id) FILTER (
            WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
              AND occurred_at < NOW() - make_interval(days => ${rangeDays})
          )::int AS visitors_last_week,
          COUNT(DISTINCT session_id) FILTER (
            WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays})
          )::int AS sessions_this_week,
          COUNT(DISTINCT session_id) FILTER (
            WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
              AND occurred_at < NOW() - make_interval(days => ${rangeDays})
          )::int AS sessions_last_week,
          COUNT(*) FILTER (
            WHERE type = 'page_view'
              AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
          )::int AS page_views_this_week,
          COUNT(*) FILTER (
            WHERE type = 'page_view'
              AND occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
              AND occurred_at < NOW() - make_interval(days => ${rangeDays})
          )::int AS page_views_last_week,
          COUNT(*) FILTER (
            WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays})
          )::int AS events_this_week,
          COUNT(*) FILTER (
            WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
              AND occurred_at < NOW() - make_interval(days => ${rangeDays})
          )::int AS events_last_week,
          COUNT(DISTINCT session_id) FILTER (
            WHERE type IN ('form_submit', 'custom')
              AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
          )::int AS converted_sessions_this_week,
          COUNT(DISTINCT session_id) FILTER (
            WHERE type IN ('form_submit', 'custom')
              AND occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
              AND occurred_at < NOW() - make_interval(days => ${rangeDays})
          )::int AS converted_sessions_last_week
        FROM filtered_events;
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
          WHERE ${baseFilter}
            AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
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
    db.execute<VisitorChartRow>(sql`
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
          AND e.type = 'page_view'
          ${projectFilter}
        GROUP BY days.day
        ORDER BY days.day;
      `),
    db.execute<SourceRow>(sql`
        SELECT
          COALESCE(NULLIF(referrer_domain, ''), 'Direct') AS name,
          COUNT(DISTINCT visitor_id)::int AS visitors
        FROM events
        WHERE ${baseFilter}
          AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
        GROUP BY COALESCE(NULLIF(referrer_domain, ''), 'Direct')
        ORDER BY visitors DESC
        LIMIT 5;
      `),
    db.execute<DeviceRow>(sql`
        SELECT
          COALESCE(NULLIF(LOWER(device), ''), 'unknown') AS name,
          COUNT(DISTINCT session_id)::int AS sessions
        FROM events
        WHERE ${baseFilter}
          AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
        GROUP BY COALESCE(NULLIF(LOWER(device), ''), 'unknown')
        ORDER BY sessions DESC;
      `),
    db.execute<VisitorBreakdownRow>(sql`
        WITH current_visitors AS (
          SELECT DISTINCT visitor_id
          FROM events
          WHERE ${baseFilter}
            AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
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
    db.execute<TopEventRow>(sql`
        SELECT
          type AS event_type,
          COUNT(*)::int AS count
        FROM events
        WHERE ${baseFilter}
          AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
          AND type NOT IN (
            'mousemove',
            'scroll',
            'resize',
            'performance',
            'session_start',
            'session_end'
          )
        GROUP BY type
        ORDER BY count DESC
        LIMIT 5;
      `),
    db.execute<LiveVisitorsRow>(sql`
        SELECT COUNT(DISTINCT visitor_id)::int AS live_visitors
        FROM events
        WHERE ${baseFilter}
          AND occurred_at >= NOW() - INTERVAL '5 minutes';
      `),
  ]);

  const stats = statsResult.rows[0];
  const visitorsThisWeek = toNumber(stats?.visitors_this_week);
  const visitorsLastWeek = toNumber(stats?.visitors_last_week);
  const sessionsThisWeek = toNumber(stats?.sessions_this_week);
  const sessionsLastWeek = toNumber(stats?.sessions_last_week);
  const pageViewsThisWeek = toNumber(stats?.page_views_this_week);
  const pageViewsLastWeek = toNumber(stats?.page_views_last_week);
  const eventsThisWeek = toNumber(stats?.events_this_week);
  const eventsLastWeek = toNumber(stats?.events_last_week);
  const avgSessionDurationThisWeek = toNumber(
    stats?.avg_session_duration_this_week
  );
  const avgSessionDurationLastWeek = toNumber(
    stats?.avg_session_duration_last_week
  );
  const conversionRate = getRate(
    toNumber(stats?.converted_sessions_this_week),
    sessionsThisWeek
  );
  const conversionRateLastWeek = getRate(
    toNumber(stats?.converted_sessions_last_week),
    sessionsLastWeek
  );

  const pages = pagesResult.rows.map((page) => {
    const seconds = toNumber(page.avg_duration_seconds);
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return {
      page: page.page,
      views: toNumber(page.views),
      duration: minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`,
    };
  });

  const visitorsChart = visitorsChartResult.rows.map((row) => ({
    day: row.day,
    visitors: toNumber(row.visitors),
    sessions: toNumber(row.sessions),
  }));

  const sourcesTotal = sourcesResult.rows.reduce(
    (total, row) => total + toNumber(row.visitors),
    0
  );
  const trafficSources = sourcesResult.rows.map((row) => ({
    name: formatReferrerName(row.name ?? "Direct"),
    value:
      sourcesTotal > 0
        ? Number(((toNumber(row.visitors) / sourcesTotal) * 100).toFixed(1))
        : 0,
    visitors: toNumber(row.visitors),
  }));

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
      sessions: toNumber(row.sessions),
    };
  });

  const visitorBreakdown = visitorBreakdownResult.rows[0];
  const visitorBreakdownData = {
    new: toNumber(visitorBreakdown?.new_visitors),
    returning: toNumber(visitorBreakdown?.returning_visitors),
  };

  const topEvents = topEventsResult.rows.map((row) => ({
    name: formatEventName(row.event_type ?? "unknown"),
    count: toNumber(row.count),
  }));

  const bounceRate = Number(toNumber(stats?.bounce_rate_this_week).toFixed(1));
  const bounceRateLastWeek = Number(
    toNumber(stats?.bounce_rate_last_week).toFixed(1)
  );
  const insights = buildInsights({
    bounceRate,
    trafficSources,
    devices,
    pages,
  });

  return {
    visitors: toNumber(stats?.visitors),
    sessions: toNumber(stats?.sessions),
    events: toNumber(stats?.event_count),
    pageViews: toNumber(stats?.page_views),
    avgSessionDuration: formatDuration(
      toNumber(stats?.avg_session_duration_seconds)
    ),
    weeklyChange: {
      visitors: getChange(visitorsThisWeek, visitorsLastWeek),
      sessions: getChange(sessionsThisWeek, sessionsLastWeek),
      pageViews: getChange(pageViewsThisWeek, pageViewsLastWeek),
      events: getChange(eventsThisWeek, eventsLastWeek),
    },
    pages,
    visitorsChart,
    trafficSources,
    devices,
    visitorBreakdown: visitorBreakdownData,
    topEvents,
    insights,
    liveVisitors: toNumber(liveVisitorsResult.rows[0]?.live_visitors),
    avgSessionDurationChange: getDifference(
      avgSessionDurationThisWeek,
      avgSessionDurationLastWeek
    ),
    bounceRate,
    bounceRateChange: getDifference(bounceRate, bounceRateLastWeek),
    conversionRate,
    conversionRateChange: getDifference(conversionRate, conversionRateLastWeek),
  };
}
