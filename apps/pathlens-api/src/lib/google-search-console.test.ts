import assert from "node:assert/strict";
import test from "node:test";

import {
  runSearchConsoleReport,
  SearchConsoleApiError,
} from "./google-search-console";

test("normalizes Search Console analytics for a project property", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_INTEGRATION;
  const originalClientId = process.env.GOOGLE_AUTH_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET;
  process.env.GOOGLE_INTEGRATION = "integration-key";
  process.env.GOOGLE_AUTH_CLIENT_ID = "client-id";
  process.env.GOOGLE_AUTH_CLIENT_SECRET = "client-secret";
  let requestCount = 0;

  globalThis.fetch = async (input) => {
    const url = input.toString();
    requestCount += 1;
    if (url === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "access-token" }));
    }
    if (url.includes("/webmasters/v3/sites?")) {
      return new Response(
        JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:example.com" }] })
      );
    }
    return new Response(
      JSON.stringify({
        rows: [
          {
            keys: [
              requestCount === 4 ? "example query" : "https://example.com/",
            ],
            clicks: 12.8,
            impressions: 100.4,
            ctr: 0.128,
            position: 3.4,
          },
        ],
      })
    );
  };

  try {
    const result = await runSearchConsoleReport(
      "refresh-token",
      "https://example.com/",
      { startDate: "2026-01-01", endDate: "2026-01-28" }
    );

    assert.equal(result.siteUrl, "sc-domain:example.com");
    assert.deepEqual(result.summary, {
      clicks: 13,
      impressions: 100,
      ctr: 0.128,
      position: 3.4,
    });
    assert.equal(result.topQueries[0]?.key, "example query");
    assert.equal(result.topPages[0]?.key, "https://example.com/");
    assert.equal(requestCount, 5);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_INTEGRATION;
    else process.env.GOOGLE_INTEGRATION = originalKey;
    if (originalClientId === undefined)
      delete process.env.GOOGLE_AUTH_CLIENT_ID;
    else process.env.GOOGLE_AUTH_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined)
      delete process.env.GOOGLE_AUTH_CLIENT_SECRET;
    else process.env.GOOGLE_AUTH_CLIENT_SECRET = originalClientSecret;
  }
});

test("rejects when the selected domain has no Search Console property", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_INTEGRATION;
  const originalClientId = process.env.GOOGLE_AUTH_CLIENT_ID;
  const originalClientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET;
  process.env.GOOGLE_INTEGRATION = "integration-key";
  process.env.GOOGLE_AUTH_CLIENT_ID = "client-id";
  process.env.GOOGLE_AUTH_CLIENT_SECRET = "client-secret";
  globalThis.fetch = async (input) =>
    input.toString() === "https://oauth2.googleapis.com/token"
      ? new Response(JSON.stringify({ access_token: "access-token" }))
      : new Response(JSON.stringify({ siteEntry: [] }));

  try {
    await assert.rejects(
      () =>
        runSearchConsoleReport("refresh-token", "https://example.com/", {
          startDate: "2026-01-01",
          endDate: "2026-01-28",
        }),
      (error: unknown) =>
        error instanceof SearchConsoleApiError && error.statusCode === 403
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_INTEGRATION;
    else process.env.GOOGLE_INTEGRATION = originalKey;
    if (originalClientId === undefined)
      delete process.env.GOOGLE_AUTH_CLIENT_ID;
    else process.env.GOOGLE_AUTH_CLIENT_ID = originalClientId;
    if (originalClientSecret === undefined)
      delete process.env.GOOGLE_AUTH_CLIENT_SECRET;
    else process.env.GOOGLE_AUTH_CLIENT_SECRET = originalClientSecret;
  }
});
