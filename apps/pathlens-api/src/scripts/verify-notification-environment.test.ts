import assert from "node:assert/strict";
import test from "node:test";

import {
  fingerprintVariables,
  validateNotificationEnvironment,
} from "./verify-notification-environment";

const workerEnvironment = {
  DATABASE_URL:
    "postgresql://postgres.projectref:password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
  DATABASE_SSL_REQUIRED: "true",
  DATABASE_SSL_CA: "/var/task/certs/supabase-ca.crt",
  INTEGRATION_ENCRYPTION_KEY: "a".repeat(64),
  FRONTEND_URL: "http://staging.example.test",
  PATHLENS_NOTIFICATION_SMOKE_TEST: "true",
};

test("accepts recovered worker environment without exposing values", () => {
  assert.deepEqual(
    validateNotificationEnvironment(
      "pathlens-notification-staging-worker",
      workerEnvironment
    ),
    []
  );
  const fingerprint = fingerprintVariables(workerEnvironment);
  assert.equal(Object.keys(fingerprint).length, 6);
  assert.equal(JSON.stringify(fingerprint).includes("projectref"), false);
  assert.equal(JSON.stringify(fingerprint).includes("password"), false);
});

test("fails closed when smoke mode or a required variable is lost", () => {
  const errors = validateNotificationEnvironment(
    "pathlens-notification-staging-worker",
    {
      ...workerEnvironment,
      PATHLENS_NOTIFICATION_SMOKE_TEST: "false",
      FRONTEND_URL: "",
    }
  );
  assert.ok(errors.includes("FRONTEND_URL missing"));
  assert.ok(errors.includes("PATHLENS_NOTIFICATION_SMOKE_TEST is not true"));
});

test("rejects a fixture integration ID in either mode", () => {
  const errors = validateNotificationEnvironment(
    "pathlens-notification-staging-worker",
    {
      ...workerEnvironment,
      PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID: "fixture",
    }
  );
  assert.ok(
    errors.includes("PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID present")
  );
});
