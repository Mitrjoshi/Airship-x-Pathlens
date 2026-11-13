export function logNotification(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown> = {}
) {
  const payload = { event, ...fields };
  console[level](JSON.stringify(payload));
}
