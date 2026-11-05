import { asc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { integrations } from "../db/schema";

export async function getVisibleIntegrationsModel() {
  return db
    .select({
      id: integrations.id,
      slug: integrations.slug,
      name: integrations.name,
      description: integrations.description,
      category: integrations.category,
      iconUrl: integrations.iconUrl,
      status: integrations.status,
    })
    .from(integrations)
    .where(eq(integrations.isVisible, true))
    .orderBy(asc(integrations.sortOrder), asc(integrations.name));
}
