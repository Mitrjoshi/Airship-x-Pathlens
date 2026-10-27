import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateClickHeatmap,
  aggregateMovementHeatmap,
  collectClickSamples,
} from "./heatmap-aggregation";
import {
  clickElementAnchorSchema,
  clickRegionAnchorSchema,
  incomingEventSchema,
} from "@workspace/contracts/events";

const fallbackViewport = { width: 1000, height: 800 };

test("keeps document and viewport click samples in separate compatible groups", () => {
  const result = aggregateClickHeatmap(
    [
      {
        type: "click",
        payload: {
          coordinateSchemaVersion: 1,
          pageX: 200,
          pageY: 400,
          viewport: { width: 500, height: 400 },
          document: { width: 1000, height: 2000 },
        },
      },
      {
        type: "click",
        payload: {
          coordinateSchemaVersion: 1,
          x: 200,
          y: 100,
          viewport: { width: 500, height: 400 },
        },
      },
    ],
    fallbackViewport
  );

  assert.equal(result.groups.length, 2);
  assert.deepEqual(
    result.groups.map((group) => [
      group.coordinateMode,
      group.sampleCount,
      group.alignment,
      group.safeForDocumentOverlay,
    ]),
    [
      ["document", 1, "document-compatible", true],
      ["viewport", 1, "viewport-only", false],
    ]
  );
});

test("preserves legacy click samples as unknown alignment", () => {
  const result = aggregateClickHeatmap(
    [{ type: "click", payload: { x: 100, y: 80 } }],
    fallbackViewport
  );

  assert.equal(result.groups[0]?.alignment, "legacy-unknown");
  assert.equal(result.groups[0]?.safeForDocumentOverlay, false);
  assert.equal(result.groups[0]?.sampleCount, 1);
});

test("represents a single click at its normalized position within its bucket", () => {
  const result = aggregateClickHeatmap(
    [
      {
        type: "click",
        payload: {
          coordinateSchemaVersion: 1,
          pageX: 479.99,
          pageY: 539.99,
          viewport: { width: 1920, height: 911 },
          document: { width: 1920, height: 2700 },
        },
      },
    ],
    fallbackViewport
  );

  const point = result.points[0];
  assert.ok(point);
  assert.equal(point.x, 479.99 / 1920);
  assert.equal(point.y, 539.99 / 2700);
  assert.equal(point.count, 1);
});

