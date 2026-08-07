import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getVisitorsModel,
  type VisitorStatus,
  type VisitorsRange,
} from "../models/visitors.model";

const visitorsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  status: z.enum(["all", "online", "offline"]).default("all"),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

export async function getVisitors(req: Request, res: Response) {
  try {
    const query = visitorsQuerySchema.parse(req.query);
    const visitors = await getVisitorsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as VisitorsRange,
      status: query.status as VisitorStatus,
      search: query.search,
      page: query.page,
      pageSize: query.page_size,
    });

    return res.status(200).json({
      success: true,
      data: visitors,
    });
  } catch (error) {
    console.error(error);

    let message = "Unable to load visitors.";

    if (error instanceof ZodError) {
      message = error.issues[0]?.message ?? "Invalid visitor filters.";
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
