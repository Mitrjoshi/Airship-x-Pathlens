import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "../db/client";
import { goals, projectDomains } from "../db/schema";
import {
  getRevenueValue,
  matchesGoal,
  type GoalEventRow,
  type GoalType,
} from "./goal-matching";
import { assertWorkspaceUsageLimit } from "./usage.model";

export type { GoalType } from "./goal-matching";
export type GoalRange = "24h" | "7d" | "30d" | "90d";

export interface Goal {
  id: string;
  name: string;
  type: "Event" | "Revenue" | "Pageview" | "Button" | "Form submit";
  target: number;
  current: number;
  unit: string;
  matchTarget: string;
  matchPath: string | null;
  domainId: string | null;
  domain: string | null;
  trend: "up" | "down" | "flat";
  trendValue: string;
  status: "On Track" | "At Risk" | "Achieved";
  deadline: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoalDefinition {
  id: string;
  workspaceId: string;
  projectId: string;
  domainId: string | null;
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  matchTarget: string;
  matchPath: string | null;
  domain: string | null;
  deadline: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

type GoalDashboardDevice = "all" | "desktop" | "mobile" | "tablet";

interface GoalDashboardEvent extends GoalEventRow {
  visitor_id: string;
  session_id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  country_code: string | null;
  city: string | null;
  referrer_domain: string | null;
  url: string | null;
}

interface GoalDashboardBreakdown {
  name: string;
  completions: number;
  uniqueVisitors: number;
  uniqueSessions: number;
}

const RANGE_DAYS: Record<GoalRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string") {
    const date = new Date(value);

    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return new Date(0).toISOString();
}

function toTimestamp(value: unknown): number | null {
  const timestamp = new Date(toIso(value)).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function getTypeLabel(type: GoalType): Goal["type"] {
  if (type === "pageview") return "Pageview";
  if (type === "revenue") return "Revenue";
  if (type === "button") return "Button";
  if (type === "form_submit") return "Form submit";

  return "Event";
}

function calculateGoalValue(
  sourceEvents: GoalEventRow[],
  goal: GoalDefinition
): number {
  const matchingEvents = sourceEvents.filter((event) =>
    matchesGoal(event, goal)
  );

  if (goal.type === "revenue") {
    return Number(
      matchingEvents
        .reduce((total, event) => total + getRevenueValue(event.payload), 0)
        .toFixed(2)
    );
  }

  return matchingEvents.length;
}

function getTrend(current: number, previous: number) {
  const difference =
    previous > 0
      ? ((current - previous) / previous) * 100
      : current > 0
        ? 100
        : 0;
  const roundedDifference = Number(difference.toFixed(1));

  return {
    trend:
      roundedDifference > 0
        ? ("up" as const)
        : roundedDifference < 0
          ? ("down" as const)
          : ("flat" as const),
    trendValue: `${Math.abs(roundedDifference).toFixed(1)}%`,
  };
}

function getStatus(
  current: number,
  target: number,
  deadline: string | null
): Goal["status"] {
  if (current >= target) return "Achieved";

  if (
    deadline &&
    new Date(`${deadline}T23:59:59.999Z`).getTime() < Date.now()
  ) {
    return "At Risk";
  }

  return current / target >= 0.5 ? "On Track" : "At Risk";
}

async function getGoalEvents(
  definition: GoalDefinition,
  rangeDays: number,
  domain?: string
): Promise<GoalEventRow[]> {
  const target = definition.matchTarget.trim();
  const targetFilter =
    definition.type === "button"
      ? sql`type = 'click' AND path = ${definition.matchPath ?? ""}`
      : definition.type === "form_submit"
        ? sql`type = 'form_submit'`
        : target.startsWith("/")
          ? sql`path = ${target}`
          : sql`LOWER(type) = ${target.toLowerCase()}`;

  const result = await db.execute<GoalEventRow>(sql`
    SELECT occurred_at, path, type, payload
    FROM events
    WHERE workspace_id = ${definition.workspaceId}
      AND project_id = ${definition.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
      ${domain ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${domain}` : sql``}
      AND ${targetFilter}
    ORDER BY occurred_at ASC;
  `);

  return result.rows;
}

async function getGoalWithStats(
  definition: GoalDefinition,
  range: GoalRange,
  domain?: string
): Promise<Goal> {
  const rangeDays = RANGE_DAYS[range];
  const now = Date.now();
  const currentStart = now - rangeDays * 24 * 60 * 60 * 1000;
  const previousStart = currentStart - rangeDays * 24 * 60 * 60 * 1000;
  const sourceEvents = await getGoalEvents(definition, rangeDays, domain);
  const currentEvents = sourceEvents.filter((event) => {
    const timestamp = toTimestamp(event.occurred_at);

    return timestamp !== null && timestamp >= currentStart;
  });
  const previousEvents = sourceEvents.filter((event) => {
    const timestamp = toTimestamp(event.occurred_at);

    return (
      timestamp !== null &&
      timestamp >= previousStart &&
      timestamp < currentStart
    );
  });
  const current = calculateGoalValue(currentEvents, definition);
  const previous = calculateGoalValue(previousEvents, definition);
  const trend = getTrend(current, previous);

  return {
    id: definition.id,
    name: definition.name,
    type: getTypeLabel(definition.type),
    target: definition.target,
    current,
    unit: definition.unit,
    matchTarget: definition.matchTarget,
    matchPath: definition.matchPath,
    domainId: definition.domainId,
    domain: definition.domain,
    trend: trend.trend,
    trendValue: trend.trendValue,
    status: getStatus(current, definition.target, definition.deadline),
    deadline: definition.deadline,
    createdAt: toIso(definition.createdAt),
    updatedAt: toIso(definition.updatedAt),
  };
}

async function getGoalDefinitions(
  workspaceId: string,
  projectId: string,
  domainId?: string
): Promise<GoalDefinition[]> {
  const definitions = await db
    .select({
      id: goals.id,
      workspaceId: goals.workspaceId,
      projectId: goals.projectId,
      domainId: goals.domainId,
      domain: projectDomains.domain,
      name: goals.name,
      type: goals.type,
      target: goals.target,
      unit: goals.unit,
      matchTarget: goals.matchTarget,
      matchPath: goals.matchPath,
      deadline: goals.deadline,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .leftJoin(projectDomains, eq(goals.domainId, projectDomains.id))
    .where(
      and(
        eq(goals.workspaceId, workspaceId),
        eq(goals.projectId, projectId),
        domainId
          ? or(eq(goals.domainId, domainId), sql`${goals.domainId} IS NULL`)
          : undefined
      )
    )
    .orderBy(desc(goals.updatedAt));

  return definitions as unknown as GoalDefinition[];
}

export async function getGoalsModel(
  workspaceId: string,
  projectId: string,
  range: GoalRange,
  domain?: string,
  domainId?: string
): Promise<Goal[]> {
  const definitions = await getGoalDefinitions(
    workspaceId,
    projectId,
    domainId
  );

  return Promise.all(
    definitions.map((definition) => getGoalWithStats(definition, range, domain))
  );
}

async function getGoalDefinition(
  goalId: string,
  workspaceId: string,
  projectId: string
): Promise<GoalDefinition | undefined> {
  const [definition] = await db
    .select({
      id: goals.id,
      workspaceId: goals.workspaceId,
      projectId: goals.projectId,
      domainId: goals.domainId,
      domain: projectDomains.domain,
      name: goals.name,
      type: goals.type,
      target: goals.target,
      unit: goals.unit,
      matchTarget: goals.matchTarget,
      matchPath: goals.matchPath,
      deadline: goals.deadline,
      createdAt: goals.createdAt,
      updatedAt: goals.updatedAt,
    })
    .from(goals)
    .leftJoin(projectDomains, eq(goals.domainId, projectDomains.id))
    .where(
      and(
        eq(goals.id, goalId),
        eq(goals.workspaceId, workspaceId),
        eq(goals.projectId, projectId)
      )
    )
    .limit(1);

  return definition as GoalDefinition | undefined;
}

export async function getProjectDomainModel(
  domainId: string,
  projectId: string
): Promise<{ id: string; domain: string } | undefined> {
  const [domain] = await db
    .select({ id: projectDomains.id, domain: projectDomains.domain })
    .from(projectDomains)
    .where(
      and(
        eq(projectDomains.id, domainId),
        eq(projectDomains.projectId, projectId)
      )
    )
    .limit(1);

  return domain;
}

async function getGoalDashboardEvents(
  definition: GoalDefinition,
  rangeDays: number,
  device: GoalDashboardDevice,
  domain?: string
): Promise<GoalDashboardEvent[]> {
  const target = definition.matchTarget.trim();
  const targetFilter =
    definition.type === "button"
      ? sql`type = 'click' AND path = ${definition.matchPath ?? ""}`
      : definition.type === "form_submit"
        ? sql`type = 'form_submit'`
        : target.startsWith("/")
          ? sql`path = ${target}`
          : sql`LOWER(type) = ${target.toLowerCase()}`;
  const deviceFilter =
    device !== "all" ? sql`AND LOWER(device) = ${device}` : sql``;
  const domainFilter = domain
    ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${domain}`
    : sql``;

  const result = await db.execute<GoalDashboardEvent>(sql`
    SELECT
      occurred_at,
      path,
      type,
      payload,
      visitor_id,
      session_id,
      device,
      browser,
      os,
      country,
      country_code,
      city,
      referrer_domain,
      url
    FROM events
    WHERE workspace_id = ${definition.workspaceId}
      AND project_id = ${definition.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
      ${deviceFilter}
      ${domainFilter}
      AND ${targetFilter}
    ORDER BY occurred_at DESC;
  `);

  return result.rows;
}

function getBreakdown(
  events: GoalDashboardEvent[],
  getName: (event: GoalDashboardEvent) => string | null | undefined
): GoalDashboardBreakdown[] {
  const values = new Map<
    string,
    { completions: number; visitors: Set<string>; sessions: Set<string> }
  >();

  for (const event of events) {
    const name = getName(event)?.trim() || "Unknown";
    const value = values.get(name) ?? {
      completions: 0,
      visitors: new Set<string>(),
      sessions: new Set<string>(),
    };

    value.completions += 1;
    value.visitors.add(event.visitor_id);
    value.sessions.add(event.session_id);
    values.set(name, value);
  }

  return [...values.entries()]
    .map(([name, value]) => ({
      name,
      completions: value.completions,
      uniqueVisitors: value.visitors.size,
      uniqueSessions: value.sessions.size,
    }))
    .sort((left, right) => right.completions - left.completions);
}

function getCompletionTrend(
  events: GoalDashboardEvent[],
  goal: GoalDefinition
) {
  const values = new Map<
    string,
    {
      completions: number;
      visitors: Set<string>;
      sessions: Set<string>;
      revenue: number;
    }
  >();

  for (const event of events) {
    const date = toIso(event.occurred_at).slice(0, 10);
    const value = values.get(date) ?? {
      completions: 0,
      visitors: new Set<string>(),
      sessions: new Set<string>(),
      revenue: 0,
    };

    value.completions += 1;
    value.visitors.add(event.visitor_id);
    value.sessions.add(event.session_id);
    if (goal.type === "revenue") {
      value.revenue += getRevenueValue(event.payload);
    }
    values.set(date, value);
  }

  return [...values.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, value]) => ({
      date,
      completions:
        goal.type === "revenue"
          ? Number(value.revenue.toFixed(2))
          : value.completions,
      uniqueVisitors: value.visitors.size,
      uniqueSessions: value.sessions.size,
      revenue: Number(value.revenue.toFixed(2)),
    }));
}

