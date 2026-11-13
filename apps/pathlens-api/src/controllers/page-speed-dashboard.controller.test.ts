import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("services/page-speed-dashboard.service.ts"), {
  namedExports: {
    PageSpeedDashboardError: class PageSpeedDashboardError extends Error {
      statusCode = 400;
    },
    getPageSpeedDashboardData: async () => ({
      provider: "pagespeed-insights",
      url: "https://example.com/",
      strategy: "mobile",
      fetchedAt: "2026-03-01T00:00:00.000Z",
      scores: {
        performance: 90,
        accessibility: 80,
        bestPractices: 70,
        seo: 60,
      },
      metrics: {
        largestContentfulPaint: { displayValue: "1.2 s", numericValue: 1200 },
        firstContentfulPaint: { displayValue: "0.8 s", numericValue: 800 },
        totalBlockingTime: { displayValue: "100 ms", numericValue: 100 },
        cumulativeLayoutShift: { displayValue: "0", numericValue: 0 },
        speedIndex: { displayValue: "2.0 s", numericValue: 2000 },
      },
    }),
  },
});

let getPageSpeedDashboard: (typeof import("./page-speed-dashboard.controller"))["getPageSpeedDashboard"];

async function getController() {
  if (!getPageSpeedDashboard) {
    ({ getPageSpeedDashboard } =
      await import("./page-speed-dashboard.controller"));
  }
  return getPageSpeedDashboard;
}

test("returns the PageSpeed dashboard envelope", async () => {
  let body: unknown;
  const response = {
    status: () => response,
    json: (value: unknown) => {
      body = value;
      return response;
    },
  };

  await (
    await getController()
  )(
    {
      params: { project_id: "00000000-0000-4000-8000-000000000001" },
      query: {
        workspace_id: "00000000-0000-4000-8000-000000000002",
        domain: "https://example.com",
        strategy: "mobile",
      },
    } as never,
    response as never
  );

  assert.equal((body as { success: boolean }).success, true);
  assert.equal(
    (body as { data: { metrics: { largestContentfulPaint: unknown } } }).data
      .metrics.largestContentfulPaint !== null,
    true
  );
});

test("rejects missing PageSpeed dashboard parameters", async () => {
  let statusCode: number | undefined;
  const response = {
    status: (status: number) => {
      statusCode = status;
      return response;
    },
    json: () => response,
  };

  await (
    await getController()
  )(
    {
      params: { project_id: "00000000-0000-4000-8000-000000000001" },
      query: { workspace_id: "00000000-0000-4000-8000-000000000002" },
    } as never,
    response as never
  );

  assert.equal(statusCode, 400);
});
