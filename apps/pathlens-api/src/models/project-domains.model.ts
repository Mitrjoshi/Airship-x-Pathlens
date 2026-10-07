import { and, asc, count, eq } from "drizzle-orm";

import { db } from "../db/client";
import { projectDomains } from "../db/schema";
import { normalizeProjectDomain } from "../lib/project-domain";

export class ProjectDomainDeletionError extends Error {
  constructor() {
    super("A project must have at least one domain.");
    this.name = "ProjectDomainDeletionError";
  }
}

export class DefaultProjectDomainDeletionError extends Error {
  constructor() {
    super("The default project domain cannot be deleted.");
    this.name = "DefaultProjectDomainDeletionError";
  }
}

export async function getProjectDomainsModel(projectId: string) {
  return db
    .select({
      id: projectDomains.id,
      projectId: projectDomains.projectId,
      userId: projectDomains.userId,
      domain: projectDomains.domain,
      isDefault: projectDomains.isDefault,
      createdAt: projectDomains.createdAt,
    })
    .from(projectDomains)
    .where(eq(projectDomains.projectId, projectId))
    .orderBy(asc(projectDomains.createdAt));
}

export async function createProjectDomainModel(data: {
  projectId: string;
  userId: string;
  domain: string;
}) {
  const domain = normalizeProjectDomain(data.domain);

  if (!domain) throw new Error("A valid domain is required.");

  const [projectDomain] = await db
    .insert(projectDomains)
    .values({
      projectId: data.projectId,
      userId: data.userId,
      domain,
      isDefault: false,
    })
    .returning();

  return projectDomain;
}

export async function updateProjectDomainModel(data: {
  projectId: string;
  domainId: string;
  domain: string;
}) {
  const domain = normalizeProjectDomain(data.domain);

  if (!domain) throw new Error("A valid domain is required.");

  const [projectDomain] = await db
    .update(projectDomains)
    .set({ domain })
    .where(
      and(
        eq(projectDomains.id, data.domainId),
        eq(projectDomains.projectId, data.projectId)
      )
    )
    .returning();

  return projectDomain;
}

export async function deleteProjectDomainModel(data: {
  projectId: string;
  domainId: string;
}) {
  const [domainToDelete] = await db
    .select({ isDefault: projectDomains.isDefault })
    .from(projectDomains)
    .where(
      and(
        eq(projectDomains.id, data.domainId),
        eq(projectDomains.projectId, data.projectId)
      )
    );

  if (!domainToDelete) return undefined;
  if (domainToDelete.isDefault) {
    throw new DefaultProjectDomainDeletionError();
  }

  const [domainCount] = await db
    .select({ total: count() })
    .from(projectDomains)
    .where(eq(projectDomains.projectId, data.projectId));

  if (Number(domainCount?.total ?? 0) <= 1) {
    throw new ProjectDomainDeletionError();
  }

  const [projectDomain] = await db
    .delete(projectDomains)
    .where(
      and(
        eq(projectDomains.id, data.domainId),
        eq(projectDomains.projectId, data.projectId)
      )
    )
    .returning({ id: projectDomains.id });

  return projectDomain;
}
