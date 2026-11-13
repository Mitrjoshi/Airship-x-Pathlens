import assert from "node:assert/strict";
import test from "node:test";

import {
  getAnalyticsComparison,
  getAnalyticsFunnelSummary,
} from "./analytics-summary.model";

test("calculates comparisons without invalid percentages", () => {
  assert.deepEqual(getAnalyticsComparison(0, 0), {
    current: 0,
    previous: 0,
    absoluteChange: 0,
    percentChange: 0,
    direction: "flat",
  });
  assert.deepEqual(getAnalyticsComparison(5, 0), {
    current: 5,
    previous: 0,
    absoluteChange: 5,
    percentChange: null,
    direction: "up",
  });
  assert.deepEqual(getAnalyticsComparison(3, 8), {
    current: 3,
    previous: 8,
    absoluteChange: -5,
    percentChange: -62.5,
    direction: "down",
  });
});

test("deduplicates funnel visitors while preserving ordered steps", () => {
  const currentStart = new Date("2024-01-08T00:00:00.000Z");
  const currentEnd = new Date("2024-01-15T00:00:00.000Z");
  const previousStart = new Date("2024-01-01T00:00:00.000Z");
  const previousEnd = currentStart;

  const result = getAnalyticsFunnelSummary(
    {
      id: "funnel-1",
      name: "Signup",
      steps: [
        { name: "Landing", target: "/landing" },
        { name: "Signup", target: "form_submit" },
      ],
    },
    [
      {
        visitor_id: "visitor-1",
        session_id: "session-1",
        occurred_at: new Date("2024-01-08T01:00:00.000Z"),
        path: "/landing",
        type: "page_view",
      },
      {
        visitor_id: "visitor-1",
        session_id: "session-1",
        occurred_at: new Date("2024-01-08T01:01:00.000Z"),
        path: "/landing",
        type: "page_view",
      },
      {
        visitor_id: "visitor-1",
        session_id: "session-1",
        occurred_at: new Date("2024-01-08T01:02:00.000Z"),
        path: "/signup",
        type: "form_submit",
      },
      {
        visitor_id: "visitor-2",
        session_id: "session-2",
        occurred_at: new Date("2024-01-09T01:00:00.000Z"),
        path: "/landing",
        type: "page_view",
      },
      {
        visitor_id: "visitor-1",
        session_id: "session-3",
        occurred_at: new Date("2024-01-10T01:00:00.000Z"),
        path: "/landing",
        type: "page_view",
      },
      {
        visitor_id: "visitor-1",
        session_id: "session-3",
        occurred_at: new Date("2024-01-10T01:01:00.000Z"),
        path: "/signup",
        type: "form_submit",
      },
      {
        visitor_id: "visitor-3",
        session_id: "session-4",
        occurred_at: new Date("2024-01-02T01:00:00.000Z"),
        path: "/landing",
        type: "page_view",
      },
      {
        visitor_id: "visitor-3",
        session_id: "session-4",
        occurred_at: new Date("2024-01-02T01:01:00.000Z"),
        path: "/signup",
        type: "form_submit",
      },
    ],
    currentStart,
    currentEnd,
    previousStart,
    previousEnd
  );

  assert.deepEqual(result.steps, [
    { name: "Landing", visitors: 2 },
    { name: "Signup", visitors: 1 },
  ]);
  assert.equal(result.conversionRate, 50);
  assert.equal(result.previousConversionRate, 100);
  assert.equal(result.conversionComparison.percentagePointChange, -50);
});
