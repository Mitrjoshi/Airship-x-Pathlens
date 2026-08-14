import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getErrorsModel,
  type ErrorsDevice,
  type ErrorsRange,
} from "../models/errors.model";

const errorsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z
    .enum(["all", "desktop", "mobile", "tablet", "unknown"])
    .default("all"),
  browser: z.string().trim().max(100).optional(),
  url: z.string().trim().max(2048).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

export async function getErrors(req: Request, res: Response) {
  try {
    const query = errorsQuerySchema.parse(req.query);
    const errors = await getErrorsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as ErrorsRange,
      device: query.device as ErrorsDevice,
      browser: query.browser,
      url: query.url,
      search: query.search,
      page: query.page,
      pageSize: query.page_size,
    });

    return res.status(200).json({
      success: true,
      data: errors,
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? (error.issues[0]?.message ?? "Invalid error filters.")
          : "Unable to load errors.",
    });
  }
}
