import type { NextFunction, Request, Response } from "express";
import { decryptTrackingPayload } from "../lib/encrypted-payload";
import {
  getScopeForEventType,
  resolveProjectApiKey,
  type ProjectApiKeyContext,
  type TrackingScope,
} from "../lib/project-api-keys";
import { isProjectOriginAllowed } from "../lib/project-domain";

export type TrackingRequest = Request & {
  projectApiKey?: ProjectApiKeyContext;
};

function getRecords(payload: unknown): Record<string, unknown>[] | null {
  const records = Array.isArray(payload) ? payload : [payload];

  for (const record of records) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      return null;
    }
  }

  return records as Record<string, unknown>[];
}

function injectProjectId(payload: unknown, projectId: string): unknown {
  const records = getRecords(payload);

  if (!records) return null;

  const projectRecords = records.map((record) => ({
    ...record,
    projectId,
  }));

  return Array.isArray(payload) ? projectRecords : projectRecords[0];
}

export function decryptEncryptedTrackingPayload(
  req: TrackingRequest,
  res: Response,
  next: NextFunction,
  requiredScope: TrackingScope = "events"
): void {
  const apiKey = req.header("x-project-key");

  if (!apiKey) {
    res.status(401).json({
      success: false,
      message: "X-Project-Key is required.",
    });
    return;
  }

  void resolveProjectApiKey(apiKey)
    .then((projectApiKey) => {
      if (!projectApiKey) {
        res.status(401).json({
          success: false,
          message: "Invalid or expired project API key.",
        });
        return;
      }

      if (
        !isProjectOriginAllowed(
          projectApiKey.domain,
          req.header("origin"),
          req.header("referer")
        )
      ) {
        res.status(403).json({
          success: false,
          message: "This API key is not authorized for this domain.",
        });
        return;
      }

      req.projectApiKey = projectApiKey;

      try {
        const payload = decryptTrackingPayload(req.body, apiKey);
        const records = getRecords(payload);

        if (!records) {
          res.status(400).json({
            success: false,
            message: "Invalid encrypted tracking payload.",
          });
          return;
        }

        const scopes = records.map((record) => {
          if (
            requiredScope === "replay" ||
            !record ||
            typeof record !== "object"
          ) {
            return requiredScope;
          }

          return getScopeForEventType(
            String((record as { type?: unknown }).type ?? "")
          );
        });

        if (scopes.some((scope) => !projectApiKey.scopes.includes(scope))) {
          res.status(403).json({
            success: false,
            message: "This API key is not allowed to track this data.",
          });
          return;
        }

        req.body = injectProjectId(payload, projectApiKey.projectId);
        next();
      } catch {
        res.status(400).json({
          success: false,
          message: "Invalid encrypted tracking payload.",
        });
      }
    })
    .catch(() => {
      res.status(500).json({
        success: false,
        message: "Unable to validate project API key.",
      });
    });
}
