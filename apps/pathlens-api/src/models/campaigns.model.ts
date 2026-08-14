import { and, desc, eq, sql } from "drizzle-orm";
import type {
  CampaignAnalyticsData,
  CampaignDevice,
  CampaignGoalOption,
  CampaignRange,
  CampaignRow,
  CampaignSummary,
} from "@workspace/contracts/campaigns";
import { db } from "../db/client";
import { goals } from "../db/schema";
import { type GoalMatchDefinition, type GoalType } from "./goal-matching";

export type {
  CampaignDevice,
  CampaignRange,
} from "@workspace/contracts/campaigns";

export interface CampaignFilters {
  workspaceId: string;
  projectId: string;
  range: CampaignRange;
  device: CampaignDevice;
  goalId?: string;
  page: number;
  pageSize: number;
}

interface CampaignGoalDefinition extends GoalMatchDefinition {
  id: string;
  name: string;
  unit: string;
}

interface CampaignStatsRow extends Record<string, unknown> {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  visitors: number | string | null;
  sessions: number | string | null;
  engaged_visitors: number | string | null;
  engaged_sessions: number | string | null;
}

interface CampaignGoalStatsRow extends Record<string, unknown> {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  converted_visitors: number | string | null;
  revenue: number | string | null;
}

const RANGE_DAYS: Record<CampaignRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function getPercentage(numerator: number, denominator: number): number {
  return denominator > 0
    ? Number(((numerator / denominator) * 100).toFixed(1))
    : 0;
}

function getGoalType(value: string): GoalType {
  if (
    value === "revenue" ||
    value === "pageview" ||
    value === "button" ||
    value === "form_submit"
  ) {
    return value;
  }

  return "event";
}

async function getGoalDefinitions(
  workspaceId: string,
  projectId: string
): Promise<CampaignGoalDefinition[]> {
  const definitions = await db
    .select({
      id: goals.id,
      name: goals.name,
      type: goals.type,
      unit: goals.unit,
      matchTarget: goals.matchTarget,
      matchPath: goals.matchPath,
    })
    .from(goals)
    .where(
      and(eq(goals.workspaceId, workspaceId), eq(goals.projectId, projectId))
    )
    .orderBy(desc(goals.updatedAt));

  return definitions.map((definition) => ({
    id: definition.id,
    name: definition.name,
    type: getGoalType(definition.type),
    unit: definition.unit,
    matchTarget: definition.matchTarget,
    matchPath: definition.matchPath,
  }));
}

function getGoalOption(definition: CampaignGoalDefinition): CampaignGoalOption {
  return {
    id: definition.id,
    name: definition.name,
    type: definition.type,
    unit: definition.unit,
  };
}

function getCampaignKey(row: {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}): string {
  return JSON.stringify([
    row.utm_source ?? "",
    row.utm_medium ?? "",
    row.utm_campaign ?? "",
    row.utm_term ?? "",
    row.utm_content ?? "",
  ]);
}

function getCampaignFields(row: {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
}) {
  return {
    utmSource: row.utm_source?.trim() || null,
    utmMedium: row.utm_medium?.trim() || null,
    utmCampaign: row.utm_campaign?.trim() || null,
    utmTerm: row.utm_term?.trim() || null,
    utmContent: row.utm_content?.trim() || null,
  };
}

function getGoalFilter(goal: CampaignGoalDefinition) {
  const target = goal.matchTarget.trim();

  if (goal.type === "button") {
    return sql`
      events.type = 'click'
      AND COALESCE(NULLIF(BTRIM(events.path), ''), '/') = ${goal.matchPath?.trim() || "/"}
      AND BTRIM(regexp_replace(
        COALESCE(events.payload->>'buttonText', ''),
        '[[:space:]]+',
        ' ',
        'g'
      )) = ${target.replace(/\s+/g, " ").trim()}
    `;
  }

  if (goal.type === "form_submit") {
    return sql`
      events.type = 'form_submit'
      AND BTRIM(COALESCE(events.payload->>'id', '')) = ${target}
    `;
  }

  if (goal.type === "pageview") {
    return sql`
      events.type = 'page_view'
      AND COALESCE(NULLIF(BTRIM(events.path), ''), '/') = ${target}
    `;
  }

  if (target.startsWith("/")) {
    return sql`COALESCE(NULLIF(BTRIM(events.path), ''), '/') = ${target}`;
  }

  return sql`LOWER(events.type) = ${target.toLowerCase()}`;
}

