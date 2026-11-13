import assert from "node:assert/strict";
import test from "node:test";

import {
  slackProjectSettingsDefaults,
  slackProjectSettingsResponseSchema,
  slackProjectSettingsSchema,
} from "@workspace/contracts";

const baseSettings = {
  channelId: "C123",
  dailyEnabled: true,
  weeklyEnabled: false,
  dailyHour: 9,
  weeklyDay: 1,
  weeklyHour: 17,
  timezone: "America/New_York",
};

test("accepts every ISO weekday and preserves it through serialization", () => {
  for (const weeklyDay of [1, 2, 3, 4, 5, 6, 7]) {
    const parsed = slackProjectSettingsSchema.parse({
      ...baseSettings,
      weeklyDay,
    });

    assert.equal(JSON.parse(JSON.stringify(parsed)).weeklyDay, weeklyDay);
  }
});

test("accepts Sunday as ISO weekday 7", () => {
  const parsed = slackProjectSettingsSchema.parse({
    ...baseSettings,
    weeklyDay: 7,
  });

  assert.equal(parsed.weeklyDay, 7);
});

test("rejects JavaScript-style and out-of-range weekdays", () => {
  for (const weeklyDay of [-1, 0, 8, 1.5]) {
    assert.equal(
      slackProjectSettingsSchema.safeParse({ ...baseSettings, weeklyDay })
        .success,
      false
    );
  }
});

test("validates reporting hours and IANA timezones", () => {
  for (const dailyHour of [-1, 24, 1.5]) {
    assert.equal(
      slackProjectSettingsSchema.safeParse({ ...baseSettings, dailyHour })
        .success,
      false
    );
  }
  for (const weeklyHour of [-1, 24, 1.5]) {
    assert.equal(
      slackProjectSettingsSchema.safeParse({ ...baseSettings, weeklyHour })
        .success,
      false
    );
  }

  assert.equal(
    slackProjectSettingsSchema.safeParse({
      ...baseSettings,
      timezone: "Not/A_Timezone",
    }).success,
    false
  );
  assert.equal(
    slackProjectSettingsSchema.safeParse({
      ...baseSettings,
      timezone: "UTC",
    }).success,
    true
  );
});

test("keeps new-connection defaults and nullable response channel", () => {
  assert.deepEqual(slackProjectSettingsDefaults, {
    channelId: null,
    dailyEnabled: false,
    weeklyEnabled: false,
    dailyHour: 9,
    weeklyDay: 1,
    weeklyHour: 9,
    timezone: "UTC",
  });

  assert.equal(
    slackProjectSettingsResponseSchema.safeParse({
      ...slackProjectSettingsDefaults,
    }).success,
    true
  );
});

test("preserves daily and weekly preferences during round trips", () => {
  const settings = {
    ...baseSettings,
    dailyEnabled: false,
    weeklyEnabled: true,
    weeklyDay: 7,
    dailyHour: 6,
    weeklyHour: 22,
    timezone: "Europe/London",
  };

  const saved = slackProjectSettingsSchema.parse(settings);
  const fetched = slackProjectSettingsSchema.parse(
    JSON.parse(JSON.stringify(saved))
  );

  assert.deepEqual(fetched, settings);
});
