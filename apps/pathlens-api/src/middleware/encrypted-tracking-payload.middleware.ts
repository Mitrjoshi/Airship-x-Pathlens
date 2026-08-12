import type { NextFunction, Request, Response } from "express";
import { decryptTrackingPayload } from "../lib/encrypted-payload";

function getProjectIds(payload: unknown): string[] | null {
  const records = Array.isArray(payload) ? payload : [payload];
  const projectIds: string[] = [];

  for (const record of records) {
    if (!record || typeof record !== "object") return null;

    const projectId = (record as { projectId?: unknown }).projectId;

    if (typeof projectId !== "string" || projectId.length === 0) {
      return null;
    }

    projectIds.push(projectId);
  }

  return projectIds;
}

export function decryptEncryptedTrackingPayload(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const projectKey = req.header("x-project-key");

  if (!projectKey) {
    res.status(401).json({
      success: false,
      message: "X-Project-Key is required.",
    });
    return;
  }

  try {
    const payload = decryptTrackingPayload(req.body, projectKey);
    const projectIds = getProjectIds(payload);

    if (!projectIds) {
      res.status(400).json({
        success: false,
        message: "Invalid encrypted tracking payload.",
      });
      return;
    }

    if (projectIds.some((projectId) => projectId !== projectKey)) {
      res.status(401).json({
        success: false,
        message: "Invalid project API key.",
      });
      return;
    }

    req.body = payload;
    next();
  } catch {
    res.status(400).json({
      success: false,
      message: "Invalid encrypted tracking payload.",
    });
  }
}
