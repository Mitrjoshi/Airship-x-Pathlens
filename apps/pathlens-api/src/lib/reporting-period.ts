import type { AnalyticsSummaryReportType } from "@workspace/contracts";

export interface ReportingPeriodInput {
  reportType: AnalyticsSummaryReportType;
  timezone: string;
  now?: Date;
}

export interface ReportingPeriod {
  timezone: string;
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
}

export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

function getPart(parts: Intl.DateTimeFormatPart[], type: string) {
  const value = parts.find((part) => part.type === type)?.value;
  if (!value) throw new Error(`Unable to read ${type} from timezone.`);
  return Number(value);
}

function getLocalDate(date: Date, timezone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: getPart(parts, "year"),
    month: getPart(parts, "month"),
    day: getPart(parts, "day"),
  };
}

export function addCalendarDays(date: LocalDate, days: number): LocalDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day, 12));
  value.setUTCDate(value.getUTCDate() + days);

  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function getOffsetMilliseconds(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const asUtc = Date.UTC(
    getPart(parts, "year"),
    getPart(parts, "month") - 1,
    getPart(parts, "day"),
    getPart(parts, "hour"),
    getPart(parts, "minute"),
    getPart(parts, "second")
  );

  return asUtc - date.getTime();
}

export function localDateTimeToUtc(
  date: LocalDate,
  hour: number,
  timezone: string,
  minute = 0
) {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error("Local time must contain a valid hour and minute.");
  }
  const localWallClock = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    hour,
    minute
  );
  let candidate = localWallClock;

  // Resolve the timezone offset iteratively. Calendar arithmetic happens before
  // this conversion, so DST changes do not become fixed 24-hour calculations.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offset = getOffsetMilliseconds(new Date(candidate), timezone);
    const resolved = localWallClock - offset;
    if (resolved === candidate) break;
    candidate = resolved;
  }

  const resolved = new Date(candidate);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(resolved);
  const actual = {
    year: getPart(parts, "year"),
    month: getPart(parts, "month"),
    day: getPart(parts, "day"),
    hour: getPart(parts, "hour"),
    minute: getPart(parts, "minute"),
  };

  if (
    actual.year !== date.year ||
    actual.month !== date.month ||
    actual.day !== date.day ||
    actual.hour !== hour ||
    actual.minute !== minute
  ) {
    return null;
  }

  return resolved;
}

export function localMidnightToUtc(date: LocalDate, timezone: string) {
  const exact = localDateTimeToUtc(date, 0, timezone);
  if (exact) return exact;
  // A small number of IANA zones have moved clocks at local midnight. The
  // first valid wall-clock minute is the real UTC boundary for that date.
  for (
    let minuteAfterMidnight = 1;
    minuteAfterMidnight <= 180;
    minuteAfterMidnight += 1
  ) {
    const candidate = localDateTimeToUtc(
      date,
      Math.floor(minuteAfterMidnight / 60),
      timezone,
      minuteAfterMidnight % 60
    );
    if (candidate) return candidate;
  }
  return null;
}

function validateTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new Error(`Invalid IANA timezone: ${timezone}`);
  }
}

function getIsoWeekMonday(date: LocalDate) {
  const weekday = new Date(
    Date.UTC(date.year, date.month - 1, date.day)
  ).getUTCDay();
  const isoWeekday = weekday === 0 ? 7 : weekday;
  return addCalendarDays(date, -(isoWeekday - 1));
}

export function getReportingPeriod({
  reportType,
  timezone,
  now = new Date(),
}: ReportingPeriodInput): ReportingPeriod {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid reporting date.");
  validateTimezone(timezone);

  const localToday = getLocalDate(now, timezone);
  const currentPeriodEnd =
    reportType === "daily" ? localToday : getIsoWeekMonday(localToday);
  const currentPeriodStart =
    reportType === "daily"
      ? addCalendarDays(currentPeriodEnd, -1)
      : addCalendarDays(currentPeriodEnd, -7);
  const previousPeriodStart =
    reportType === "daily"
      ? addCalendarDays(currentPeriodStart, -1)
      : addCalendarDays(currentPeriodStart, -7);
  const previousPeriodEnd = currentPeriodStart;

  const start = localMidnightToUtc(currentPeriodStart, timezone);
  const end = localMidnightToUtc(currentPeriodEnd, timezone);
  const previousStart = localMidnightToUtc(previousPeriodStart, timezone);
  const previousEnd = localMidnightToUtc(previousPeriodEnd, timezone);
  if (!start || !end || !previousStart || !previousEnd) {
    throw new Error(
      `Unable to resolve a local calendar boundary for timezone ${timezone}.`
    );
  }

  return {
    timezone,
    start,
    end,
    previousStart,
    previousEnd,
  };
}
