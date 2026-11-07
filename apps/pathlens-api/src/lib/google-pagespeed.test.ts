import assert from "node:assert/strict";
import test from "node:test";

import { PageSpeedApiError, runPageSpeedInsights } from "./google-pagespeed";

test("normalizes Google PageSpeed Insights results", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.GOOGLE_INTEGRATION;
  process.env.GOOGLE_INTEGRATION = "secret-key";
  globalThis.fetch = async (input) => {
    const url = new URL(input.toString());
    assert.equal(url.searchParams.get("key"), "secret-key");
    assert.equal(url.searchParams.get("strategy"), "mobile");

    return new Response(
      JSON.stringify({
        lighthouseResult: {
          categories: {
            performance: { score: 0.91 },
            accessibility: { score: 0.87 },
            "best-practices": { score: 0.95 },
            seo: { score: 0.8 },
          },
          audits: {
            "largest-contentful-paint": {
              title: "Largest Contentful Paint",
              displayValue: "2.1 s",
              numericValue: 2100,
            },
          },
        },
      })
    );
  };

  try {
    const result = await runPageSpeedInsights("https://example.com", "mobile");

    assert.deepEqual(result.scores, {
      performance: 91,
      accessibility: 87,
      bestPractices: 95,
      seo: 80,
    });
    assert.equal(result.metrics[1]?.displayValue, "2.1 s");
    assert.equal(result.metrics[1]?.numericValue, 2100);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GOOGLE_INTEGRATION;
    else process.env.GOOGLE_INTEGRATION = originalKey;
  }
});

test("rejects requests when GOOGLE_INTEGRATION is missing", async () => {
  const originalKey = process.env.GOOGLE_INTEGRATION;
  delete process.env.GOOGLE_INTEGRATION;

  try {
    await assert.rejects(
      () => runPageSpeedInsights("https://example.com", "desktop"),
      (error: unknown) =>
        error instanceof PageSpeedApiError &&
        error.statusCode === 503 &&
        error.message.includes("not configured")
    );
  } finally {
    if (originalKey === undefined) delete process.env.GOOGLE_INTEGRATION;
    else process.env.GOOGLE_INTEGRATION = originalKey;
  }
});
