import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getCampaignsModel,
  type CampaignDevice,
  type CampaignRange,
} from "../models/campaigns.model";

const campaignsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("30d"),
  device: z
    .enum(["all", "desktop", "mobile", "tablet", "unknown"])
    .default("all"),
  goal_id: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

export async function getCampaigns(req: Request, res: Response) {
  try {
    const query = campaignsQuerySchema.parse(req.query);
    const campaignData = await getCampaignsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as CampaignRange,
      device: query.device as CampaignDevice,
      goalId: query.goal_id,
      page: query.page,
      pageSize: query.page_size,
    });

    return res.status(200).json({
      success: true,
      data: campaignData,
    });
  } catch (error) {
    console.error(error);

    const status = error instanceof ZodError ? 400 : 500;

    return res.status(status).json({
      success: false,
      message:
        error instanceof ZodError
          ? (error.issues[0]?.message ?? "Invalid campaign filters.")
          : "Unable to load campaign analytics.",
    });
  }
}
