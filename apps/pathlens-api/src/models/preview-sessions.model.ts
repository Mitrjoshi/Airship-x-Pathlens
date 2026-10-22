import { and, eq } from "drizzle-orm";
import type {
  PreviewDevice,
  PreviewIntent,
  PreviewSessionClaims,
} from "@workspace/contracts";
import { normalizePagePath } from "@workspace/contracts";
import { db } from "../db/client";
import { heatmapPreviewSessions, projectDomains, projects } from "../db/schema";
import {
  createPreviewSessionHandle,
  getAllowedPreviewHostnames,
  hashPreviewSessionHandle,
  PREVIEW_SESSION_TTL_MS,
} from "../lib/preview-session";

interface PreviewDomainRow {
  projectId: string;
  workspaceId: string;
  domainId: string;
  domain: string;
}

export interface CreatedPreviewSession {
  handle: string;
  claims: PreviewSessionClaims;
}

async function getProjectDomain(
  projectId: string,
  workspaceId: string,
  domainId: string
): Promise<PreviewDomainRow | null> {
  const [row] = await db
    .select({
      projectId: projects.id,
      workspaceId: projects.workspaceId,
      domainId: projectDomains.id,
      domain: projectDomains.domain,
    })
    .from(projectDomains)
    .innerJoin(projects, eq(projects.id, projectDomains.projectId))
    .where(
      and(
        eq(projectDomains.id, domainId),
        eq(projectDomains.projectId, projectId),
        eq(projects.workspaceId, workspaceId)
      )
    );

  return row ?? null;
}

function toClaims(row: {
  id: string;
  workspaceId: string;
  projectId: string;
  projectDomainId: string;
  userId: string;
  canonicalHostname: string;
  allowedHostnames: string[];
  pathname: string;
  device: string;
  previewIntent: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}): PreviewSessionClaims {
  return {
    sessionId: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    projectDomainId: row.projectDomainId,
    userId: row.userId,
    canonicalHostname: row.canonicalHostname,
    allowedHostnames: row.allowedHostnames,
    pathname: row.pathname,
    device: row.device as PreviewDevice,
    previewIntent: row.previewIntent as PreviewIntent,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export async function createPreviewSessionModel(input: {
  workspaceId: string;
  projectId: string;
  domainId: string;
  userId: string;
  pathname: string;
  device: PreviewDevice;
  previewIntent: PreviewIntent;
}): Promise<CreatedPreviewSession | null> {
  const domain = await getProjectDomain(
    input.projectId,
    input.workspaceId,
    input.domainId
  );

  if (!domain) return null;

  const { canonicalHostname, allowedHostnames } = getAllowedPreviewHostnames(
    domain.domain
  );
  const handle = createPreviewSessionHandle();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + PREVIEW_SESSION_TTL_MS);

  const [row] = await db
    .insert(heatmapPreviewSessions)
    .values({
      handleHash: hashPreviewSessionHandle(handle),
      workspaceId: domain.workspaceId,
      projectId: domain.projectId,
      projectDomainId: domain.domainId,
      userId: input.userId,
      canonicalHostname,
      allowedHostnames,
      pathname: normalizePagePath(input.pathname),
      device: input.device,
      previewIntent: input.previewIntent,
      createdAt,
      expiresAt,
    })
    .returning({
      id: heatmapPreviewSessions.id,
      workspaceId: heatmapPreviewSessions.workspaceId,
      projectId: heatmapPreviewSessions.projectId,
      projectDomainId: heatmapPreviewSessions.projectDomainId,
      userId: heatmapPreviewSessions.userId,
      canonicalHostname: heatmapPreviewSessions.canonicalHostname,
      allowedHostnames: heatmapPreviewSessions.allowedHostnames,
      pathname: heatmapPreviewSessions.pathname,
      device: heatmapPreviewSessions.device,
      previewIntent: heatmapPreviewSessions.previewIntent,
      createdAt: heatmapPreviewSessions.createdAt,
      expiresAt: heatmapPreviewSessions.expiresAt,
      revokedAt: heatmapPreviewSessions.revokedAt,
    });

  if (!row) throw new Error("Unable to create preview session.");

  return { handle, claims: toClaims(row) };
}

export async function validatePreviewSessionModel(
  handle: string
): Promise<PreviewSessionClaims | null> {
  const [row] = await db
    .select({
      id: heatmapPreviewSessions.id,
      workspaceId: heatmapPreviewSessions.workspaceId,
      projectId: heatmapPreviewSessions.projectId,
      projectDomainId: heatmapPreviewSessions.projectDomainId,
      userId: heatmapPreviewSessions.userId,
      canonicalHostname: heatmapPreviewSessions.canonicalHostname,
      allowedHostnames: heatmapPreviewSessions.allowedHostnames,
      pathname: heatmapPreviewSessions.pathname,
      device: heatmapPreviewSessions.device,
      previewIntent: heatmapPreviewSessions.previewIntent,
      createdAt: heatmapPreviewSessions.createdAt,
      expiresAt: heatmapPreviewSessions.expiresAt,
      revokedAt: heatmapPreviewSessions.revokedAt,
      supersededAt: heatmapPreviewSessions.supersededAt,
      currentDomain: projectDomains.domain,
      currentWorkspaceId: projects.workspaceId,
      currentProjectId: projects.id,
    })
    .from(heatmapPreviewSessions)
    .innerJoin(
      projectDomains,
      eq(projectDomains.id, heatmapPreviewSessions.projectDomainId)
    )
    .innerJoin(projects, eq(projects.id, heatmapPreviewSessions.projectId))
    .where(
      eq(heatmapPreviewSessions.handleHash, hashPreviewSessionHandle(handle))
    );

  if (!row || row.revokedAt || row.supersededAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;
  if (row.currentProjectId !== row.projectId) return null;
  if (row.currentWorkspaceId !== row.workspaceId) return null;

  const currentDomain = getAllowedPreviewHostnames(row.currentDomain);

  if (
    currentDomain.canonicalHostname !== row.canonicalHostname ||
    currentDomain.allowedHostnames.some(
      (hostname) => !row.allowedHostnames.includes(hostname)
    )
  ) {
    return null;
  }

  return toClaims({
    ...row,
    allowedHostnames: currentDomain.allowedHostnames,
  });
}

export async function revokePreviewSessionModel(input: {
  sessionId: string;
  userId: string;
}): Promise<boolean> {
  const result = await db
    .update(heatmapPreviewSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(heatmapPreviewSessions.id, input.sessionId),
        eq(heatmapPreviewSessions.userId, input.userId)
      )
    );

  return result.rowCount === 1;
}

export async function supersedePreviewSessionModel(input: {
  sessionId: string;
  userId: string;
}): Promise<boolean> {
  const result = await db
    .update(heatmapPreviewSessions)
    .set({ supersededAt: new Date() })
    .where(
      and(
        eq(heatmapPreviewSessions.id, input.sessionId),
        eq(heatmapPreviewSessions.userId, input.userId)
      )
    );

  return result.rowCount === 1;
}
