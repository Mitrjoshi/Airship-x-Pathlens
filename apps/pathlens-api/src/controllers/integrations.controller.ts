import type { Response } from "express";
import { z } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  getVisibleIntegrationByIdModel,
  getVisibleIntegrationCategoriesModel,
  getVisibleIntegrationsModel,
} from "../models/integrations.model";

const integrationFiltersSchema = z.object({
  category: z.string().min(1).optional(),
  filter: z.enum(["all", "installed"]).default("all"),
  project_id: z.string().min(1).optional(),
});

export async function getIntegrationsController(
  req: AuthRequest,
  res: Response
) {
  try {
    const filters = integrationFiltersSchema.parse(req.query);

    if (filters.filter === "installed" && !filters.project_id) {
      return res.status(400).json({
        success: false,
        message: "project_id is required when filter is installed.",
      });
    }

    const integrations = await getVisibleIntegrationsModel({
      category: filters.category,
      filter: filters.filter,
      projectId: filters.project_id,
    });

    return res.status(200).json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid integration filters.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to load integrations.",
    });
  }
}

export async function getIntegrationCategoriesController(
  _req: AuthRequest,
  res: Response
) {
  try {
    const categories = await getVisibleIntegrationCategoriesModel();

    return res.status(200).json({
      success: true,
      data: categories,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: "Unable to load integration categories.",
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
