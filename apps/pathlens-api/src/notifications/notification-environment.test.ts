import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import { validateNotificationEnvironment } from "./notification-environment";

const baseEnvironment = {
  DATABASE_URL: "postgresql://user:password@example.invalid/postgres",
  DATABASE_SSL_REQUIRED: "true",
  DATABASE_SSL_CA: path.resolve(__dirname, "../../certs/supabase-ca.crt"),
  FRONTEND_URL: "https://staging.pathlens.example",
  INTEGRATION_ENCRYPTION_KEY: "a".repeat(64),
  NOTIFICATION_GRACE_PERIOD_MS: "900000",
  NOTIFICATION_QUEUE_URL:
    "https://sqs.ap-south-1.amazonaws.com/000000000000/pathlens-notification-staging-queue",
  PATHLENS_NOTIFICATION_SMOKE_TEST: "true",
  PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID:
    "11111111-1111-4111-8111-111111111111",
};

function withEnvironment(
  overrides: Partial<typeof baseEnvironment>,
  callback: () => void
) {
  const previous = new Map<string, string | undefined>();
  const values = { ...baseEnvironment, ...overrides };
  for (const [name, value] of Object.entries(values)) {
    previous.set(name, process.env[name]);
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  try {
    callback();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

test("validates dispatcher environment without Secrets Manager", () => {
  withEnvironment({}, () => {
    assert.doesNotThrow(() => validateNotificationEnvironment("dispatcher"));
  });
});

test("validates worker environment without Secrets Manager", () => {
  withEnvironment({}, () => {
    assert.doesNotThrow(() => validateNotificationEnvironment("worker"));
  });
});

test("requires the smoke-test fixture integration", () => {
  withEnvironment({ PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID: "" }, () => {
    assert.throws(
      () => validateNotificationEnvironment("dispatcher"),
      /PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID is required/
    );
  });
});

test("requires the worker encryption key", () => {
  withEnvironment({ INTEGRATION_ENCRYPTION_KEY: "" }, () => {
    assert.throws(
      () => validateNotificationEnvironment("worker"),
      /INTEGRATION_ENCRYPTION_KEY is required/
    );
  });
});