export async function getGoalDashboardModel(filters: {
  goalId: string;
  workspaceId: string;
  projectId: string;
  range: GoalRange;
  device: GoalDashboardDevice;
  domain?: string;
}) {
  const definition = await getGoalDefinition(
    filters.goalId,
    filters.workspaceId,
    filters.projectId
  );

  if (!definition) return null;

  const rangeDays = RANGE_DAYS[filters.range];
  const now = Date.now();
  const currentStart = now - rangeDays * 24 * 60 * 60 * 1000;
  const previousStart = currentStart - rangeDays * 24 * 60 * 60 * 1000;
  const events = await getGoalDashboardEvents(
    definition,
    rangeDays,
    filters.device,
    definition.domain ?? filters.domain
  );
  const currentEvents = events.filter((event) => {
    const timestamp = toTimestamp(event.occurred_at);

    return timestamp !== null && timestamp >= currentStart;
  });
  const previousEvents = events.filter((event) => {
    const timestamp = toTimestamp(event.occurred_at);

    return (
      timestamp !== null &&
      timestamp >= previousStart &&
      timestamp < currentStart
    );
  });
  const currentValue = calculateGoalValue(currentEvents, definition);
  const previousValue = calculateGoalValue(previousEvents, definition);
  const trend = getTrend(currentValue, previousValue);
  const deviceFilter =
    filters.device !== "all"
      ? sql`AND LOWER(device) = ${filters.device}`
      : sql``;
  const domainFilter = filters.domain
    ? sql`AND regexp_replace(regexp_replace(regexp_replace(lower(split_part(split_part(coalesce(url, ''), '://', 2), '/', 1)), ':[0-9]+$', ''), '^www\\.', ''), '\\.$', '') = ${filters.domain}`
    : sql``;
  const denominatorResult = await db.execute<{
    current_visitors: number | string | null;
    previous_visitors: number | string | null;
    current_sessions: number | string | null;
    previous_sessions: number | string | null;
  }>(sql`
    SELECT
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays})
      )::int AS current_visitors,
      COUNT(DISTINCT visitor_id) FILTER (
        WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
          AND occurred_at < NOW() - make_interval(days => ${rangeDays})
      )::int AS previous_visitors,
      COUNT(DISTINCT session_id) FILTER (
        WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays})
      )::int AS current_sessions,
      COUNT(DISTINCT session_id) FILTER (
        WHERE occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
          AND occurred_at < NOW() - make_interval(days => ${rangeDays})
      )::int AS previous_sessions
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      ${deviceFilter}
      ${domainFilter}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays * 2});
  `);
  const denominator = denominatorResult.rows[0];
  const currentVisitors = Number(denominator?.current_visitors ?? 0);
  const previousVisitors = Number(denominator?.previous_visitors ?? 0);
  const currentSessions = Number(denominator?.current_sessions ?? 0);
  const previousSessions = Number(denominator?.previous_sessions ?? 0);
  const currentUniqueVisitors = new Set(
    currentEvents.map((event) => event.visitor_id)
  ).size;
  const currentUniqueSessions = new Set(
    currentEvents.map((event) => event.session_id)
  ).size;
  const previousUniqueVisitors = new Set(
    previousEvents.map((event) => event.visitor_id)
  ).size;
  const previousUniqueSessions = new Set(
    previousEvents.map((event) => event.session_id)
  ).size;
  const currentRevenue = currentEvents.reduce(
    (total, event) => total + getRevenueValue(event.payload),
    0
  );
  const previousRevenue = previousEvents.reduce(
    (total, event) => total + getRevenueValue(event.payload),
    0
  );

  return {
    goal: {
      id: definition.id,
      name: definition.name,
      type: getTypeLabel(definition.type),
      target: definition.target,
      unit: definition.unit,
      matchTarget: definition.matchTarget,
      matchPath: definition.matchPath,
      deadline: definition.deadline,
      createdAt: toIso(definition.createdAt),
      updatedAt: toIso(definition.updatedAt),
    },
    range: {
      value: filters.range,
      currentFrom: new Date(currentStart).toISOString(),
      currentTo: new Date(now).toISOString(),
      previousFrom: new Date(previousStart).toISOString(),
      previousTo: new Date(currentStart).toISOString(),
    },
    summary: {
      completions: currentValue,
      previousCompletions: previousValue,
      trend: trend.trend,
      trendValue: trend.trendValue,
      status: getStatus(currentValue, definition.target, definition.deadline),
      uniqueVisitors: currentUniqueVisitors,
      previousUniqueVisitors,
      uniqueSessions: currentUniqueSessions,
      previousUniqueSessions,
      visitorConversionRate:
        currentVisitors > 0
          ? Number(((currentUniqueVisitors / currentVisitors) * 100).toFixed(2))
          : 0,
      sessionConversionRate:
        currentSessions > 0
          ? Number(((currentUniqueSessions / currentSessions) * 100).toFixed(2))
          : 0,
      revenue: Number(currentRevenue.toFixed(2)),
      previousRevenue: Number(previousRevenue.toFixed(2)),
    },
    trend: getCompletionTrend(currentEvents, definition),
    breakdowns: {
      devices: getBreakdown(currentEvents, (event) => event.device),
      browsers: getBreakdown(currentEvents, (event) => event.browser),
      operatingSystems: getBreakdown(currentEvents, (event) => event.os),
      countries: getBreakdown(currentEvents, (event) => event.country),
      sources: getBreakdown(
        currentEvents,
        (event) => event.referrer_domain || "Direct"
      ),
      pages: getBreakdown(currentEvents, (event) => event.path),
    },
    recentCompletions: currentEvents.slice(0, 50).map((event) => ({
      occurredAt: toIso(event.occurred_at),
      type: event.type,
      path: event.path,
      device: event.device,
      browser: event.browser,
      operatingSystem: event.os,
      country: event.country,
      city: event.city,
      source: event.referrer_domain || "Direct",
      revenue: Number(getRevenueValue(event.payload).toFixed(2)),
    })),
  };
}

