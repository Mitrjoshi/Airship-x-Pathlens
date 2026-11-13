import assert from "node:assert/strict";
import { test } from "node:test";

import { toDashboardIntegration } from "./dashboard-integrations.model";

test("maps a connected dashboard-capable integration without sensitive fields", () => {
  const result = toDashboardIntegration({
    slug: "stripe",
    name: "Stripe",
    iconUrl: null,
    status: "connected",
  });

  assert.deepEqual(result, {
    provider: "stripe",
    name: "Stripe",
    iconUrl: null,
    status: "connected",
    supportsDateRange: true,
    requiresDomain: false,
    dashboardApiAvailable: true,
  });
  assert.equal("encryptedCredentials" in (result ?? {}), false);
});

test("excludes disconnected, error, and non-dashboard integrations", () => {
  assert.equal(
    toDashboardIntegration({
      slug: "stripe",
      name: "Stripe",
      iconUrl: null,
      status: "disconnected",
    }),
    null
  );
  assert.equal(
    toDashboardIntegration({
      slug: "stripe",
      name: "Stripe",
      iconUrl: null,
      status: "error",
    }),
    null
  );
  assert.equal(
    toDashboardIntegration({
      slug: "slack",
      name: "Slack",
      iconUrl: null,
      status: "connected",
    }),
    null
  );
  assert.equal(
    toDashboardIntegration({
      slug: "unknown",
      name: "Unknown",
      iconUrl: null,
      status: "connected",
    }),
    null
  );
});
