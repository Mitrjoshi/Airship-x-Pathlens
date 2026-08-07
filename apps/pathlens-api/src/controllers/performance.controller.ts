import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { getPerformanceModel } from "../models/performance.model";

const performanceQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1).optional(),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
});

export async function getPerformance(req: Request, res: Response) {
  try {
    const query = performanceQuerySchema.parse(req.query);
    const performance = await getPerformanceModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range,
      device: query.device,
    });

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    console.error(error);

    let message = "Unable to load performance data.";

    if (error instanceof ZodError) {
      message = error.issues[0]?.message ?? "Invalid performance filters.";
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
