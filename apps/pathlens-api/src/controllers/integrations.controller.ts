import type { Response } from "express";

import type { AuthRequest } from "../lib/jwt";
import { getVisibleIntegrationsModel } from "../models/integrations.model";

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
