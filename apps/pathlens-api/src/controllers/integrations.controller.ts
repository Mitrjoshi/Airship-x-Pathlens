import type { Response } from "express";

import type { AuthRequest } from "../lib/jwt";
import {
  getVisibleIntegrationByIdModel,
  getVisibleIntegrationsModel,
} from "../models/integrations.model";

export async function getIntegrationsController(
  _req: AuthRequest,
  res: Response
) {
  try {
    const integrations = await getVisibleIntegrationsModel();

    return res.status(200).json({
      success: true,
      data: integrations,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to load integrations.",
    });
  }
}

export async function getIntegrationByIdController(
  req: AuthRequest,
  res: Response
) {
  try {
    const integrationId = req.params.integrationId;

    if (typeof integrationId !== "string") {
      return res.status(404).json({
        success: false,
        message: "Integration not found.",
      });
    }

    const projectId =
      typeof req.query.project_id === "string"
        ? req.query.project_id
        : undefined;

    const integration = await getVisibleIntegrationByIdModel(
      integrationId,
      projectId
    );

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: "Integration not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: integration,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to load integration.",
    });
  }
}
