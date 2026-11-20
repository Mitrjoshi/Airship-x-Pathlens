import assert from "node:assert/strict";
import { join } from "node:path";
import { before, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Response } from "express";
import { Pool } from "pg";

import type { AuthRequest } from "../lib/jwt";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const pool = new Pool();
const queries: Array<{ text: string; params: unknown[] }> = [];

// Capture the real Drizzle SQL without connecting to PostgreSQL.
mock.method(
  pool,
  "query",
  async (query: { text: string }, params: unknown[]) => {
    queries.push({ text: query.text, params });
    return { rows: [] };
  }
);
mock.module(pathToFileURL(join(process.cwd(), "src/db/client.ts")).href, {
  namedExports: { db: drizzle(pool) },
});

let getProjects: typeof import("./projects.controller").getProjects;

before(async () => {
  ({ getProjects } = await import("./projects.controller"));
});

async function list(query: AuthRequest["query"] = {}) {
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

  const req: Pick<AuthRequest, "query"> = {
    query: { workspace_id: workspaceId, ...query },
  };
  await getProjects(req as AuthRequest, res as Response);
  return { status, body };
}

const emptyList = { status: 200, body: { success: true, data: [] } };

test("blank search preserves the unfiltered project list", async () => {
  assert.deepEqual(await list(), emptyList);
  assert.deepEqual(
    queries.map(({ params }) => params),
    [[workspaceId]]
  );
  const unfiltered = [...queries];

  assert.deepEqual(await list({ search: "  " }), emptyList);
  assert.deepEqual(queries, unfiltered);
});

test("project names use trimmed, case-insensitive literal search", async () => {
  assert.deepEqual(await list({ search: "  Report%_\\Q  " }), emptyList);
  assert.equal(queries.length, 1);
  assert.match(queries[0].text, /"projects"\."name" ilike \$2/);
  assert.deepEqual(queries[0].params, [workspaceId, "%Report\\%\\_\\\\Q%"]);
});

test("exact UUID search preserves the workspace scope and explicit project ID filter", async () => {
  const search = "ABCDEF12-3456-4789-ABCD-EF1234567890";
  assert.deepEqual(await list({ search, project_id: projectId }), emptyList);
  assert.equal(queries.length, 1);
  assert.match(
    queries[0].text,
    /where \("projects"\."workspace_id" = \$1 and "projects"\."id" = \$2 and \("projects"\."name" ilike \$3 or "projects"\."id" = \$4\)\)/
  );
  assert.deepEqual(queries[0].params, [
    workspaceId,
    projectId,
    `%${search}%`,
    search,
  ]);
});

test("a partial UUID is only matched against project names", async () => {
  const search = "ABCDEF12-3456";
  assert.deepEqual(await list({ search }), emptyList);
  assert.equal(queries.length, 1);
  assert.deepEqual(queries[0].params, [workspaceId, `%${search}%`]);
});

test("invalid search is rejected before querying the database", async (t) => {
  t.mock.method(console, "error", () => {});
  for (const search of [["one", "two"], "a".repeat(101)]) {
    assert.equal((await list({ search })).status, 400);
    assert.equal(queries.length, 0);
  }
});
