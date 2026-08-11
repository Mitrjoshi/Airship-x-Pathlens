import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { getHeatmapsModel } from "../models/heatmaps.model";

const heatmapsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  page_path: z.string().trim().max(2048).optional(),
});

export async function getHeatmaps(req: Request, res: Response) {
  try {
    const query = heatmapsQuerySchema.parse(req.query);
    const heatmaps = await getHeatmapsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range,
      pagePath: query.page_path,
    });

    return res.status(200).json({
      success: true,
      data: heatmaps,
    });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Invalid heatmap filters.")
        : "Unable to load heatmaps.";

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
