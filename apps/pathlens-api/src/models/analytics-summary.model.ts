import { and, eq, sql } from "drizzle-orm";

import {
  analyticsSummaryReportSchema,
  type AnalyticsSummaryComparison,
  type AnalyticsSummaryReport,
  type AnalyticsSummaryReportType,
} from "@workspace/contracts";

import { db } from "../db/client";
import { funnels, type FunnelStepDefinition } from "../db/schema";
import {
  getReportingPeriod,
  type ReportingPeriod,
} from "../lib/reporting-period";
import { getProjectWorkspaceIdModel } from "./projects.model";
import { calculateStepVisitors, type FunnelEventRow } from "./funnels.model";

interface SummaryInput {
  workspaceId: string;
  projectId: string;
  reportType: AnalyticsSummaryReportType;
  timezone: string;
  now?: Date;
  period?: ReportingPeriod;
}

interface CoreRow extends Record<string, unknown> {
  current_visitors: number | string | null;
  previous_visitors: number | string | null;
  current_sessions: number | string | null;
  previous_sessions: number | string | null;
  current_page_views: number | string | null;
  previous_page_views: number | string | null;
  current_events: number | string | null;
  previous_events: number | string | null;
}

interface EventCountRow extends Record<string, unknown> {
  type: string;
  current_count: number | string | null;
  previous_count: number | string | null;
}

interface PageRow extends Record<string, unknown> {
  path: string | null;
  current_views: number | string | null;
  previous_views: number | string | null;
}

interface FunnelDefinition {
  id: string;
  name: string;
  steps: FunnelStepDefinition[];
}

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }
  return 0;
}

function round(value: number) {
  return Number(value.toFixed(1));
}

export function getAnalyticsComparison(
  current: number,
  previous: number
): AnalyticsSummaryComparison {
  const safeCurrent = Math.max(0, current);
  const safePrevious = Math.max(0, previous);
  const absoluteChange = safeCurrent - safePrevious;
  const percentChange =
    safePrevious === 0
      ? safeCurrent === 0
        ? 0
        : null
      : round((absoluteChange / safePrevious) * 100);

  return {
    current: safeCurrent,
    previous: safePrevious,
    absoluteChange,
    percentChange,
    direction: absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "flat",
  };
}

function metric(value: number, previous: number) {
  return {
    value,
    comparison: getAnalyticsComparison(value, previous),
  };
}

function getConversionRate(visitors: number[]) {
  const entered = visitors[0] ?? 0;
  const completed = visitors[visitors.length - 1] ?? 0;
  return entered === 0 ? 0 : round((completed / entered) * 100);
}

function getFunnelComparison(current: number, previous: number) {
  return {
    ...getAnalyticsComparison(current, previous),
    percentagePointChange: round(current - previous),
  };
}

async function getFunnelDefinitions(
  workspaceId: string,
  projectId: string
): Promise<FunnelDefinition[]> {
  return db
    .select({
      id: funnels.id,
      name: funnels.name,
      steps: funnels.steps,
    })
    .from(funnels)
    .where(
      and(
        eq(funnels.workspaceId, workspaceId),
        eq(funnels.projectId, projectId)
      )
    );
}

async function getFunnelEvents(
  workspaceId: string,
  projectId: string,
  start: Date,
  end: Date,
  definitions: FunnelDefinition[]
): Promise<FunnelEventRow[]> {
  const targetFilters = definitions.flatMap((definition) =>
    definition.steps.map((step) => {
      const target = step.target.trim();
      return target.startsWith("/")
        ? sql`path = ${target}`
        : sql`LOWER(type) = ${target.toLowerCase()}`;
    })
  );

  if (targetFilters.length === 0) return [];

  const targetFilter = sql.join(targetFilters, sql` OR `);
  const result = await db.execute<FunnelEventRow>(sql`
    SELECT visitor_id, session_id, occurred_at, path, type
    FROM events
    WHERE workspace_id = ${workspaceId}
      AND project_id = ${projectId}
      AND occurred_at >= ${start}
      AND occurred_at < ${end}
      AND (${targetFilter})
    ORDER BY session_id, occurred_at ASC
  `);

  return result.rows;
}

export function getAnalyticsFunnelSummary(
  definition: FunnelDefinition,
  eventsInRange: FunnelEventRow[],
  currentStart: Date,
  currentEnd: Date,
  previousStart: Date,
  previousEnd: Date
) {
  const currentEvents = eventsInRange.filter((event) => {
    const occurredAt = new Date(event.occurred_at ?? 0).getTime();
    return (
      occurredAt >= currentStart.getTime() && occurredAt < currentEnd.getTime()
    );
  });
  const previousEvents = eventsInRange.filter((event) => {
    const occurredAt = new Date(event.occurred_at ?? 0).getTime();
    return (
      occurredAt >= previousStart.getTime() &&
      occurredAt < previousEnd.getTime()
    );
  });
  const currentVisitors = calculateStepVisitors(
    currentEvents,
    definition.steps
  );
  const previousVisitors = calculateStepVisitors(
    previousEvents,
    definition.steps
  );
  const conversionRate = getConversionRate(currentVisitors);
  const previousConversionRate = getConversionRate(previousVisitors);

  return {
    id: definition.id,
    name: definition.name,
    steps: definition.steps.map((step, index) => ({
      name: step.name,
      visitors: currentVisitors[index] ?? 0,
    })),
    conversionRate,
    previousConversionRate,
    conversionComparison: getFunnelComparison(
      conversionRate,
      previousConversionRate
    ),
  };
}

