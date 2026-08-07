import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { events, funnels, type FunnelStepDefinition } from "../db/schema";

export type FunnelRange = "24h" | "7d" | "30d" | "90d";

export interface FunnelStep extends FunnelStepDefinition {
  visitors: number;
}

export interface Funnel {
  id: string;
  name: string;
  description: string;
  conversionRate: number;
  trend: "up" | "down" | "flat";
  trendValue: string;
  steps: FunnelStep[];
  createdAt: string;
  updatedAt: string;
}

interface FunnelEventRow extends Record<string, unknown> {
  visitor_id: string;
  session_id: string;
  occurred_at: Date | string | null;
  path: string | null;
  type: string;
}

interface FunnelDefinition {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  steps: FunnelStepDefinition[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

const RANGE_DAYS: Record<FunnelRange, number> = {
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

function matchesStep(
  event: FunnelEventRow,
  step: FunnelStepDefinition
): boolean {
  const target = step.target.trim();

  if (target.startsWith("/")) {
    return (event.path?.trim() || "/") === target;
  }

  return event.type.toLowerCase() === target.toLowerCase();
}

function calculateStepVisitors(
  eventsInRange: FunnelEventRow[],
  steps: FunnelStepDefinition[]
): number[] {
  const sessionEvents = new Map<string, FunnelEventRow[]>();

  for (const event of eventsInRange) {
    const key = `${event.visitor_id}:${event.session_id}`;
    const session = sessionEvents.get(key);

    if (session) {
      session.push(event);
    } else {
      sessionEvents.set(key, [event]);
    }
  }

  const visitorsByStep = steps.map(() => new Set<string>());

  for (const session of sessionEvents.values()) {
    const orderedEvents = session
      .map((event) => ({
        event,
        timestamp: toTimestamp(event.occurred_at),
      }))
      .filter(
        (item): item is { event: FunnelEventRow; timestamp: number } =>
          item.timestamp !== null
      )
      .sort((left, right) => left.timestamp - right.timestamp);

    let lastTimestamp = -Infinity;

    for (const [stepIndex, step] of steps.entries()) {
      const match = orderedEvents.find(
        (item) =>
          item.timestamp > lastTimestamp && matchesStep(item.event, step)
      );

      if (!match) break;

      visitorsByStep[stepIndex]?.add(match.event.visitor_id);
      lastTimestamp = match.timestamp;
    }
  }

  return visitorsByStep.map((visitors) => visitors.size);
}

function getConversionRate(visitors: number[]): number {
  const entered = visitors[0] ?? 0;
  const completed = visitors[visitors.length - 1] ?? 0;

  if (entered === 0) return 0;

  return Number(((completed / entered) * 100).toFixed(1));
}

function getTrend(currentRate: number, previousRate: number) {
  const difference = Number((currentRate - previousRate).toFixed(1));

  return {
    trend:
      difference > 0
        ? ("up" as const)
        : difference < 0
          ? ("down" as const)
          : ("flat" as const),
    trendValue: `${Math.abs(difference).toFixed(1)}%`,
  };
}

async function getFunnelDefinitionEvents(
  definition: FunnelDefinition,
  rangeDays: number
): Promise<FunnelEventRow[]> {
  const targets = definition.steps.map((step) => step.target.trim());
  const targetFilters = targets.map((target) =>
    target.startsWith("/")
      ? sql`path = ${target}`
      : sql`LOWER(type) = ${target.toLowerCase()}`
  );
  const targetFilter = sql.join(targetFilters, sql` OR `);

  const result = await db.execute<FunnelEventRow>(sql`
    SELECT visitor_id, session_id, occurred_at, path, type
    FROM events
    WHERE workspace_id = ${definition.workspaceId}
      AND project_id = ${definition.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays * 2})
      AND (${targetFilter})
    ORDER BY session_id, occurred_at ASC;
  `);

  return result.rows;
}

async function getFunnelWithStats(
  definition: FunnelDefinition,
  range: FunnelRange
): Promise<Funnel> {
  const rangeDays = RANGE_DAYS[range];
  const now = Date.now();
  const currentStart = now - rangeDays * 24 * 60 * 60 * 1000;
  const previousStart = currentStart - rangeDays * 24 * 60 * 60 * 1000;
  const sourceEvents = await getFunnelDefinitionEvents(definition, rangeDays);
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
  const currentVisitors = calculateStepVisitors(
    currentEvents,
    definition.steps
  );
  const previousVisitors = calculateStepVisitors(
    previousEvents,
    definition.steps
  );
  const conversionRate = getConversionRate(currentVisitors);
  const previousRate = getConversionRate(previousVisitors);
  const trend = getTrend(conversionRate, previousRate);

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description ?? "",
    conversionRate,
    trend: trend.trend,
    trendValue: trend.trendValue,
    steps: definition.steps.map((step, index) => ({
      ...step,
      visitors: currentVisitors[index] ?? 0,
    })),
    createdAt: toIso(definition.createdAt),
    updatedAt: toIso(definition.updatedAt),
  };
}

async function getFunnelDefinitions(
  workspaceId: string,
  projectId: string
): Promise<FunnelDefinition[]> {
  return db
    .select({
      id: funnels.id,
      workspaceId: funnels.workspaceId,
      projectId: funnels.projectId,
      name: funnels.name,
      description: funnels.description,
      steps: funnels.steps,
      createdAt: funnels.createdAt,
      updatedAt: funnels.updatedAt,
    })
    .from(funnels)
    .where(
      and(
        eq(funnels.workspaceId, workspaceId),
        eq(funnels.projectId, projectId)
      )
    )
    .orderBy(desc(funnels.updatedAt));
}

export async function getFunnelsModel(
  workspaceId: string,
  projectId: string,
  range: FunnelRange
): Promise<Funnel[]> {
  const definitions = await getFunnelDefinitions(workspaceId, projectId);

  return Promise.all(
    definitions.map((definition) => getFunnelWithStats(definition, range))
  );
}

export async function createFunnelModel(data: {
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  steps: FunnelStepDefinition[];
}): Promise<string> {
  const [funnel] = await db
    .insert(funnels)
    .values({
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      steps: data.steps,
    })
    .returning({ id: funnels.id });

  return funnel.id;
}

export async function updateFunnelModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  steps: FunnelStepDefinition[];
}): Promise<boolean> {
  const updated = await db
    .update(funnels)
    .set({
      name: data.name,
      description: data.description,
      steps: data.steps,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(funnels.id, data.id),
        eq(funnels.workspaceId, data.workspaceId),
        eq(funnels.projectId, data.projectId)
      )
    )
    .returning({ id: funnels.id });

  return updated.length > 0;
}

export async function deleteFunnelModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
}): Promise<boolean> {
  const deleted = await db
    .delete(funnels)
    .where(
      and(
        eq(funnels.id, data.id),
        eq(funnels.workspaceId, data.workspaceId),
        eq(funnels.projectId, data.projectId)
      )
    )
    .returning({ id: funnels.id });

  return deleted.length > 0;
}
