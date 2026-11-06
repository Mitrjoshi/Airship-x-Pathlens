import { and, asc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { integrations, projectIntegrations, projects } from "../db/schema";
import { createIntegrationAssetSignedUrl } from "../lib/s3";

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
      content: integrations.content,
      assets: integrations.assets,
      support: integrations.support,
      documentation: integrations.documentation,
      terms: integrations.terms,
      privacy: integrations.privacy,
      website: integrations.website,
      category: integrations.category,
      iconUrl: integrations.iconUrl,
      status: integrations.status,
      installsCount: db.$count(
        projectIntegrations,
        and(
          eq(projectIntegrations.integrationId, integrations.id),
          eq(projectIntegrations.status, "connected")
        )
      ),
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

  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      content: row.content,
      assets: (
        await Promise.all(
          row.assets.map((asset) => createIntegrationAssetSignedUrl(asset))
        )
      ).filter((asset): asset is string => asset !== null),
      support: row.support,
      documentation: row.documentation,
      terms: row.terms,
      privacy: row.privacy,
      website: row.website,
      category: row.category,
      iconUrl: row.iconUrl,
      status: row.status,
      installsCount: row.installsCount,
      isConnected: row.connectionStatus === "connected",
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
    }))
  );
}
