import assert from "node:assert/strict";
import { test } from "node:test";
import { mapHeatmapPointToSnapshot } from "@workspace/contracts";

test("maps document-relative normalized points to screenshot coordinates", () => {
  assert.deepEqual(
    mapHeatmapPointToSnapshot(
      { x: 0.25, y: 0.75, coordinateMode: "document" },
      1200,
      2000
    ),
    { x: 300, y: 1500 }
  );
});

test("the same base coordinates remain valid when the preview is CSS-scaled", () => {
  const point = { x: 0.5, y: 0.25, coordinateMode: "document" as const };

  assert.deepEqual(mapHeatmapPointToSnapshot(point, 1200, 2000), {
    x: 600,
    y: 500,
  });
  assert.deepEqual(mapHeatmapPointToSnapshot(point, 600, 1000), {
    x: 300,
    y: 250,
  });
});

test("does not project viewport-relative points onto a full-page screenshot", () => {
  assert.equal(
    mapHeatmapPointToSnapshot(
      { x: 0.5, y: 0.5, coordinateMode: "viewport" },
      1200,
      2000
    ),
    null
  );
});