function getRevenueExpression() {
  return sql`
    CASE
      WHEN COALESCE(
        events.payload->>'revenue_cents',
        events.payload->>'amount_cents'
      ) ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN COALESCE(
          events.payload->>'revenue_cents',
          events.payload->>'amount_cents'
        )::numeric / 100
      WHEN COALESCE(
        events.payload->>'revenue',
        events.payload->>'value',
        events.payload->>'amount'
      ) ~ '^-?[0-9]+([.][0-9]+)?$'
        THEN COALESCE(
          events.payload->>'revenue',
          events.payload->>'value',
          events.payload->>'amount'
        )::numeric
      ELSE 0
    END
  `;
}

function getBaseFilters(filters: CampaignFilters) {
  const rangeDays = RANGE_DAYS[filters.range];
  const deviceFilter =
    filters.device === "all"
      ? sql``
      : sql`AND LOWER(COALESCE(events.device, 'unknown')) = ${filters.device}`;

  return sql`
    events.workspace_id = ${filters.workspaceId}
    AND events.project_id = ${filters.projectId}
    AND events.occurred_at >= NOW() - make_interval(days => ${rangeDays})
    AND events.occurred_at <= NOW()
    ${deviceFilter}
  `;
}

const campaignSelect = sql`
  COALESCE(attribution.utm_source, '') AS utm_source,
  COALESCE(attribution.utm_medium, '') AS utm_medium,
  COALESCE(attribution.utm_campaign, '') AS utm_campaign,
  COALESCE(attribution.utm_term, '') AS utm_term,
  COALESCE(attribution.utm_content, '') AS utm_content
`;

const campaignGroup = sql`
  utm_source,
  utm_medium,
  utm_campaign,
  utm_term,
  utm_content
`;

const attributionGroup = sql`
  COALESCE(attribution.utm_source, ''),
  COALESCE(attribution.utm_medium, ''),
  COALESCE(attribution.utm_campaign, ''),
  COALESCE(attribution.utm_term, ''),
  COALESCE(attribution.utm_content, '')
`;

async function getCampaignStats(
  filters: CampaignFilters
): Promise<CampaignStatsRow[]> {
  const baseFilters = getBaseFilters(filters);

  const result = await db.execute<CampaignStatsRow>(sql`
    WITH filtered_events AS (
      SELECT
        events.visitor_id,
        events.session_id,
        events.type,
        events.occurred_at,
        events.session_duration_ms,
        ${campaignSelect}
      FROM events
      LEFT JOIN visitor_campaign_attribution attribution
        ON attribution.workspace_id = events.workspace_id
        AND attribution.project_id = events.project_id
        AND attribution.visitor_id = events.visitor_id
        AND events.occurred_at >= attribution.first_seen_at
      WHERE ${baseFilters}
    ),
    session_stats AS (
      SELECT
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        visitor_id,
        session_id,
        COUNT(*) FILTER (WHERE type = 'page_view') AS page_views,
        BOOL_OR(
          type IN ('click', 'scroll', 'form_submit', 'form_success', 'form_error')
        ) AS has_interaction,
        COALESCE(
          MAX(session_duration_ms),
          EXTRACT(EPOCH FROM (MAX(occurred_at) - MIN(occurred_at))) * 1000
        ) AS duration_ms
      FROM filtered_events
      GROUP BY
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        visitor_id,
        session_id
    )
    SELECT
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      COUNT(DISTINCT visitor_id)::int AS visitors,
      COUNT(DISTINCT session_id)::int AS sessions,
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE page_views >= 2 OR has_interaction OR duration_ms >= 10000
      )::int AS engaged_visitors,
      COUNT(DISTINCT session_id) FILTER (
        WHERE page_views >= 2 OR has_interaction OR duration_ms >= 10000
      )::int AS engaged_sessions
    FROM session_stats
    GROUP BY ${campaignGroup}
    ORDER BY visitors DESC, sessions DESC;
  `);

  return result.rows;
}

async function getGoalStats(
  filters: CampaignFilters,
  goal: CampaignGoalDefinition
): Promise<CampaignGoalStatsRow[]> {
  const baseFilters = getBaseFilters(filters);
  const goalFilter = getGoalFilter(goal);
  const revenueExpression =
    goal.type === "revenue" ? getRevenueExpression() : sql`0`;

  const result = await db.execute<CampaignGoalStatsRow>(sql`
    SELECT
      ${campaignSelect},
      COUNT(DISTINCT events.visitor_id)::int AS converted_visitors,
      SUM(${revenueExpression})::numeric AS revenue
    FROM events
    LEFT JOIN visitor_campaign_attribution attribution
      ON attribution.workspace_id = events.workspace_id
      AND attribution.project_id = events.project_id
      AND attribution.visitor_id = events.visitor_id
      AND events.occurred_at >= attribution.first_seen_at
    WHERE ${baseFilters}
      AND ${goalFilter}
    GROUP BY ${attributionGroup};
  `);

  return result.rows;
}

