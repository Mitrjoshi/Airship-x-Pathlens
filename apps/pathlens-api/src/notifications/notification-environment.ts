import fs from "node:fs";
import path from "node:path";
import { getNotificationSmokeIntegrationId } from "./notification-isolation";
import { getNotificationScheduleNotBefore } from "./notification-activation";

export type NotificationRuntime = "dispatcher" | "worker";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function validUrl(name: string, protocols: string[] = ["http:", "https:"]) {
  const value = required(name);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
  if (!protocols.includes(url.protocol)) {
    throw new Error(`${name} must use an approved URL protocol.`);
  }
  return value;
}

function validEncryptionKey(value: string) {
  const bytes = /^[0-9a-f]{64}$/i.test(value)
    ? Buffer.from(value, "hex")
    : Buffer.from(value, "base64");
  return bytes.length === 32;
}

function validateTls() {
  if (process.env.DATABASE_SSL_REQUIRED !== "true") {
    throw new Error("DATABASE_SSL_REQUIRED must be true.");
  }
  const caPath = required("DATABASE_SSL_CA");
  if (!fs.existsSync(path.resolve(caPath))) {
    throw new Error("DATABASE_SSL_CA must point to a readable certificate.");
  }
}

function validateSmokeMode() {
  const smokeTest = required("PATHLENS_NOTIFICATION_SMOKE_TEST");
  if (smokeTest !== "true" && smokeTest !== "false") {
    throw new Error("PATHLENS_NOTIFICATION_SMOKE_TEST must be true or false.");
  }
  getNotificationSmokeIntegrationId();
  getNotificationScheduleNotBefore();
  if (
    smokeTest === "false" &&
    process.env.PATHLENS_NOTIFICATION_MOCK_SLACK === "true"
  ) {
    throw new Error("Mock Slack transport must not be enabled in normal mode.");
  }
  if (
    smokeTest === "false" &&
    process.env.PATHLENS_NOTIFICATION_MOCK_OUTCOME?.trim()
  ) {
    throw new Error(
      "Mock Slack outcome injection must not be enabled in normal mode."
    );
  }
}

export function validateNotificationEnvironment(runtime: NotificationRuntime) {
  validUrl("DATABASE_URL", ["postgres:", "postgresql:"]);
  validateTls();
  validateSmokeMode();

  if (runtime === "dispatcher") {
    validUrl("NOTIFICATION_QUEUE_URL", ["http:", "https:"]);
    const gracePeriod = Number(required("NOTIFICATION_GRACE_PERIOD_MS"));
    if (!Number.isFinite(gracePeriod) || gracePeriod < 0) {
      throw new Error(
        "NOTIFICATION_GRACE_PERIOD_MS must be a non-negative number."
      );
    }
    return;
  }

  required("FRONTEND_URL");
  const encryptionKey = required("INTEGRATION_ENCRYPTION_KEY");
  if (!validEncryptionKey(encryptionKey)) {
    throw new Error("INTEGRATION_ENCRYPTION_KEY must encode 32 bytes.");
  }
}
