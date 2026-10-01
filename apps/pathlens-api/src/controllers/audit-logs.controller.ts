import { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import { getAuditLogs } from "../models/audit-logs.model";

const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
  action: z.string().trim().min(1).optional(),
  resource_type: z.string().trim().min(1).optional(),
  actor_user_id: z.uuid().optional(),
  project_id: z.uuid().optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

function getWorkspaceId(req: AuthRequest) {
  return typeof req.params.workspace_id === "string"
    ? req.params.workspace_id
    : undefined;
}

function isUnauthorized(req: AuthRequest, workspaceId?: string) {
  return !req.user?.id || !workspaceId;
}

export async function getAuditLogsController(req: AuthRequest, res: Response) {
  const workspaceId = getWorkspaceId(req);

  if (isUnauthorized(req, workspaceId)) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const query = auditLogsQuerySchema.parse(req.query);
    const result = await getAuditLogs({
      workspaceId,
      page: query.page,
      pageSize: query.page_size,
      action: query.action,
      resourceType: query.resource_type,
      actorUserId: query.actor_user_id,
      projectId: query.project_id,
      search: query.search,
    });

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        page: query.page,
        pageSize: query.page_size,
        total: result.total,
        totalPages: Math.ceil(result.total / query.page_size),
        hasNextPage: query.page * query.page_size < result.total,
      },
    });
  } catch (error) {
    if (!(error instanceof ZodError)) {
      console.error("Unable to load audit logs", error);
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? "Invalid query."
          : "Unable to load audit logs.",
    });
  }
}
