import assert from "node:assert/strict";
import { mock, test } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const otherWorkspaceId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const otherProjectId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("models/projects.model.ts"), {
  namedExports: {
    getProjectWorkspaceIdModel: async (id: string) => {
      if (id === projectId) return workspaceId;
      if (id === otherProjectId) return otherWorkspaceId;
      return null;
    },
  },
});

mock.module(sourcePath("models/workshop.model.ts"), {
  namedExports: {
    getWorkspaceAccessModel: async (id: string, idUser: string) =>
      id === workspaceId && idUser === userId
        ? { workspaceId: id, userId: idUser, permissions: [] }
        : null,
    hasWorkspacePermission: () => true,
  },
});

mock.module(sourcePath("middleware/auth.middleware.ts"), {
  namedExports: {
    authMiddleware: (
      req: { user?: { id: string } },
      _res: unknown,
      next: () => void
    ) => {
      req.user = { id: userId };
      next();
    },
  },
});

mock.module(sourcePath("controllers/heatmaps.controller.ts"), {
  namedExports: {
    getHeatmaps: (
      _req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } }
    ) => res.status(200).json({ success: true, data: { pages: [] } }),
    getHeatmapDetails: (
      _req: unknown,
      res: { status: (code: number) => { json: (body: unknown) => void } }
    ) => res.status(200).json({ success: true, data: { selectedPage: null } }),
  },
});

let heatmapsRouter: typeof import("./heatmaps.route").default;

async function getHeatmapsRouter() {
  heatmapsRouter ??= (await import("./heatmaps.route")).default;
  return heatmapsRouter;
}

async function request(query: string) {
  const app = express();
  app.use("/heatmaps", await getHeatmapsRouter());
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    return await fetch(`http://127.0.0.1:${address.port}/heatmaps${query}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test("allows a heatmap request when workspace and project match", async () => {
  const response = await request(
    `/detail?workspace_id=${workspaceId}&project_id=${projectId}&page_path=/`
  );

  assert.equal(response.status, 200);
});

test("rejects a project from another workspace before the controller runs", async () => {
  const response = await request(
    `/detail?workspace_id=${workspaceId}&project_id=${otherProjectId}&page_path=/`
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "You do not have permission to perform this action.",
  });
});

test("rejects malformed and missing workspace/project identifiers", async () => {
  const malformed = await request(
    "/detail?workspace_id=invalid&project_id=" + projectId + "&page_path=/"
  );
  const missing = await request(
    `/detail?workspace_id=${workspaceId}&page_path=/`
  );

  assert.equal(malformed.status, 400);
  assert.equal(missing.status, 400);
});

test("does not grant access when the workspace itself is unauthorized", async () => {
  const response = await request(
    `/detail?workspace_id=${otherWorkspaceId}&project_id=${otherProjectId}&page_path=/`
  );

  assert.equal(response.status, 403);
});
