import { sql } from "drizzle-orm";
import { db } from "../db/client";

export type PerformanceRange = "24h" | "7d" | "30d" | "90d";
export type PerformanceDevice = "all" | "desktop" | "mobile" | "tablet";

export interface PerformanceFilters {
  workspaceId: string;
  projectId?: string;
  range: PerformanceRange;
  device: PerformanceDevice;
}

export interface PerformanceResponse {
  summary: {
    avgTtfb: number;
    avgDomLoaded: number;
    avgLoad: number;
    avgDns: number;
    avgTcp: number;
    p75Ttfb: number;
    p75DomLoaded: number;
    p75Load: number;
    totalSamples: number;
  };
  trend: {
    day: string;
    ttfb: number;
    domLoaded: number;
    load: number;
  }[];
  pages: {
    path: string;
    samples: number;
    avgTtfb: number;
    avgDomLoaded: number;
    avgLoad: number;
  }[];
  browsers: {
    name: string;
    avgTtfb: number;
    avgLoad: number;
    samples: number;
  }[];
  devices: {
    name: string;
    avgTtfb: number;
    avgLoad: number;
    samples: number;
  }[];
}

interface SummaryRow extends Record<string, unknown> {
  avg_ttfb: number | string | null;
  avg_dom_loaded: number | string | null;
  avg_load: number | string | null;
  avg_dns: number | string | null;
  avg_tcp: number | string | null;
  p75_ttfb: number | string | null;
  p75_dom_loaded: number | string | null;
  p75_load: number | string | null;
  total_samples: number | string | null;
}

interface TrendRow extends Record<string, unknown> {
  day: string;
  ttfb: number | string | null;
  dom_loaded: number | string | null;
  load: number | string | null;
}

interface PageRow extends Record<string, unknown> {
  path: string | null;
  samples: number | string | null;
  avg_ttfb: number | string | null;
  avg_dom_loaded: number | string | null;
  avg_load: number | string | null;
}

interface BrowserRow extends Record<string, unknown> {
  name: string | null;
  avg_ttfb: number | string | null;
  avg_load: number | string | null;
  samples: number | string | null;
}

interface DeviceRow extends Record<string, unknown> {
  name: string | null;
  avg_ttfb: number | string | null;
  avg_load: number | string | null;
  samples: number | string | null;
}

const RANGE_DAYS: Record<PerformanceRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function getProjectFilter(projectId?: string) {
  return projectId ? sql` AND project_id = ${projectId}` : sql``;
}

