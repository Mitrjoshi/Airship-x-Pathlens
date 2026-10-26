import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
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
import { hashPreviewSessionHandle } from "../lib/preview-session";

function correlationId(req: Request): string {
  return (
    req.header("x-pathlens-proxy-request-id") ||
    req.header("x-request-id") ||
    randomUUID()
  );
}

function logPreviewDiagnostic(
  category: string,
  fields: {
    requestId: string;
    sessionId?: string;
    handle?: string;
  }
): void {
  console.info({
    event: "preview_session_diagnostic",
    category,
    request_id: fields.requestId,
    ...(fields.sessionId ? { session_id: fields.sessionId } : {}),
    ...(fields.handle
      ? {
          handle_fingerprint: hashPreviewSessionHandle(fields.handle).slice(
            0,
            16
          ),
        }
      : {}),
  });
}

function proxyOrigin(): string {
  return (
    process.env.HEATMAP_PROXY_PUBLIC_ORIGIN?.trim() || "http://localhost:8082"
  ).replace(/\/$/, "");
}

function proxyBasePath(): string {
  const value = (
    process.env.HEATMAP_PROXY_PUBLIC_BASE_PATH?.trim() || ""
  ).replace(/\/$/, "");
  if (!value) return "";
  if (
    !value.startsWith("/") ||
    value.includes("?") ||
    value.includes("#") ||
    value
      .split("/")
      .some(
        (segment, index) =>
          (index > 0 && !segment) || segment === "." || segment === ".."
      )
  ) {
    throw new Error(
      "HEATMAP_PROXY_PUBLIC_BASE_PATH must contain only non-empty path segments."
    );
  }
  return value;
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

    logPreviewDiagnostic("session_created", {
      requestId: correlationId(req),
      sessionId: session.claims.sessionId,
    });

    return res.status(201).json({
      success: true,
      data: {
        session_id: session.claims.sessionId,
        iframe_url: `${proxyOrigin()}${proxyBasePath()}/v1/session/${encodeURIComponent(session.handle)}/page${session.claims.pathname}`,
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

  logPreviewDiagnostic(revoked ? "session_revoked" : "revoke_not_applied", {
    requestId: correlationId(req),
    sessionId: parsed.data.session_id,
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

  logPreviewDiagnostic(
    superseded ? "session_superseded" : "supersede_not_applied",
    {
      requestId: correlationId(req),
      sessionId: parsed.data.session_id,
    }
  );

  return res.status(200).json({
    success: true,
    data: { session_id: parsed.data.session_id, revoked: superseded },
  });
}

export async function validatePreviewSession(req: any, res: Response) {
  const requestId = correlationId(req);
  let validationCategory = "missing_session";
  const session = await validatePreviewSessionModel(
    req.body.handle,
    (category) => {
      validationCategory = category;
    }
  );

  logPreviewDiagnostic(validationCategory, {
    requestId,
    sessionId: session?.sessionId,
    handle: req.body.handle,
  });

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
