import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateScrollGroups,
  aggregateScrollReach,
} from "./scroll-aggregation";

function event(
  sessionId: string,
  percentage: number,
  overrides: Record<string, unknown> = {}
) {
  return {
    sessionId,
    device: "desktop",
    payload: {
      percentage,
      scrollY: (percentage / 100) * (2700 - 911),
      viewport: { width: 1920, height: 911 },
      document: { width: 1920, height: 2700 },
      ...overrides,
    },
  };
}

test("deduplicates sessions and uses each session maximum", () => {
  const groups = aggregateScrollGroups([
    event("a", 10),
    event("a", 55),
    event("b", 20),
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.sessionCount, 2);
  assert.ok(Math.abs((groups[0]?.maximumReachPercent ?? 0) - 70.18) < 0.01);
});

test("separates devices and geometries", () => {
  const groups = aggregateScrollGroups([
    event("desktop", 50),
    { ...event("mobile", 50), device: "mobile" },
    event("wide", 50, {
      viewport: { width: 1440, height: 900 },
      document: { width: 1440, height: 3000 },
    }),
  ]);

  assert.deepEqual(
    groups.map((group) => [
      group.device,
      group.sourceViewport,
      group.sourceDocument,
      group.safeForDocumentOverlay,
    ]),
    [
      [
        "desktop",
        { width: 1440, height: 900 },
        { width: 1440, height: 3000 },
        true,
      ],
      [
        "desktop",
        { width: 1920, height: 911 },
        { width: 1920, height: 2700 },
        true,
      ],
      [
        "mobile",
        { width: 1920, height: 911 },
        { width: 1920, height: 2700 },
        true,
      ],
    ]
  );
});

test("marks missing and changing geometry unsafe", () => {
  const groups = aggregateScrollGroups([
    event("missing", 25, { viewport: undefined, document: undefined }),
    event("changing", 25),
    event("changing", 50, {
      viewport: { width: 390, height: 844 },
      document: { width: 390, height: 1600 },
    }),
  ]);

  assert.deepEqual(
    groups.map((group) => [group.alignment, group.safeForDocumentOverlay]),
    [
      ["geometry-inconsistent", false],
      ["geometry-unavailable", false],
    ]
  );
});

test("normalizes unknown devices and invalid percentages safely", () => {
  const groups = aggregateScrollGroups([
    { ...event("unknown", 150), device: null },
    { ...event("unknown", -10), device: "legacy-device" },
    { ...event("unknown", Number.NaN), device: "legacy-device" },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0]?.device, "unknown");
  assert.equal(groups[0]?.maximumReachPercent, 100);
});

test("derives 100 percent reach from the bottom scroll offset", () => {
  const groups = aggregateScrollGroups([event("bottom", 0, { scrollY: 1789 })]);
  assert.equal(groups[0]?.maximumReachPercent, 100);
});

test("does not fabricate reach for legacy offset-only events", () => {
  const groups = aggregateScrollGroups([
    {
      sessionId: "legacy",
      device: "desktop",
      payload: {
        percentage: 100,
        viewport: { width: 1920, height: 911 },
        document: { width: 1920, height: 2700 },
      },
    },
  ]);

  assert.equal(groups[0]?.maximumReachPercent, null);
  assert.deepEqual(groups[0]?.reachPoints, []);
});

test("combines relative reach across desktop geometries by session", () => {
  const reach = aggregateScrollReach(
    [
      event("wide", 0, {
        scrollY: 1000,
        viewport: { width: 1920, height: 900 },
        document: { width: 1920, height: 4000 },
      }),
      event("wide", 0, {
        scrollY: 2500,
        viewport: { width: 1440, height: 800 },
        document: { width: 1440, height: 3000 },
      }),
      event("short", 0, {
        scrollY: 500,
        viewport: { width: 1920, height: 900 },
        document: { width: 1920, height: 2000 },
      }),
    ],
    { device: "desktop", totalEligibleSessions: 4 }
  );

  assert.equal(reach.validScrollSessions, 2);
  assert.equal(reach.sessionsWithoutScrollEvents, 2);
  assert.equal(reach.excludedSessions, 2);
  assert.equal(reach.geometryVariableSessions, 1);
  const middleBand = reach.bands.find((band) => band.percentage === 52.5);
  assert.equal(middleBand?.count, 2);
  assert.equal(middleBand?.intensity, 0.5);
});

test("keeps devices isolated and rejects invalid relative observations", () => {
  const reach = aggregateScrollReach(
    [
      event("desktop", 50),
      { ...event("mobile", 50), device: "mobile" },
      event("invalid", 50, {
        scrollY: 10,
        viewport: { width: 0, height: 0 },
      }),
    ],
    { device: "desktop", totalEligibleSessions: 2 }
  );

  assert.equal(reach.device, "desktop");
  assert.equal(reach.validScrollSessions, 1);
  assert.equal(reach.excludedSessions, 1);
  assert.equal(reach.excludedReasons["invalid-scroll-observation"], 1);
});

test("clamps relative reach and preserves truncation metadata", () => {
  const reach = aggregateScrollReach(
    [event("clamped", 0, { scrollY: 10_000 })],
    { device: "desktop", totalEligibleSessions: 1, truncated: true }
  );

  assert.equal(reach.truncated, true);
  assert.equal(reach.bands[reach.bands.length - 1]?.percentage, 97.5);
});
