import assert from "node:assert/strict";
import { mock, test } from "node:test";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

let authenticated = true;
let shouldFail = false;

mock.module(sourcePath("middleware/auth.middleware.ts"), {
  namedExports: {
    authMiddleware: (
      req: { user?: { id: string } },
      res: { status: (status: number) => { json: (body: unknown) => void } },
      next: () => void
    ) => {
      if (!authenticated) {
        res.status(401).json({ success: false, message: "Unauthorized." });
        return;
      }

      req.user = { id: "user-id" };
      next();
    },
  },
});

mock.module(sourcePath("models/integrations.model.ts"), {
  namedExports: {
    getVisibleIntegrationsModel: async () => {
      if (shouldFail) throw new Error("database unavailable");

      return [
        {
          id: "integration-1",
          slug: "slack",
          name: "Slack",
          description: "Slack description",
          category: "Notifications",
          iconUrl: "https://example.com/slack.png",
          status: "available",
        },
      ];
    },
  },
});

let integrationsRouter: typeof import("./integrations.route").default;

async function getRouter() {
  integrationsRouter ??= (await import("./integrations.route")).default;
  return integrationsRouter;
}

async function request() {
  const app = express();
  app.use("/integrations", await getRouter());
  const server = createServer(app);

  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    return await fetch(`http://127.0.0.1:${address.port}/integrations`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test("returns the visible integration catalog", async () => {
  authenticated = true;
  shouldFail = false;

  const response = await request();

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: [
      {
        id: "integration-1",
        slug: "slack",
        name: "Slack",
        description: "Slack description",
        category: "Notifications",
        iconUrl: "https://example.com/slack.png",
        status: "available",
      },
    ],
  });
});

test("requires authentication", async () => {
  authenticated = false;

  const response = await request();

  assert.equal(response.status, 401);
});

test("returns a safe error when the catalog cannot be loaded", async () => {
  authenticated = true;
  shouldFail = true;

  const response = await request();

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Unable to load integrations.",
  });
});
