import type { Permission } from "@workspace/contracts";

export type DashboardIntegrationCapability = {
  provider: string;
  supportsDashboard: boolean;
  supportsDateRange: boolean;
  requiresDomain: boolean;
  existingApiAvailable: boolean;
  dashboardApiAvailable: boolean;
  requiredPermission: Permission;
};

const dashboardPermission: Permission = "analytics.dashboard.view";

export const dashboardIntegrationCapabilities = {
  "google-search-console": {
    provider: "google-search-console",
    supportsDashboard: true,
    supportsDateRange: true,
    requiresDomain: true,
    existingApiAvailable: false,
    dashboardApiAvailable: true,
    requiredPermission: dashboardPermission,
  },
  stripe: {
    provider: "stripe",
    supportsDashboard: true,
    supportsDateRange: true,
    requiresDomain: false,
    existingApiAvailable: true,
    dashboardApiAvailable: true,
    requiredPermission: dashboardPermission,
  },
  "pagespeed-insights": {
    provider: "pagespeed-insights",
    supportsDashboard: true,
    supportsDateRange: false,
    requiresDomain: true,
    existingApiAvailable: false,
    dashboardApiAvailable: true,
    requiredPermission: dashboardPermission,
  },
  slack: {
    provider: "slack",
    supportsDashboard: false,
    supportsDateRange: false,
    requiresDomain: false,
    existingApiAvailable: true,
    dashboardApiAvailable: false,
    requiredPermission: dashboardPermission,
  },
} satisfies Record<string, DashboardIntegrationCapability>;

export function getDashboardIntegrationCapability(provider: string) {
  return dashboardIntegrationCapabilities[
    provider as keyof typeof dashboardIntegrationCapabilities
  ];
}
