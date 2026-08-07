import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { getDashboardModel } from "../models/dashboard.model";

const getDashboardSchema = z.object({
  workspace_id: z.string({
    error: "Please enter a workspace id.",
  }),
  project_id: z.string().optional(),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
});

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const query = getDashboardSchema.parse(req.query);

    const dashboard = await getDashboardModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range,
      device: query.device,
    });

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
};
