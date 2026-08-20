import type { NextFunction, Response } from "express";
import type { Permission } from "@workspace/contracts";

import { AuthRequest } from "../lib/jwt";
import { getProjectWorkspaceIdModel } from "../models/projects.model";
import {
  getWorkspaceAccessModel,
  hasWorkspacePermission,
} from "../models/workshop.model";

function getStringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

async function getWorkspaceId(req: AuthRequest): Promise<string | null> {
  const workspaceId =
    getStringValue(req.params.workspace_id) ??
    getStringValue(req.query.workspace_id) ??
    getStringValue(req.body?.workspace_id);

  if (workspaceId) return workspaceId;

  const channelAccess = (req as { channelAccess?: { channel: { workspaceId: string } | null } })
    .channelAccess;

  if (channelAccess?.channel?.workspaceId) {
    return channelAccess.channel.workspaceId;
  }

  const projectId =
    getStringValue(req.params.project_id) ??
    getStringValue(req.query.project_id) ??
    getStringValue(req.body?.project_id);

  return projectId ? getProjectWorkspaceIdModel(projectId) : null;
}

export function requireWorkspacePermission(permission: Permission) {
  return requireAnyWorkspacePermission(permission);
}

export function requireAnyWorkspacePermission(...permissions: Permission[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized." });
      return;
    }

    try {
      const workspaceId = await getWorkspaceId(req);

      if (!workspaceId) {
        res.status(400).json({
          success: false,
          message: "Workspace id is required.",
        });
        return;
      }

      const access = await getWorkspaceAccessModel(workspaceId, userId);

      if (
        !access ||
        !permissions.some((permission) =>
          hasWorkspacePermission(access, permission)
        )
      ) {
        res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action.",
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
