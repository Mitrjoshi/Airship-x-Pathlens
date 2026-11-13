import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { before, mock, test } from "node:test";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

const dbUrl = sourcePath("db/client.ts");
const projectsModelUrl = sourcePath("models/projects.model.ts");
const usageModelUrl = sourcePath("models/usage.model.ts");

const projectA = "11111111-1111-4111-8111-111111111111";
const projectB = "22222222-2222-4222-8222-222222222222";
const workspaceA = "33333333-3333-4333-8333-333333333333";
const workspaceB = "44444444-4444-4444-8444-444444444444";

const persistedEventKeys = new Set<string>();
let persistedEventCount = 0;

const projects = new Map([
  [projectA, { id: projectA, workspace_id: workspaceA }],
  [projectB, { id: projectB, workspace_id: workspaceB }],
]);

mock.module(projectsModelUrl, {
  namedExports: {
    getProjectByIdModel: async (projectId: string) => {
      const project = projects.get(projectId);
      return project ? [project] : [];
    },
  },
});

mock.module(usageModelUrl, {
  namedExports: {
    assertWorkspaceUsageLimit: async () => undefined,
    assertWorkspaceHeatmapPages: async () => undefined,
  },
});

mock.module(dbUrl, {
  namedExports: {
    db: {
      transaction: async (callback: (transaction: unknown) => Promise<void>) => {
        await callback({
          insert: (table: unknown) => ({
            values: (values: Array<Record<string, unknown>>) => ({
              onConflictDoNothing: async () => {
                if (values[0]?.eventId !== undefined) {
                  for (const value of values) {
                    const key = `${String(value.projectId)}:${String(value.eventId)}`;
                    if (persistedEventKeys.has(key)) continue;
                    persistedEventKeys.add(key);
                    persistedEventCount += 1;
                  }
                }
              },
              onConflictDoUpdate: async () => undefined,
            }),
          }),
          update: () => ({
            set: () => ({ where: async () => undefined }),
          }),
        });
      },
    },
  },
});

let createEvents: typeof import("./events.model").createEvents;

before(async () => {
  ({ createEvents } = await import("./events.model"));
});

function event(projectId: string, eventId?: string) {
  return {
    ...(eventId ? { eventId } : {}),
    projectId,
    visitorId: "visitor-1",
    sessionId: "session-1",
    type: "page_view",
    timestamp: "2026-01-01T00:00:00.000Z",
    path: "/",
  };
}

test("repeated delivery after a lost response persists one event", async () => {
  const payload = event(projectA, "event-retry-1");

  await createEvents([payload]);
  await createEvents([payload]);

  assert.equal(persistedEventCount, 1);
});

test("concurrent duplicate deliveries are protected by the scoped key", async () => {
  const payload = event(projectA, "event-concurrent-1");

  await Promise.all([
    createEvents([payload]),
    createEvents([payload]),
    createEvents([payload]),
  ]);

  assert.equal(persistedEventCount, 2);
});

test("the same client event ID is valid in separate projects", async () => {
  await createEvents([event(projectA, "shared-event-id")]);
  await createEvents([event(projectB, "shared-event-id")]);

  assert.equal(persistedEventCount, 4);
});

test("legacy events without an ID remain insertable", async () => {
  await createEvents([event(projectA)]);
  await createEvents([event(projectA)]);

  assert.equal(persistedEventCount, 6);
});
