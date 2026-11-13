import { and, eq } from "drizzle-orm";

import type { PageSpeedDashboardData } from "@workspace/contracts";

import { db } from "../db/client";
import { projectDomains } from "../db/schema";
import {
  PageSpeedApiError,
  runPageSpeedInsights,
  type PageSpeedStrategy,
} from "../lib/google-pagespeed";
import { normalizeProjectDomain } from "../lib/project-domain";
import { getProjectIntegrationBySlugModel } from "../models/project-integrations.model";

const PAGE_SPEED_PROVIDER = "pagespeed-insights";

export class PageSpeedDashboardError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 404 | 429 | 502 | 503 | 504
  ) {
    super(message);
    this.name = "PageSpeedDashboardError";
  }
}

function metric(
  metrics: Array<{
    id: string;
    displayValue: string | null;
    numericValue: number | null;
  }>,
  id: string
) {
  const value = metrics.find((item) => item.id === id);
  return {
    displayValue: value?.displayValue ?? null,
    numericValue: value?.numericValue ?? null,
  };
}

export async function getPageSpeedDashboardData(input: {
  projectId: string;
  domain: string;
  strategy: PageSpeedStrategy;
}): Promise<PageSpeedDashboardData> {
  // PageSpeed is a point-in-time audit. Keep this request fresh and bounded;
  // dashboard consumers can add client-side stale-time or explicit refresh
  // behavior without introducing cross-project server cache state.
  const connection = await getProjectIntegrationBySlugModel(
    input.projectId,
    PAGE_SPEED_PROVIDER
  );
  if (
    !connection ||
    connection.connection.status !== "connected" ||
    connection.integrationStatus !== "available" ||
    !connection.integrationIsVisible
  ) {
    throw new PageSpeedDashboardError(
      "Google PageSpeed Insights is not connected to this project.",
      404
    );
  }

  const normalizedDomain = normalizeProjectDomain(input.domain);
  if (!normalizedDomain) {
    throw new PageSpeedDashboardError("Invalid project domain.", 400);
  }

  const [domain] = await db
    .select({ domain: projectDomains.domain })
    .from(projectDomains)
    .where(
      and(
        eq(projectDomains.projectId, input.projectId),
        eq(projectDomains.domain, normalizedDomain)
      )
    )
    .limit(1);

  if (!domain) {
    throw new PageSpeedDashboardError(
      "The selected domain does not belong to this project.",
      400
    );
  }

  try {
    const result = await runPageSpeedInsights(domain.domain, input.strategy);
    return {
      provider: PAGE_SPEED_PROVIDER,
      url: result.url,
      strategy: result.strategy,
      fetchedAt: result.fetchedAt,
      scores: result.scores,
      metrics: {
        largestContentfulPaint: metric(
          result.metrics,
          "largest-contentful-paint"
        ),
        firstContentfulPaint: metric(result.metrics, "first-contentful-paint"),
        totalBlockingTime: metric(result.metrics, "total-blocking-time"),
        cumulativeLayoutShift: metric(
          result.metrics,
          "cumulative-layout-shift"
        ),
        speedIndex: metric(result.metrics, "speed-index"),
      },
    };
  } catch (error) {
    if (error instanceof PageSpeedApiError) {
      const statusCode = [429, 502, 503, 504].includes(error.statusCode)
        ? (error.statusCode as 429 | 502 | 503 | 504)
        : 502;
      throw new PageSpeedDashboardError(error.message, statusCode);
    }
    throw new PageSpeedDashboardError(
      "Unable to load Google PageSpeed Insights data.",
      502
    );
  }
}
