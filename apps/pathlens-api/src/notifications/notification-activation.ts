export function getNotificationScheduleNotBefore() {
  const raw = process.env.NOTIFICATION_SCHEDULE_NOT_BEFORE?.trim();
  if (!raw && process.env.PATHLENS_NOTIFICATION_SMOKE_TEST !== "false")
    return undefined;
  const date = raw ? new Date(raw) : undefined;
  if (!date || !Number.isFinite(date.getTime()) || date.toISOString() !== raw) {
    throw new Error(
      "NOTIFICATION_SCHEDULE_NOT_BEFORE must be an explicitly approved UTC ISO timestamp in normal mode."
    );
  }
  return date;
}