export async function getPerformanceModel(
  filters: PerformanceFilters
): Promise<PerformanceResponse> {
  const rangeDays = RANGE_DAYS[filters.range];
  const projectFilter = getProjectFilter(filters.projectId);
  const deviceFilter =
    filters.device !== "all"
      ? sql` AND LOWER(device) = ${filters.device}`
      : sql``;

  const baseWhere = sql`
    workspace_id = ${filters.workspaceId}
    AND type = 'performance'
    AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ${projectFilter}
    ${deviceFilter}
  `;

  const [
    summaryResult,
    trendResult,
    pagesResult,
    browsersResult,
    devicesResult,
  ] = await Promise.all([
    db.execute<SummaryRow>(sql`
        SELECT
          AVG((payload->>'ttfb')::float)::float AS avg_ttfb,
          AVG((payload->>'domLoaded')::float)::float AS avg_dom_loaded,
          AVG((payload->>'load')::float)::float AS avg_load,
          AVG((payload->>'dns')::float)::float AS avg_dns,
          AVG((payload->>'tcp')::float)::float AS avg_tcp,
          PERCENTILE_CONT(0.75) WITHIN GROUP (
            ORDER BY (payload->>'ttfb')::float
          )::float AS p75_ttfb,
          PERCENTILE_CONT(0.75) WITHIN GROUP (
            ORDER BY (payload->>'domLoaded')::float
          )::float AS p75_dom_loaded,
          PERCENTILE_CONT(0.75) WITHIN GROUP (
            ORDER BY (payload->>'load')::float
          )::float AS p75_load,
          COUNT(*)::int AS total_samples
        FROM events
        WHERE ${baseWhere}
      `),
    db.execute<TrendRow>(sql`
        WITH days AS (
          SELECT generate_series(
            CURRENT_DATE - make_interval(days => ${rangeDays - 1}),
            CURRENT_DATE,
            INTERVAL '1 day'
          )::date AS day
        )
        SELECT
          TO_CHAR(days.day, 'Dy') AS day,
          AVG((e.payload->>'ttfb')::float)::float AS ttfb,
          AVG((e.payload->>'domLoaded')::float)::float AS dom_loaded,
          AVG((e.payload->>'load')::float)::float AS load
        FROM days
        LEFT JOIN events e
          ON e.occurred_at >= days.day
          AND e.occurred_at < days.day + INTERVAL '1 day'
          AND e.workspace_id = ${filters.workspaceId}
          AND e.type = 'performance'
          ${projectFilter}
          ${deviceFilter}
        GROUP BY days.day
        ORDER BY days.day;
      `),
    db.execute<PageRow>(sql`
        SELECT
          COALESCE(NULLIF(path, ''), '/') AS path,
          COUNT(*)::int AS samples,
          AVG((payload->>'ttfb')::float)::float AS avg_ttfb,
          AVG((payload->>'domLoaded')::float)::float AS avg_dom_loaded,
          AVG((payload->>'load')::float)::float AS avg_load
        FROM events
        WHERE ${baseWhere}
        GROUP BY COALESCE(NULLIF(path, ''), '/')
        ORDER BY samples DESC
        LIMIT 10;
      `),
    db.execute<BrowserRow>(sql`
        SELECT
          COALESCE(NULLIF(browser, ''), 'Other') AS name,
          AVG((payload->>'ttfb')::float)::float AS avg_ttfb,
          AVG((payload->>'load')::float)::float AS avg_load,
          COUNT(*)::int AS samples
        FROM events
        WHERE ${baseWhere}
        GROUP BY COALESCE(NULLIF(browser, ''), 'Other')
        ORDER BY samples DESC
        LIMIT 8;
      `),
    db.execute<DeviceRow>(sql`
        SELECT
          COALESCE(NULLIF(LOWER(device), ''), 'unknown') AS name,
          AVG((payload->>'ttfb')::float)::float AS avg_ttfb,
          AVG((payload->>'load')::float)::float AS avg_load,
          COUNT(*)::int AS samples
        FROM events
        WHERE ${baseWhere}
        GROUP BY COALESCE(NULLIF(LOWER(device), ''), 'unknown')
        ORDER BY samples DESC;
      `),
  ]);

  const summary = summaryResult.rows[0];

  return {
    summary: {
      avgTtfb: Number(toNumber(summary?.avg_ttfb).toFixed(0)),
      avgDomLoaded: Number(toNumber(summary?.avg_dom_loaded).toFixed(0)),
      avgLoad: Number(toNumber(summary?.avg_load).toFixed(0)),
      avgDns: Number(toNumber(summary?.avg_dns).toFixed(0)),
      avgTcp: Number(toNumber(summary?.avg_tcp).toFixed(0)),
      p75Ttfb: Number(toNumber(summary?.p75_ttfb).toFixed(0)),
      p75DomLoaded: Number(toNumber(summary?.p75_dom_loaded).toFixed(0)),
      p75Load: Number(toNumber(summary?.p75_load).toFixed(0)),
      totalSamples: toNumber(summary?.total_samples),
    },
    trend: trendResult.rows.map((row) => ({
      day: row.day,
      ttfb: Number(toNumber(row.ttfb).toFixed(0)),
      domLoaded: Number(toNumber(row.dom_loaded).toFixed(0)),
      load: Number(toNumber(row.load).toFixed(0)),
    })),
    pages: pagesResult.rows.map((row) => ({
      path: row.path ?? "/",
      samples: toNumber(row.samples),
      avgTtfb: Number(toNumber(row.avg_ttfb).toFixed(0)),
      avgDomLoaded: Number(toNumber(row.avg_dom_loaded).toFixed(0)),
      avgLoad: Number(toNumber(row.avg_load).toFixed(0)),
    })),
    browsers: browsersResult.rows.map((row) => ({
      name: row.name ?? "Other",
      avgTtfb: Number(toNumber(row.avg_ttfb).toFixed(0)),
      avgLoad: Number(toNumber(row.avg_load).toFixed(0)),
      samples: toNumber(row.samples),
    })),
    devices: devicesResult.rows.map((row) => ({
      name: row.name ?? "unknown",
      avgTtfb: Number(toNumber(row.avg_ttfb).toFixed(0)),
      avgLoad: Number(toNumber(row.avg_load).toFixed(0)),
      samples: toNumber(row.samples),
    })),
  };
}
