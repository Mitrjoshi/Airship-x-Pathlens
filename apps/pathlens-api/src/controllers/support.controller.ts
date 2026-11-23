import type { Response } from "express";
import {
  createSupportRequestSchema,
  supportUploadSchema,
} from "@workspace/contracts";
import { ZodError } from "zod";
import type { AuthRequest } from "../lib/jwt";
import {
  assertSupportAccess,
  createSupportRequestModel,
  createSupportUploadsModel,
} from "../models/support.model";
import { SupportError } from "../support/errors";

function respondError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: error.issues[0]?.message ?? "Invalid request.",
    });
  }
  if (error instanceof SupportError) {
    return res
      .status(error.statusCode)
      .json({ success: false, message: error.message });
  }
  console.error("Support request failed.", error);
  return res.status(500).json({
    success: false,
    message: "Unable to submit your request. Please try again.",
  });
}

export async function createSupportAttachments(
  req: AuthRequest,
  res: Response
) {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized." });
  try {
    const payload = supportUploadSchema.parse(req.body);
    await assertSupportAccess(req.user.id, payload);
    const uploads = await createSupportUploadsModel(req.user.id, payload);
    return res.status(201).json({ success: true, data: uploads });
  } catch (error) {
    return respondError(res, error);
  }
}

export async function createSupportRequest(req: AuthRequest, res: Response) {
  if (!req.user?.id)
    return res.status(401).json({ success: false, message: "Unauthorized." });
  try {
    const payload = createSupportRequestSchema.parse(req.body);
    await assertSupportAccess(req.user.id, payload);
    const request = await createSupportRequestModel(req.user.id, payload);
    return res.status(201).json({ success: true, data: request });
  } catch (error) {
    return respondError(res, error);
  }
}