export async function createGoalModel(data: {
  workspaceId: string;
  projectId: string;
  domainId: string;
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  matchTarget: string;
  matchPath: string | null;
  deadline: string | null;
}): Promise<string> {
  await assertWorkspaceUsageLimit(data.workspaceId, "goals", 1, false);
  const [goal] = await db
    .insert(goals)
    .values({
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      domainId: data.domainId,
      name: data.name,
      type: data.type,
      target: data.target,
      unit: data.unit,
      matchTarget: data.matchTarget,
      matchPath: data.matchPath,
      deadline: data.deadline,
    })
    .returning({ id: goals.id });

  return goal.id;
}

export async function updateGoalModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
  domainId: string | null;
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  matchTarget: string;
  matchPath: string | null;
  deadline: string | null;
}): Promise<boolean> {
  const updated = await db
    .update(goals)
    .set({
      name: data.name,
      type: data.type,
      target: data.target,
      unit: data.unit,
      matchTarget: data.matchTarget,
      matchPath: data.matchPath,
      domainId: data.domainId,
      deadline: data.deadline,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(goals.id, data.id),
        eq(goals.workspaceId, data.workspaceId),
        eq(goals.projectId, data.projectId)
      )
    )
    .returning({ id: goals.id });

  return updated.length > 0;
}

export async function deleteGoalModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
}) {
  const deleted = await db
    .delete(goals)
    .where(
      and(
        eq(goals.id, data.id),
        eq(goals.workspaceId, data.workspaceId),
        eq(goals.projectId, data.projectId)
      )
    )
    .returning({
      id: goals.id,
      projectId: goals.projectId,
      name: goals.name,
      type: goals.type,
      target: goals.target,
      unit: goals.unit,
      matchTarget: goals.matchTarget,
      matchPath: goals.matchPath,
      deadline: goals.deadline,
    });

  return deleted[0];
}
