import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

let connection: unknown = {
  integrationStatus: "available",
  integrationIsVisible: true,
  connection: {
    status: "connected",
    encryptedCredentials: "encrypted",
  },
};
let domainRows = [{ domain: "https://example.com/" }];

mock.module(sourcePath("models/project-integrations.model.ts"), {
  namedExports: {
    getProjectIntegrationBySlugModel: async () => connection,
  },
});

mock.module(sourcePath("lib/credential-encryption.ts"), {
  namedExports: {
    decryptIntegrationCredentials: () => ({ refreshToken: "refresh-token" }),
  },
});

mock.module(sourcePath("lib/google-search-console.ts"), {
  namedExports: {
    SearchConsoleApiError: class SearchConsoleApiError extends Error {
      statusCode = 502;
    },
    runSearchConsoleReport: async (
      _refreshToken: string,
      _siteUrl: string,
      range: { startDate: string; endDate: string }
    ) => ({
      siteUrl: "sc-domain:example.com",
      ...range,
      summary: { clicks: 12, impressions: 100, ctr: 0.12, position: 3.4 },
      topQueries: [
        {
          key: "example query",
          clicks: 12,
          impressions: 100,
          ctr: 0.12,
          position: 3.4,
        },
      ],
      topPages: [],
    }),
  },
});

mock.module(sourcePath("db/client.ts"), {
  namedExports: {
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => domainRows,
          }),
        }),
      }),
    },
  },
});

let getGoogleSearchConsoleDashboardData: (typeof import("./google-search-console-dashboard.service"))["getGoogleSearchConsoleDashboardData"];

async function getService() {
  if (!getGoogleSearchConsoleDashboardData) {
    ({ getGoogleSearchConsoleDashboardData } =
      await import("./google-search-console-dashboard.service"));
  }
  return getGoogleSearchConsoleDashboardData;
}

test("validates the connection and domain before fetching normalized data", async () => {
  const result = await (
    await getService()
  )({
    projectId: "project-id",
    domain: "example.com",
    range: "7d",
  });

  assert.equal(result.siteUrl, "sc-domain:example.com");
  assert.equal(result.period.timezone, "UTC");
  assert.deepEqual(result.topQueries[0], {
    query: "example query",
    clicks: 12,
    impressions: 100,
    ctr: 0.12,
    position: 3.4,
  });
  assert.equal("refreshToken" in result, false);
});

test("rejects a connection that is not connected", async () => {
  const previous = connection;
  connection = {
    integrationStatus: "available",
    integrationIsVisible: true,
    connection: { status: "error", encryptedCredentials: "encrypted" },
  };

  try {
    const service = await getService();
    await assert.rejects(
      () =>
        service({
          projectId: "project-id",
          domain: "example.com",
          range: "7d",
        }),
      (error: unknown) =>
        error instanceof Error &&
        "statusCode" in error &&
        error.statusCode === 404
    );
  } finally {
    connection = previous;
  }
});

test("rejects a domain that is not registered for the project", async () => {
  const previous = domainRows;
  domainRows = [];

  try {
    const service = await getService();
    await assert.rejects(
      () =>
        service({
          projectId: "project-id",
          domain: "example.com",
          range: "7d",
        }),
      (error: unknown) =>
        error instanceof Error &&
        "statusCode" in error &&
        error.statusCode === 400
    );
  } finally {
    domainRows = previous;
  }
});
