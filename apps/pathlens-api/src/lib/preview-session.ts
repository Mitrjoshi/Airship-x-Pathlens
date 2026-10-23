import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type {
  HeatmapDevice,
  PreviewDevice,
  PreviewSessionClaims,
} from "@workspace/contracts";
import { normalizeProjectHostname } from "./project-domain";

export const PREVIEW_SESSION_TTL_MS = 10 * 60 * 1000;
export const PROXY_AUTH_MAX_CLOCK_SKEW_SECONDS = 300;

export function resolveHeatmapPreviewDevice(
  device: HeatmapDevice
): PreviewDevice {
  return device === "mobile"
    ? "mobile"
    : device === "tablet"
      ? "tablet"
      : "desktop";
}

export function createPreviewSessionHandle(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPreviewSessionHandle(handle: string): string {
  return createHash("sha256").update(handle).digest("hex");
}

export function getAllowedPreviewHostnames(domain: string): {
  canonicalHostname: string;
  allowedHostnames: string[];
} {
  const canonicalHostname = normalizeProjectHostname(domain);

  if (!canonicalHostname) {
    throw new Error("The project domain has an invalid hostname.");
  }

  return {
    canonicalHostname,
    // This follows the existing project-domain www/non-www equivalence.
    allowedHostnames: [canonicalHostname, `www.${canonicalHostname}`],
  };
}

export function createProxyAuthSignature(
  timestamp: string,
  handle: string,
  secret: string
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}\n${handle}`)
    .digest("hex");
}

export function verifyProxyAuthSignature(
  timestamp: string,
  handle: string,
  signature: string,
  secret: string,
  now = Date.now()
): boolean {
  const timestampNumber = Number(timestamp);

  if (!Number.isSafeInteger(timestampNumber)) return false;

  if (
    Math.abs(Math.floor(now / 1000) - timestampNumber) >
    PROXY_AUTH_MAX_CLOCK_SKEW_SECONDS
  ) {
    return false;
  }

  const expected = createProxyAuthSignature(timestamp, handle, secret);
  const received = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return (
    received.length === expectedBuffer.length &&
    timingSafeEqual(received, expectedBuffer)
  );
}

export function authorizePreviewResource(
  session: PreviewSessionClaims,
  rawUrl: string,
  method: string
): { allowed: boolean; reason: string | null; canonicalHostname: string } {
  const canonicalHostname = session.canonicalHostname;

  if (method !== "GET" && method !== "HEAD") {
    return {
      allowed: false,
      reason: "Only GET and HEAD resources are allowed.",
      canonicalHostname,
    };
  }

  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return {
      allowed: false,
      reason: "The resource URL is invalid.",
      canonicalHostname,
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      allowed: false,
      reason: "Only HTTP and HTTPS resources are allowed.",
      canonicalHostname,
    };
  }

  if (url.username || url.password) {
    return {
      allowed: false,
      reason: "Resource credentials are not allowed.",
      canonicalHostname,
    };
  }

  if (url.port) {
    return {
      allowed: false,
      reason: "Explicit resource ports are not allowed.",
      canonicalHostname,
    };
  }

  const resourceHostname = normalizeProjectHostname(url.hostname);
  const allowed = resourceHostname
    ? session.allowedHostnames.some(
        (hostname) => normalizeProjectHostname(hostname) === resourceHostname
      )
    : false;

  return {
    allowed,
    reason: allowed ? null : "The resource host is outside the preview domain.",
    canonicalHostname,
  };
}
