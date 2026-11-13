import assert from "node:assert/strict";
import test from "node:test";

import { parseNotificationSettings } from "./notification-settings";

test("historical weekly settings remain unconfirmed", () => {
  const settings = parseNotificationSettings(
    {
      channelId: "C123",
      dailyHour: 9,
      weeklyDay: 2,
      weeklyHour: 9,
      timezone: "UTC",
    },
    { dailyEnabled: false, weeklyEnabled: true }
  );
  assert.equal(settings?.weeklyDayConfirmed, false);
});

test("confirmed weekly settings are accepted only for valid ISO weekdays", () => {
  const settings = parseNotificationSettings(
    {
      channelId: "C123",
      dailyHour: 9,
      weeklyDay: 7,
      weeklyHour: 9,
      timezone: "UTC",
      weeklyDayConfirmed: true,
    },
    { dailyEnabled: false, weeklyEnabled: true }
  );
  assert.equal(settings?.weeklyDayConfirmed, true);
  assert.equal(
    parseNotificationSettings(
      { channelId: "C123", weeklyDay: 0, weeklyDayConfirmed: true },
      { weeklyEnabled: true }
    ),
    null
  );
});
