import { Request, Response } from "express";
import type { HeatmapDevice } from "@workspace/contracts/heatmaps";
import { z, ZodError } from "zod";
import {
  getHeatmapDetailsModel,
  getHeatmapPageSnapshot,
  getHeatmapsListModel,
  type HeatmapsRange,
} from "../models/heatmaps.model";
import { normalizeProjectHostname } from "../lib/project-domain";
import { createSnapshotSignedUrl } from "../lib/s3";

const heatmapsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
  page_path: z.string().trim().max(2048).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
  domain: z.string().trim().max(2048).optional(),
});

const heatmapDetailsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
  page_path: z.string().trim().min(1).max(2048),
  domain: z.string().trim().max(2048).optional(),
});

export async function getHeatmaps(req: Request, res: Response) {
  try {
    const query = heatmapsQuerySchema.parse(req.query);
    const heatmaps = await getHeatmapsListModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range,
      device: query.device as HeatmapDevice,
      pagePath: query.page_path,
      page: query.page,
      pageSize: query.page_size,
      domain: query.domain
        ? (normalizeProjectHostname(query.domain) ?? "")
        : undefined,
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

export async function getHeatmapDetails(req: Request, res: Response) {
  try {
    const query = heatmapDetailsQuerySchema.parse(req.query);
    const details = await getHeatmapDetailsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as HeatmapsRange,
      device: query.device as HeatmapDevice,
      pagePath: query.page_path,
      domain: query.domain
        ? (normalizeProjectHostname(query.domain) ?? "")
        : undefined,
    });
    const snapshot = await getHeatmapPageSnapshot({
      projectId: query.project_id,
      domain: query.domain
        ? (normalizeProjectHostname(query.domain) ?? "")
        : undefined,
      pagePath: query.page_path,
    });
    const screenshotUrl =
      snapshot?.storagePath && snapshot.status === "ready"
        ? await createSnapshotSignedUrl(snapshot.storagePath)
        : null;

    return res.status(200).json({
      success: true,
      data: details
        ? {
            ...details,
            screenshotUrl,
            screenshotStatus: snapshot?.status ?? "pending",
            screenshotCapturedAt: snapshot?.capturedAt ?? null,
            screenshotWidth: snapshot?.viewportWidth ?? null,
            screenshotHeight: snapshot?.viewportHeight ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error(error);

    const message =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Invalid heatmap detail filters.")
        : "Unable to load heatmap details.";

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
