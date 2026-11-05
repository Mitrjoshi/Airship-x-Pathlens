import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { integrations, projectIntegrations, projects } from "../db/schema";

export async function getProjectIntegrationBySlugModel(
  projectId: string,
  slug: string
) {
  const [row] = await db
    .select({
      projectName: projects.name,
      integrationId: integrations.id,
      connection: projectIntegrations,
    })
    .from(projects)
    .innerJoin(
      projectIntegrations,
      eq(projectIntegrations.projectId, projects.id)
    )
    .innerJoin(
      integrations,
      and(
        eq(integrations.id, projectIntegrations.integrationId),
        eq(integrations.slug, slug)
      )
    )
    .where(eq(projects.id, projectId))
    .limit(1);
  return row ?? null;
}

export async function getProjectIntegrationsModel(projectId: string) {
  const rows = await db
    .select({
      id: integrations.id,
      slug: integrations.slug,
      name: integrations.name,
      description: integrations.description,
      category: integrations.category,
      iconUrl: integrations.iconUrl,
      status: integrations.status,
      connectionId: projectIntegrations.id,
      connectionProviderWorkspaceId: projectIntegrations.providerWorkspaceId,
      connectionProviderWorkspaceName:
        projectIntegrations.providerWorkspaceName,
      connectionStatus: projectIntegrations.status,
      connectionConnectedAt: projectIntegrations.connectedAt,
      connectionUpdatedAt: projectIntegrations.updatedAt,
      connectionLastError: projectIntegrations.lastError,
    })
    .from(integrations)
    .leftJoin(
      projectIntegrations,
      and(
        eq(projectIntegrations.integrationId, integrations.id),
        eq(projectIntegrations.projectId, projectId)
      )
    )
    .where(eq(integrations.isVisible, true))
    .orderBy(asc(integrations.sortOrder), asc(integrations.name));

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    iconUrl: row.iconUrl,
    status: row.status,
    connection: row.connectionId
      ? {
          id: row.connectionId,
          providerWorkspaceId: row.connectionProviderWorkspaceId!,
          providerWorkspaceName: row.connectionProviderWorkspaceName!,
          status: row.connectionStatus as
            "connected" | "disconnected" | "error",
          connectedAt: row.connectionConnectedAt?.toISOString() ?? null,
          updatedAt: row.connectionUpdatedAt?.toISOString() ?? null,
          lastError: row.connectionLastError,
        }
      : null,
  }));
}
