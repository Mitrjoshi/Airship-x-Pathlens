import {
  slackProjectSettingsDefaults,
  slackProjectSettingsSchema,
} from "@workspace/contracts";

import type { NotificationSettings } from "./scheduling";

export function parseNotificationSettings(
  rawSettings: unknown,
  rawPreferences: unknown
): NotificationSettings | null {
  const settings =
    rawSettings && typeof rawSettings === "object"
      ? (rawSettings as Record<string, unknown>)
      : {};
  const preferences =
    rawPreferences && typeof rawPreferences === "object"
      ? (rawPreferences as Record<string, unknown>)
      : {};
  const parsed = slackProjectSettingsSchema.safeParse({
    ...slackProjectSettingsDefaults,
    ...settings,
    ...preferences,
  });
  if (!parsed.success || !parsed.data.channelId) return null;
  return {
    ...parsed.data,
    weeklyDayConfirmed: settings.weeklyDayConfirmed === true,
  };
}
