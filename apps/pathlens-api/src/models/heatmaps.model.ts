import { sql } from "drizzle-orm";
import type {
  HeatmapClickPoint,
  HeatmapPage,
  HeatmapPageDetail,
  HeatmapScrollPoint,
  HeatmapsData,
  ReplayEvent,
} from "@workspace/contracts";
import { db } from "../db/client";
import { getReplayDataModel } from "./replay.model";

const MAX_HEATMAP_EVENTS = 20_000;

export type HeatmapsRange = "24h" | "7d" | "30d" | "90d";

export interface HeatmapsFilters {
  workspaceId: string;
  projectId: string;
  range: HeatmapsRange;
  pagePath?: string;
}

interface PageRow extends Record<string, unknown> {
  path: string | null;
  url: string | null;
  visitors: number | string | null;
  views: number | string | null;
  clicks: number | string | null;
  scroll_events: number | string | null;
  max_scroll: number | string | null;
  average_scroll: number | string | null;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
}

interface HeatmapEventRow extends Record<string, unknown> {
  type: string;
  payload: Record<string, unknown> | null;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
}

interface ReplaySessionRow extends Record<string, unknown> {
  session_id: string;
}

const RANGE_DAYS: Record<HeatmapsRange, number> = {
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

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function getPayloadNumber(
  payload: Record<string, unknown> | null,
  key: string
): number | null {
  const value = payload?.[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function getPayloadViewport(
  payload: Record<string, unknown> | null
): { width: number; height: number } | null {
  const viewport = payload?.viewport;

  if (!viewport || typeof viewport !== "object") return null;

  const dimensions = viewport as Record<string, unknown>;
  const width = getPayloadNumber(dimensions, "width");
  const height = getPayloadNumber(dimensions, "height");

  return width && height ? { width, height } : null;
}

function getPageViewport(
  page: HeatmapPage,
  event: HeatmapEventRow
): { width: number; height: number } {
  const payloadViewport = getPayloadViewport(event.payload);

  return (
    payloadViewport ??
    page.viewport ?? {
      width: 1280,
      height: 720,
    }
  );
}

function mapPage(row: PageRow): HeatmapPage {
  const width = toNumber(row.viewport_width);
  const height = toNumber(row.viewport_height);

  return {
    path: row.path?.trim() || "/",
    url: row.url?.trim() || null,
    visitors: toNumber(row.visitors),
    views: toNumber(row.views),
    clicks: toNumber(row.clicks),
    scrollEvents: toNumber(row.scroll_events),
    maxScroll: clamp(toNumber(row.max_scroll)),
    averageScroll: clamp(toNumber(row.average_scroll)),
    viewport: width > 0 && height > 0 ? { width, height } : null,
  };
}

function buildClickPoints(
  rows: HeatmapEventRow[],
  page: HeatmapPage
): HeatmapClickPoint[] {
  const buckets = new Map<string, { x: number; y: number; count: number }>();

  for (const row of rows) {
    if (row.type !== "click") continue;

    const x = getPayloadNumber(row.payload, "x");
    const y = getPayloadNumber(row.payload, "y");

    if (x === null || y === null) continue;

    const viewport = getPageViewport(page, row);
    const xPercent = clamp((x / viewport.width) * 100);
    const yPercent = clamp((y / viewport.height) * 100);
    const xBucket = Math.floor(xPercent / 5);
    const yBucket = Math.floor(yPercent / 5);
    const key = `${xBucket}:${yBucket}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.count += 1;
    } else {
      buckets.set(key, {
        x: xBucket * 5 + 2.5,
        y: yBucket * 5 + 2.5,
        count: 1,
      });
    }
  }

  const maxCount = Math.max(
    ...Array.from(buckets.values()).map((item) => item.count),
    1
  );

  return Array.from(buckets.values())
    .map((point) => ({
      ...point,
      intensity: point.count / maxCount,
    }))
    .sort((left, right) => right.count - left.count);
}

function buildScrollPoints(rows: HeatmapEventRow[]): HeatmapScrollPoint[] {
  const buckets = new Map<number, number>();

  for (const row of rows) {
    if (row.type !== "scroll") continue;

    const percentage = getPayloadNumber(row.payload, "percentage");

    if (percentage === null) continue;

    const bucket = Math.floor(clamp(percentage) / 5) * 5;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }

  const maxCount = Math.max(...buckets.values(), 1);

  return Array.from(buckets.entries())
    .map(([percentage, count]) => ({
      percentage: percentage + 2.5,
      count,
      intensity: count / maxCount,
    }))
    .sort((left, right) => left.percentage - right.percentage);
}

async function getRepresentativeReplaySession(
  filters: HeatmapsFilters,
  pagePath: string,
  rangeDays: number
): Promise<string | null> {
  const result = await db.execute<ReplaySessionRow>(sql`
    SELECT
      page_event.session_id
    FROM events page_event
    INNER JOIN replay_sessions replay
      ON replay.id = page_event.session_id
      AND replay.workspace_id = ${filters.workspaceId}
      AND replay.project_id = ${filters.projectId}
    WHERE page_event.workspace_id = ${filters.workspaceId}
      AND page_event.project_id = ${filters.projectId}
      AND page_event.type = 'page_view'
      AND COALESCE(NULLIF(page_event.path, ''), '/') = ${pagePath}
      AND page_event.occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ORDER BY (
      NOT EXISTS (
        SELECT 1
        FROM events first_page
        WHERE first_page.session_id = page_event.session_id
          AND first_page.type = 'page_view'
          AND first_page.occurred_at < page_event.occurred_at
      )
    ) DESC, page_event.occurred_at DESC
    LIMIT 1;
  `);

  return result.rows[0]?.session_id ?? null;
}

export async function getHeatmapsModel(
  filters: HeatmapsFilters
): Promise<HeatmapsData> {
  const rangeDays = RANGE_DAYS[filters.range];
  const pageResult = await db.execute<PageRow>(sql`
    SELECT
      COALESCE(NULLIF(path, ''), '/') AS path,
      MAX(NULLIF(url, '')) FILTER (WHERE type = 'page_view') AS url,
      COUNT(DISTINCT visitor_id)::int AS visitors,
      COUNT(*) FILTER (WHERE type = 'page_view')::int AS views,
      COUNT(*) FILTER (WHERE type = 'click')::int AS clicks,
      COUNT(*) FILTER (WHERE type = 'scroll')::int AS scroll_events,
      COALESCE(
        MAX(
          CASE
            WHEN type = 'scroll'
              THEN NULLIF(payload->>'percentage', '')::double precision
            ELSE 0
          END
        ),
        0
      )::float AS max_scroll,
      COALESCE(
        AVG(
          CASE
            WHEN type = 'scroll'
              THEN NULLIF(payload->>'percentage', '')::double precision
          END
        ),
        0
      )::float AS average_scroll,
      MAX(viewport_width)::int AS viewport_width,
      MAX(viewport_height)::int AS viewport_height
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
    GROUP BY COALESCE(NULLIF(path, ''), '/')
    HAVING COUNT(*) FILTER (WHERE type IN ('page_view', 'click', 'scroll')) > 0
    ORDER BY views DESC, clicks DESC, path ASC
    LIMIT 100;
  `);
  const pages = pageResult.rows.map(mapPage);

  if (pages.length === 0) {
    return { pages: [], selectedPage: null };
  }

  const selectedPage =
    pages.find((page) => page.path === filters.pagePath) ?? pages[0];
  const eventResult = await db.execute<HeatmapEventRow>(sql`
    SELECT
      type,
      payload,
      viewport_width,
      viewport_height
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
      AND COALESCE(NULLIF(path, ''), '/') = ${selectedPage.path}
      AND type IN ('click', 'scroll')
    ORDER BY occurred_at ASC
    LIMIT ${MAX_HEATMAP_EVENTS};
  `);
  const replaySessionId = await getRepresentativeReplaySession(
    filters,
    selectedPage.path,
    rangeDays
  );
  const replay = replaySessionId
    ? await getReplayDataModel(
        filters.workspaceId,
        filters.projectId,
        replaySessionId
      )
    : null;
  const pageDetail: HeatmapPageDetail = {
    ...selectedPage,
    clickPoints: buildClickPoints(eventResult.rows, selectedPage),
    scrollPoints: buildScrollPoints(eventResult.rows),
    replayEvents: replay?.events ?? [],
  };

  return {
    pages,
    selectedPage: pageDetail,
  };
}
