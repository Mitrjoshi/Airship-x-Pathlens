import { and, eq, isNull } from "drizzle-orm";
import type {
  HeatmapDevice,
  PreviewDevice,
  PreviewIntent,
  PreviewSessionClaims,
} from "@workspace/contracts";
import { normalizePagePath } from "@workspace/contracts";
import { db } from "../db/client";
import { heatmapPreviewSessions, projectDomains, projects } from "../db/schema";
import { getHeatmapIdentityModel } from "./heatmaps.model";
import {
  createPreviewSessionHandle,
  getAllowedPreviewHostnames,
  hashPreviewSessionHandle,
  PREVIEW_SESSION_TTL_MS,
  resolveHeatmapPreviewDevice,
} from "../lib/preview-session";

export interface CreatedPreviewSession {
  handle: string;
  claims: PreviewSessionClaims;
}

export interface PreviewSessionAuthorization {
  sessionId: string;
  workspaceId: string;
  projectId: string;
  projectWorkspaceId: string;
  userId: string;
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
  heatmapId: string;
  userId: string;
  device: HeatmapDevice;
}): Promise<CreatedPreviewSession | null> {
  const heatmap = await getHeatmapIdentityModel(
    input.heatmapId,
    input.workspaceId,
    input.projectId
  );

  if (!heatmap) return null;

  const previewDevice = resolveHeatmapPreviewDevice(input.device);
  const { canonicalHostname, allowedHostnames } = getAllowedPreviewHostnames(
    heatmap.domain
  );

  const handle = createPreviewSessionHandle();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + PREVIEW_SESSION_TTL_MS);

  const [row] = await db
    .insert(heatmapPreviewSessions)
    .values({
      handleHash: hashPreviewSessionHandle(handle),
      workspaceId: heatmap.workspaceId,
      projectId: heatmap.projectId,
      projectDomainId: heatmap.domainId,
      userId: input.userId,
      canonicalHostname,
      allowedHostnames,
      pathname: normalizePagePath(heatmap.pagePath),
      device: previewDevice,
      previewIntent: "heatmap",
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

export async function getPreviewSessionAuthorizationModel(
  sessionId: string
): Promise<PreviewSessionAuthorization | null> {
  const [row] = await db
    .select({
      sessionId: heatmapPreviewSessions.id,
      workspaceId: heatmapPreviewSessions.workspaceId,
      projectId: heatmapPreviewSessions.projectId,
      projectWorkspaceId: projects.workspaceId,
      userId: heatmapPreviewSessions.userId,
    })
    .from(heatmapPreviewSessions)
    .innerJoin(projects, eq(projects.id, heatmapPreviewSessions.projectId))
    .where(eq(heatmapPreviewSessions.id, sessionId));

  return row ?? null;
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
        eq(heatmapPreviewSessions.userId, input.userId),
        isNull(heatmapPreviewSessions.revokedAt),
        isNull(heatmapPreviewSessions.supersededAt)
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
        eq(heatmapPreviewSessions.userId, input.userId),
        isNull(heatmapPreviewSessions.revokedAt),
        isNull(heatmapPreviewSessions.supersededAt)
      )
    );

  return result.rowCount === 1;
}
