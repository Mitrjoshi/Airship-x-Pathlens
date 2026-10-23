import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizePreviewResource,
  createPreviewSessionHandle,
  createProxyAuthSignature,
  getAllowedPreviewHostnames,
  verifyProxyAuthSignature,
  resolveHeatmapPreviewDevice,
} from "./preview-session";
import { createPreviewSessionRequestSchema } from "@workspace/contracts";

const claims = {
  sessionId: "00000000-0000-4000-8000-000000000001",
  workspaceId: "00000000-0000-4000-8000-000000000002",
  projectId: "00000000-0000-4000-8000-000000000003",
  projectDomainId: "00000000-0000-4000-8000-000000000004",
  userId: "00000000-0000-4000-8000-000000000005",
  canonicalHostname: "example.com",
  allowedHostnames: ["example.com", "www.example.com"],
  pathname: "/contact",
  device: "desktop" as const,
  createdAt: "2026-10-22T10:00:00.000Z",
  expiresAt: "2026-10-22T10:10:00.000Z",
  revokedAt: null,
  previewIntent: "compatibility" as const,
};

test("preview handles are opaque and resource authorization is domain-bound", () => {
  const handle = createPreviewSessionHandle();
  assert.ok(handle.length >= 32);

  assert.deepEqual(getAllowedPreviewHostnames("https://www.example.com"), {
    canonicalHostname: "example.com",
    allowedHostnames: ["example.com", "www.example.com"],
  });

  assert.equal(
    authorizePreviewResource(claims, "https://example.com/app.js", "GET")
      .allowed,
    true
  );
  assert.equal(
    authorizePreviewResource(claims, "https://anotherbrand.com/app.js", "GET")
      .allowed,
    false
  );
  assert.equal(
    authorizePreviewResource(claims, "https://example.com:8443/app.js", "GET")
      .allowed,
    false
  );
  assert.equal(
    authorizePreviewResource(claims, "https://example.com/app.js", "POST")
      .allowed,
    false
  );
});

test("proxy authorization signatures expire and reject tampering", () => {
  const timestamp = "1792663200";
  const handle = "a".repeat(32);
  const secret = "test-secret";
  const signature = createProxyAuthSignature(timestamp, handle, secret);
  const now = Number(timestamp) * 1000;

  assert.equal(
    verifyProxyAuthSignature(timestamp, handle, signature, secret, now),
    true
  );
  assert.equal(
    verifyProxyAuthSignature(timestamp, `${handle}x`, signature, secret, now),
    false
  );
  assert.equal(
    verifyProxyAuthSignature(
      timestamp,
      handle,
      signature,
      secret,
      now + 301_000
    ),
    false
  );
});

test("heatmap preview requests use the persisted ID and supported device filters", () => {
  const base = {
    workspace_id: "00000000-0000-4000-8000-000000000002",
    project_id: "00000000-0000-4000-8000-000000000003",
    heatmap_id: "00000000-0000-4000-8000-000000000004",
  };

  for (const device of [
    "all",
    "desktop",
    "mobile",
    "tablet",
    "unknown",
  ] as const) {
    assert.equal(
      createPreviewSessionRequestSchema.safeParse({ ...base, device }).success,
      true
    );
  }

  assert.equal(resolveHeatmapPreviewDevice("all"), "desktop");
  assert.equal(resolveHeatmapPreviewDevice("unknown"), "desktop");
  assert.equal(resolveHeatmapPreviewDevice("mobile"), "mobile");
  assert.equal(resolveHeatmapPreviewDevice("tablet"), "tablet");
  assert.equal(
    createPreviewSessionRequestSchema.safeParse({
      ...base,
      device: "desktop",
      domain_id: "00000000-0000-4000-8000-000000000005",
      page_path: "/work",
      preview_intent: "heatmap",
    }).success,
    false
  );
});
