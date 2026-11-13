import assert from "node:assert/strict";
import test from "node:test";

import type { AnalyticsSummaryReport } from "@workspace/contracts";

import {
  formatComparison,
  formatSlackAnalyticsReport,
} from "./slack-report-formatter";

function comparison(
  current: number,
  previous: number,
  percentChange: number | null,
  direction: "up" | "down" | "flat"
) {
  return {
    current,
    previous,
    absoluteChange: current - previous,
    percentChange,
    direction,
  };
}

function report(
  reportType: "daily" | "weekly" = "daily"
): AnalyticsSummaryReport {
  const metrics = {
    uniqueVisitors: {
      value: 2847,
      comparison: comparison(2847, 2532, 12.4, "up"),
    },
    totalSessions: {
      value: 3102,
      comparison: comparison(3102, 2751, 12.8, "up"),
    },
    pageViews: {
      value: 8329,
      comparison: comparison(8329, 7670, 8.6, "up"),
    },
    totalEvents: {
      value: 12401,
      comparison: comparison(12401, 13508, -8.2, "down"),
    },
  };
  return {
    projectId: "project/one",
    reportType,
    period: {
      timezone: "America/New_York",
      start: "2026-11-10T05:00:00.000Z",
      end:
        reportType === "daily"
          ? "2026-11-11T05:00:00.000Z"
          : "2026-11-16T05:00:00.000Z",
      previousStart: "2026-11-03T04:00:00.000Z",
      previousEnd: "2026-11-10T05:00:00.000Z",
    },
    metrics,
    eventCounts: [
      {
        type: "signup",
        count: 120,
        comparison: comparison(120, 100, 20, "up"),
      },
    ],
    topPages: [
      {
        path: "/pricing",
        views: 3200,
        comparison: comparison(3200, 2800, 14.3, "up"),
      },
      {
        path: null,
        views: 100,
        comparison: comparison(100, 0, null, "up"),
      },
    ],
    topEvents: [
      {
        type: "signup",
        count: 120,
        comparison: comparison(120, 100, 20, "up"),
      },
    ],
    funnels: [
      {
        id: "funnel-1",
        name: "Signup funnel",
        steps: [
          { name: "Landing", visitors: 1000 },
          { name: "Signup", visitors: 250 },
        ],
        conversionRate: 25,
        previousConversionRate: 30,
        conversionComparison: {
          ...comparison(25, 30, -16.7, "down"),
          percentagePointChange: -5,
        },
      },
    ],
  };
}

test("formats a daily Block Kit report with KPI fields and dashboard action", () => {
  const payload = formatSlackAnalyticsReport({
    report: report(),
    projectName: "Example Website",
    workspaceId: "workspace-1",
    applicationUrl: "https://app.example.test",
  });

  assert.match(payload.text, /Daily Analytics Report/);
  assert.match(payload.text, /2,847 \(\+12.4%\)/);
  assert.equal(payload.blocks[0]?.type, "header");
  assert.equal(
    payload.blocks.filter((block) => block.type === "actions").length,
    1
  );
  assert.equal(
    payload.blocks.filter((block) => block.type === "section").length,
    2
  );
  const actions = payload.blocks.find((block) => block.type === "actions");
  assert.equal(
    actions?.type === "actions" ? actions.elements[0]?.url : null,
    "https://app.example.test/app/workspace-1/project%2Fone"
  );
});

test("formats richer weekly content and funnel percentage points", () => {
  const payload = formatSlackAnalyticsReport({
    report: report("weekly"),
    projectName: "Weekly project",
    workspaceId: "workspace-1",
    applicationUrl: "https://app.example.test/",
  });
  const blockText = JSON.stringify(payload.blocks);
  assert.match(blockText, /Top events/);
  assert.match(blockText, /Funnels/);
  assert.match(blockText, /-5\.0 pp/);
  assert.match(blockText, /November 10, 2026/);
  assert.match(blockText, /November 15, 2026/);
});

test("uses neutral comparison labels and handles empty reports", () => {
  assert.equal(formatComparison(comparison(0, 0, 0, "flat")), "0%");
  assert.equal(formatComparison(comparison(5, 0, null, "up")), "New activity");
  const empty = report();
  empty.topPages = [];
  empty.topEvents = [];
  empty.funnels = [];
  const payload = formatSlackAnalyticsReport({
    report: empty,
    projectName: "Empty project",
    workspaceId: "workspace-1",
    applicationUrl: "not a URL",
  });
  assert.equal(
    payload.blocks.some((block) => block.type === "actions"),
    false
  );
  assert.equal(
    payload.blocks.some((block) => block.type === "section"),
    true
  );
  assert.equal(payload.blocks.length <= 50, true);
});

test("escapes mentions and truncates untrusted report metadata", () => {
  const longName = "<@channel>".repeat(40);
  const longPath = `<https://evil.example|@everyone>${"x".repeat(300)}`;
  const unsafe = report();
  unsafe.topPages[0]!.path = longPath;
  const payload = formatSlackAnalyticsReport({
    report: unsafe,
    projectName: longName,
    workspaceId: "workspace-1",
  });
  const serialized = JSON.stringify(payload.blocks);
  assert.equal(serialized.includes("<@channel>"), false);
  assert.equal(serialized.includes("&lt;@channel&gt;"), true);
  assert.equal(serialized.includes(longPath), false);
  assert.equal(payload.blocks.length <= 50, true);
});
