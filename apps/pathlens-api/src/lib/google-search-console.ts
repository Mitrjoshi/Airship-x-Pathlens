import {
  getGoogleIntegrationApiKey,
  getGoogleIntegrationTimeoutMs,
  getGoogleOAuthEnv,
} from "./google-integration";

export type SearchConsoleDateRange = {
  startDate: string;
  endDate: string;
};

export type SearchConsoleResult = SearchConsoleDateRange & {
  siteUrl: string;
  summary: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: SearchConsoleRow[];
  topPages: SearchConsoleRow[];
};

export type SearchConsoleRow = {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export class SearchConsoleApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 502
  ) {
    super(message);
    this.name = "SearchConsoleApiError";
  }
}

type SiteEntry = {
  siteUrl?: string;
  permissionLevel?: string;
};

type SearchAnalyticsResponse = {
  rows?: Array<{
    keys?: string[];
    clicks?: number;
    impressions?: number;
    ctr?: number;
    position?: number;
  }>;
};

function siteHost(value: string) {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return value.toLowerCase().replace(/^www\./, "");
  }
}

function normalizedOrigin(value: string) {
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return `${url.origin}/`;
  } catch {
    return value;
  }
}

function getPropertyMatch(siteUrl: string, sites: SiteEntry[]) {
  const origin = normalizedOrigin(siteUrl);
  const host = siteHost(siteUrl);
  return (
    sites.find((site) => site.siteUrl === origin)?.siteUrl ??
    sites.find((site) => site.siteUrl === `sc-domain:${host}`)?.siteUrl ??
    sites.find((site) => site.siteUrl && siteHost(site.siteUrl) === host)
      ?.siteUrl ??
    null
  );
}

async function googleFetch<T>(
  url: URL,
  options: RequestInit = {},
  errorMessage: string
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    getGoogleIntegrationTimeoutMs()
  );

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 401) {
        throw new SearchConsoleApiError(
          "Google Search Console authorization has expired. Reconnect the integration.",
          401
        );
      }
      if (response.status === 403) {
        throw new SearchConsoleApiError(
          "The connected Google account cannot access this Search Console property.",
          403
        );
      }
      if (response.status === 429) {
        throw new SearchConsoleApiError(
          "Google Search Console is rate limiting requests. Please try again shortly.",
          429
        );
      }
      throw new SearchConsoleApiError(errorMessage, 502);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof SearchConsoleApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SearchConsoleApiError(
        "Google Search Console took too long to respond.",
        504
      );
    }
    throw new SearchConsoleApiError(
      "Unable to reach Google Search Console.",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getGoogleOAuthEnv("GOOGLE_AUTH_CLIENT_ID"),
      client_secret: getGoogleOAuthEnv("GOOGLE_AUTH_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new SearchConsoleApiError(
      "Google Search Console authorization has expired. Reconnect the integration.",
      401
    );
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new SearchConsoleApiError(
      "Google did not return a Search Console access token.",
      401
    );
  }
  return data.access_token;
}

function toRows(response: SearchAnalyticsResponse): SearchConsoleRow[] {
  return (response.rows ?? []).map((row) => ({
    key: row.keys?.[0] ?? "Unknown",
    clicks: Math.round(row.clicks ?? 0),
    impressions: Math.round(row.impressions ?? 0),
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

export async function runSearchConsoleReport(
  refreshToken: string,
  siteUrl: string,
  range: SearchConsoleDateRange
): Promise<SearchConsoleResult> {
  const accessToken = await refreshAccessToken(refreshToken);
  const sitesUrl = new URL(
    "https://searchconsole.googleapis.com/webmasters/v3/sites"
  );
  sitesUrl.searchParams.set("key", getGoogleIntegrationApiKey());
  const sites = await googleFetch<{ siteEntry?: SiteEntry[] }>(
    sitesUrl,
    { headers: { Authorization: `Bearer ${accessToken}` } },
    "Unable to load Google Search Console properties."
  );
  const property = getPropertyMatch(siteUrl, sites.siteEntry ?? []);
  if (!property) {
    throw new SearchConsoleApiError(
      "The connected Google account has no Search Console property for this domain.",
      403
    );
  }

  const query = async (dimensions: string[]) => {
    const url = new URL(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`
    );
    url.searchParams.set("key", getGoogleIntegrationApiKey());
    return googleFetch<SearchAnalyticsResponse>(
      url,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate: range.startDate,
          endDate: range.endDate,
          dimensions,
          rowLimit: dimensions.length ? 10 : 1,
          dataState: "final",
        }),
      },
      "Unable to load Google Search Console analytics."
    );
  };

  const [summaryResponse, queriesResponse, pagesResponse] = await Promise.all([
    query([]),
    query(["query"]),
    query(["page"]),
  ]);
  const summary = summaryResponse.rows?.[0];

  return {
    siteUrl: property,
    ...range,
    summary: {
      clicks: Math.round(summary?.clicks ?? 0),
      impressions: Math.round(summary?.impressions ?? 0),
      ctr: summary?.ctr ?? 0,
      position: summary?.position ?? 0,
    },
    topQueries: toRows(queriesResponse),
    topPages: toRows(pagesResponse),
  };
}