test("calculates a weighted centroid while preserving the existing bucket", () => {
  const result = aggregateClickHeatmap(
    [
      {
        type: "click",
        payload: {
          pageX: 210,
          pageY: 410,
          count: 1,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
      {
        type: "click",
        payload: {
          pageX: 230,
          pageY: 430,
          count: 3,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
    ],
    fallbackViewport
  );

  const point = result.points[0];
  assert.ok(point);
  assert.deepEqual(
    { x: point.x, y: point.y, count: point.count },
    { x: 0.225, y: 0.2125, count: 4 }
  );
  assert.equal(result.groups[0]?.sampleCount, 4);
});

test("keeps centroid edge coordinates and ignores invalid coordinates or weights", () => {
  const result = aggregateClickHeatmap(
    [
      {
        type: "click",
        payload: {
          pageX: 0,
          pageY: 0,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
      {
        type: "click",
        payload: {
          pageX: 1000,
          pageY: 2000,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
      {
        type: "click",
        payload: {
          pageX: Number.NaN,
          pageY: 100,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
      {
        type: "click",
        payload: {
          pageX: 500,
          pageY: 1000,
          count: 0,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
    ],
    fallbackViewport
  );

  assert.equal(result.groups[0]?.sampleCount, 2);
  assert.deepEqual(
    result.points.map((point) => [point.x, point.y, point.count]),
    [
      [0, 0, 1],
      [1, 1, 1],
    ]
  );
});

test("uses a bounded 40 by 40 grid for mouse movement", () => {
  const result = aggregateMovementHeatmap(
    [
      {
        type: "mousemove",
        payload: {
          coordinateSchemaVersion: 1,
          x: 80,
          y: 40,
          viewport: { width: 1000, height: 800 },
          document: { width: 1000, height: 1600 },
          pageX: 80,
          pageY: 40,
        },
      },
      {
        type: "mousemove",
        payload: {
          coordinateSchemaVersion: 1,
          x: 85,
          y: 45,
          viewport: { width: 1000, height: 800 },
          document: { width: 1000, height: 1600 },
          pageX: 85,
          pageY: 45,
        },
      },
    ],
    fallbackViewport
  );

  assert.equal(result.groups[0]?.sampleCount, 2);
  assert.equal(result.points.length, 1);
  assert.equal(result.points[0]?.count, 2);
  assert.equal(result.points[0]?.coordinateMode, "document");
  assert.equal(result.points[0]?.x, 0.0875);
  assert.equal(result.points[0]?.y, 0.0375);
});

test("reconciles the supplied mobile click shape without recovering sub-bucket positions", () => {
  const documentDimensions = { width: 360, height: 3876 };
  const viewportA = { width: 360, height: 762 };
  const viewportB = { width: 360, height: 706 };
  const click = (pageX: number, pageY: number, viewport: typeof viewportA) => ({
    type: "click" as const,
    payload: {
      coordinateSchemaVersion: 1,
      pageX,
      pageY,
      x: pageX,
      y: pageY,
      viewport,
      document: documentDimensions,
    },
  });
  const rows = [
    click(18, 100, viewportA),
    click(90, 1000, viewportA),
    click(270, 1800, viewportA),
    ...Array.from({ length: 19 }, () => click(189, 2800, viewportB)),
    click(18, 200, viewportB),
    click(90, 800, viewportB),
    click(162, 1400, viewportB),
    click(234, 2000, viewportB),
    click(306, 2400, viewportB),
    click(54, 3000, viewportB),
    click(342, 3700, viewportB),
    click(18, 200, viewportB),
  ];

  const result = aggregateClickHeatmap(rows, viewportA);
  const groupedCount = result.groups.reduce(
    (total, group) => total + group.sampleCount,
    0
  );
  const pointCount = result.groups.reduce(
    (total, group) => total + group.points.length,
    0
  );
  const dominantPoint = result.groups
    .flatMap((group) => group.points)
    .find((point) => point.count === 19);

  assert.equal(rows.length, 30);
  assert.equal(result.groups.length, 2);
  assert.equal(groupedCount, 30);
  assert.equal(pointCount, 11);
  assert.deepEqual(
    result.groups.map((group) => [
      group.sourceViewport?.height,
      group.sampleCount,
    ]),
    [
      [762, 3],
      [706, 27],
    ]
  );
  assert.equal(dominantPoint?.count, 19);
  assert.ok(Math.abs((dominantPoint?.x ?? 0) - 0.525) < Number.EPSILON);
  assert.ok(Math.abs((dominantPoint?.y ?? 0) - 2800 / 3876) < Number.EPSILON);
  assert.equal(Math.abs(0.525 * 360 - 189), 0);
  assert.equal(Math.abs((2800 / 3876) * 3876 - 2800), 0);
});

test("collects individual document click samples without bucket-centering", () => {
  const result = collectClickSamples(
    [
      {
        type: "click",
        payload: {
          pageX: 100,
          pageY: 200,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
          coordinateSchemaVersion: 1,
        },
      },
      {
        type: "click",
        payload: {
          pageX: 120,
          pageY: 300,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
          coordinateSchemaVersion: 1,
        },
      },
    ],
    { width: 1000, height: 500 }
  );

  assert.equal(result.eligibleEventCount, 2);
  assert.deepEqual(result.groups[0]?.samples, [
    { x: 0.1, y: 0.1, weight: 1, coordinateMode: "document" },
    { x: 0.12, y: 0.15, weight: 1, coordinateMode: "document" },
  ]);
});

test("rejects unsafe individual click coordinates instead of clamping them", () => {
  const result = collectClickSamples(
    [
      {
        type: "click",
        payload: {
          pageX: -1,
          pageY: 200,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
        },
      },
      {
        type: "click",
        payload: {
          pageX: 100,
          pageY: 200,
          viewport: { width: 1000, height: 500 },
          document: { width: 1000, height: 2000 },
          count: 3,
        },
      },
    ],
    { width: 1000, height: 500 }
  );

  assert.equal(result.eligibleEventCount, 1);
  assert.equal(result.groups[0]?.sampleCount, 3);
  assert.equal(result.groups[0]?.samples[0]?.weight, 3);
});

test("propagates and deduplicates valid element anchors without merging samples", () => {
  const anchor = {
    schemaVersion: 1 as const,
    anchorId: "fnv1a32-header",
    positionMode: "static" as const,
    effectivePositionMode: "sticky" as const,
    positioningAncestorDepth: 2,
    positioningAncestorAnchorId: "fnv1a32-sticky",
    relativeX: 0.25,
    relativeY: 0.75,
    capturedRect: { left: 10, top: 20, width: 100, height: 40 },
    transformedAncestor: false,
    stickyInset: { top: 0 },
    scrollAncestors: [],
  };
  const result = collectClickSamples(
    [
      {
        type: "click",
        payload: {
          x: 100,
          y: 80,
          viewport: fallbackViewport,
          elementAnchor: anchor,
        },
      },
      {
        type: "click",
        payload: {
          x: 120,
          y: 100,
          viewport: fallbackViewport,
          elementAnchor: { ...anchor, relativeX: 0.75, relativeY: 0.25 },
        },
      },
    ],
    fallbackViewport
  );

  assert.equal(result.groups[0]?.samples.length, 2);
  assert.equal(result.anchorDefinitions.length, 1);
  assert.deepEqual(
    result.groups[0]?.samples.map((sample) => [
      sample.anchorId,
      sample.relativeX,
      sample.relativeY,
    ]),
    [
      ["fnv1a32-header", 0.25, 0.75],
      ["fnv1a32-header", 0.75, 0.25],
    ]
  );
  assert.deepEqual(
    {
      ...result.anchorDiagnostics,
      anchorMetadataBytes: result.anchorDiagnostics.anchorMetadataBytes > 0,
    },
    {
      anchorCapableEvents: 2,
      legacyEvents: 0,
      missingAnchorEvents: 0,
      invalidAnchorEvents: 0,
      uniqueAnchors: 1,
      conflictingAnchorIdentities: 0,
      anchorDefinitionsReturned: 1,
      anchorDefinitionsTruncated: false,
      anchorMetadataBytes: true,
    }
  );
});

test("preserves explicit region anchors alongside element anchors", () => {
  const regionAnchor = {
    schemaVersion: 1 as const,
    regionId: "fnv1a32-a1b2c3d4",
    positionMode: "static" as const,
    relativeX: 0.25,
    relativeY: 0.75,
    capturedRect: { left: 0, top: 0, width: 800, height: 400 },
  };
  const result = collectClickSamples(
    [
      {
        type: "click",
        payload: {
          x: 100,
          y: 80,
          viewport: fallbackViewport,
          regionAnchor,
        },
      },
    ],
    fallbackViewport
  );

  assert.deepEqual(result.regionDefinitions, [
    { regionId: "fnv1a32-a1b2c3d4", schemaVersion: 1 },
  ]);
  assert.deepEqual(result.groups[0]?.samples[0]?.regionAnchor, regionAnchor);
  assert.equal(clickRegionAnchorSchema.safeParse(regionAnchor).success, true);
});

test("rejects invalid and conflicting persisted anchors without losing click samples", () => {
  const baseAnchor = {
    schemaVersion: 1 as const,
    anchorId: "fnv1a32-conflict",
    positionMode: "static" as const,
    relativeX: 0.5,
    relativeY: 0.5,
    capturedRect: { left: 0, top: 0, width: 20, height: 20 },
    transformedAncestor: false,
    scrollAncestors: [],
  };
  const result = collectClickSamples(
    [
      {
        type: "click",
        payload: {
          x: 100,
          y: 80,
          viewport: fallbackViewport,
          elementAnchor: baseAnchor,
        },
      },
      {
        type: "click",
        payload: {
          x: 120,
          y: 100,
          viewport: fallbackViewport,
          elementAnchor: { ...baseAnchor, positionMode: "fixed" },
        },
      },
      {
        type: "click",
        payload: {
          x: 140,
          y: 120,
          viewport: fallbackViewport,
          elementAnchor: { ...baseAnchor, privateSelector: "secret" },
        },
      },
      {
        type: "click",
        payload: { x: 160, y: 140, viewport: fallbackViewport },
      },
    ],
    fallbackViewport
  );

  assert.equal(result.groups[0]?.samples.length, 4);
  assert.equal(
    result.groups[0]?.samples.every((sample) => !sample.anchorId),
    true
  );
  assert.equal(result.anchorDefinitions.length, 0);
  assert.equal(result.anchorDiagnostics.invalidAnchorEvents, 1);
  assert.equal(result.anchorDiagnostics.missingAnchorEvents, 1);
  assert.equal(result.anchorDiagnostics.conflictingAnchorIdentities, 1);
});

test("strictly validates anchor metadata and rejects unknown or oversized fields", () => {
  const validAnchor = {
    schemaVersion: 1,
    anchorId: "fnv1a32-valid",
    positionMode: "static",
    relativeX: 0.5,
    relativeY: 0.5,
    capturedRect: { left: 0, top: 0, width: 20, height: 20 },
    transformedAncestor: false,
    scrollAncestors: [],
  };

  assert.equal(clickElementAnchorSchema.safeParse(validAnchor).success, true);
  assert.equal(
    clickElementAnchorSchema.safeParse({
      ...validAnchor,
      selector: "#private-selector",
    }).success,
    false
  );
  assert.equal(
    clickElementAnchorSchema.safeParse({
      ...validAnchor,
      relativeX: 2,
    }).success,
    false
  );

  const legacyEvent = {
    projectId: "project",
    visitorId: "visitor",
    sessionId: "session",
    type: "click",
    timestamp: "2026-01-01T00:00:00.000Z",
    x: 100,
    y: 80,
  };
  assert.equal(incomingEventSchema.safeParse(legacyEvent).success, true);
  assert.equal(
    incomingEventSchema.safeParse({
      ...legacyEvent,
      elementAnchor: validAnchor,
    }).success,
    true
  );
  assert.equal(
    incomingEventSchema.safeParse({
      ...legacyEvent,
      elementAnchor: { ...validAnchor, selector: "#private-selector" },
    }).success,
    false
  );
});

test("bounds anchor definition output without dropping individual samples", () => {
  const result = collectClickSamples(
    Array.from({ length: 2_049 }, (_, index) => ({
      type: "click" as const,
      payload: {
        x: 100,
        y: 80,
        viewport: fallbackViewport,
        elementAnchor: {
          schemaVersion: 1 as const,
          anchorId: `fnv1a32-${index}`,
          positionMode: "static" as const,
          relativeX: 0.5,
          relativeY: 0.5,
          capturedRect: { left: 0, top: 0, width: 20, height: 20 },
          transformedAncestor: false,
          scrollAncestors: [],
        },
      },
    })),
    fallbackViewport
  );

  assert.equal(result.groups[0]?.samples.length, 2_049);
  assert.equal(result.anchorDefinitions.length, 2_048);
  assert.equal(result.anchorDiagnostics.uniqueAnchors, 2_049);
  assert.equal(result.anchorDiagnostics.anchorDefinitionsTruncated, true);
});
