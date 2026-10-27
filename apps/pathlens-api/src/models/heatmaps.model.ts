import { and, eq, sql } from "drizzle-orm";
import type {
  HeatmapDevice,
  HeatmapClickSampleCoverage,
  HeatmapHotArea,
  HeatmapMovementCoverage,
  HeatmapPage,
  HeatmapPageDetail,
  HeatmapScrollPoint,
  HeatmapSnapshot,
  HeatmapSnapshotStatus,
  HeatmapsData,
  HeatmapsListData,
} from "@workspace/contracts/heatmaps";
import { normalizePagePath } from "@workspace/contracts";
import { db } from "../db/client";
import { heatmapPageSnapshots, projectDomains, projects } from "../db/schema";
import { createHeatmapSnapshotSignedUrl } from "../lib/s3";
import { enqueueHeatmapPageSnapshot } from "../lib/snapshot-queue";
import { normalizeProjectHostname } from "../lib/project-domain";
import {
  aggregateClickHeatmap,
  aggregateMovementHeatmap,
  collectClickSamples,
} from "../lib/heatmap-aggregation";
import { aggregateScrollGroups } from "../lib/scroll-aggregation";
import { getCompleteReplayDataModel } from "./replay.model";

export const MAX_HEATMAP_EVENTS = 20_000;
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
  domain?: string;
  page?: number;
  pageSize?: number;
  includeDetails?: boolean;
  heatmapId?: string;
}

export function buildClickSampleCoverage(
  totalEvents: number,
  returnedEvents: number,
  eligibleEvents: number,
  diagnostics?: {
    anchorCapableEvents: number;
    legacyEvents: number;
    missingAnchorEvents: number;
    invalidAnchorEvents: number;
    uniqueAnchors: number;
    conflictingAnchorIdentities: number;
    anchorDefinitionsReturned: number;
    anchorDefinitionsTruncated: boolean;
    anchorMetadataBytes: number;
  }
): HeatmapClickSampleCoverage {
  return {
    limit: MAX_HEATMAP_EVENTS,
    totalEvents: Math.max(0, totalEvents),
    returnedEvents: Math.min(MAX_HEATMAP_EVENTS, Math.max(0, returnedEvents)),
    eligibleEvents: Math.max(0, eligibleEvents),
    truncated: totalEvents > MAX_HEATMAP_EVENTS,
    ...(diagnostics ?? {}),
  };
}

export function buildMovementCoverage(
  totalEvents: number,
  returnedEvents: number,
  eligibleEvents: number
): HeatmapMovementCoverage {
  return {
    limit: MAX_HEATMAP_EVENTS,
    totalEvents: Math.max(0, totalEvents),
    returnedEvents: Math.min(MAX_HEATMAP_EVENTS, Math.max(0, returnedEvents)),
    eligibleEvents: Math.max(0, eligibleEvents),
    truncated: totalEvents > MAX_HEATMAP_EVENTS,
  };
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
  total: number | string | null;
}

interface HeatmapIdentity {
  id: string;
  workspaceId: string;
  projectId: string;
  domainId: string;
  domain: string;
  pagePath: string;
  device: HeatmapDevice;
}

export interface HeatmapIdentityCandidate {
  id: string;
  device: HeatmapDevice;
}

interface HeatmapEventRow extends Record<string, unknown> {
  type: "click" | "mousemove";
  session_id: string;
  payload: Record<string, unknown> | null;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
  total_count?: number | string | null;
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
  session_id: string;
  device: string | null;
  payloads: Record<string, unknown>[] | null;
  max_scroll: number | string | null;
}

interface ReplaySessionRow extends Record<string, unknown> {
  session_id: string;
  viewport_width: number | string | null;
  viewport_height: number | string | null;
}

