import type { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  getPageSpeedDashboardData,
  PageSpeedDashboardError,
} from "../services/page-speed-dashboard.service";

const paramsSchema = z.object({
  project_id: z.uuid(),
});

const querySchema = z.object({
  workspace_id: z.uuid(),
  domain: z.string().trim().min(1),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
});

export async function getPageSpeedDashboard(req: AuthRequest, res: Response) {
  try {
    const { project_id: projectId } = paramsSchema.parse(req.params);
    const query = querySchema.parse(req.query);
    const data = await getPageSpeedDashboardData({
      projectId,
      domain: query.domain,
      strategy: query.strategy,
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request.",
      });
    }
    if (error instanceof PageSpeedDashboardError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("PageSpeed dashboard request failed", error);
    return res.status(502).json({
      success: false,
      message: "Unable to load Google PageSpeed Insights data.",
    });
  }
}
