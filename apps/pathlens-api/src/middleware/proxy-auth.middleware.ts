import type { NextFunction, Request, Response } from "express";
import { validatePreviewSessionRequestSchema } from "@workspace/contracts";
import { verifyProxyAuthSignature } from "../lib/preview-session";

export function proxyAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const secret = process.env.HEATMAP_PROXY_SHARED_SECRET;
  const timestamp = req.header("x-pathlens-proxy-timestamp");
  const signature = req.header("x-pathlens-proxy-signature");
  const parsed = validatePreviewSessionRequestSchema.safeParse(req.body);

  if (!secret || !timestamp || !signature || !parsed.success) {
    return res.status(401).json({
      success: false,
      error: {
        code: "SESSION_MISSING",
        message: "Proxy authorization is invalid.",
        retryable: false,
      },
    });
  }

  if (
    !verifyProxyAuthSignature(timestamp, parsed.data.handle, signature, secret)
  ) {
    return res.status(401).json({
      success: false,
      error: {
        code: "SESSION_MISSING",
        message: "Proxy authorization is invalid.",
        retryable: false,
      },
    });
  }

  req.body = parsed.data;
  next();
}
