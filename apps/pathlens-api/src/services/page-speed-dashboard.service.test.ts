import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("models/project-integrations.model.ts"), {
  namedExports: {
    getProjectIntegrationBySlugModel: async () => ({
      integrationStatus: "available",
      integrationIsVisible: true,
      connection: { status: "connected" },
    }),
  },
});

mock.module(sourcePath("db/client.ts"), {
  namedExports: {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ domain: "https://example.com/" }],
          }),
        }),
      }),
    },
  },
});

mock.module(sourcePath("lib/google-pagespeed.ts"), {
  namedExports: {
    PageSpeedApiError: class PageSpeedApiError extends Error {
      statusCode = 502;
    },
    runPageSpeedInsights: async () => ({
      url: "https://example.com/",
      strategy: "desktop",
      fetchedAt: "2026-03-01T00:00:00.000Z",
      scores: {
        performance: 90,
        accessibility: 80,
        bestPractices: 70,
        seo: 60,
      },
      metrics: [
        {
          id: "largest-contentful-paint",
          label: "LCP",
          displayValue: "1.2 s",
          numericValue: 1200,
        },
      ],
    }),
  },
});

let getPageSpeedDashboardData: (typeof import("./page-speed-dashboard.service"))["getPageSpeedDashboardData"];

async function getService() {
  if (!getPageSpeedDashboardData) {
    ({ getPageSpeedDashboardData } =
      await import("./page-speed-dashboard.service"));
  }
  return getPageSpeedDashboardData;
}

test("preserves missing PageSpeed metrics as null", async () => {
  const result = await (
    await getService()
  )({
    projectId: "project-id",
    domain: "example.com",
    strategy: "desktop",
  });

  assert.equal(result.strategy, "desktop");
  assert.deepEqual(result.metrics.largestContentfulPaint, {
    displayValue: "1.2 s",
    numericValue: 1200,
  });
  assert.deepEqual(result.metrics.speedIndex, {
    displayValue: null,
    numericValue: null,
  });
});
