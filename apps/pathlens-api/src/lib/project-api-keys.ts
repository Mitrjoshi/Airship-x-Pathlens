import { and, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "../db/client";
import { projectApiKeys, projectDomains, projects } from "../db/schema";
import { hashApiKey } from "../utils/utils";

export const TRACKING_SCOPES = [
  "events",
  "replay",
  "errors",
  "performance",
] as const;

export type TrackingScope = (typeof TRACKING_SCOPES)[number];

export interface ProjectApiKeyContext {
  projectId: string;
  workspaceId: string;
  domains: string[];
  keyId: string | null;
  scopes: readonly TrackingScope[];
}

function isTrackingScope(value: string): value is TrackingScope {
  return (TRACKING_SCOPES as readonly string[]).includes(value);
}

function normalizeScopes(scopes: readonly string[]): TrackingScope[] {
  return scopes.filter(isTrackingScope);
}

export async function resolveProjectApiKey(
  apiKey: string
): Promise<ProjectApiKeyContext | null> {
  const now = new Date();
  const [key] = await db
    .select({
      id: projectApiKeys.id,
      projectId: projectApiKeys.projectId,
      workspaceId: projects.workspaceId,
      scopes: projectApiKeys.scopes,
    })
    .from(projectApiKeys)
    .innerJoin(projects, eq(projectApiKeys.projectId, projects.id))
    .where(
      and(
        eq(projectApiKeys.secretHash, hashApiKey(apiKey)),
        isNull(projectApiKeys.revokedAt),
        or(isNull(projectApiKeys.expiresAt), gt(projectApiKeys.expiresAt, now))
      )
    );

  if (key) {
    const domainRows = await db
      .select({ domain: projectDomains.domain })
      .from(projectDomains)
      .where(eq(projectDomains.projectId, key.projectId));

    await db
      .update(projectApiKeys)
      .set({ lastUsedAt: now })
      .where(eq(projectApiKeys.id, key.id));

    return {
      projectId: key.projectId,
      workspaceId: key.workspaceId,
      domains: domainRows.map((row) => row.domain),
      keyId: key.id,
      scopes: normalizeScopes(key.scopes),
    };
  }

  return null;
}

export function getScopeForEventType(type: string): TrackingScope {
  if (type === "javascript_error" || type === "promise_rejection") {
    return "errors";
  }

  if (type === "performance") return "performance";

  return "events";
}
