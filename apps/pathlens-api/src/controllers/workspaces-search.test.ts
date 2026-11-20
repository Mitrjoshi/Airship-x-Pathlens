import assert from "node:assert/strict";
import { join } from "node:path";
import { before, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Response } from "express";
import { Pool } from "pg";

import type { AuthRequest } from "../lib/jwt";

const userId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const pool = new Pool();
const db = drizzle(pool);
const queries: Array<{ text: string; params: unknown[] }> = [];

// Use the real Drizzle query builder but do not connect to PostgreSQL.
mock.method(
  pool,
  "query",
  async (query: { text: string }, params: unknown[]) => {
    queries.push({ text: query.text, params });
    return { rows: [] };
  }
);
mock.module(pathToFileURL(join(process.cwd(), "src/db/client.ts")).href, {
  namedExports: { db },
});

let getUserWorkspacesController: typeof import("./workspace.controller").getUserWorkspacesController;
let getWorkspaceMembers: typeof import("./workspace.controller").getWorkspaceMembers;
let getWorkspaceMembersModel: typeof import("../models/workshop.model").getWorkspaceMembersModel;
let getPermissionProfiles: typeof import("./workspace.controller").getPermissionProfiles;
let getPermissionProfilesModel: typeof import("../models/workshop.model").getPermissionProfilesModel;

before(async () => {
  ({ getUserWorkspacesController, getWorkspaceMembers, getPermissionProfiles } =
    await import("./workspace.controller"));
  ({ getWorkspaceMembersModel, getPermissionProfilesModel } =
    await import("../models/workshop.model"));
});

async function list(
  query: AuthRequest["query"],
  authenticated = true,
  controller = getUserWorkspacesController
) {
  queries.length = 0;
  let status = 200;
  let body: unknown;
  const res = {
    status(value: number) {
      status = value;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };
  const req: Pick<AuthRequest, "params" | "query" | "user"> = {
    params: { workspace_id: workspaceId },
    query,
    user: authenticated
      ? { id: userId, email: "tester@example.com" }
      : undefined,
  };

  await controller(req as AuthRequest, res as Response);
  return { status, body };
}

const emptyList = { status: 200, body: { success: true, data: [] } };

test("omitted and blank search use the same unfiltered membership queries", async () => {
  assert.deepEqual(await list({}), emptyList);
  const unfiltered = [...queries];
  assert.equal(unfiltered.length, 2);
  for (const { text, params } of unfiltered) {
    assert.doesNotMatch(text, /\bilike\b/);
    assert.deepEqual(params, [userId]);
  }

  assert.deepEqual(await list({ search: "  " }), emptyList);
  assert.deepEqual(queries, unfiltered);
});

test("search uses a trimmed, case-insensitive literal pattern scoped to the caller", async () => {
  assert.deepEqual(await list({ search: "  RePort%_\\Q  " }), emptyList);
  assert.equal(queries.length, 2);
  for (const { text, params } of queries) {
    assert.match(
      text,
      /where \("workspace_members"\."user_id" = \$1 and "workspaces"\."name" ilike \$2\)/
    );
    assert.deepEqual(params, [userId, "%RePort\\%\\_\\\\Q%"]);
  }
  assert.match(
    queries[1].text,
    /order by "workspaces"\."is_default" desc, "workspaces"\."created_at" desc/
  );
});

test("a full workspace UUID adds an exact ID match under the membership filter", async () => {
  const workspaceId = "ABCDEF12-3456-4789-ABCD-EF1234567890";
  assert.deepEqual(await list({ search: ` ${workspaceId} ` }), emptyList);
  assert.equal(queries.length, 2);
  for (const { text, params } of queries) {
    assert.match(
      text,
      /where \("workspace_members"\."user_id" = \$1 and \("workspaces"\."name" ilike \$2 or "workspaces"\."id" = \$3\)\)/
    );
    assert.deepEqual(params, [userId, `%${workspaceId}%`, workspaceId]);
  }
});

test("a partial workspace UUID is only matched against names", async () => {
  const search = "ABCDEF12-3456";
  assert.deepEqual(await list({ search }), emptyList);
  assert.equal(queries.length, 2);
  for (const { params } of queries) {
    assert.deepEqual(params, [userId, `%${search}%`]);
  }
});

test("invalid search is rejected before querying the database", async () => {
  for (const search of [["one", "two"], "a".repeat(101)]) {
    assert.equal((await list({ search })).status, 400);
    assert.equal(queries.length, 0);
  }
});

test("an unauthenticated search is rejected before querying the database", async () => {
  assert.equal((await list({ search: "report" }, false)).status, 401);
  assert.equal(queries.length, 0);
});

test("member search is a literal, case-insensitive name or email match within the workspace", async () => {
  queries.length = 0;
  assert.deepEqual(await getWorkspaceMembersModel(workspaceId, "Te%_\\st"), []);
  assert.equal(queries.length, 1);
  assert.match(
    queries[0].text,
    /where \("workspace_members"\."workspace_id" = \$1 and \("users"\."name" ilike \$2 or "users"\."email" ilike \$3\)\)/
  );
  assert.deepEqual(queries[0].params, [
    workspaceId,
    "%Te\\%\\_\\\\st%",
    "%Te\\%\\_\\\\st%",
  ]);
});

test("omitted and empty member search keep the unfiltered query", async () => {
  queries.length = 0;
  await getWorkspaceMembersModel(workspaceId);
  await getWorkspaceMembersModel(workspaceId, "");
  assert.equal(queries.length, 2);
  assert.deepEqual(queries[0], queries[1]);
  assert.deepEqual(queries[0].params, [workspaceId]);
  assert.doesNotMatch(queries[0].text, /\bilike\b/);
});

test("member search requires workspace access before listing any members", async () => {
  const result = await list(
    { search: "example.com" },
    true,
    getWorkspaceMembers
  );
  assert.equal(result.status, 403);
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, [workspaceId, userId]);
});

test("invalid member search is rejected before querying the database", async () => {
  for (const search of [["one", "two"], "a".repeat(101)]) {
    assert.equal(
      (await list({ search }, true, getWorkspaceMembers)).status,
      400
    );
    assert.equal(queries.length, 0);
  }
});

test("permission profile search uses only the name, even for UUID-shaped terms", async (t) => {
  // Skip default-profile initialization; inspect the list query itself.
  t.mock.method(db, "transaction", async () => []);
  const profileId = "ABCDEF12-3456-4789-ABCD-EF1234567890";
  for (const [search, pattern] of [
    ["Te%_\\st", "%Te\\%\\_\\\\st%"],
    [profileId, `%${profileId}%`],
  ]) {
    queries.length = 0;
    assert.deepEqual(await getPermissionProfilesModel(workspaceId, search), []);
    assert.equal(queries.length, 1);
    assert.match(
      queries[0].text,
      /where \("permission_profiles"\."workspace_id" = \$1 and "permission_profiles"\."name" ilike \$2\)/
    );
    assert.deepEqual(queries[0].params, [workspaceId, pattern]);
  }
});

test("permission profile search preserves access checks and rejects invalid input", async () => {
  assert.equal(
    (await list({ search: "viewer" }, true, getPermissionProfiles)).status,
    403
  );
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, [workspaceId, userId]);

  assert.equal(
    (await list({ search: ["viewer", "admin"] }, true, getPermissionProfiles))
      .status,
    400
  );
  assert.equal(queries.length, 0);
});
