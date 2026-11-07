export type PageSpeedStrategy = "mobile" | "desktop";

export type PageSpeedResult = {
  url: string;
  strategy: PageSpeedStrategy;
  fetchedAt: string;
  scores: {
    performance: number | null;
    accessibility: number | null;
    bestPractices: number | null;
    seo: number | null;
  };
  metrics: Array<{
    id: string;
    label: string;
    displayValue: string | null;
    numericValue: number | null;
  }>;
};

import {
  getGoogleIntegrationApiKey,
  getGoogleIntegrationTimeoutMs,
} from "./google-integration";

export class PageSpeedApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502
  ) {
    super(message);
    this.name = "PageSpeedApiError";
  }
}

function requiredApiKey() {
  try {
    return getGoogleIntegrationApiKey();
  } catch {
    throw new PageSpeedApiError(
      "Google PageSpeed Insights is not configured.",
      503
    );
  }
}

function score(value: unknown) {
  return typeof value === "number" ? Math.round(value * 100) : null;
}

export async function runPageSpeedInsights(
  url: string,
  strategy: PageSpeedStrategy
): Promise<PageSpeedResult> {
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
  );
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("key", requiredApiKey());
  endpoint.searchParams.set("strategy", strategy);
  for (const category of [
    "performance",
    "accessibility",
    "best-practices",
    "seo",
  ]) {
    endpoint.searchParams.append("category", category);
  }

  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(
    () => controller.abort(),
    getGoogleIntegrationTimeoutMs()
  );

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) {
      console.warn("Google PageSpeed Insights request failed", {
        status: response.status,
        strategy,
        durationMs: Date.now() - startedAt,
      });
      throw new PageSpeedApiError(
        response.status === 429
          ? "Google PageSpeed Insights is rate limiting requests. Please try again shortly."
          : "Google PageSpeed Insights could not analyze this domain.",
        response.status === 429 ? 429 : 502
      );
    }

    const payload = (await response.json()) as {
      lighthouseResult?: {
        categories?: Record<string, { score?: unknown }>;
        audits?: Record<
          string,
          {
            title?: string;
            displayValue?: string;
            numericValue?: number;
          }
        >;
      };
    };
    const lighthouse = payload.lighthouseResult;
    const audits = lighthouse?.audits ?? {};
    const metricIds = [
      "first-contentful-paint",
      "largest-contentful-paint",
      "cumulative-layout-shift",
      "total-blocking-time",
      "speed-index",
    ];

    return {
      url,
      strategy,
      fetchedAt: new Date().toISOString(),
      scores: {
        performance: score(lighthouse?.categories?.performance?.score),
        accessibility: score(lighthouse?.categories?.accessibility?.score),
        bestPractices: score(lighthouse?.categories?.["best-practices"]?.score),
        seo: score(lighthouse?.categories?.seo?.score),
      },
      metrics: metricIds.map((id) => ({
        id,
        label: audits[id]?.title ?? id,
        displayValue: audits[id]?.displayValue ?? null,
        numericValue: audits[id]?.numericValue ?? null,
      })),
    };
  } catch (error) {
    if (error instanceof PageSpeedApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("Google PageSpeed Insights request timed out", {
        strategy,
        durationMs: Date.now() - startedAt,
      });
      throw new PageSpeedApiError(
        "Google PageSpeed Insights took too long to respond.",
        504
      );
    }
    throw new PageSpeedApiError(
      "Unable to reach Google PageSpeed Insights.",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}