export async function getAnalyticsSummaryModel({
  workspaceId,
  projectId,
  reportType,
  timezone,
  now,
  period: explicitPeriod,
}: SummaryInput): Promise<AnalyticsSummaryReport> {
  const projectWorkspaceId = await getProjectWorkspaceIdModel(projectId);
  if (!projectWorkspaceId || projectWorkspaceId !== workspaceId) {
    throw new Error("Project does not belong to the workspace.");
  }

  const period =
    explicitPeriod ?? getReportingPeriod({ reportType, timezone, now });
  const definitions = await getFunnelDefinitions(workspaceId, projectId);

  const [coreResult, eventCountResult, pagesResult, funnelEvents] =
    await Promise.all([
      db.execute<CoreRow>(sql`
        SELECT
          COUNT(DISTINCT visitor_id) FILTER (
            WHERE occurred_at >= ${period.start}
              AND occurred_at < ${period.end}
          )::int AS current_visitors,
          COUNT(DISTINCT visitor_id) FILTER (
            WHERE occurred_at >= ${period.previousStart}
              AND occurred_at < ${period.previousEnd}
          )::int AS previous_visitors,
          COUNT(DISTINCT session_id) FILTER (
            WHERE occurred_at >= ${period.start}
              AND occurred_at < ${period.end}
          )::int AS current_sessions,
          COUNT(DISTINCT session_id) FILTER (
            WHERE occurred_at >= ${period.previousStart}
              AND occurred_at < ${period.previousEnd}
          )::int AS previous_sessions,
          COUNT(*) FILTER (
            WHERE type = 'page_view'
              AND occurred_at >= ${period.start}
              AND occurred_at < ${period.end}
          )::int AS current_page_views,
          COUNT(*) FILTER (
            WHERE type = 'page_view'
              AND occurred_at >= ${period.previousStart}
              AND occurred_at < ${period.previousEnd}
          )::int AS previous_page_views,
          COUNT(*) FILTER (
            WHERE occurred_at >= ${period.start}
              AND occurred_at < ${period.end}
          )::int AS current_events,
          COUNT(*) FILTER (
            WHERE occurred_at >= ${period.previousStart}
              AND occurred_at < ${period.previousEnd}
          )::int AS previous_events
        FROM events
        WHERE workspace_id = ${workspaceId}
          AND project_id = ${projectId}
          AND occurred_at >= ${period.previousStart}
          AND occurred_at < ${period.end}
      `),
      db.execute<EventCountRow>(sql`
        WITH counts AS (
          SELECT
            type,
            COUNT(*) FILTER (
              WHERE occurred_at >= ${period.start}
                AND occurred_at < ${period.end}
            )::int AS current_count,
            COUNT(*) FILTER (
              WHERE occurred_at >= ${period.previousStart}
                AND occurred_at < ${period.previousEnd}
            )::int AS previous_count
          FROM events
          WHERE workspace_id = ${workspaceId}
            AND project_id = ${projectId}
            AND occurred_at >= ${period.previousStart}
            AND occurred_at < ${period.end}
          GROUP BY type
        )
        SELECT type, current_count, previous_count
        FROM counts
        ORDER BY current_count DESC, type ASC
      `),
      db.execute<PageRow>(sql`
        WITH page_counts AS (
          SELECT
            path,
            COUNT(*) FILTER (
              WHERE occurred_at >= ${period.start}
                AND occurred_at < ${period.end}
            )::int AS current_views,
            COUNT(*) FILTER (
              WHERE occurred_at >= ${period.previousStart}
                AND occurred_at < ${period.previousEnd}
            )::int AS previous_views
          FROM events
          WHERE workspace_id = ${workspaceId}
            AND project_id = ${projectId}
            AND type = 'page_view'
            AND occurred_at >= ${period.previousStart}
            AND occurred_at < ${period.end}
          GROUP BY path
        )
        SELECT path, current_views, previous_views
        FROM page_counts
        WHERE current_views > 0
        ORDER BY current_views DESC, path ASC NULLS FIRST
        LIMIT 5
      `),
      getFunnelEvents(
        workspaceId,
        projectId,
        period.previousStart,
        period.end,
        definitions
      ),
    ]);

  const core = coreResult.rows[0];
  const eventCounts = eventCountResult.rows.map((row) => {
    const current = toNumber(row.current_count);
    const previous = toNumber(row.previous_count);
    return {
      type: row.type,
      count: current,
      comparison: getAnalyticsComparison(current, previous),
    };
  });
  const topEvents = eventCounts.filter((event) => event.count > 0).slice(0, 5);
  const topPages = pagesResult.rows.map((row) => {
    const current = toNumber(row.current_views);
    const previous = toNumber(row.previous_views);
    return {
      path: row.path,
      views: current,
      comparison: getAnalyticsComparison(current, previous),
    };
  });

  const report = {
    projectId,
    reportType,
    period: {
      timezone,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      previousStart: period.previousStart.toISOString(),
      previousEnd: period.previousEnd.toISOString(),
    },
    metrics: {
      uniqueVisitors: metric(
        toNumber(core?.current_visitors),
        toNumber(core?.previous_visitors)
      ),
      totalSessions: metric(
        toNumber(core?.current_sessions),
        toNumber(core?.previous_sessions)
      ),
      pageViews: metric(
        toNumber(core?.current_page_views),
        toNumber(core?.previous_page_views)
      ),
      totalEvents: metric(
        toNumber(core?.current_events),
        toNumber(core?.previous_events)
      ),
    },
    eventCounts,
    topPages,
    topEvents,
    funnels: definitions.map((definition) =>
      getAnalyticsFunnelSummary(
        definition,
        funnelEvents,
        period.start,
        period.end,
        period.previousStart,
        period.previousEnd
      )
    ),
  };

  return analyticsSummaryReportSchema.parse(report);
}
