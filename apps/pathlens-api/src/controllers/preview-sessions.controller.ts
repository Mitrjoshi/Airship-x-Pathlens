import type { Response } from "express";
import {
  createPreviewSessionRequestSchema,
  revokePreviewSessionRequestSchema,
} from "@workspace/contracts";
import type { AuthenticatedRequest } from "../middleware/auth.middleware";
import {
  createPreviewSessionModel,
  revokePreviewSessionModel,
  supersedePreviewSessionModel,
  validatePreviewSessionModel,
} from "../models/preview-sessions.model";

function proxyOrigin(): string {
  return (
    process.env.HEATMAP_PROXY_PUBLIC_ORIGIN?.trim() || "http://localhost:8082"
  ).replace(/\/$/, "");
}

export async function createPreviewSession(
  req: AuthenticatedRequest,
  res: Response
) {
  const parsed = createPreviewSessionRequestSchema.safeParse(req.body);
  const userId = req.user?.id;

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid preview session.",
    });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const session = await createPreviewSessionModel({
      workspaceId: parsed.data.workspace_id,
      projectId: parsed.data.project_id,
      heatmapId: parsed.data.heatmap_id,
      userId,
      device: parsed.data.device,
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Project domain not found for this workspace.",
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        session_id: session.claims.sessionId,
        iframe_url: `${proxyOrigin()}/v1/session/${session.handle}/page${session.claims.pathname}`,
        expires_at: session.claims.expiresAt,
        project_id: session.claims.projectId,
        domain_id: session.claims.projectDomainId,
        canonical_hostname: session.claims.canonicalHostname,
        pathname: session.claims.pathname,
        device: session.claims.device,
        preview_intent: session.claims.previewIntent,
        protocol_version: 1,
      },
    });
  } catch (error) {
    console.error("Unable to create heatmap preview session.", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create heatmap preview session.",
    });
  }
}

export async function revokePreviewSession(
  req: AuthenticatedRequest,
  res: Response
) {
  const parsed = revokePreviewSessionRequestSchema.safeParse(req.body);
  const userId = req.user?.id;

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid session ID.",
    });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const revoked = await revokePreviewSessionModel({
    sessionId: parsed.data.session_id,
    userId,
  });

  return res.status(200).json({
    success: true,
    data: { session_id: parsed.data.session_id, revoked },
  });
}

export async function supersedePreviewSession(
  req: AuthenticatedRequest,
  res: Response
) {
  const parsed = revokePreviewSessionRequestSchema.safeParse(req.body);
  const userId = req.user?.id;

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid session ID.",
    });
  }

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const superseded = await supersedePreviewSessionModel({
    sessionId: parsed.data.session_id,
    userId,
  });

  return res.status(200).json({
    success: true,
    data: { session_id: parsed.data.session_id, revoked: superseded },
  });
}

export async function validatePreviewSession(req: any, res: Response) {
  const session = await validatePreviewSessionModel(req.body.handle);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: {
        code: "SESSION_EXPIRED",
        message: "Preview session is missing, expired, revoked, or stale.",
        retryable: false,
      },
    });
  }

  return res.status(200).json({ success: true, data: session });
}
