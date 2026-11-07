import { and, asc, eq, exists } from "drizzle-orm";

import { db } from "../db/client";
import { integrations, projectIntegrations } from "../db/schema";
import { createIntegrationAssetSignedUrl } from "../lib/s3";

async function withSignedAssetUrls<T extends { assets: string[] }>(
  integration: T
): Promise<T> {
  const assets = await Promise.all(
    integration.assets.map((asset) => createIntegrationAssetSignedUrl(asset))
  );

  return {
    ...integration,
    assets: assets.filter((asset): asset is string => asset !== null),
  };
}

export type IntegrationCatalogFilters = {
  category?: string;
  filter?: "all" | "installed";
  projectId?: string;
};

export async function getVisibleIntegrationsModel(
  filters: IntegrationCatalogFilters = {}
) {
  const conditions = [eq(integrations.isVisible, true)];

  if (filters.category) {
    conditions.push(eq(integrations.category, filters.category));
  }

  if (filters.filter === "installed" && filters.projectId) {
    conditions.push(
      exists(
        db
          .select({ id: projectIntegrations.id })
          .from(projectIntegrations)
          .where(
            and(
              eq(projectIntegrations.integrationId, integrations.id),
              eq(projectIntegrations.projectId, filters.projectId),
              eq(projectIntegrations.status, "connected")
            )
          )
      )
    );
  }

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
      ...(filters.projectId
        ? {
            isConnected: exists(
              db
                .select({ id: projectIntegrations.id })
                .from(projectIntegrations)
                .where(
                  and(
                    eq(projectIntegrations.integrationId, integrations.id),
                    eq(projectIntegrations.projectId, filters.projectId),
                    eq(projectIntegrations.status, "connected")
                  )
                )
            ),
          }
        : {}),
    })
    .from(integrations)
    .where(and(...conditions))
    .orderBy(asc(integrations.sortOrder), asc(integrations.name));

  return Promise.all(rows.map(withSignedAssetUrls));
}

export async function getVisibleIntegrationCategoriesModel() {
  const rows = await db
    .selectDistinct({ category: integrations.category })
    .from(integrations)
    .where(eq(integrations.isVisible, true))
    .orderBy(asc(integrations.category));

  return rows.map((row) => row.category);
}

export async function getVisibleIntegrationByIdModel(
  id: string,
  projectId?: string
) {
  const [integration] = await db
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
    })
    .from(integrations)
    .where(eq(integrations.id, id))
    .limit(1);

  if (!integration) return null;

  const [connection] = projectId
    ? await db
        .select({ status: projectIntegrations.status })
        .from(projectIntegrations)
        .where(
          and(
            eq(projectIntegrations.integrationId, integration.id),
            eq(projectIntegrations.projectId, projectId)
          )
        )
        .limit(1)
    : [];

  return withSignedAssetUrls({
    ...integration,
    isConnected: connection?.status === "connected",
  });
}
