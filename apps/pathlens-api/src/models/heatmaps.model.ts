import { sql } from "drizzle-orm";
import type {
  HeatmapClickPoint,
  HeatmapDevice,
  HeatmapHotArea,
  HeatmapPage,
  HeatmapPageDetail,
  HeatmapScrollPoint,
  HeatmapsData,
} from "@workspace/contracts";
import { db } from "../db/client";
import { getReplayDataModel } from "./replay.model";

const MAX_HEATMAP_EVENTS = 20_000;
const MAX_HOT_AREA_LABEL_LENGTH = 56;
const MAX_HOT_AREA_LABEL_WORDS = 8;
const STRUCTURAL_HOT_AREA_TAGS = new Set([
  "html",
  "body",
  "main",
  "section",
  "nav",
  "header",
  "footer",
  "div",
  "span",
]);
const UTILITY_CLASS_PREFIXES = [
  "gap-",
  "grid-",
  "items-",
  "justify-",
  "max-w-",
  "min-w-",
  "opacity-",
  "overflow-",
  "p-",
  "px-",
  "py-",
  "relative",
  "shrink-",
  "space-",
  "text-",
  "truncate",
  "w-",
  "whitespace-",
];

export type HeatmapsRange = "24h" | "7d" | "30d" | "90d";

export interface HeatmapsFilters {
  workspaceId: string;
  projectId: string;
  range: HeatmapsRange;
  device: HeatmapDevice;
  pagePath?: string;
}

interface PageRow extends Record<string, unknown> {
  path: string | null;
  url: string | null;
  visitors: number | string | null;
  views: number | string | null;
  clicks: number | string | null;
  scroll_events: number | string | null;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
  replay_available: boolean | null;
}

interface HeatmapEventRow extends Record<string, unknown> {
  type: string;
  session_id: string;
  payload: Record<string, unknown> | null;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
}

interface ScrollSummaryRow extends Record<string, unknown> {
  path: string | null;
  sessions: number | string | null;
  average_scroll: number | string | null;
  max_scroll: number | string | null;
  reach25: number | string | null;
  reach50: number | string | null;
  reach75: number | string | null;
  reach100: number | string | null;
}

interface ScrollSessionRow extends Record<string, unknown> {
  max_scroll: number | string | null;
}

interface ReplaySessionRow extends Record<string, unknown> {
  session_id: string;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
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

function getPayloadText(
  payload: Record<string, unknown> | null,
  key: string
): string | null {
  const value = payload?.[key];

  if (typeof value !== "string") return null;

  const text = value.replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 100) : null;
}

function isUsefulHotAreaLabel(value: string | null): value is string {
  if (!value || value.length > MAX_HOT_AREA_LABEL_LENGTH) return false;

  return value.split(" ").filter(Boolean).length <= MAX_HOT_AREA_LABEL_WORDS;
}

function isUtilityClass(value: string): boolean {
  return UTILITY_CLASS_PREFIXES.some(
    (prefix) => value === prefix || value.startsWith(prefix)
  );
}

function getMeaningfulHotAreaDescriptor(
  tag: string | undefined,
  className: string | undefined
): string | null {
  if (!tag || STRUCTURAL_HOT_AREA_TAGS.has(tag)) return null;

  const classes = className?.split(".").filter(Boolean) ?? [];
  const meaningfulClasses = classes.filter((value) => !isUtilityClass(value));

  if (meaningfulClasses.length === 0) {
    return tag === "button" || tag === "a" || tag === "input" ? tag : null;
  }

  return `${tag}.${meaningfulClasses.slice(0, 2).join(".")}`;
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

function getPayloadDocument(
  payload: Record<string, unknown> | null
): { width: number; height: number } | null {
  const document = payload?.document;

  if (!document || typeof document !== "object") return null;

  const dimensions = document as Record<string, unknown>;
  const width = getPayloadNumber(dimensions, "width");
  const height = getPayloadNumber(dimensions, "height");

  return width && width > 0 && height && height > 0 ? { width, height } : null;
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
    maxScroll: 0,
    averageScroll: 0,
    reach25: 0,
    reach50: 0,
    reach75: 0,
    reach100: 0,
    viewport: width > 0 && height > 0 ? { width, height } : null,
    replayAvailable: Boolean(row.replay_available),
  };
}

