import assert from "node:assert/strict";
import { mock, test } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sessionId = "11111111-1111-4111-8111-111111111111";
const otherSessionId = "22222222-2222-4222-8222-222222222222";
const workspaceId = "33333333-3333-4333-8333-333333333333";
const otherWorkspaceId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const otherUserId = "66666666-6666-4666-8666-666666666666";
const heatmapId = "77777777-7777-4777-8777-777777777777";

let currentUserId = userId;
let revokedSessionId: string | null = null;
let supersededSessionId: string | null = null;
const revokedSessions = new Set<string>();
const supersededSessions = new Set<string>();

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;
const modelUrl = sourcePath("models/preview-sessions.model.ts");
const workshopUrl = sourcePath("models/workshop.model.ts");
const authUrl = sourcePath("middleware/auth.middleware.ts");

mock.module(modelUrl, {
  namedExports: {
    createPreviewSessionModel: async () => ({
      handle: "a".repeat(64),
      claims: {
        sessionId,
        workspaceId,
        projectId: "88888888-8888-4888-8888-888888888888",
        projectDomainId: "99999999-9999-4999-8999-999999999999",
        userId,
        canonicalHostname: "example.com",
        allowedHostnames: ["example.com", "www.example.com"],
        pathname: "/",
        device: "desktop",
        previewIntent: "heatmap",
        createdAt: new Date(0).toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        revokedAt: null,
      },
    }),
    getPreviewSessionAuthorizationModel: async (id: string) => {
      if (id === otherSessionId) {
        return {
          sessionId: id,
          workspaceId: otherWorkspaceId,
          projectId: "77777777-7777-4777-8777-777777777777",
          projectWorkspaceId: otherWorkspaceId,
          userId: otherUserId,
        };
      }

      if (id !== sessionId) return null;

      return {
        sessionId: id,
        workspaceId,
        projectId: "88888888-8888-4888-8888-888888888888",
        projectWorkspaceId: workspaceId,
        userId,
      };
    },
    revokePreviewSessionModel: async ({ sessionId: id, userId: idUser }) => {
      if (
        idUser !== userId ||
        id !== sessionId ||
        revokedSessions.has(id) ||
        supersededSessions.has(id)
      ) {
        return false;
      }
      revokedSessionId = id;
      revokedSessions.add(id);
      return true;
    },
    supersedePreviewSessionModel: async ({ sessionId: id, userId: idUser }) => {
      if (
        idUser !== userId ||
        id !== sessionId ||
        revokedSessions.has(id) ||
        supersededSessions.has(id)
      ) {
        return false;
      }
      supersededSessionId = id;
      supersededSessions.add(id);
      return true;
    },
    validatePreviewSessionModel: async () => null,
  },
});

mock.module(workshopUrl, {
  namedExports: {
    getWorkspaceAccessModel: async (id: string, idUser: string) =>
      id === workspaceId && idUser === userId
        ? { workspaceId: id, userId: idUser, permissions: [] }
        : null,
    hasWorkspacePermission: () => true,
  },
});

mock.module(sourcePath("models/projects.model.ts"), {
  namedExports: {
    getProjectWorkspaceIdModel: async (id: string) =>
      id === "88888888-8888-4888-8888-888888888888" ? workspaceId : null,
  },
});

mock.module(authUrl, {
  namedExports: {
    authMiddleware: (
      req: { user?: { id: string } },
      _res: unknown,
      next: () => void
    ) => {
      req.user = { id: currentUserId };
      next();
    },
  },
});

let previewSessionsRouter: typeof import("./preview-sessions.route").default;

async function getPreviewSessionsRouter() {
  previewSessionsRouter ??= (await import("./preview-sessions.route")).default;
  return previewSessionsRouter;
}

async function request(method: "DELETE" | "POST", path: string, body: unknown) {
  const app = express();
  app.use(express.json());
  app.use("/heatmaps/preview-sessions", await getPreviewSessionsRouter());
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    return await fetch(
      `http://127.0.0.1:${address.port}/heatmaps/preview-sessions${path}`,
      {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      }
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test("revokes an authorized session through the route middleware", async () => {
  currentUserId = userId;
  revokedSessionId = null;
  revokedSessions.clear();
  supersededSessions.clear();

  const response = await request("DELETE", "", { session_id: sessionId });

  assert.equal(response.status, 200);
  assert.equal(revokedSessionId, sessionId);

  const repeated = await request("DELETE", "", { session_id: sessionId });
  assert.deepEqual(await repeated.json(), {
    success: true,
    data: { session_id: sessionId, revoked: false },
  });
});

test("rejects malformed and unknown session IDs without querying permissions", async () => {
  const malformed = await request("DELETE", "", { session_id: "not-a-uuid" });
  const unknown = await request("DELETE", "", {
    session_id: "99999999-9999-4999-8999-999999999999",
  });

  assert.equal(malformed.status, 400);
  assert.equal(unknown.status, 403);
});

test("rejects a session from another workspace or user", async () => {
  currentUserId = userId;
  const crossWorkspace = await request("DELETE", "", {
    session_id: otherSessionId,
  });

  currentUserId = otherUserId;
  const unauthorizedUser = await request("DELETE", "", {
    session_id: sessionId,
  });

  assert.equal(crossWorkspace.status, 403);
  assert.equal(unauthorizedUser.status, 403);
});

test("supersedes an authorized session through the same session-aware path", async () => {
  currentUserId = userId;
  supersededSessionId = null;
  revokedSessions.clear();
  supersededSessions.clear();

  const response = await request("POST", "/supersede", {
    session_id: sessionId,
  });

  assert.equal(response.status, 200);
  assert.equal(supersededSessionId, sessionId);
});

test("authorizes preview creation from the persisted project workspace", async () => {
  currentUserId = userId;

  const response = await request("POST", "", {
    workspace_id: workspaceId,
    project_id: "88888888-8888-4888-8888-888888888888",
    heatmap_id: heatmapId,
    device: "desktop",
  });

  assert.equal(response.status, 201);
});

test("rejects preview creation when workspace and project do not match", async () => {
  currentUserId = userId;

  const response = await request("POST", "", {
    workspace_id: otherWorkspaceId,
    project_id: "88888888-8888-4888-8888-888888888888",
    heatmap_id: heatmapId,
    device: "desktop",
  });

  assert.equal(response.status, 403);
});