interface HeatmapSnapshotRow {
  id: string;
  domain: string;
  pagePath: string;
  device: string;
  status: string;
  storagePath: string | null;
  viewportWidth: number;
  viewportHeight: number;
  pageWidth: number | null;
  pageHeight: number | null;
  deviceScaleFactor: number;
  capturedAt: Date | string | null;
  requestedAt: Date | string | null;
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

function normalizedPathSql(column: string) {
  const source = sql.raw(column);
  const withoutOrigin = sql`CASE
    WHEN ${source} ~* '^[a-z][a-z0-9+.-]*://[^/]*'
      THEN regexp_replace(${source}, '^[a-z][a-z0-9+.-]*://[^/]*', '')
    WHEN ${source} ~ '^//[^/]+'
      THEN regexp_replace(${source}, '^//[^/]+', '')
    ELSE ${source}
  END`;
  const withoutQuery = sql`regexp_replace(${withoutOrigin}, '[?#].*$', '')`;
  const withLeadingSlash = sql`CASE
    WHEN ${withoutQuery} LIKE '/%' THEN ${withoutQuery}
    ELSE '/' || ${withoutQuery}
  END`;

  return sql`COALESCE(
    NULLIF(regexp_replace(${withLeadingSlash}, '/+$', ''), ''),
    '/'
  )`;
}

function normalizedDeviceSql(column: string) {
  return sql`LOWER(COALESCE(NULLIF(TRIM(${sql.raw(column)}), ''), 'unknown'))`;
}

export function applyHeatmapIdentityToFilters(
  filters: HeatmapsFilters,
  identity: Pick<HeatmapIdentity, "domain" | "pagePath">
): HeatmapsFilters {
  return {
    ...filters,
    domain: identity.domain,
    pagePath: identity.pagePath,
  };
}

export function selectHeatmapIdentityId(
  candidates: readonly HeatmapIdentityCandidate[],
  device: HeatmapDevice
): string | null {
  return (
    candidates.find((candidate) => candidate.device === device)?.id ?? null
  );
}

function getSnapshotViewport(
  page: HeatmapPage,
  device: HeatmapDevice
): { width: number; height: number } {
  if (page.viewport && page.viewport.width > 0 && page.viewport.height > 0) {
    return page.viewport;
  }

  if (device === "mobile") return { width: 390, height: 844 };
  if (device === "tablet") return { width: 1024, height: 768 };

  return { width: 1440, height: 900 };
}

function getSnapshotStatus(value: string): HeatmapSnapshotStatus {
  if (
    value === "processing" ||
    value === "ready" ||
    value === "stale" ||
    value === "failed"
  ) {
    return value;
  }

  return "pending";
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function getHeatmapSnapshot(
  filters: HeatmapsFilters,
  page: HeatmapPage
): Promise<{
  url: string | null;
  status: HeatmapSnapshotStatus;
  capturedAt: string | null;
  width: number | null;
  height: number | null;
  snapshot: HeatmapSnapshot | null;
}> {
  const requestedDomain =
    filters.domain ?? normalizeProjectHostname(page.url ?? "");

  if (!requestedDomain) {
    return {
      url: null,
      status: "pending",
      capturedAt: null,
      width: null,
      height: null,
      snapshot: null,
    };
  }

  const ownedDomains = await db
    .select({ domain: projectDomains.domain })
    .from(projectDomains)
    .innerJoin(projects, eq(projects.id, projectDomains.projectId))
    .where(
      and(
        eq(projectDomains.projectId, filters.projectId),
        eq(projects.workspaceId, filters.workspaceId)
      )
    );
  const domainIsOwned = ownedDomains.some(
    (row) => normalizeProjectHostname(row.domain) === requestedDomain
  );

  if (!domainIsOwned) {
    return {
      url: null,
      status: "pending",
      capturedAt: null,
      width: null,
      height: null,
      snapshot: null,
    };
  }

  const pathname = normalizePagePath(page.path);
  const sourceUrl = new URL(pathname, `https://${requestedDomain}`).toString();

  // All-devices data has no single snapshot geometry. It must use validated
  // geometry groups rather than creating a synthetic all-device snapshot.
  if (filters.device === "all") {
    return {
      url: null,
      status: "pending",
      capturedAt: null,
      width: null,
      height: null,
      snapshot: null,
    };
  }

  const viewport = getSnapshotViewport(page, filters.device);
  const deviceScaleFactor = 1;
  const identity = and(
    eq(heatmapPageSnapshots.workspaceId, filters.workspaceId),
    eq(heatmapPageSnapshots.projectId, filters.projectId),
    eq(heatmapPageSnapshots.domain, requestedDomain),
    eq(heatmapPageSnapshots.pagePath, pathname),
    eq(heatmapPageSnapshots.device, filters.device)
  );

  let [row] = await db
    .select({
      id: heatmapPageSnapshots.id,
      domain: heatmapPageSnapshots.domain,
      pagePath: heatmapPageSnapshots.pagePath,
      device: heatmapPageSnapshots.device,
      status: heatmapPageSnapshots.status,
      storagePath: heatmapPageSnapshots.storagePath,
      viewportWidth: heatmapPageSnapshots.viewportWidth,
      viewportHeight: heatmapPageSnapshots.viewportHeight,
      pageWidth: heatmapPageSnapshots.pageWidth,
      pageHeight: heatmapPageSnapshots.pageHeight,
      deviceScaleFactor: heatmapPageSnapshots.deviceScaleFactor,
      capturedAt: heatmapPageSnapshots.capturedAt,
      requestedAt: heatmapPageSnapshots.requestedAt,
    })
    .from(heatmapPageSnapshots)
    .where(identity);

  let shouldQueue = false;

  if (!row) {
    [row] = await db
      .insert(heatmapPageSnapshots)
      .values({
        workspaceId: filters.workspaceId,
        projectId: filters.projectId,
        domain: requestedDomain,
        pagePath: pathname,
        sourceUrl,
        device: filters.device,
        status: "pending",
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
        deviceScaleFactor,
        requestedAt: null,
      })
      .onConflictDoNothing({
        target: [
          heatmapPageSnapshots.projectId,
          heatmapPageSnapshots.domain,
          heatmapPageSnapshots.pagePath,
          heatmapPageSnapshots.device,
        ],
      })
      .returning({
        id: heatmapPageSnapshots.id,
        domain: heatmapPageSnapshots.domain,
        pagePath: heatmapPageSnapshots.pagePath,
        device: heatmapPageSnapshots.device,
        status: heatmapPageSnapshots.status,
        storagePath: heatmapPageSnapshots.storagePath,
        viewportWidth: heatmapPageSnapshots.viewportWidth,
        viewportHeight: heatmapPageSnapshots.viewportHeight,
        pageWidth: heatmapPageSnapshots.pageWidth,
        pageHeight: heatmapPageSnapshots.pageHeight,
        deviceScaleFactor: heatmapPageSnapshots.deviceScaleFactor,
        capturedAt: heatmapPageSnapshots.capturedAt,
        requestedAt: heatmapPageSnapshots.requestedAt,
      });

    if (row) shouldQueue = true;
    else {
      [row] = await db
        .select({
          id: heatmapPageSnapshots.id,
          domain: heatmapPageSnapshots.domain,
          pagePath: heatmapPageSnapshots.pagePath,
          device: heatmapPageSnapshots.device,
          status: heatmapPageSnapshots.status,
          storagePath: heatmapPageSnapshots.storagePath,
          viewportWidth: heatmapPageSnapshots.viewportWidth,
          viewportHeight: heatmapPageSnapshots.viewportHeight,
          pageWidth: heatmapPageSnapshots.pageWidth,
          pageHeight: heatmapPageSnapshots.pageHeight,
          deviceScaleFactor: heatmapPageSnapshots.deviceScaleFactor,
          capturedAt: heatmapPageSnapshots.capturedAt,
          requestedAt: heatmapPageSnapshots.requestedAt,
        })
        .from(heatmapPageSnapshots)
        .where(identity);
    }
  }

  if (!row) {
    return {
      url: null,
      status: "pending",
      capturedAt: null,
      width: null,
      height: null,
      snapshot: null,
    };
  }

  if (shouldQueue) {
    try {
      await enqueueHeatmapPageSnapshot(row.id);
      await db
        .update(heatmapPageSnapshots)
        .set({ requestedAt: new Date() })
        .where(eq(heatmapPageSnapshots.id, row.id));
    } catch (error) {
      console.error("Unable to enqueue heatmap snapshot.", error);
    }
  }

  const status = getSnapshotStatus(row.status);
  const url =
    row.storagePath && (status === "ready" || status === "stale")
      ? await createHeatmapSnapshotSignedUrl(row.storagePath)
      : null;

  return {
    url,
    status,
    capturedAt: toIso(row.capturedAt),
    width: row.pageWidth,
    height: row.pageHeight,
    snapshot: {
      id: row.id,
      pathname: row.pagePath,
      domain: row.domain,
      device: row.device as HeatmapDevice,
      viewportWidth: row.viewportWidth,
      viewportHeight: row.viewportHeight,
      pageWidth: row.pageWidth,
      pageHeight: row.pageHeight,
      deviceScaleFactor: row.deviceScaleFactor,
      capturedAt: toIso(row.capturedAt),
    },
  };
}

async function getPersistedHeatmapPageId(
  filters: HeatmapsFilters,
  page: HeatmapPage
): Promise<string | null> {
  const requestedDomain =
    filters.domain ?? normalizeProjectHostname(page.url ?? "");

  if (!requestedDomain) return null;

  const pathname = normalizePagePath(page.path);
  const rows = await db
    .select({
      id: heatmapPageSnapshots.id,
      device: heatmapPageSnapshots.device,
    })
    .from(heatmapPageSnapshots)
    .innerJoin(projects, eq(projects.id, heatmapPageSnapshots.projectId))
    .where(
      and(
        eq(heatmapPageSnapshots.workspaceId, filters.workspaceId),
        eq(heatmapPageSnapshots.projectId, filters.projectId),
        eq(projects.workspaceId, filters.workspaceId),
        eq(heatmapPageSnapshots.domain, requestedDomain),
        eq(heatmapPageSnapshots.pagePath, pathname)
      )
    );

  return selectHeatmapIdentityId(
    rows.map((row) => ({
      id: row.id,
      device: row.device as HeatmapDevice,
    })),
    filters.device
  );
}

function mapPage(row: PageRow): HeatmapPage {
  const width = toNumber(row.viewport_width);
  const height = toNumber(row.viewport_height);

  return {
    id: "",
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
      ? sql`AND ${normalizedDeviceSql("page_event.device")} = ${filters.device}`
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
       AND ${normalizedPathSql("page_event.path")} = ${normalizePagePath(pagePath)}
      AND page_event.occurred_at >= NOW() - make_interval(days => ${rangeDays})
      ${filters.domain ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(page_event.url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${filters.domain}` : sql``}
         ${deviceFilter}
      AND replay.event_count >= 2
      AND replay.ended_at IS NOT NULL
      AND replay.last_sequence >= 0
      AND EXISTS (
        SELECT 1
        FROM replay_chunks replay_chunk
        WHERE replay_chunk.session_id = replay.id
          AND replay_chunk.events @> '[{"type": 2}]'::jsonb
      )
      AND NOT EXISTS (
        SELECT 1
        FROM generate_series(0, replay.last_sequence) expected(sequence)
        LEFT JOIN replay_chunks complete_chunk
          ON complete_chunk.session_id = replay.id
          AND complete_chunk.sequence = expected.sequence
        WHERE complete_chunk.id IS NULL
      )
    ORDER BY (
      NOT EXISTS (
        SELECT 1
        FROM events first_page
        WHERE first_page.session_id = page_event.session_id
            AND first_page.type = 'page_view'
            AND ${normalizedPathSql("first_page.path")} = ${normalizePagePath(pagePath)}
           AND first_page.occurred_at < page_event.occurred_at
           ${filters.domain ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(first_page.url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${filters.domain}` : sql``}
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
    filters.device !== "all"
      ? sql`AND ${normalizedDeviceSql("device")} = ${filters.device}`
      : sql``;
  const replayPageDeviceFilter =
    filters.device !== "all"
      ? sql`AND ${normalizedDeviceSql("replay_page.device")} = ${filters.device}`
      : sql``;
  const domainFilter = filters.domain
    ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${filters.domain}`
    : sql``;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const pagePathFilter =
    filters.includeDetails && filters.pagePath
      ? sql`AND ${normalizedPathSql("path")} = ${normalizePagePath(filters.pagePath)}`
      : sql``;
  const normalizedPath = normalizedPathSql("path");
  const pageResult = await db.execute<PageRow>(sql`
    WITH page_metrics AS (
      SELECT
        ${normalizedPath} AS path,
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
          ${domainFilter}
          ${pagePathFilter}
       GROUP BY ${normalizedPath}
      HAVING COUNT(*) FILTER (WHERE type IN ('page_view', 'click', 'scroll')) > 0
    )
    SELECT
      page_metrics.*,
      COUNT(*) OVER()::int AS total,
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
                AND ${normalizedPathSql("replay_page.path")} = page_metrics.path
               ${replayPageDeviceFilter}
               ${filters.domain ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(replay_page.url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${filters.domain}` : sql``}
          )
      ) AS replay_available
    FROM page_metrics
    ORDER BY views DESC, clicks DESC, path ASC
      LIMIT ${pageSize}
      OFFSET ${(page - 1) * pageSize};
  `);
  const scrollSummaryResult = await db.execute<ScrollSummaryRow>(sql`
    WITH session_scroll AS (
       SELECT
         ${normalizedPath} AS path,
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
         ${domainFilter}
       GROUP BY ${normalizedPath}, session_id
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
  const pages = await Promise.all(
    pageResult.rows.map(async (row) => {
      const page = mapPage(row);
      const summary = scrollSummaries.get(page.path);
      const sessions = toNumber(summary?.sessions);
      const snapshot = await getHeatmapSnapshot(filters, page);
      const persistedId =
        snapshot.snapshot?.id ??
        (await getPersistedHeatmapPageId(filters, page));

      return {
        ...page,
        id: persistedId ?? "",
        averageScroll: toNumber(summary?.average_scroll),
        maxScroll: toNumber(summary?.max_scroll),
        reach25:
          sessions > 0 ? (toNumber(summary?.reach25) / sessions) * 100 : 0,
        reach50:
          sessions > 0 ? (toNumber(summary?.reach50) / sessions) * 100 : 0,
        reach75:
          sessions > 0 ? (toNumber(summary?.reach75) / sessions) * 100 : 0,
        reach100:
          sessions > 0 ? (toNumber(summary?.reach100) / sessions) * 100 : 0,
      };
    })
  );

  const total = toNumber(pageResult.rows[0]?.total);
  const totalPages = Math.ceil(total / pageSize);
  const pagination = {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };

  if (pages.length === 0) {
    return { pages: [], selectedPage: null, pagination };
  }

  if (filters.includeDetails === false) {
    return { pages, selectedPage: null, pagination };
  }

  const selectedPage =
    (filters.pagePath
      ? pages.find((page) => page.path === normalizePagePath(filters.pagePath))
      : pages[0]) ?? null;

  if (!selectedPage) {
    return { pages, selectedPage: null, pagination };
  }
  const clickEventResult = await db.execute<HeatmapEventRow>(sql`
    SELECT
      type,
      session_id,
      payload,
      viewport_width,
      viewport_height,
      COUNT(*) OVER()::int AS total_count
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
       AND ${normalizedPathSql("path")} = ${selectedPage.path}
       AND type = 'click'
      ${deviceFilter}
      ${domainFilter}
    ORDER BY md5(concat_ws('|', session_id, occurred_at::text, payload::text))
    LIMIT ${MAX_HEATMAP_EVENTS + 1};
  `);
  const movementEventResult = await db.execute<HeatmapEventRow>(sql`
    SELECT
      type,
      session_id,
      payload,
      viewport_width,
      viewport_height,
      COUNT(*) OVER()::int AS total_count
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
       AND ${normalizedPathSql("path")} = ${selectedPage.path}
       AND type = 'mousemove'
      ${deviceFilter}
      ${domainFilter}
    ORDER BY occurred_at ASC
    LIMIT ${MAX_HEATMAP_EVENTS};
  `);
  const selectedScrollResult = await db.execute<ScrollSessionRow>(sql`
    SELECT
      session_id,
      device,
      ARRAY_AGG(payload) AS payloads,
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
       AND ${normalizedPathSql("path")} = ${selectedPage.path}
      AND type = 'scroll'
      ${deviceFilter}
      ${domainFilter}
    GROUP BY session_id, device;
  `);
  const replaySession = await getRepresentativeReplaySession(
    filters,
    selectedPage.path,
    rangeDays
  );
  const replay = replaySession
    ? await getCompleteReplayDataModel(
        filters.workspaceId,
        filters.projectId,
        replaySession.session_id
      )
    : null;
  const fallbackViewport = getPageViewport(selectedPage, {
    payload: null,
  } as HeatmapEventRow);
  const clickRows = clickEventResult.rows.slice(0, MAX_HEATMAP_EVENTS);
  const clickTotalEvents = toNumber(
    clickEventResult.rows[0]?.total_count ?? clickEventResult.rows.length
  );
  const clickAggregation = aggregateClickHeatmap(clickRows, fallbackViewport);
  const clickSamples = collectClickSamples(clickRows, fallbackViewport);
  const clickSampleCoverage = buildClickSampleCoverage(
    clickTotalEvents,
    clickRows.length,
    clickSamples.eligibleEventCount,
    clickSamples.anchorDiagnostics
  );
  const movementAggregation = aggregateMovementHeatmap(
    movementEventResult.rows,
    fallbackViewport
  );
  const movementTotalEvents = toNumber(
    movementEventResult.rows[0]?.total_count ?? movementEventResult.rows.length
  );
  const movementEligibleEvents = movementAggregation.groups.reduce(
    (total, group) => total + group.sampleCount,
    0
  );
  const movementCoverage = buildMovementCoverage(
    movementTotalEvents,
    movementEventResult.rows.length,
    movementEligibleEvents
  );
  const heatmapSnapshot = await getHeatmapSnapshot(filters, selectedPage);
  const selectedScrollSummary = scrollSummaries.get(selectedPage.path);
  const sessionCount = toNumber(selectedScrollSummary?.sessions);
  const pageDetail: HeatmapPageDetail = {
    ...selectedPage,
    clickPoints: clickAggregation.points,
    clickGroups: clickAggregation.groups,
    clickSamples: clickSamples.groups,
    anchorDefinitions: clickSamples.anchorDefinitions,
    regionDefinitions: clickSamples.regionDefinitions,
    clickSampleCoverage,
    movementPoints: movementAggregation.points,
    movementGroups: movementAggregation.groups,
    movementCoordinateMode: movementAggregation.coordinateMode,
    movementCoverage,
    hotAreas: buildHotAreas(clickRows, selectedPage),
    scrollPoints: buildScrollPoints(selectedScrollResult.rows, sessionCount),
    scrollGroups: aggregateScrollGroups(
      selectedScrollResult.rows.flatMap((row) =>
        (row.payloads ?? []).map((payload) => ({
          sessionId: row.session_id,
          device: row.device,
          payload,
        }))
      )
    ),
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
    screenshotUrl: heatmapSnapshot.url,
    screenshotStatus: heatmapSnapshot.status,
    screenshotCapturedAt: heatmapSnapshot.capturedAt,
    screenshotWidth: heatmapSnapshot.width,
    screenshotHeight: heatmapSnapshot.height,
    snapshot: heatmapSnapshot.snapshot,
  };

  return {
    pages,
    selectedPage: pageDetail,
    pagination,
  };
}

export async function getHeatmapsListModel(
  filters: HeatmapsFilters
): Promise<HeatmapsListData> {
  const data = await getHeatmapsModel({
    ...filters,
    includeDetails: false,
  });

  return {
    pages: data.pages,
    pagination: data.pagination,
  };
}

export async function getHeatmapIdentityModel(
  heatmapId: string,
  workspaceId: string,
  projectId: string
): Promise<HeatmapIdentity | null> {
  const [row] = await db
    .select({
      id: heatmapPageSnapshots.id,
      workspaceId: heatmapPageSnapshots.workspaceId,
      projectId: heatmapPageSnapshots.projectId,
      domain: heatmapPageSnapshots.domain,
      pagePath: heatmapPageSnapshots.pagePath,
      device: heatmapPageSnapshots.device,
    })
    .from(heatmapPageSnapshots)
    .innerJoin(projects, eq(projects.id, heatmapPageSnapshots.projectId))
    .where(
      and(
        eq(heatmapPageSnapshots.id, heatmapId),
        eq(heatmapPageSnapshots.workspaceId, workspaceId),
        eq(heatmapPageSnapshots.projectId, projectId),
        eq(projects.workspaceId, workspaceId)
      )
    );

  if (!row) return null;

  const domains = await db
    .select({ id: projectDomains.id, domain: projectDomains.domain })
    .from(projectDomains)
    .innerJoin(projects, eq(projects.id, projectDomains.projectId))
    .where(
      and(
        eq(projectDomains.projectId, projectId),
        eq(projects.workspaceId, workspaceId)
      )
    );
  const domain = domains.find(
    (item) =>
      normalizeProjectHostname(item.domain) ===
      normalizeProjectHostname(row.domain)
  );

  if (!domain) return null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    domainId: domain.id,
    domain: normalizeProjectHostname(domain.domain) ?? domain.domain,
    pagePath: normalizePagePath(row.pagePath),
    device: row.device as HeatmapDevice,
  };
}

export async function getHeatmapDetailsModel(
  filters: HeatmapsFilters
): Promise<HeatmapPageDetail | null> {
  if (filters.heatmapId) {
    const identity = await getHeatmapIdentityModel(
      filters.heatmapId,
      filters.workspaceId,
      filters.projectId
    );

    if (!identity) return null;

    filters = applyHeatmapIdentityToFilters(filters, identity);
  }

  const data = await getHeatmapsModel({
    ...filters,
    includeDetails: true,
    page: 1,
    pageSize: 1,
  });

  return data.selectedPage;
}
