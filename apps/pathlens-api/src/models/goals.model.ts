import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { goals } from "../db/schema";

export type GoalType =
  "event" | "revenue" | "pageview" | "button" | "form_submit";
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
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  matchTarget: string;
  matchPath: string | null;
  deadline: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface GoalEventRow extends Record<string, unknown> {
  occurred_at: Date | string | null;
  path: string | null;
  type: string;
  payload: Record<string, unknown> | null;
}

const RANGE_DAYS: Record<GoalRange, number> = {
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

function normalizeButtonText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function matchesGoal(event: GoalEventRow, goal: GoalDefinition): boolean {
  const target = goal.matchTarget.trim();

  if (goal.type === "pageview") {
    return event.type === "page_view" && (event.path?.trim() || "/") === target;
  }

  if (goal.type === "button") {
    return (
      event.type === "click" &&
      (event.path?.trim() || "/") === (goal.matchPath?.trim() || "/") &&
      normalizeButtonText(event.payload?.buttonText) ===
        normalizeButtonText(target)
    );
  }

  if (goal.type === "form_submit") {
    return (
      event.type === "form_submit" &&
      typeof event.payload?.id === "string" &&
      event.payload.id.trim() === target
    );
  }

  if (target.startsWith("/")) {
    return (event.path?.trim() || "/") === target;
  }

  return event.type.toLowerCase() === target.toLowerCase();
}

function getRevenueValue(payload: Record<string, unknown> | null): number {
  if (!payload) return 0;

  const cents = payload.revenue_cents ?? payload.amount_cents;

  if (cents !== undefined) return toNumber(cents) / 100;

  return toNumber(payload.revenue ?? payload.value ?? payload.amount);
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
  rangeDays: number
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
      AND ${targetFilter}
    ORDER BY occurred_at ASC;
  `);

  return result.rows;
}

async function getGoalWithStats(
  definition: GoalDefinition,
  range: GoalRange
): Promise<Goal> {
  const rangeDays = RANGE_DAYS[range];
  const now = Date.now();
  const currentStart = now - rangeDays * 24 * 60 * 60 * 1000;
  const previousStart = currentStart - rangeDays * 24 * 60 * 60 * 1000;
  const sourceEvents = await getGoalEvents(definition, rangeDays);
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
  projectId: string
): Promise<GoalDefinition[]> {
  return db
    .select({
      id: goals.id,
      workspaceId: goals.workspaceId,
      projectId: goals.projectId,
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
    .where(
      and(eq(goals.workspaceId, workspaceId), eq(goals.projectId, projectId))
    )
    .orderBy(desc(goals.updatedAt)) as unknown as GoalDefinition[];
}

export async function getGoalsModel(
  workspaceId: string,
  projectId: string,
  range: GoalRange
): Promise<Goal[]> {
  const definitions = await getGoalDefinitions(workspaceId, projectId);

  return Promise.all(
    definitions.map((definition) => getGoalWithStats(definition, range))
  );
}

export async function createGoalModel(data: {
  workspaceId: string;
  projectId: string;
  name: string;
  type: GoalType;
  target: number;
  unit: string;
  matchTarget: string;
  matchPath: string | null;
  deadline: string | null;
}): Promise<string> {
  const [goal] = await db
    .insert(goals)
    .values({
      workspaceId: data.workspaceId,
      projectId: data.projectId,
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
}): Promise<boolean> {
  const deleted = await db
    .delete(goals)
    .where(
      and(
        eq(goals.id, data.id),
        eq(goals.workspaceId, data.workspaceId),
        eq(goals.projectId, data.projectId)
      )
    )
    .returning({ id: goals.id });

  return deleted.length > 0;
}
