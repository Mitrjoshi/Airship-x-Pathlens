import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { integrations, projectIntegrations, projects } from "../db/schema";
import { getDashboardIntegrationCapability } from "../integrations/dashboard-capabilities";

type DashboardIntegrationRow = {
  slug: string;
  name: string;
  iconUrl: string | null;
  status: string;
};

export function toDashboardIntegration(row: DashboardIntegrationRow) {
  const capability = getDashboardIntegrationCapability(row.slug);

  if (!capability?.supportsDashboard || row.status !== "connected") {
    return null;
  }

  return {
    provider: row.slug,
    name: row.name,
    iconUrl: row.iconUrl,
    status: "connected" as const,
    supportsDateRange: capability.supportsDateRange,
    requiresDomain: capability.requiresDomain,
    dashboardApiAvailable: capability.dashboardApiAvailable,
  };
}

export async function getProjectDashboardIntegrationsModel(
  workspaceId: string,
  projectId: string
) {
  const rows = await db
    .select({
      slug: integrations.slug,
      name: integrations.name,
      iconUrl: integrations.iconUrl,
      status: projectIntegrations.status,
    })
    .from(projectIntegrations)
    .innerJoin(projects, eq(projects.id, projectIntegrations.projectId))
    .innerJoin(
      integrations,
      eq(integrations.id, projectIntegrations.integrationId)
    )
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.workspaceId, workspaceId),
        eq(projectIntegrations.status, "connected"),
        eq(integrations.status, "available"),
        eq(integrations.isVisible, true)
      )
    )
    .orderBy(asc(integrations.sortOrder), asc(integrations.name));

  return rows.flatMap((row) => {
    const integration = toDashboardIntegration(row);
    return integration ? [integration] : [];
  });
}
