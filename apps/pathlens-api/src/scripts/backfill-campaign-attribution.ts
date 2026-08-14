import { sql } from "drizzle-orm";
import { db, pool } from "../db/client";
import { visitorCampaignAttribution } from "../db/schema";

const CAMPAIGN_VALUE_LIMIT = 512;

interface HistoricalEventRow extends Record<string, unknown> {
  workspace_id: string;
  project_id: string;
  visitor_id: string;
  url: string | null;
  occurred_at: Date | string;
}

function normalizeCampaignValue(value: string | null): string | null {
  const normalized = value?.trim().slice(0, CAMPAIGN_VALUE_LIMIT) ?? "";

  return normalized || null;
}

function getLandingUrl(value: string | null): string | null {
  if (!value) return null;

  try {
    const parsedUrl = new URL(value, "https://pathlens.invalid");

    parsedUrl.search = "";
    parsedUrl.hash = "";

    return parsedUrl.toString();
  } catch {
    return value.split(/[?#]/, 1)[0] || null;
  }
}

function getCampaignFromUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url, "https://pathlens.invalid");
    const params = parsedUrl.searchParams;
    const attribution = {
      utmSource: normalizeCampaignValue(params.get("utm_source")),
      utmMedium: normalizeCampaignValue(params.get("utm_medium")),
      utmCampaign: normalizeCampaignValue(params.get("utm_campaign")),
      utmTerm: normalizeCampaignValue(params.get("utm_term")),
      utmContent: normalizeCampaignValue(params.get("utm_content")),
    };

    return Object.values(attribution).some(Boolean) ? attribution : null;
  } catch {
    return null;
  }
}

async function backfillCampaignAttribution(): Promise<void> {
  const result = await db.execute<HistoricalEventRow>(sql`
    SELECT workspace_id, project_id, visitor_id, url, occurred_at
    FROM events
    WHERE url IS NOT NULL
    ORDER BY occurred_at ASC, id ASC;
  `);
  const attributions = new Map<
    string,
    typeof visitorCampaignAttribution.$inferInsert
  >();

  for (const event of result.rows) {
    const campaign = getCampaignFromUrl(event.url);

    if (!campaign) continue;

    const key = `${event.workspace_id}:${event.project_id}:${event.visitor_id}`;

    if (!attributions.has(key)) {
      attributions.set(key, {
        workspaceId: event.workspace_id,
        projectId: event.project_id,
        visitorId: event.visitor_id,
        ...campaign,
        landingUrl: getLandingUrl(event.url),
        firstSeenAt: new Date(event.occurred_at),
      });
    }
  }

  const rows = Array.from(attributions.values());

  for (let index = 0; index < rows.length; index += 500) {
    await db
      .insert(visitorCampaignAttribution)
      .values(rows.slice(index, index + 500))
      .onConflictDoUpdate({
        target: [
          visitorCampaignAttribution.workspaceId,
          visitorCampaignAttribution.projectId,
          visitorCampaignAttribution.visitorId,
        ],
        set: {
          utmSource: sql`excluded.utm_source`,
          utmMedium: sql`excluded.utm_medium`,
          utmCampaign: sql`excluded.utm_campaign`,
          utmTerm: sql`excluded.utm_term`,
          utmContent: sql`excluded.utm_content`,
          landingUrl: sql`excluded.landing_url`,
          firstSeenAt: sql`excluded.first_seen_at`,
        },
        setWhere: sql`
          excluded.first_seen_at < ${visitorCampaignAttribution.firstSeenAt}
        `,
      });
  }

  console.log(`Backfilled ${rows.length} visitor campaign attributions.`);
}

async function main(): Promise<void> {
  try {
    await backfillCampaignAttribution();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
