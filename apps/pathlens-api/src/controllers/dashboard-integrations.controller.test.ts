import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("models/dashboard-integrations.model.ts"), {
  namedExports: {
    getProjectDashboardIntegrationsModel: async () => [
      {
        provider: "stripe",
        name: "Stripe",
        iconUrl: null,
        status: "connected",
        supportsDateRange: true,
        requiresDomain: false,
        dashboardApiAvailable: false,
      },
    ],
  },
});

let getDashboardIntegrations: (typeof import("./dashboard-integrations.controller"))["getDashboardIntegrations"];

async function getController() {
  if (!getDashboardIntegrations) {
    ({ getDashboardIntegrations } =
      await import("./dashboard-integrations.controller"));
  }
  return getDashboardIntegrations;
}

test("returns the dashboard integration envelope", async () => {
  let responseBody: unknown;
  const response = {
    status: () => response,
    json: (body: unknown) => {
      responseBody = body;
      return response;
    },
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

  assert.deepEqual(responseBody, {
    success: true,
    data: [
      {
        provider: "stripe",
        name: "Stripe",
        iconUrl: null,
        status: "connected",
        supportsDateRange: true,
        requiresDomain: false,
        dashboardApiAvailable: false,
      },
    ],
  });
});

test("rejects invalid project and workspace identifiers", async () => {
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
    { params: { project_id: "project" }, query: {} } as never,
    response as never
  );

  assert.equal(statusCode, 400);
});
