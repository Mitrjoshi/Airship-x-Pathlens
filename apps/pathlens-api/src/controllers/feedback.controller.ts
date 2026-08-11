import type { Response } from "express";
import { createFeedbackSchema } from "@workspace/contracts";
import { ZodError } from "zod";

import { getProjectWorkspaceIdModel } from "../models/projects.model";
import { createFeedbackModel } from "../models/feedback.model";
import { getWorkspaceMemberModel } from "../models/workshop.model";
import type { AuthRequest } from "../lib/jwt";

function getAuthenticatedUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

async function validateFeedbackContext(data: {
  userId: string;
  workspaceId?: string;
  projectId?: string;
}) {
  let workspaceId = data.workspaceId;

  if (data.projectId) {
    const projectWorkspaceId = await getProjectWorkspaceIdModel(data.projectId);

    if (!projectWorkspaceId) {
      return {
        status: 400,
        message: "The selected project was not found.",
      };
    }

    if (workspaceId && workspaceId !== projectWorkspaceId) {
      return {
        status: 400,
        message: "The project does not belong to the selected workspace.",
      };
    }

    workspaceId = projectWorkspaceId;
  }

  if (!workspaceId) return null;

  const member = await getWorkspaceMemberModel(workspaceId, data.userId);

  if (!member) {
    return {
      status: 403,
      message: "You do not have access to this workspace.",
    };
  }

  return null;
}

export async function createFeedback(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const payload = createFeedbackSchema.parse(req.body);
    const contextError = await validateFeedbackContext({
      userId,
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
    });

    if (contextError) {
      return res.status(contextError.status).json({
        success: false,
        message: contextError.message,
      });
    }

    const entry = await createFeedbackModel({
      userId,
      category: payload.category,
      message: payload.message,
      pageUrl: payload.page_url,
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
    });

    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}
