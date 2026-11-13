import { and, eq } from "drizzle-orm";

import type { GoogleSearchConsoleDashboardData } from "@workspace/contracts";

import { db } from "../db/client";
import { projectDomains } from "../db/schema";
import { getDashboardIntegrationCapability } from "../integrations/dashboard-capabilities";
import {
  getDashboardSearchConsoleDateRange,
  type DashboardSearchConsoleRange,
} from "../lib/google-search-console-dashboard";
import { decryptIntegrationCredentials } from "../lib/credential-encryption";
import {
  runSearchConsoleReport,
  SearchConsoleApiError,
} from "../lib/google-search-console";
import { normalizeProjectDomain } from "../lib/project-domain";
import { getProjectIntegrationBySlugModel } from "../models/project-integrations.model";

export const GOOGLE_SEARCH_CONSOLE_PROVIDER = "google-search-console";

export class DashboardSearchConsoleError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 400 | 401 | 403 | 404 | 502 | 504
  ) {
    super(message);
    this.name = "DashboardSearchConsoleError";
  }
}

export async function getGoogleSearchConsoleDashboardData(input: {
  projectId: string;
  domain: string;
  range: DashboardSearchConsoleRange;
}): Promise<GoogleSearchConsoleDashboardData> {
  const capability = getDashboardIntegrationCapability(
    GOOGLE_SEARCH_CONSOLE_PROVIDER
  );
  if (!capability?.dashboardApiAvailable) {
    throw new DashboardSearchConsoleError(
      "Google Search Console dashboard data is unavailable.",
      502
    );
  }

  const connection = await getProjectIntegrationBySlugModel(
    input.projectId,
    GOOGLE_SEARCH_CONSOLE_PROVIDER
  );
  if (
    !connection ||
    connection.connection.status !== "connected" ||
    connection.integrationStatus !== "available" ||
    !connection.integrationIsVisible
  ) {
    throw new DashboardSearchConsoleError(
      "Google Search Console is not connected to this project.",
      404
    );
  }

  const normalizedDomain = normalizeProjectDomain(input.domain);
  if (!normalizedDomain) {
    throw new DashboardSearchConsoleError("Invalid project domain.", 400);
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
    throw new DashboardSearchConsoleError(
      "The selected domain does not belong to this project.",
      400
    );
  }

  const credentials = decryptIntegrationCredentials<{
    refreshToken?: string;
  }>(connection.connection.encryptedCredentials);
  if (!credentials.refreshToken) {
    throw new DashboardSearchConsoleError(
      "Google Search Console authorization is missing. Reconnect the integration.",
      401
    );
  }

  try {
    const period = getDashboardSearchConsoleDateRange(input.range);
    const result = await runSearchConsoleReport(
      credentials.refreshToken,
      domain.domain,
      period
    );

    return {
      siteUrl: result.siteUrl,
      period,
      summary: result.summary,
      topQueries: result.topQueries.map((row) => ({
        query: row.key,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })),
      topPages: result.topPages.map((row) => ({
        page: row.key,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
      })),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof SearchConsoleApiError) throw error;
    throw new DashboardSearchConsoleError(
      "Unable to load Google Search Console data.",
      502
    );
  }
}
