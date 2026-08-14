import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { getAnalyticsModel } from "../models/analytics.model";
import { getRetentionModel } from "../models/retention.model";

const analyticsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1).optional(),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
});

const retentionQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["30d", "90d"]).default("30d"),
  interval: z.enum(["day", "week"]).default("week"),
  periods: z.coerce.number().int().min(4).max(12).default(8),
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

export async function getRetention(req: Request, res: Response) {
  try {
    const query = retentionQuerySchema.parse(req.query);
    const retention = await getRetentionModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range,
      interval: query.interval,
      periods: query.periods,
      device: query.device,
    });

    return res.status(200).json({
      success: true,
      data: retention,
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? (error.issues[0]?.message ?? "Invalid retention filters.")
          : "Unable to load retention.",
    });
  }
}
