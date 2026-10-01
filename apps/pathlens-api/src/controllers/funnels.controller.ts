import { Response } from "express";
import { z, ZodError } from "zod";
import type { AuthRequest } from "../lib/jwt";
import {
  createFunnelModel,
  deleteFunnelModel,
  getFunnelsModel,
  updateFunnelModel,
  type FunnelRange,
} from "../models/funnels.model";
import { WorkspaceUsageLimitError } from "../lib/usage-limits";
import { createAuditLog } from "../models/audit-logs.model";

const funnelStepSchema = z.object({
  name: z.string().trim().min(1).max(100),
  target: z.string().trim().min(1).max(255),
});

const funnelPayloadSchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).nullable().optional(),
  steps: z.array(funnelStepSchema).min(2).max(10),
});

const funnelsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
});

const funnelParamsSchema = z.object({
  funnel_id: z.string().min(1),
});

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

export async function getFunnels(req: AuthRequest, res: Response) {
  try {
    const query = funnelsQuerySchema.parse(req.query);
    const funnels = await getFunnelsModel(
      query.workspace_id,
      query.project_id,
      query.range as FunnelRange
    );

    return res.status(200).json({
      success: true,
      data: funnels,
    });
  } catch (error) {
    console.error(error);

    return res
      .status(
        error instanceof WorkspaceUsageLimitError
          ? 409
          : error instanceof ZodError
            ? 400
            : 500
      )
      .json({
        success: false,
        message: getErrorMessage(error, "Unable to load funnels."),
      });
  }
}

export async function createFunnel(req: AuthRequest, res: Response) {
  try {
    const payload = funnelPayloadSchema.parse(req.body);
    const id = await createFunnelModel({
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      name: payload.name,
      description: payload.description ?? null,
      steps: payload.steps,
    });

    if (req.user?.id) {
      await createAuditLog({
        workspaceId: payload.workspace_id,
        actorUserId: req.user.id,
        action: "funnel.created",
        resourceType: "funnel",
        resourceId: id,
        metadata: {
          projectId: payload.project_id,
          name: payload.name,
          description: payload.description,
          steps: payload.steps,
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error(error);

    return res
      .status(
        error instanceof WorkspaceUsageLimitError
          ? 409
          : error instanceof ZodError
            ? 400
            : 500
      )
      .json({
        success: false,
        message: getErrorMessage(error, "Unable to create funnel."),
      });
  }
}

export async function updateFunnel(req: AuthRequest, res: Response) {
  try {
    const params = funnelParamsSchema.parse(req.params);
    const payload = funnelPayloadSchema.parse(req.body);
    const updated = await updateFunnelModel({
      id: params.funnel_id,
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      name: payload.name,
      description: payload.description ?? null,
      steps: payload.steps,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Funnel not found.",
      });
    }

    if (req.user?.id) {
      await createAuditLog({
        workspaceId: payload.workspace_id,
        actorUserId: req.user.id,
        action: "funnel.updated",
        resourceType: "funnel",
        resourceId: params.funnel_id,
        metadata: {
          projectId: payload.project_id,
          name: payload.name,
          description: payload.description,
          steps: payload.steps,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Funnel updated.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error, "Unable to update funnel."),
    });
  }
}

export async function deleteFunnel(req: AuthRequest, res: Response) {
  try {
    const params = funnelParamsSchema.parse(req.params);
    const query = z
      .object({
        workspace_id: z.string().min(1),
        project_id: z.string().min(1),
      })
      .parse(req.query);
    const deleted = await deleteFunnelModel({
      id: params.funnel_id,
      workspaceId: query.workspace_id,
      projectId: query.project_id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Funnel not found.",
      });
    }

    if (req.user?.id) {
      await createAuditLog({
        workspaceId: query.workspace_id,
        actorUserId: req.user.id,
        action: "funnel.deleted",
        resourceType: "funnel",
        resourceId: params.funnel_id,
        metadata: {
          projectId: deleted.projectId,
          name: deleted.name,
          description: deleted.description,
          steps: deleted.steps,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Funnel deleted.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error, "Unable to delete funnel."),
    });
  }
}
