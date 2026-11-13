import { validateNotificationEnvironment } from "./notification-environment";

export async function handler() {
  validateNotificationEnvironment("dispatcher");
  const runtime = await import("./notification-dispatcher");
  return runtime.handler();
}
