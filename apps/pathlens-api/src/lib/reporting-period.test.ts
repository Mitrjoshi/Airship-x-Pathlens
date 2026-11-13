import assert from "node:assert/strict";
import test from "node:test";

import {
  getReportingPeriod,
  localDateTimeToUtc,
  localMidnightToUtc,
} from "./reporting-period";

test("calculates the previous completed local day", () => {
  const period = getReportingPeriod({
    reportType: "daily",
    timezone: "America/New_York",
    now: new Date("2024-03-11T15:00:00.000Z"),
  });

  assert.equal(period.start.toISOString(), "2024-03-10T05:00:00.000Z");
  assert.equal(period.end.toISOString(), "2024-03-11T04:00:00.000Z");
  assert.equal(period.previousStart.toISOString(), "2024-03-09T05:00:00.000Z");
  assert.equal(period.previousEnd.toISOString(), "2024-03-10T05:00:00.000Z");
});

test("handles the DST fall-back day without fixed 24-hour arithmetic", () => {
  const period = getReportingPeriod({
    reportType: "daily",
    timezone: "America/New_York",
    now: new Date("2024-11-04T15:00:00.000Z"),
  });

  assert.equal(period.start.toISOString(), "2024-11-03T04:00:00.000Z");
  assert.equal(period.end.toISOString(), "2024-11-04T05:00:00.000Z");
});

test("calculates the previous completed ISO week", () => {
  const period = getReportingPeriod({
    reportType: "weekly",
    timezone: "UTC",
    now: new Date("2024-01-10T12:00:00.000Z"),
  });

  assert.equal(period.start.toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(period.end.toISOString(), "2024-01-08T00:00:00.000Z");
  assert.equal(period.previousStart.toISOString(), "2023-12-25T00:00:00.000Z");
  assert.equal(period.previousEnd.toISOString(), "2024-01-01T00:00:00.000Z");
});

test("handles leap years and timezone offsets", () => {
  const period = getReportingPeriod({
    reportType: "daily",
    timezone: "Asia/Kolkata",
    now: new Date("2024-03-01T04:00:00.000Z"),
  });

  assert.equal(period.start.toISOString(), "2024-02-28T18:30:00.000Z");
  assert.equal(period.end.toISOString(), "2024-02-29T18:30:00.000Z");
});

test("rejects invalid dates and timezones", () => {
  assert.throws(
    () =>
      getReportingPeriod({
        reportType: "daily",
        timezone: "Not/A_Timezone",
      }),
    /Invalid IANA timezone/
  );
  assert.throws(
    () =>
      getReportingPeriod({
        reportType: "weekly",
        timezone: "UTC",
        now: new Date("invalid"),
      }),
    /Invalid reporting date/
  );
});

test("resolves a midnight skipped by a historical timezone transition", () => {
  assert.equal(
    localMidnightToUtc(
      { year: 2018, month: 11, day: 4 },
      "America/Sao_Paulo"
    )?.toISOString(),
    "2018-11-04T03:00:00.000Z"
  );
});

test("rejects invalid wall-clock minutes instead of normalizing them", () => {
  assert.throws(
    () => localDateTimeToUtc({ year: 2024, month: 1, day: 1 }, 0, "UTC", 60),
    /valid hour and minute/
  );
});
