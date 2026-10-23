import assert from "node:assert/strict";
import test from "node:test";
import {
  applyHeatmapIdentityToFilters,
  buildClickSampleCoverage,
  buildMovementCoverage,
  selectHeatmapIdentityId,
  type HeatmapsFilters,
} from "./heatmaps.model";

const baseFilters: HeatmapsFilters = {
  workspaceId: "workspace",
  projectId: "project",
  range: "7d",
  device: "mobile",
  pagePath: "/old",
  domain: "old.example.com",
};

test("heatmap identity preserves the selected device filter", () => {
  const filters = applyHeatmapIdentityToFilters(baseFilters, {
    domain: "example.com",
    pagePath: "/contact",
  });

  assert.deepEqual(filters, {
    ...baseFilters,
    domain: "example.com",
    pagePath: "/contact",
  });
  assert.equal(filters.device, "mobile");
});

test("heatmap identity preserves all-device filtering", () => {
  const filters = applyHeatmapIdentityToFilters(
    { ...baseFilters, device: "all" },
    { domain: "example.com", pagePath: "/contact" }
  );

  assert.equal(filters.device, "all");
});

test("authoritative heatmap identity overrides a client-selected domain", () => {
  const filters = applyHeatmapIdentityToFilters(baseFilters, {
    domain: "second.example.com",
    pagePath: "/shared",
  });

  assert.equal(filters.domain, "second.example.com");
  assert.equal(filters.pagePath, "/shared");
});

test("heatmap page identity selection is stable and device-specific", () => {
  const candidates = [
    { id: "all-id", device: "all" as const },
    { id: "desktop-id", device: "desktop" as const },
    { id: "mobile-id", device: "mobile" as const },
  ];

  assert.equal(selectHeatmapIdentityId(candidates, "all"), "all-id");
  assert.equal(selectHeatmapIdentityId(candidates, "mobile"), "mobile-id");
  assert.equal(selectHeatmapIdentityId(candidates, "tablet"), null);
  assert.equal(selectHeatmapIdentityId(candidates, "all"), "all-id");
});

test("click sample coverage makes bounded truncation explicit", () => {
  assert.deepEqual(buildClickSampleCoverage(20_001, 20_000, 19_998), {
    limit: 20_000,
    totalEvents: 20_001,
    returnedEvents: 20_000,
    eligibleEvents: 19_998,
    truncated: true,
  });
  assert.deepEqual(buildClickSampleCoverage(3, 3, 2), {
    limit: 20_000,
    totalEvents: 3,
    returnedEvents: 3,
    eligibleEvents: 2,
    truncated: false,
  });
});

test("movement coverage uses the same bounded count semantics", () => {
  assert.deepEqual(buildMovementCoverage(20_001, 20_000, 19_500), {
    limit: 20_000,
    totalEvents: 20_001,
    returnedEvents: 20_000,
    eligibleEvents: 19_500,
    truncated: true,
  });
});
