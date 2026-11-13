import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NOTIFICATION_GRACE_PERIOD_MS,
  getNotificationCandidates,
  type NotificationSettings,
} from "./scheduling";

const baseSettings: NotificationSettings = {
  channelId: "C123",
  dailyEnabled: true,
  weeklyEnabled: false,
  dailyHour: 9,
  dailyMinute: 0,
  weeklyDay: 1,
  weeklyHour: 9,
  weeklyMinute: 0,
  timezone: "America/New_York",
  weeklyDayConfirmed: true,
};

test("schedules the previous local day after the grace period", () => {
  const candidates = getNotificationCandidates(
    baseSettings,
    new Date("2024-03-11T14:15:00.000Z")
  );
  const candidate = candidates.find(
    (item) => item.period.end.toISOString() === "2024-03-11T04:00:00.000Z"
  );
  assert.ok(candidate);
  assert.equal(candidate.reportType, "daily");
  assert.equal(
    candidate.period.start.toISOString(),
    "2024-03-10T05:00:00.000Z"
  );
  assert.equal(candidate.period.end.toISOString(), "2024-03-11T04:00:00.000Z");
  assert.equal(
    candidate.scheduledFor.toISOString(),
    "2024-03-11T13:00:00.000Z"
  );
});

test("does not schedule before the fifteen-minute reporting grace period", () => {
  const settings = { ...baseSettings, dailyHour: 0 };
  const beforeGrace = getNotificationCandidates(
    settings,
    new Date("2024-03-10T05:14:59.000Z")
  );
  const afterGrace = getNotificationCandidates(
    settings,
    new Date("2024-03-10T05:15:00.000Z")
  );
  assert.equal(
    beforeGrace.some(
      (candidate) =>
        candidate.period.end.toISOString() === "2024-03-10T05:00:00.000Z"
    ),
    false
  );
  assert.equal(
    afterGrace.some(
      (candidate) =>
        candidate.period.end.toISOString() === "2024-03-10T05:00:00.000Z"
    ),
    true
  );
  assert.equal(DEFAULT_NOTIFICATION_GRACE_PERIOD_MS, 900000);
});

test("supports daily minute precision and late-night schedules", () => {
  const halfPastNine = getNotificationCandidates(
    { ...baseSettings, dailyHour: 9, dailyMinute: 30 },
    new Date("2024-03-11T14:15:00.000Z")
  );
  assert.equal(
    halfPastNine
      .find(
        (candidate) =>
          candidate.scheduledFor.toISOString() === "2024-03-11T13:30:00.000Z"
      )
      ?.scheduledFor.toISOString(),
    "2024-03-11T13:30:00.000Z"
  );

  const lateNight = getNotificationCandidates(
    { ...baseSettings, dailyHour: 23, dailyMinute: 59 },
    new Date("2024-03-12T00:00:00.000Z")
  );
  assert.equal(
    lateNight
      .find(
        (candidate) =>
          candidate.scheduledFor.toISOString() === "2024-03-11T03:59:00.000Z"
      )
      ?.scheduledFor.toISOString(),
    "2024-03-11T03:59:00.000Z"
  );
});

test("supports independent daily and weekly candidates", () => {
  const candidates = getNotificationCandidates(
    {
      ...baseSettings,
      dailyEnabled: true,
      weeklyEnabled: true,
      weeklyDay: 1,
      weeklyHour: 9,
    },
    new Date("2024-01-15T18:00:00.000Z")
  );
  assert.ok(candidates.some((candidate) => candidate.reportType === "daily"));
  assert.ok(candidates.some((candidate) => candidate.reportType === "weekly"));
  assert.equal(
    getNotificationCandidates(
      { ...baseSettings, dailyEnabled: false, weeklyEnabled: false },
      new Date("2024-01-15T18:00:00.000Z")
    ).length,
    0
  );
});

test("supports weekly weekday and minute precision", () => {
  const candidates = getNotificationCandidates(
    {
      ...baseSettings,
      dailyEnabled: false,
      weeklyEnabled: true,
      weeklyDay: 5,
      weeklyHour: 17,
      weeklyMinute: 30,
    },
    new Date("2024-01-19T18:00:00.000Z")
  );
  const candidate = candidates.find(
    (item) => item.scheduledFor.toISOString() === "2024-01-12T22:30:00.000Z"
  );
  assert.equal(candidate?.reportType, "weekly");
  assert.equal(
    candidate?.scheduledFor.toISOString(),
    "2024-01-12T22:30:00.000Z"
  );
});

test("limits daily catch-up to two local reporting periods", () => {
  const candidates = getNotificationCandidates(
    baseSettings,
    new Date("2024-03-15T15:00:00.000Z")
  );
  assert.equal(candidates.length, 2);
});

test("requires weekly weekday confirmation and supports all ISO weekdays", () => {
  const now = new Date("2024-01-15T10:00:00.000Z");
  assert.equal(
    getNotificationCandidates(
      {
        ...baseSettings,
        dailyEnabled: false,
        weeklyEnabled: true,
        weeklyDayConfirmed: false,
      },
      now
    ).length,
    0
  );
  for (let weeklyDay = 1; weeklyDay <= 7; weeklyDay += 1) {
    const candidates = getNotificationCandidates(
      {
        ...baseSettings,
        dailyEnabled: false,
        weeklyEnabled: true,
        weeklyDay,
        weeklyDayConfirmed: true,
      },
      new Date("2024-01-21T15:00:00.000Z")
    );
    assert.equal(candidates.length, 2);
  }
});

test("skips a nonexistent DST delivery hour", () => {
  const candidates = getNotificationCandidates(
    { ...baseSettings, dailyHour: 2 },
    new Date("2024-03-10T07:00:00.000Z")
  );
  assert.equal(
    candidates.some(
      (candidate) =>
        candidate.scheduledFor.toISOString() === "2024-03-10T07:00:00.000Z"
    ),
    false
  );
});

test("deduplicates a repeated fall-back delivery hour", () => {
  const candidates = getNotificationCandidates(
    { ...baseSettings, dailyHour: 1 },
    new Date("2024-11-04T07:00:00.000Z")
  );
  const periods = candidates.map((candidate) =>
    candidate.period.end.toISOString()
  );
  assert.equal(new Set(periods).size, periods.length);
});
