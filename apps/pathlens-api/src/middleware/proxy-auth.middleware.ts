import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { validatePreviewSessionRequestSchema } from "@workspace/contracts";
import {
  hashPreviewSessionHandle,
  verifyProxyAuthSignature,
} from "../lib/preview-session";

function requestId(req: Request): string {
  return req.header("x-pathlens-proxy-request-id") || randomUUID();
}

function logProxyAuth(
  category: "invalid_hmac" | "hmac_valid",
  req: Request,
  handle?: string
): void {
  console.info({
    event: "preview_proxy_authentication",
    category,
    request_id: requestId(req),
    ...(handle
      ? { handle_fingerprint: hashPreviewSessionHandle(handle).slice(0, 16) }
      : {}),
  });
}

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
    logProxyAuth(
      "invalid_hmac",
      req,
      parsed.success ? parsed.data.handle : undefined
    );
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
    logProxyAuth("invalid_hmac", req, parsed.data.handle);
    return res.status(401).json({
      success: false,
      error: {
        code: "SESSION_MISSING",
        message: "Proxy authorization is invalid.",
        retryable: false,
      },
    });
  }

  logProxyAuth("hmac_valid", req, parsed.data.handle);
  req.body = parsed.data;
  next();
}
