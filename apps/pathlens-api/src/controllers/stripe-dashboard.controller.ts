import type { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  getStripeDashboardData,
  StripeDashboardError,
} from "../services/stripe-dashboard.service";

const paramsSchema = z.object({ project_id: z.uuid() });
const querySchema = z.object({
  workspace_id: z.uuid(),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("30d"),
});

const rangeDays = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 } as const;

export async function getStripeDashboard(req: AuthRequest, res: Response) {
  try {
    const { project_id: projectId } = paramsSchema.parse(req.params);
    const query = querySchema.parse(req.query);
    const data = await getStripeDashboardData({
      workspaceId: query.workspace_id,
      projectId,
      days: rangeDays[query.range],
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request.",
      });
    }
    if (error instanceof StripeDashboardError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Stripe dashboard request failed", error);
    return res.status(502).json({
      success: false,
      message: "Unable to retrieve Stripe analytics.",
    });
  }
}
