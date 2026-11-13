import type { AnalyticsSummaryReportType } from "@workspace/contracts";

import {
  addCalendarDays,
  localDateTimeToUtc,
  localMidnightToUtc,
  type LocalDate,
  type ReportingPeriod,
} from "../lib/reporting-period";

export const DEFAULT_NOTIFICATION_GRACE_PERIOD_MS = 15 * 60 * 1000;
export const NOTIFICATION_CATCH_UP_DAYS = 2;
export const NOTIFICATION_CATCH_UP_WEEKS = 2;

export type NotificationSettings = {
  channelId: string;
  dailyEnabled: boolean;
  weeklyEnabled: boolean;
  dailyHour: number;
  weeklyDay: number;
  weeklyHour: number;
  timezone: string;
  weeklyDayConfirmed: boolean;
};

export type NotificationCandidate = {
  reportType: AnalyticsSummaryReportType;
  period: ReportingPeriod;
  scheduledFor: Date;
  readyAt: Date;
};

function getGracePeriodMs() {
  const raw = process.env.NOTIFICATION_GRACE_PERIOD_MS?.trim();
  if (!raw) return DEFAULT_NOTIFICATION_GRACE_PERIOD_MS;
  const configured = Number(raw);
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_NOTIFICATION_GRACE_PERIOD_MS;
}

function part(parts: Intl.DateTimeFormatPart[], type: string) {
  const value = parts.find((item) => item.type === type)?.value;
  if (!value) throw new Error(`Unable to read ${type} from timezone.`);
  return Number(value);
}

export function getLocalDateTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    weekday: "short",
  }).formatToParts(date);
  const weekdayName = parts.find((item) => item.type === "weekday")?.value;
  const weekday =
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
      weekdayName ?? ""
    ) + 1;
  return {
    date: {
      year: part(parts, "year"),
      month: part(parts, "month"),
      day: part(parts, "day"),
    } satisfies LocalDate,
    hour: part(parts, "hour"),
    weekday,
  };
}

function getIsoWeekMonday(date: LocalDate) {
  const weekday = new Date(
    Date.UTC(date.year, date.month - 1, date.day)
  ).getUTCDay();
  const isoWeekday = weekday === 0 ? 7 : weekday;
  return addCalendarDays(date, -(isoWeekday - 1));
}

function dateKey(date: LocalDate) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(
    date.day
  ).padStart(2, "0")}`;
}

function getDailyCandidate(
  endDate: LocalDate,
  settings: NotificationSettings,
  now: Date
): NotificationCandidate | null {
  const periodEnd = localMidnightToUtc(endDate, settings.timezone);
  const periodStart = localMidnightToUtc(
    addCalendarDays(endDate, -1),
    settings.timezone
  );
  const previousStart = localMidnightToUtc(
    addCalendarDays(endDate, -2),
    settings.timezone
  );
  const scheduledFor = localDateTimeToUtc(
    endDate,
    settings.dailyHour,
    settings.timezone
  );
  if (!periodEnd || !periodStart || !previousStart || !scheduledFor)
    return null;
  const period = {
    timezone: settings.timezone,
    start: periodStart,
    end: periodEnd,
    previousStart,
    previousEnd: periodStart,
  };
  const readyAt = new Date(
    Math.max(scheduledFor.getTime(), periodEnd.getTime() + getGracePeriodMs())
  );
  return readyAt <= now
    ? { reportType: "daily", period, scheduledFor, readyAt }
    : null;
}

function getWeeklyCandidate(
  scheduleDate: LocalDate,
  settings: NotificationSettings,
  now: Date
): NotificationCandidate | null {
  const periodEndDate = getIsoWeekMonday(scheduleDate);
  const periodEnd = localMidnightToUtc(periodEndDate, settings.timezone);
  const periodStart = localMidnightToUtc(
    addCalendarDays(periodEndDate, -7),
    settings.timezone
  );
  const previousStart = localMidnightToUtc(
    addCalendarDays(periodEndDate, -14),
    settings.timezone
  );
  const scheduledFor = localDateTimeToUtc(
    scheduleDate,
    settings.weeklyHour,
    settings.timezone
  );
  if (!periodEnd || !periodStart || !previousStart || !scheduledFor)
    return null;
  const period = {
    timezone: settings.timezone,
    start: periodStart,
    end: periodEnd,
    previousStart,
    previousEnd: periodStart,
  };
  const readyAt = new Date(
    Math.max(scheduledFor.getTime(), periodEnd.getTime() + getGracePeriodMs())
  );
  return readyAt <= now
    ? { reportType: "weekly", period, scheduledFor, readyAt }
    : null;
}

export function getNotificationCandidates(
  settings: NotificationSettings,
  now = new Date()
) {
  const localNow = getLocalDateTime(now, settings.timezone);
  const candidates: NotificationCandidate[] = [];

  if (settings.dailyEnabled) {
    for (let offset = 0; offset < NOTIFICATION_CATCH_UP_DAYS; offset += 1) {
      const endDate = addCalendarDays(localNow.date, -offset);
      const candidate = getDailyCandidate(endDate, settings, now);
      if (candidate) candidates.push(candidate);
    }
  }

  if (settings.weeklyEnabled && settings.weeklyDayConfirmed) {
    if (settings.weeklyDay < 1 || settings.weeklyDay > 7) return candidates;
    const daysSinceSchedule = (localNow.weekday - settings.weeklyDay + 7) % 7;
    const mostRecent = addCalendarDays(localNow.date, -daysSinceSchedule);
    for (let offset = 0; offset < NOTIFICATION_CATCH_UP_WEEKS; offset += 1) {
      const scheduleDate = addCalendarDays(mostRecent, -offset * 7);
      const candidate = getWeeklyCandidate(scheduleDate, settings, now);
      if (candidate) candidates.push(candidate);
    }
  }

  const unique = new Map<string, NotificationCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.reportType}:${dateKey(getLocalDateTime(candidate.period.end, settings.timezone).date)}`;
    unique.set(key, candidate);
  }
  return [...unique.values()].sort(
    (left, right) => left.readyAt.getTime() - right.readyAt.getTime()
  );
}

export function getExpectedScheduledFor(
  reportType: AnalyticsSummaryReportType,
  period: ReportingPeriod,
  settings: NotificationSettings
) {
  const endDate = getLocalDateTime(period.end, settings.timezone).date;
  const scheduleDate =
    reportType === "daily"
      ? endDate
      : addCalendarDays(getIsoWeekMonday(endDate), settings.weeklyDay - 1);
  return localDateTimeToUtc(
    scheduleDate,
    reportType === "daily" ? settings.dailyHour : settings.weeklyHour,
    settings.timezone
  );
}

export function getComparisonPeriod(
  reportType: AnalyticsSummaryReportType,
  period: ReportingPeriod,
  timezone: string
): ReportingPeriod {
  const startDate = getLocalDateTime(period.start, timezone).date;
  const previousEndDate = startDate;
  const previousStartDate = addCalendarDays(
    startDate,
    reportType === "daily" ? -1 : -7
  );
  return {
    timezone,
    start: period.start,
    end: period.end,
    previousStart: requireLocalMidnight(previousStartDate, timezone),
    previousEnd: requireLocalMidnight(previousEndDate, timezone),
  };
}

function requireLocalMidnight(date: LocalDate, timezone: string) {
  const boundary = localMidnightToUtc(date, timezone);
  if (!boundary) {
    throw new Error(
      `Unable to resolve a local calendar boundary for timezone ${timezone}.`
    );
  }
  return boundary;
}