function getEmptySummary(hasGoal: boolean): CampaignSummary {
  return {
    campaignCount: 0,
    visitors: 0,
    sessions: 0,
    engagedVisitors: 0,
    engagedSessions: 0,
    engagementRate: 0,
    convertedVisitors: hasGoal ? 0 : null,
    conversionRate: hasGoal ? 0 : null,
    revenue: hasGoal ? 0 : null,
  };
}

export async function getCampaignsModel(
  filters: CampaignFilters
): Promise<CampaignAnalyticsData> {
  const definitions = await getGoalDefinitions(
    filters.workspaceId,
    filters.projectId
  );
  const selectedGoal = filters.goalId
    ? (definitions.find((definition) => definition.id === filters.goalId) ??
      definitions[0] ??
      null)
    : (definitions[0] ?? null);

  const [statsRows, goalRows] = await Promise.all([
    getCampaignStats(filters),
    selectedGoal ? getGoalStats(filters, selectedGoal) : Promise.resolve([]),
  ]);
  const goalAggregates = new Map<
    string,
    { visitors: number; revenue: number }
  >();

  if (selectedGoal) {
    for (const row of goalRows) {
      const key = getCampaignKey(row);
      const aggregate = goalAggregates.get(key) ?? {
        visitors: 0,
        revenue: 0,
      };

      aggregate.visitors += toNumber(row.converted_visitors);
      aggregate.revenue += toNumber(row.revenue);

      goalAggregates.set(key, aggregate);
    }
  }

  const campaigns = statsRows.map((row): CampaignRow => {
    const fields = getCampaignFields(row);
    const key = getCampaignKey(row);
    const goalAggregate = goalAggregates.get(key);
    const visitors = toNumber(row.visitors);
    const convertedVisitors = selectedGoal
      ? (goalAggregate?.visitors ?? 0)
      : null;

    return {
      key,
      isUnattributed: Object.values(fields).every((value) => value === null),
      ...fields,
      visitors,
      sessions: toNumber(row.sessions),
      engagedVisitors: toNumber(row.engaged_visitors),
      engagedSessions: toNumber(row.engaged_sessions),
      engagementRate: getPercentage(toNumber(row.engaged_visitors), visitors),
      convertedVisitors,
      conversionRate:
        convertedVisitors === null
          ? null
          : getPercentage(convertedVisitors, visitors),
      revenue:
        selectedGoal?.type === "revenue"
          ? Number((goalAggregate?.revenue ?? 0).toFixed(2))
          : null,
    };
  });

  campaigns.sort(
    (left, right) =>
      right.visitors - left.visitors ||
      (right.convertedVisitors ?? 0) - (left.convertedVisitors ?? 0) ||
      left.key.localeCompare(right.key)
  );

  const summary = campaigns.reduce<CampaignSummary>(
    (current, campaign) => {
      if (!campaign.isUnattributed) current.campaignCount += 1;
      current.visitors += campaign.visitors;
      current.sessions += campaign.sessions;
      current.engagedVisitors += campaign.engagedVisitors;
      current.engagedSessions += campaign.engagedSessions;
      current.convertedVisitors =
        current.convertedVisitors === null ||
        campaign.convertedVisitors === null
          ? null
          : current.convertedVisitors + campaign.convertedVisitors;
      current.revenue =
        current.revenue === null || campaign.revenue === null
          ? null
          : current.revenue + campaign.revenue;

      return current;
    },
    getEmptySummary(Boolean(selectedGoal))
  );

  summary.engagementRate = getPercentage(
    summary.engagedVisitors,
    summary.visitors
  );
  summary.conversionRate =
    summary.convertedVisitors === null
      ? null
      : getPercentage(summary.convertedVisitors, summary.visitors);
  if (selectedGoal?.type !== "revenue") {
    summary.revenue = null;
  }
  if (summary.revenue !== null) {
    summary.revenue = Number(summary.revenue.toFixed(2));
  }

  const offset = (filters.page - 1) * filters.pageSize;
  const totalPages = Math.ceil(campaigns.length / filters.pageSize);

  return {
    goals: definitions.map(getGoalOption),
    selectedGoal: selectedGoal ? getGoalOption(selectedGoal) : null,
    summary,
    campaigns: campaigns.slice(offset, offset + filters.pageSize),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total: campaigns.length,
      totalPages,
      hasNextPage: filters.page < totalPages,
    },
  };
}
