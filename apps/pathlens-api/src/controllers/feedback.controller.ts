import type { Response } from "express";
import { createFeedbackSchema } from "@workspace/contracts";
import { ZodError } from "zod";

import {
  createFeedbackModel,
  hasFeedbackModel,
} from "../models/feedback.model";
import type { AuthRequest } from "../lib/jwt";

function getAuthenticatedUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function getFeedbackStatus(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const submitted = await hasFeedbackModel(userId);

  return res.json({
    success: true,
    data: { submitted },
  });
}

export async function createFeedback(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const payload = createFeedbackSchema.parse(req.body);

    const entry = await createFeedbackModel({
      userId,
      message: payload.message,
      pageUrl: payload.page_url,
    });

    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted feedback.",
      });
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}
