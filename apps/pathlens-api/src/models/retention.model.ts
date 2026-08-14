import { sql } from "drizzle-orm";
import type {
  RetentionCell,
  RetentionCohort,
  RetentionData,
  RetentionInterval,
} from "@workspace/contracts";
import { db } from "../db/client";

export type RetentionRange = "30d" | "90d";
export type RetentionDevice = "all" | "desktop" | "mobile" | "tablet";

export interface RetentionFilters {
  workspaceId: string;
  projectId: string;
  range: RetentionRange;
  interval: RetentionInterval;
  periods: number;
  device: RetentionDevice;
}

interface RetentionRow extends Record<string, unknown> {
  cohort_start: Date | string;
  cohort_size: number | string;
  period: number | string;
  retained: number | string;
}

const RANGE_DAYS: Record<RetentionRange, number> = {
  "30d": 30,
  "90d": 90,
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") return Number(value);

  return 0;
}

function toDate(value: Date | string): Date {
  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function toDateKey(value: Date | string): string {
  return toDate(value).toISOString().slice(0, 10);
}

function getBucketStart(value: Date, interval: RetentionInterval): Date {
  const bucket = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  );

  if (interval === "day") return bucket;

  const day = bucket.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  bucket.setUTCDate(bucket.getUTCDate() - daysFromMonday);

  return bucket;
}

function getPeriodStart(
  cohortStart: Date,
  period: number,
  interval: RetentionInterval
): Date {
  const periodStart = new Date(cohortStart);
  const days = interval === "week" ? period * 7 : period;
  periodStart.setUTCDate(periodStart.getUTCDate() + days);

  return periodStart;
}

function buildCells(
  cohortStart: Date,
  cohortSize: number,
  periods: number,
  interval: RetentionInterval,
  currentBucket: Date,
  retainedByPeriod: Map<number, number>
): RetentionCell[] {
  return Array.from({ length: periods }, (_, period) => {
    const isComplete =
      getPeriodStart(cohortStart, period, interval) <= currentBucket;
    const retained = isComplete ? (retainedByPeriod.get(period) ?? 0) : null;

    return {
      period,
      retained,
      rate:
        retained === null || cohortSize === 0
          ? null
          : Number(((retained / cohortSize) * 100).toFixed(1)),
    };
  });
}

export async function getRetentionModel(
  filters: RetentionFilters
): Promise<RetentionData> {
  const rangeDays = RANGE_DAYS[filters.range];
  const periodSeconds =
    filters.interval === "week" ? 7 * 24 * 60 * 60 : 24 * 60 * 60;
  const projectFilter = sql`AND e.project_id = ${filters.projectId}`;
  const deviceFilter =
    filters.device === "all"
      ? sql``
      : sql`AND LOWER(e.device) = ${filters.device}`;
  const cohortBucket =
    filters.interval === "week"
      ? sql`DATE_TRUNC('week', occurred_at)`
      : sql`DATE_TRUNC('day', occurred_at)`;
  const activityBucket =
    filters.interval === "week"
      ? sql`DATE_TRUNC('week', e.occurred_at)`
      : sql`DATE_TRUNC('day', e.occurred_at)`;

  const result = await db.execute<RetentionRow>(sql`
    WITH filtered_events AS (
      SELECT e.visitor_id, e.occurred_at
      FROM events e
      WHERE e.workspace_id = ${filters.workspaceId}
        ${projectFilter}
        ${deviceFilter}
        AND e.occurred_at >= NOW() - make_interval(days => ${rangeDays})
    ),
    first_activity AS (
      SELECT visitor_id, ${cohortBucket} AS cohort_start
      FROM filtered_events
      GROUP BY visitor_id
    ),
    cohort_sizes AS (
      SELECT cohort_start, COUNT(*)::int AS cohort_size
      FROM first_activity
      GROUP BY cohort_start
    ),
    activity AS (
      SELECT
        first_activity.cohort_start,
        FLOOR(EXTRACT(EPOCH FROM (
          ${activityBucket} - first_activity.cohort_start
        )) / ${periodSeconds})::int AS period,
        COUNT(DISTINCT e.visitor_id)::int AS retained
      FROM first_activity
      INNER JOIN events e ON e.visitor_id = first_activity.visitor_id
      WHERE e.workspace_id = ${filters.workspaceId}
        ${projectFilter}
        ${deviceFilter}
        AND e.occurred_at >= first_activity.cohort_start
        AND e.occurred_at <= NOW()
        AND FLOOR(EXTRACT(EPOCH FROM (
          ${activityBucket} - first_activity.cohort_start
        )) / ${periodSeconds})::int BETWEEN 0 AND ${filters.periods - 1}
      GROUP BY first_activity.cohort_start, period
    )
    SELECT
      cohort_sizes.cohort_start,
      cohort_sizes.cohort_size,
      activity.period,
      activity.retained
    FROM cohort_sizes
    INNER JOIN activity ON activity.cohort_start = cohort_sizes.cohort_start
    ORDER BY cohort_sizes.cohort_start DESC, activity.period ASC;
  `);

  const cohorts = new Map<
    string,
    {
      cohortStart: Date;
      cohortSize: number;
      retainedByPeriod: Map<number, number>;
    }
  >();

  for (const row of result.rows) {
    const cohortStart = getBucketStart(
      toDate(row.cohort_start),
      filters.interval
    );
    const key = cohortStart.toISOString();
    let cohort = cohorts.get(key);

    if (!cohort) {
      cohort = {
        cohortStart,
        cohortSize: toNumber(row.cohort_size),
        retainedByPeriod: new Map(),
      };
      cohorts.set(key, cohort);
    }

    cohort.retainedByPeriod.set(toNumber(row.period), toNumber(row.retained));
  }

  const currentBucket = getBucketStart(new Date(), filters.interval);
  const data: RetentionCohort[] = [...cohorts.values()].map((cohort) => ({
    cohortStart: toDateKey(cohort.cohortStart),
    cohortSize: cohort.cohortSize,
    cells: buildCells(
      cohort.cohortStart,
      cohort.cohortSize,
      filters.periods,
      filters.interval,
      currentBucket,
      cohort.retainedByPeriod
    ),
  }));

  return {
    interval: filters.interval,
    periods: filters.periods,
    cohorts: data,
  };
}
