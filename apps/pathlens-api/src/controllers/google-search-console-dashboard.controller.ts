import type { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  DashboardSearchConsoleError,
  getGoogleSearchConsoleDashboardData,
} from "../services/google-search-console-dashboard.service";

const paramsSchema = z.object({
  project_id: z.uuid(),
});

const querySchema = z.object({
  workspace_id: z.uuid(),
  domain: z.string().trim().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
});

export async function getGoogleSearchConsoleDashboard(
  req: AuthRequest,
  res: Response
) {
  try {
    const { project_id: projectId } = paramsSchema.parse(req.params);
    const query = querySchema.parse(req.query);
    const data = await getGoogleSearchConsoleDashboardData({
      projectId,
      domain: query.domain,
      range: query.range,
    });

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request.",
      });
    }

    if (error instanceof DashboardSearchConsoleError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Google Search Console dashboard request failed", error);
    return res.status(502).json({
      success: false,
      message: "Unable to load Google Search Console data.",
    });
  }
}
