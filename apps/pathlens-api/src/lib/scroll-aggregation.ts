import type {
  HeatmapDevice,
  HeatmapScrollGroup,
  HeatmapScrollPoint,
  HeatmapSourceDimensions,
} from "@workspace/contracts/heatmaps";

const MAX_SCROLL_DIMENSION = 10_000_000;
const MAX_SCROLL_PERCENTAGE = 100;
const SCROLL_BUCKET_SIZE = 5;
const SCROLL_BUCKET_COUNT = 20;

export interface ScrollAggregationEvent {
  sessionId: string;
  device: string | null;
  payload: Record<string, unknown> | null;
}

interface SessionData {
  device: Exclude<HeatmapDevice, "all">;
  coordinateSchemaVersion: number | null;
  maximumReachPercent: number | null;
  geometries: Map<string, Geometry>;
  missingGeometry: boolean;
}

interface Geometry {
  viewport: HeatmapSourceDimensions;
  document: HeatmapSourceDimensions;
}

function normalizeDevice(value: string | null): Exclude<HeatmapDevice, "all"> {
  switch (value?.trim().toLowerCase()) {
    case "desktop":
      return "desktop";
    case "mobile":
      return "mobile";
    case "tablet":
      return "tablet";
    default:
      return "unknown";
  }
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  return null;
}

function readDimensions(value: unknown): HeatmapSourceDimensions | null {
  if (!value || typeof value !== "object") return null;

  const dimensions = value as Record<string, unknown>;
  const width = finiteNumber(dimensions.width);
  const height = finiteNumber(dimensions.height);

  if (
    width === null ||
    height === null ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_SCROLL_DIMENSION ||
    height > MAX_SCROLL_DIMENSION
  ) {
    return null;
  }

  return { width, height };
}

function readGeometry(
  payload: Record<string, unknown> | null
): Geometry | null {
  const viewport = readDimensions(payload?.viewport);
  const document = readDimensions(payload?.document);

  return viewport && document ? { viewport, document } : null;
}

function readSchemaVersion(
  payload: Record<string, unknown> | null
): number | null {
  const value = finiteNumber(payload?.coordinateSchemaVersion);

  return value !== null && Number.isInteger(value) && value > 0 ? value : null;
}

function readDocumentReachPercent(
  payload: Record<string, unknown> | null
): number | null {
  const scrollY = finiteNumber(payload?.scrollY);
  const viewport = readDimensions(payload?.viewport);
  const document = readDimensions(payload?.document);
  if (scrollY === null || !viewport || !document) return null;

  return Math.min(
    MAX_SCROLL_PERCENTAGE,
    Math.max(0, ((scrollY + viewport.height) / document.height) * 100)
  );
}

function geometryKey(geometry: Geometry): string {
  return [
    geometry.viewport.width,
    geometry.viewport.height,
    geometry.document.width,
    geometry.document.height,
  ].join("x");
}

function groupId(
  device: Exclude<HeatmapDevice, "all">,
  schemaVersion: number | null,
  status: "compatible" | "geometry-unavailable" | "geometry-inconsistent",
  geometry: Geometry | null
): string {
  return [
    "scroll",
    device,
    schemaVersion ?? "legacy",
    status,
    geometry ? geometryKey(geometry) : "unknown",
  ].join(":");
}

function buildReachPoints(
  percentages: readonly number[],
  sessionCount: number
): HeatmapScrollPoint[] {
  const counts = new Map<number, number>();

  for (const percentage of percentages) {
    const bucket =
      Math.min(
        SCROLL_BUCKET_COUNT - 1,
        Math.floor(percentage / SCROLL_BUCKET_SIZE)
      ) * SCROLL_BUCKET_SIZE;

    for (
      let threshold = 0;
      threshold <= bucket;
      threshold += SCROLL_BUCKET_SIZE
    ) {
      counts.set(threshold, (counts.get(threshold) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([threshold, count]) => ({
      percentage: threshold + SCROLL_BUCKET_SIZE / 2,
      count,
      intensity: sessionCount > 0 ? count / sessionCount : 0,
    }))
    .sort((left, right) => left.percentage - right.percentage);
}

function createGroup(
  sessions: readonly SessionData[],
  device: Exclude<HeatmapDevice, "all">,
  coordinateSchemaVersion: number | null,
  status: "compatible" | "geometry-unavailable" | "geometry-inconsistent",
  geometry: Geometry | null
): HeatmapScrollGroup {
  const percentages = sessions.flatMap((session) =>
    session.maximumReachPercent === null ? [] : [session.maximumReachPercent]
  );
  const sessionCount = sessions.length;

  return {
    groupId: groupId(device, coordinateSchemaVersion, status, geometry),
    device,
    coordinateSchemaVersion,
    sourceViewport: geometry?.viewport ?? null,
    sourceDocument: geometry?.document ?? null,
    sessionCount,
    maximumReachPercent:
      percentages.length > 0 ? Math.max(...percentages) : null,
    coordinateMode: "document",
    alignment:
      status === "compatible"
        ? "document-compatible"
        : status === "geometry-unavailable"
          ? "geometry-unavailable"
          : "geometry-inconsistent",
    safeForDocumentOverlay: status === "compatible",
    reachPoints: buildReachPoints(percentages, sessionCount),
  };
}

export function aggregateScrollGroups(
  rows: readonly ScrollAggregationEvent[]
): HeatmapScrollGroup[] {
  const sessions = new Map<string, SessionData>();

  for (const row of rows) {
    if (!row.payload) continue;

    const session =
      sessions.get(row.sessionId) ??
      ({
        device: normalizeDevice(row.device),
        coordinateSchemaVersion: readSchemaVersion(row.payload),
        maximumReachPercent: null,
        geometries: new Map(),
        missingGeometry: false,
      } satisfies SessionData);

    const reachPercent = readDocumentReachPercent(row.payload);
    if (reachPercent !== null) {
      session.maximumReachPercent = Math.max(
        session.maximumReachPercent ?? 0,
        reachPercent
      );
    }

    const geometry = readGeometry(row.payload);
    if (geometry) session.geometries.set(geometryKey(geometry), geometry);
    else session.missingGeometry = true;

    if (session.coordinateSchemaVersion !== readSchemaVersion(row.payload)) {
      session.coordinateSchemaVersion = null;
    }

    sessions.set(row.sessionId, session);
  }

  const grouped = new Map<string, SessionData[]>();

  for (const session of sessions.values()) {
    const geometryEntries = Array.from(session.geometries.values());
    const status =
      session.missingGeometry || geometryEntries.length === 0
        ? "geometry-unavailable"
        : geometryEntries.length > 1
          ? "geometry-inconsistent"
          : "compatible";
    const geometry = status === "compatible" ? geometryEntries[0]! : null;
    const key = groupId(
      session.device,
      session.coordinateSchemaVersion,
      status,
      geometry
    );
    const group = grouped.get(key) ?? [];
    group.push(session);
    grouped.set(key, group);
  }

  return Array.from(grouped.entries())
    .map(([key, group]) => {
      const session = group[0]!;
      const status = key.includes(":geometry-unavailable:")
        ? "geometry-unavailable"
        : key.includes(":geometry-inconsistent:")
          ? "geometry-inconsistent"
          : "compatible";
      const geometryEntries = Array.from(session.geometries.values());
      return createGroup(
        group,
        session.device,
        session.coordinateSchemaVersion,
        status,
        status === "compatible" ? geometryEntries[0]! : null
      );
    })
    .sort((left, right) => left.groupId.localeCompare(right.groupId));
}
