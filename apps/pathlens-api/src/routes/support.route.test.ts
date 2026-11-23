import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { before, beforeEach, mock, test } from "node:test";
import express from "express";
import { ApiKeyMiddleware } from "../middleware/apiKey.middleware";
import { SupportError } from "../support/errors";

const userId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const source = (path: string) =>
  pathToFileURL(join(process.cwd(), "src", path)).href;
let failure: Error | undefined;
let submitted: { userId: string; data: Record<string, unknown> } | undefined;
let accessChecks = 0;

mock.module(source("lib/jwt.ts"), {
  namedExports: {
    verifyJwt: (token: string) => {
      if (token !== "valid-session") throw new Error("Invalid token");
      return { id: userId };
    },
  },
});
mock.module(source("models/support.model.ts"), {
  namedExports: {
    assertSupportAccess: async () => {
      accessChecks++;
      if (failure) throw failure;
    },
    createSupportRequestModel: async (
      id: string,
      data: Record<string, unknown>
    ) => {
      submitted = { userId: id, data };
      return { id: workspaceId, createdAt: new Date(0) };
    },
    createSupportUploadsModel: async () => [
      {
        id: workspaceId,
        url: "https://private-support.s3.amazonaws.com",
        fields: { key: "server-key" },
      },
    ],
  },
});
let router: express.Router;
before(async () => {
  router = (await import("./support.route")).default;
});
beforeEach(() => {
  process.env.INTERNAL_API_SECRET = "test-api-key";
  failure = undefined;
  submitted = undefined;
  accessChecks = 0;
});

async function post(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
) {
  const app = express();
  app.use(express.json(), ApiKeyMiddleware);
  app.use("/api/support", router);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/support${path}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": "test-api-key",
          authorization: "Bearer valid-session",
          ...headers,
        },
        body: JSON.stringify(body),
      }
    );
    return { status: response.status, body: await response.json() };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

const request = {
  workspace_id: workspaceId,
  issue_id: "heatmaps",
  severity: "high",
  subject: "Heatmap broken",
  service: ["Analytics"],
  message: "Details",
};

test("both endpoints enforce API key and JWT middleware", async () => {
  for (const path of ["/requests", "/attachments"]) {
    assert.equal((await post(path, {}, { "x-api-key": "wrong" })).status, 401);
    assert.equal((await post(path, {}, { authorization: "" })).status, 401);
    assert.equal(
      (await post(path, {}, { authorization: "Bearer expired" })).status,
      401
    );
  }
  assert.equal(accessChecks, 0);
});

test("submission without files derives identity from the session", async () => {
  const result = await post("/requests", {
    ...request,
    user_id: workspaceId,
    email: "spoof@example.com",
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.success, true);
  assert.equal(submitted!.userId, userId);
  assert.equal(submitted!.data.user_id, undefined);
  assert.equal(submitted!.data.email, undefined);
  assert.deepEqual(submitted!.data.attachment_ids, []);
});

test("invalid form fields are rejected before authorization or persistence", async () => {
  const result = await post("/requests", {
    ...request,
    message: "x".repeat(5001),
  });
  assert.equal(result.status, 400);
  assert.equal(accessChecks, 0);
  assert.equal(submitted, undefined);
});

test("workspace/project denial prevents submission and upload grants", async () => {
  failure = new SupportError(403, "Workspace access denied.");
  assert.equal((await post("/requests", request)).status, 403);
  assert.equal(
    (
      await post("/attachments", {
        workspace_id: workspaceId,
        files: [{ name: "error.png", content_type: "image/png", size: 1234 }],
      })
    ).status,
    403
  );
  assert.equal(submitted, undefined);
});

test("upload endpoint returns grants only for validated optional files", async () => {
  const result = await post("/attachments", {
    workspace_id: workspaceId,
    files: [{ name: "error.png", content_type: "image/png", size: 1234 }],
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data[0].fields.key, "server-key");
  assert.equal(
    (await post("/attachments", { workspace_id: workspaceId, files: [] }))
      .status,
    400
  );
});

test("known configuration failures stay actionable and unknown failures do not leak details", async () => {
  failure = new SupportError(503, "Attachment storage is not configured.");
  assert.equal((await post("/requests", request)).status, 503);
  failure = new Error("database-password=secret");
  mock.method(console, "error", () => {});
  const result = await post("/requests", request);
  assert.equal(result.status, 500);
  assert.ok(!JSON.stringify(result.body).includes("database-password"));
});
