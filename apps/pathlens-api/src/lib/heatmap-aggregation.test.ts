import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateClickHeatmap,
  aggregateMovementHeatmap,
  collectClickSamples,
} from "./heatmap-aggregation";

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
