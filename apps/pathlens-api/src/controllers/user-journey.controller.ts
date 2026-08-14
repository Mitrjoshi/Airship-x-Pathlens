import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getUserJourneyModel,
  type UserJourneyDevice,
  type UserJourneyRange,
} from "../models/user-journey.model";

const userJourneyQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
});

export async function getUserJourney(req: Request, res: Response) {
  try {
    const query = userJourneyQuerySchema.parse(req.query);
    const journey = await getUserJourneyModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as UserJourneyRange,
      device: query.device as UserJourneyDevice,
    });

    return res.status(200).json({
      success: true,
      data: journey,
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? error.issues[0]?.message ?? "Invalid journey filters."
          : "Unable to load user journey.",
    });
  }
}
