import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { getNotificationScheduleNotBefore } from "./notification-activation";
import { getNotificationCandidates } from "./scheduling";

const previousMode = process.env.PATHLENS_NOTIFICATION_SMOKE_TEST;
const previousCutoff = process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE;
test.afterEach(() => {
  if (previousMode === undefined)
    delete process.env.PATHLENS_NOTIFICATION_SMOKE_TEST;
  else process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = previousMode;
  if (previousCutoff === undefined)
    delete process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE;
  else process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE = previousCutoff;
});
test("normal mode refuses an unapproved or dynamic initial cutover", () => {
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "false";
  for (const cutoff of ["", "now", "2026-11-12"]) {
    process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE = cutoff;
    assert.throws(getNotificationScheduleNotBefore);
  }
});
test("explicit activation cutoff removes catch-up without changing scheduling preferences", () => {
  process.env.PATHLENS_NOTIFICATION_SMOKE_TEST = "false";
  process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE = "2026-11-12T09:30:00.000Z";
  const settings = {
    channelId: "C1",
    timezone: "Asia/Kolkata",
    dailyEnabled: true,
    dailyHour: 15,
    weeklyEnabled: false,
    weeklyDay: 1,
    weeklyHour: 9,
    weeklyDayConfirmed: true,
  };
  const candidates = getNotificationCandidates(
    settings,
    new Date("2026-11-12T09:35:00.000Z")
  );
  assert.equal(candidates.length, 2);
  const after = candidates.filter(
    (c) => c.scheduledFor >= getNotificationScheduleNotBefore()!
  );
  assert.equal(after.length, 1);
  assert.equal(after[0].scheduledFor.toISOString(), "2026-11-12T09:30:00.000Z");
});
test("monitoring covers caught failures, durable unknown backlog and missing heartbeat", () => {
  const template = fs.readFileSync(
    path.resolve(__dirname, "../../template.yaml"),
    "utf8"
  );
  for (const event of [
    "notification_delivery_failed",
    "notification_record_failed",
    "notification_schedule_failed",
    "notification_enqueue_partial_failure",
    "notification_provider_outcome_unknown",
    "notification_unknown_backlog",
    "notification_dispatch_completed",
  ])
    assert.ok(template.includes(event));
  assert.match(template, /TreatMissingData: breaching/);
  assert.match(template, /MetricName: Throttles/);
  assert.match(template, /HasAlertDestination/);
  assert.match(template, /MaximumConcurrency: 2/);
  assert.ok(!template.includes("Environment:"));
});
