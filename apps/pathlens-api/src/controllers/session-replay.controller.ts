import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getSessionReplayDetailModel,
  getSessionReplayModel,
  type SessionReplayDevice,
  type SessionReplayRange,
} from "../models/session-replay.model";

const sessionReplayQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

export async function getSessionReplay(req: Request, res: Response) {
  try {
    const query = sessionReplayQuerySchema.parse(req.query);
    const sessionReplay = await getSessionReplayModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as SessionReplayRange,
      device: query.device as SessionReplayDevice,
      search: query.search,
      page: query.page,
      pageSize: query.page_size,
    });

    return res.status(200).json({
      success: true,
      data: sessionReplay,
    });
  } catch (error) {
    console.error(error);

    let message = "Unable to load session replays.";

    if (error instanceof ZodError) {
      message = error.issues[0]?.message ?? "Invalid session replay filters.";
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}

const sessionReplayDetailQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
});

export async function getSessionReplayDetail(req: Request, res: Response) {
  try {
    const query = sessionReplayDetailQuerySchema.parse(req.query);
    const sessionReplay = await getSessionReplayDetailModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      sessionId: z.string().min(1).max(255).parse(req.params.sessionId),
    });

    if (!sessionReplay) {
      return res.status(404).json({
        success: false,
        message: "Session replay not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: sessionReplay,
    });
  } catch (error) {
    console.error(error);

    let message = "Unable to load the session replay.";

    if (error instanceof ZodError) {
      message = error.issues[0]?.message ?? "Invalid session replay request.";
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
