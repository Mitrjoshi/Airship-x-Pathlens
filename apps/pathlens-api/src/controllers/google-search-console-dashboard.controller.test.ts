import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("services/google-search-console-dashboard.service.ts"), {
  namedExports: {
    DashboardSearchConsoleError: class DashboardSearchConsoleError extends Error {
      statusCode = 401;
    },
    getGoogleSearchConsoleDashboardData: async () => ({
      siteUrl: "sc-domain:example.com",
      period: {
        startDate: "2026-02-22",
        endDate: "2026-02-28",
        timezone: "UTC",
      },
      summary: {
        clicks: 12,
        impressions: 100,
        ctr: 0.12,
        position: 3.4,
      },
      topQueries: [],
      topPages: [],
      fetchedAt: "2026-03-01T00:00:00.000Z",
    }),
  },
});

let getGoogleSearchConsoleDashboard: (typeof import("./google-search-console-dashboard.controller"))["getGoogleSearchConsoleDashboard"];

async function getController() {
  if (!getGoogleSearchConsoleDashboard) {
    ({ getGoogleSearchConsoleDashboard } =
      await import("./google-search-console-dashboard.controller"));
  }
  return getGoogleSearchConsoleDashboard;
}

test("returns the normalized dashboard response", async () => {
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
        range: "7d",
      },
    } as never,
    response as never
  );

  assert.deepEqual(body, {
    success: true,
    data: {
      siteUrl: "sc-domain:example.com",
      period: {
        startDate: "2026-02-22",
        endDate: "2026-02-28",
        timezone: "UTC",
      },
      summary: { clicks: 12, impressions: 100, ctr: 0.12, position: 3.4 },
      topQueries: [],
      topPages: [],
      fetchedAt: "2026-03-01T00:00:00.000Z",
    },
  });
});

test("rejects missing or invalid query parameters", async () => {
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
      query: {},
    } as never,
    response as never
  );

  assert.equal(statusCode, 400);
});