function buildHotAreas(
  rows: HeatmapEventRow[],
  page: HeatmapPage
): HeatmapHotArea[] {
  const areas = new Map<string, HeatmapHotArea>();

  for (const row of rows) {
    if (row.type !== "click") continue;

    const document = getPayloadDocument(row.payload);
    const x = getPayloadNumber(row.payload, document ? "pageX" : "x");
    const y = getPayloadNumber(row.payload, document ? "pageY" : "y");
    const dimensions = document ?? getPageViewport(page, row);
    const xRatio = x === null ? null : clamp(x / dimensions.width, 0, 1);
    const yRatio = y === null ? null : clamp(y / dimensions.height, 0, 1);
    const xBucket =
      xRatio === null ? null : Math.min(19, Math.floor(xRatio * 20));
    const yBucket =
      yRatio === null ? null : Math.min(19, Math.floor(yRatio * 20));
    const regionKey =
      xBucket === null || yBucket === null
        ? "region:unknown"
        : `region:${xBucket}:${yBucket}`;
    const elementKey = getPayloadText(row.payload, "elementKey");
    const id = getPayloadText(row.payload, "id");
    const buttonText = getPayloadText(row.payload, "buttonText");
    const text = getPayloadText(row.payload, "text");
    const tag = getPayloadText(row.payload, "tag")?.toLowerCase();
    const className = getPayloadText(row.payload, "className")
      ?.split(/\s+/)
      .filter((value) => /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value))
      .slice(0, 3)
      .join(".");
    const key =
      elementKey ??
      (id ? `id:${id}` : null) ??
      (buttonText && buttonText !== "[masked]"
        ? `button:${buttonText}`
        : null) ??
      (text && text !== "[masked]" ? `text:${text}` : null) ??
      (tag || className
        ? `tag:${tag ?? "region"}${className ? `:${className}` : ""}`
        : regionKey);
    const conciseButtonText =
      buttonText &&
      buttonText !== "[masked]" &&
      isUsefulHotAreaLabel(buttonText)
        ? buttonText
        : null;
    const conciseText =
      text &&
      text !== "[masked]" &&
      !STRUCTURAL_HOT_AREA_TAGS.has(tag ?? "") &&
      isUsefulHotAreaLabel(text)
        ? text
        : null;
    const conciseDescriptor = getMeaningfulHotAreaDescriptor(tag, className);
    const conciseId = id && isUsefulHotAreaLabel(`#${id}`) ? `#${id}` : null;
    const label =
      conciseButtonText ??
      conciseText ??
      conciseId ??
      (conciseDescriptor && isUsefulHotAreaLabel(conciseDescriptor)
        ? conciseDescriptor
        : "Page region");
    const area = areas.get(key);

    if (area) {
      area.count += 1;
      continue;
    }

    areas.set(key, {
      key,
      label,
      ...(tag ? { tag } : {}),
      count: 1,
      percentage: 0,
      intensity: 0,
      ...(xBucket !== null && yBucket !== null
        ? { x: (xBucket + 0.5) / 20, y: (yBucket + 0.5) / 20 }
        : {}),
    });
  }

  const sortedAreas = Array.from(areas.values()).sort(
    (left, right) => right.count - left.count
  );
  const totalGroupedClicks = sortedAreas.reduce(
    (total, area) => total + area.count,
    0
  );
  const maxAreaCount = sortedAreas[0]?.count ?? 0;

  return sortedAreas.slice(0, 10).map((area) => ({
    ...area,
    percentage:
      totalGroupedClicks > 0 ? (area.count / totalGroupedClicks) * 100 : 0,
    intensity: maxAreaCount > 0 ? Math.min(1, area.count / maxAreaCount) : 0,
  }));
}

function buildClickPoints(
  rows: HeatmapEventRow[],
  page: HeatmapPage
): {
  points: HeatmapClickPoint[];
  coordinateMode: "document" | "viewport" | "mixed";
} {
  const buckets = new Map<string, { x: number; y: number; count: number }>();
  let documentCoordinates = 0;
  let viewportCoordinates = 0;

  for (const row of rows) {
    if (row.type !== "click") continue;

    const document = getPayloadDocument(row.payload);
    const x = getPayloadNumber(row.payload, document ? "pageX" : "x");
    const y = getPayloadNumber(row.payload, document ? "pageY" : "y");

    if (x === null || y === null) continue;

    const dimensions = document ?? getPageViewport(page, row);

    if (document) documentCoordinates += 1;
    else viewportCoordinates += 1;

    const xRatio = clamp(x / dimensions.width, 0, 1);
    const yRatio = clamp(y / dimensions.height, 0, 1);
    const xBucket = Math.min(19, Math.floor(xRatio * 20));
    const yBucket = Math.min(19, Math.floor(yRatio * 20));
    const key = `${xBucket}:${yBucket}`;
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.count += 1;
    } else {
      buckets.set(key, {
        x: (xBucket + 0.5) / 20,
        y: (yBucket + 0.5) / 20,
        count: 1,
      });
    }
  }

  const maxCount = Math.max(
    ...Array.from(buckets.values()).map((item) => item.count),
    1
  );

  return {
    points: Array.from(buckets.values())
      .map((point) => ({
        ...point,
        intensity: Math.min(1, point.count / maxCount),
      }))
      .sort((left, right) => right.count - left.count),
    coordinateMode:
      documentCoordinates > 0 && viewportCoordinates > 0
        ? "mixed"
        : documentCoordinates > 0
          ? "document"
          : "viewport",
  };
}

