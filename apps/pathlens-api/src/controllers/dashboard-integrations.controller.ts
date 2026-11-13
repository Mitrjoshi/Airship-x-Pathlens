import type { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import { getProjectDashboardIntegrationsModel } from "../models/dashboard-integrations.model";

const paramsSchema = z.object({
  project_id: z.uuid(),
});

const querySchema = z.object({
  workspace_id: z.uuid(),
});

export async function getDashboardIntegrations(
  req: AuthRequest,
  res: Response
) {
  try {
    const { project_id: projectId } = paramsSchema.parse(req.params);
    const { workspace_id: workspaceId } = querySchema.parse(req.query);
    const integrations = await getProjectDashboardIntegrationsModel(
      workspaceId,
      projectId
    );

    return res.status(200).json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message:
          error.issues[0]?.message ?? "Invalid dashboard integration request.",
      });
    }

    console.error("Unable to load dashboard integrations", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load dashboard integrations.",
    });
  }
}
