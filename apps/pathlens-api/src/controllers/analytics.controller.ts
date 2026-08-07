import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { getAnalyticsModel } from "../models/analytics.model";

const analyticsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1).optional(),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
});

export async function getAnalytics(req: Request, res: Response) {
  try {
    const query = analyticsQuerySchema.parse(req.query);
    const analytics = await getAnalyticsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range,
      device: query.device,
    });

    return res.status(200).json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error(error);

    let message = "Unable to load analytics.";

    if (error instanceof ZodError) {
      message = error.issues[0]?.message ?? "Invalid analytics filters.";
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
