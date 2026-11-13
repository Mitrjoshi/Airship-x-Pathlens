import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dashboardIntegrationCapabilities,
  getDashboardIntegrationCapability,
} from "./dashboard-capabilities";

test("registers the expected dashboard capability metadata", () => {
  assert.deepEqual(dashboardIntegrationCapabilities["google-search-console"], {
    provider: "google-search-console",
    supportsDashboard: true,
    supportsDateRange: true,
    requiresDomain: true,
    existingApiAvailable: false,
    dashboardApiAvailable: true,
    requiredPermission: "analytics.dashboard.view",
  });
  assert.equal(
    dashboardIntegrationCapabilities.stripe.dashboardApiAvailable,
    true
  );
  assert.equal(
    dashboardIntegrationCapabilities.stripe.existingApiAvailable,
    true
  );
  assert.equal(
    dashboardIntegrationCapabilities["pagespeed-insights"].supportsDateRange,
    false
  );
  assert.equal(
    dashboardIntegrationCapabilities["pagespeed-insights"]
      .dashboardApiAvailable,
    true
  );
  assert.equal(dashboardIntegrationCapabilities.slack.supportsDashboard, false);
});

test("does not provide capabilities for unknown providers", () => {
  assert.equal(getDashboardIntegrationCapability("unknown"), undefined);
});
