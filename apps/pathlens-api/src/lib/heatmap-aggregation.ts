import type {
  HeatmapClickGroup,
  HeatmapClickSample,
  HeatmapClickSampleGroup,
  HeatmapClickPoint,
  HeatmapCoordinateAlignment,
  HeatmapCoordinateMode,
  HeatmapMovementGroup,
  HeatmapMovementPoint,
  HeatmapSourceDimensions,
} from "@workspace/contracts";

const CLICK_GRID_SIZE = 20;
export const MOVEMENT_GRID_SIZE = 40;

export interface HeatmapAggregationEvent {
  type: "click" | "mousemove";
  payload: Record<string, unknown> | null;
}

interface MutableGroup {
  group: HeatmapClickGroup | HeatmapMovementGroup;
  points: Map<string, MutablePoint>;
}

interface MutablePoint {
  x: number;
  y: number;
  count: number;
  intensity: number;
  coordinateMode: HeatmapCoordinateMode;
  weightedX: number;
  weightedY: number;
  weight: number;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDimensions(value: unknown): HeatmapSourceDimensions | null {
  if (!value || typeof value !== "object") return null;

  const dimensions = value as Record<string, unknown>;
  const width = finiteNumber(dimensions.width);
  const height = finiteNumber(dimensions.height);

  if (width === null || height === null || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function readSchemaVersion(payload: Record<string, unknown>): number | null {
  const version = finiteNumber(payload.coordinateSchemaVersion);

  return version !== null && Number.isInteger(version) && version > 0
    ? version
    : null;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function readPointWeight(
  payload: Record<string, unknown> | null
): number | null {
  if (!payload || !Object.prototype.hasOwnProperty.call(payload, "count")) {
    return 1;
  }

  const count = finiteNumber(payload.count);
  return count !== null && count > 0 ? count : null;
}

function getPoint(
  payload: Record<string, unknown> | null,
  fallbackViewport: HeatmapSourceDimensions
): {
  x: number;
  y: number;
  coordinateMode: HeatmapCoordinateMode;
  sourceViewport: HeatmapSourceDimensions | null;
  sourceDocument: HeatmapSourceDimensions | null;
  alignment: HeatmapCoordinateAlignment;
  coordinateSchemaVersion: number | null;
} | null {
  if (!payload) return null;

  const x = finiteNumber(payload.x);
  const y = finiteNumber(payload.y);
  const pageX = finiteNumber(payload.pageX);
  const pageY = finiteNumber(payload.pageY);
  const sourceViewport = readDimensions(payload.viewport);
  const sourceDocument = readDimensions(payload.document);
  const coordinateSchemaVersion = readSchemaVersion(payload);

  if (sourceDocument && pageX !== null && pageY !== null) {
    return {
      x: clamp(pageX / sourceDocument.width),
      y: clamp(pageY / sourceDocument.height),
      coordinateMode: "document",
      sourceViewport,
      sourceDocument,
      alignment: "document-compatible",
      coordinateSchemaVersion,
    };
  }

  if (sourceViewport && x !== null && y !== null) {
    return {
      x: clamp(x / sourceViewport.width),
      y: clamp(y / sourceViewport.height),
      coordinateMode: "viewport",
      sourceViewport,
      sourceDocument: null,
      alignment: "viewport-only",
      coordinateSchemaVersion,
    };
  }

  if (x !== null && y !== null) {
    return {
      x: clamp(x / fallbackViewport.width),
      y: clamp(y / fallbackViewport.height),
      coordinateMode: "viewport",
      sourceViewport: null,
      sourceDocument: null,
      alignment: "legacy-unknown",
      coordinateSchemaVersion,
    };
  }

  return null;
}

function getStrictClickPoint(
  payload: Record<string, unknown> | null,
  fallbackViewport: HeatmapSourceDimensions
): ReturnType<typeof getPoint> {
  if (!payload) return null;

  const point = getPoint(payload, fallbackViewport);
  if (!point) return null;

  if (point.coordinateMode === "document") {
    const pageX = finiteNumber(payload.pageX);
    const pageY = finiteNumber(payload.pageY);
    const document = readDimensions(payload.document);
    if (
      pageX === null ||
      pageY === null ||
      !document ||
      pageX < 0 ||
      pageX > document.width ||
      pageY < 0 ||
      pageY > document.height
    ) {
      return null;
    }
  } else {
    const x = finiteNumber(payload.x);
    const y = finiteNumber(payload.y);
    const dimensions = readDimensions(payload.viewport) ?? fallbackViewport;
    if (
      x === null ||
      y === null ||
      x < 0 ||
      x > dimensions.width ||
      y < 0 ||
      y > dimensions.height
    ) {
      return null;
    }
  }

  return point;
}

function dimensionKey(dimensions: HeatmapSourceDimensions | null): string {
  return dimensions ? `${dimensions.width}x${dimensions.height}` : "unknown";
}

function getGroupId(
  prefix: string,
  point: ReturnType<typeof getPoint>
): string {
  return [
    prefix,
    point?.coordinateMode ?? "unknown",
    point?.coordinateSchemaVersion ?? "legacy",
    dimensionKey(point?.sourceViewport ?? null),
    dimensionKey(point?.sourceDocument ?? null),
  ].join(":");
}

function getGroup(
  groups: Map<string, MutableGroup>,
  groupId: string,
  point: NonNullable<ReturnType<typeof getPoint>>,
  kind: "click" | "movement"
): MutableGroup {
  const existing = groups.get(groupId);
  if (existing) return existing;

  const group: HeatmapCoordinateGroupBase = {
    groupId,
    coordinateSchemaVersion: point.coordinateSchemaVersion,
    coordinateMode: point.coordinateMode,
    sourceViewport: point.sourceViewport,
    sourceDocument: point.sourceDocument,
    sampleCount: 0,
    alignment: point.alignment,
    safeForDocumentOverlay: point.alignment === "document-compatible",
  };
  const mutable: MutableGroup = {
    group:
      kind === "click"
        ? ({ ...group, points: [] } as HeatmapClickGroup)
        : ({ ...group, points: [] } as HeatmapMovementGroup),
    points: new Map<string, MutablePoint>(),
  };

  groups.set(groupId, mutable);
  return mutable;
}

interface HeatmapCoordinateGroupBase {
  groupId: string;
  coordinateSchemaVersion: number | null;
  coordinateMode: HeatmapCoordinateMode;
  sourceViewport: HeatmapSourceDimensions | null;
  sourceDocument: HeatmapSourceDimensions | null;
  sampleCount: number;
  alignment: HeatmapCoordinateAlignment;
  safeForDocumentOverlay: boolean;
}

function aggregate(
  rows: HeatmapAggregationEvent[],
  fallbackViewport: HeatmapSourceDimensions,
  gridSize: number,
  kind: "click" | "movement"
) {
  const groups = new Map<string, MutableGroup>();

  for (const row of rows) {
    if (
      row.type !== kind &&
      !(kind === "movement" && row.type === "mousemove")
    ) {
      continue;
    }

    const point = getPoint(row.payload, fallbackViewport);
    if (!point) continue;
    const weight = kind === "click" ? readPointWeight(row.payload) : 1;
    if (weight === null) continue;

    const groupId = getGroupId(kind, point);
    const group = getGroup(groups, groupId, point, kind);
    const xBucket = Math.min(gridSize - 1, Math.floor(point.x * gridSize));
    const yBucket = Math.min(gridSize - 1, Math.floor(point.y * gridSize));
    const pointKey = `${xBucket}:${yBucket}`;
    const existing = group.points.get(pointKey);

    group.group.sampleCount += weight;

    if (existing) {
      existing.count += weight;
      existing.weight += weight;
      existing.weightedX += point.x * weight;
      existing.weightedY += point.y * weight;
      continue;
    }

    group.points.set(pointKey, {
      x: kind === "click" ? point.x : (xBucket + 0.5) / gridSize,
      y: kind === "click" ? point.y : (yBucket + 0.5) / gridSize,
      count: weight,
      intensity: 0,
      coordinateMode: point.coordinateMode,
      weightedX: point.x * weight,
      weightedY: point.y * weight,
      weight,
    });
  }

  const allPoints = Array.from(groups.values()).flatMap((item) =>
    Array.from(item.points.values())
  );
  const maxCount = Math.max(...allPoints.map((point) => point.count), 1);

  const resultGroups = Array.from(groups.values()).map((item) => {
    const points = Array.from(item.points.values()).map((point) => ({
      x: kind === "click" ? point.weightedX / point.weight : point.x,
      y: kind === "click" ? point.weightedY / point.weight : point.y,
      count: point.count,
      intensity: Math.min(1, point.count / maxCount),
      coordinateMode: point.coordinateMode,
    }));

    item.group.points = points;
    return item.group;
  });

  return {
    points: resultGroups.flatMap((group) => group.points),
    groups: resultGroups,
    coordinateMode:
      resultGroups.length === 0
        ? "viewport"
        : new Set(resultGroups.map((group) => group.coordinateMode)).size > 1
          ? "mixed"
          : resultGroups[0]!.coordinateMode,
  };
}

export function aggregateClickHeatmap(
  rows: HeatmapAggregationEvent[],
  fallbackViewport: HeatmapSourceDimensions
): {
  points: HeatmapClickPoint[];
  groups: HeatmapClickGroup[];
  coordinateMode: HeatmapCoordinateMode | "mixed";
} {
  return aggregate(rows, fallbackViewport, CLICK_GRID_SIZE, "click") as {
    points: HeatmapClickPoint[];
    groups: HeatmapClickGroup[];
    coordinateMode: HeatmapCoordinateMode | "mixed";
  };
}

export function collectClickSamples(
  rows: HeatmapAggregationEvent[],
  fallbackViewport: HeatmapSourceDimensions
): {
  groups: HeatmapClickSampleGroup[];
  eligibleEventCount: number;
} {
  const groups = new Map<string, HeatmapClickSampleGroup>();
  let eligibleEventCount = 0;

  for (const row of rows) {
    if (row.type !== "click") continue;

    const point = getStrictClickPoint(row.payload, fallbackViewport);
    const weight = readPointWeight(row.payload);
    if (!point || weight === null) continue;

    const groupId = getGroupId("click", point);
    const existing = groups.get(groupId);
    const group =
      existing ??
      ({
        groupId,
        coordinateSchemaVersion: point.coordinateSchemaVersion,
        coordinateMode: point.coordinateMode,
        sourceViewport: point.sourceViewport,
        sourceDocument: point.sourceDocument,
        sampleCount: 0,
        alignment: point.alignment,
        safeForDocumentOverlay: point.alignment === "document-compatible",
        samples: [],
      } satisfies HeatmapClickSampleGroup);

    group.sampleCount += weight;
    group.samples.push({
      x: point.x,
      y: point.y,
      weight,
      coordinateMode: point.coordinateMode,
    } satisfies HeatmapClickSample);
    groups.set(groupId, group);
    eligibleEventCount += 1;
  }

  return {
    groups: Array.from(groups.values())
      .map((group) => ({
        ...group,
        samples: [...group.samples].sort(
          (left, right) =>
            left.x - right.x ||
            left.y - right.y ||
            left.weight - right.weight ||
            left.coordinateMode.localeCompare(right.coordinateMode)
        ),
      }))
      .sort((left, right) => left.groupId.localeCompare(right.groupId)),
    eligibleEventCount,
  };
}

export function aggregateMovementHeatmap(
  rows: HeatmapAggregationEvent[],
  fallbackViewport: HeatmapSourceDimensions
): {
  points: HeatmapMovementPoint[];
  groups: HeatmapMovementGroup[];
  coordinateMode: HeatmapCoordinateMode | "mixed";
} {
  return aggregate(rows, fallbackViewport, MOVEMENT_GRID_SIZE, "movement") as {
    points: HeatmapMovementPoint[];
    groups: HeatmapMovementGroup[];
    coordinateMode: HeatmapCoordinateMode | "mixed";
  };
}