function buildScrollPoints(
  rows: ScrollSessionRow[],
  totalSessions: number
): HeatmapScrollPoint[] {
  const reachByBucket = new Map<number, number>();

  for (const row of rows) {
    const rawPercentage = toNumber(row.max_scroll);

    if (!Number.isFinite(rawPercentage)) continue;

    const percentage = clamp(rawPercentage);

    const bucket = Math.min(19, Math.floor(percentage / 5)) * 5;

    for (let threshold = 0; threshold <= bucket; threshold += 5) {
      reachByBucket.set(threshold, (reachByBucket.get(threshold) ?? 0) + 1);
    }
  }

  return Array.from(reachByBucket.entries())
    .map(([percentage, count]) => ({
      percentage: percentage + 2.5,
      count,
      intensity: totalSessions > 0 ? count / totalSessions : 0,
    }))
    .sort((left, right) => left.percentage - right.percentage);
}

async function getRepresentativeReplaySession(
  filters: HeatmapsFilters,
  pagePath: string,
  rangeDays: number
): Promise<ReplaySessionRow | null> {
  const deviceFilter =
    filters.device !== "all"
      ? sql`AND page_event.device = ${filters.device}`
      : sql``;
  const result = await db.execute<ReplaySessionRow>(sql`
    SELECT
      page_event.session_id,
      replay.viewport_width,
      replay.viewport_height
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
      ${deviceFilter}
      AND replay.event_count >= 2
      AND EXISTS (
        SELECT 1
        FROM replay_chunks replay_chunk
        WHERE replay_chunk.session_id = replay.id
          AND replay_chunk.events @> '[{"type": 2}]'::jsonb
      )
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

  return result.rows[0] ?? null;
}

export async function getHeatmapsModel(
  filters: HeatmapsFilters
): Promise<HeatmapsData> {
  const rangeDays = RANGE_DAYS[filters.range];
  const deviceFilter =
    filters.device !== "all" ? sql`AND device = ${filters.device}` : sql``;
  const replayPageDeviceFilter =
    filters.device !== "all"
      ? sql`AND replay_page.device = ${filters.device}`
      : sql``;
  const pageResult = await db.execute<PageRow>(sql`
    WITH page_metrics AS (
      SELECT
        COALESCE(NULLIF(path, ''), '/') AS path,
        MAX(NULLIF(url, '')) FILTER (WHERE type = 'page_view') AS url,
        COUNT(DISTINCT visitor_id)::int AS visitors,
        COUNT(*) FILTER (WHERE type = 'page_view')::int AS views,
        COUNT(*) FILTER (WHERE type = 'click')::int AS clicks,
        COUNT(*) FILTER (WHERE type = 'scroll')::int AS scroll_events,
        MAX(viewport_width)::int AS viewport_width,
        MAX(viewport_height)::int AS viewport_height
      FROM events
      WHERE workspace_id = ${filters.workspaceId}
        AND project_id = ${filters.projectId}
        AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
        ${deviceFilter}
      GROUP BY COALESCE(NULLIF(path, ''), '/')
      HAVING COUNT(*) FILTER (WHERE type IN ('page_view', 'click', 'scroll')) > 0
    )
    SELECT
      page_metrics.*,
      EXISTS (
        SELECT 1
        FROM replay_sessions replay
        WHERE replay.workspace_id = ${filters.workspaceId}
          AND replay.project_id = ${filters.projectId}
          AND replay.event_count >= 2
          AND EXISTS (
            SELECT 1
            FROM replay_chunks replay_chunk
            WHERE replay_chunk.session_id = replay.id
              AND replay_chunk.events @> '[{"type": 2}]'::jsonb
          )
          AND EXISTS (
            SELECT 1
            FROM events replay_page
            WHERE replay_page.session_id = replay.id
              AND replay_page.type = 'page_view'
              AND COALESCE(NULLIF(replay_page.path, ''), '/') = page_metrics.path
              ${replayPageDeviceFilter}
          )
      ) AS replay_available
    FROM page_metrics
    ORDER BY views DESC, clicks DESC, path ASC
    LIMIT 100;
  `);
  const scrollSummaryResult = await db.execute<ScrollSummaryRow>(sql`
    WITH session_scroll AS (
      SELECT
        COALESCE(NULLIF(path, ''), '/') AS path,
        session_id,
        MAX(
          CASE
            WHEN payload->>'percentage' ~ '^-?[0-9]+([.][0-9]+)?$'
              THEN LEAST(GREATEST((payload->>'percentage')::double precision, 0), 100)
            ELSE NULL
          END
        ) AS max_scroll
      FROM events
      WHERE workspace_id = ${filters.workspaceId}
        AND project_id = ${filters.projectId}
        AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
        AND type = 'scroll'
        ${deviceFilter}
      GROUP BY COALESCE(NULLIF(path, ''), '/'), session_id
    )
    SELECT
      path,
      COUNT(*) FILTER (WHERE max_scroll IS NOT NULL)::int AS sessions,
      COALESCE(AVG(max_scroll), 0)::float AS average_scroll,
      COALESCE(MAX(max_scroll), 0)::float AS max_scroll,
      COUNT(*) FILTER (WHERE max_scroll >= 25)::int AS reach25,
      COUNT(*) FILTER (WHERE max_scroll >= 50)::int AS reach50,
      COUNT(*) FILTER (WHERE max_scroll >= 75)::int AS reach75,
      COUNT(*) FILTER (WHERE max_scroll >= 100)::int AS reach100
    FROM session_scroll
    WHERE max_scroll IS NOT NULL
    GROUP BY path;
  `);
  const scrollSummaries = new Map(
    scrollSummaryResult.rows.map((row) => [row.path ?? "/", row])
  );
  const pages = pageResult.rows.map((row) => {
    const page = mapPage(row);
    const summary = scrollSummaries.get(page.path);
    const sessions = toNumber(summary?.sessions);

    return {
      ...page,
      averageScroll: toNumber(summary?.average_scroll),
      maxScroll: toNumber(summary?.max_scroll),
      reach25: sessions > 0 ? (toNumber(summary?.reach25) / sessions) * 100 : 0,
      reach50: sessions > 0 ? (toNumber(summary?.reach50) / sessions) * 100 : 0,
      reach75: sessions > 0 ? (toNumber(summary?.reach75) / sessions) * 100 : 0,
      reach100:
        sessions > 0 ? (toNumber(summary?.reach100) / sessions) * 100 : 0,
    };
  });

  if (pages.length === 0) {
    return { pages: [], selectedPage: null };
  }

  const selectedPage =
    pages.find((page) => page.path === filters.pagePath) ?? pages[0];
  const eventResult = await db.execute<HeatmapEventRow>(sql`
    SELECT
      type,
      session_id,
      payload,
      viewport_width,
      viewport_height
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
      AND COALESCE(NULLIF(path, ''), '/') = ${selectedPage.path}
      AND type = 'click'
      ${deviceFilter}
    ORDER BY occurred_at ASC
    LIMIT ${MAX_HEATMAP_EVENTS};
  `);
  const selectedScrollResult = await db.execute<ScrollSessionRow>(sql`
    SELECT
      MAX(
        CASE
          WHEN payload->>'percentage' ~ '^-?[0-9]+([.][0-9]+)?$'
            THEN LEAST(GREATEST((payload->>'percentage')::double precision, 0), 100)
          ELSE NULL
        END
      ) AS max_scroll
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
      AND COALESCE(NULLIF(path, ''), '/') = ${selectedPage.path}
      AND type = 'scroll'
      ${deviceFilter}
    GROUP BY session_id;
  `);
  const replaySession = await getRepresentativeReplaySession(
    filters,
    selectedPage.path,
    rangeDays
  );
  const replay = replaySession
    ? await getReplayDataModel(
        filters.workspaceId,
        filters.projectId,
        replaySession.session_id
      )
    : null;
  const clickAggregation = buildClickPoints(eventResult.rows, selectedPage);
  const selectedScrollSummary = scrollSummaries.get(selectedPage.path);
  const sessionCount = toNumber(selectedScrollSummary?.sessions);
  const pageDetail: HeatmapPageDetail = {
    ...selectedPage,
    clickPoints: clickAggregation.points,
    hotAreas: buildHotAreas(eventResult.rows, selectedPage),
    scrollPoints: buildScrollPoints(selectedScrollResult.rows, sessionCount),
    replayEvents: replay?.events ?? [],
    replayViewport:
      replaySession &&
      replaySession.viewport_width &&
      replaySession.viewport_height
        ? {
            width: toNumber(replaySession.viewport_width),
            height: toNumber(replaySession.viewport_height),
          }
        : selectedPage.viewport,
    coordinateMode: clickAggregation.coordinateMode,
    replayAvailable: Boolean(replay?.available),
  };

  return {
    pages,
    selectedPage: pageDetail,
  };
}
