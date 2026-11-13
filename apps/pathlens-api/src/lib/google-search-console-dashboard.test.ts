import assert from "node:assert/strict";
import { test } from "node:test";

import { getDashboardSearchConsoleDateRange } from "./google-search-console-dashboard";

test("maps dashboard ranges to complete UTC calendar days", () => {
  const now = new Date("2026-03-01T18:45:00.000Z");

  assert.deepEqual(getDashboardSearchConsoleDateRange("24h", now), {
    startDate: "2026-02-28",
    endDate: "2026-02-28",
    timezone: "UTC",
  });
  assert.deepEqual(getDashboardSearchConsoleDateRange("7d", now), {
    startDate: "2026-02-22",
    endDate: "2026-02-28",
    timezone: "UTC",
  });
  assert.deepEqual(getDashboardSearchConsoleDateRange("30d", now), {
    startDate: "2026-01-30",
    endDate: "2026-02-28",
    timezone: "UTC",
  });
  assert.deepEqual(getDashboardSearchConsoleDateRange("90d", now), {
    startDate: "2025-12-01",
    endDate: "2026-02-28",
    timezone: "UTC",
  });
});

test("handles year boundaries deterministically", () => {
  assert.deepEqual(
    getDashboardSearchConsoleDateRange(
      "7d",
      new Date("2025-01-01T00:05:00.000Z")
    ),
    {
      startDate: "2024-12-25",
      endDate: "2024-12-31",
      timezone: "UTC",
    }
  );
});
