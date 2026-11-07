import { and, eq } from "drizzle-orm";

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
