import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { before, beforeEach, mock, test } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  createSupportRequestSchema,
  supportUploadSchema,
  SUPPORT_MAX_FILE_SIZE,
} from "@workspace/contracts";
import type { supportAttachments } from "../db/schema";

const userId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const attachmentId = "44444444-4444-4444-8444-444444444444";
const requestId = "55555555-5555-4555-8555-555555555555";
const otherId = "66666666-6666-4666-8666-666666666666";
const source = (path: string) =>
  pathToFileURL(join(process.cwd(), "src", path)).href;
type Attachment = typeof supportAttachments.$inferSelect;
let attachments: Attachment[] = [];
let member = true;
let project = true;
let storageFailure = false;
let finalized: Array<{ id: string; key: string }> = [];
let granted: Record<string, unknown>[] = [];
let queries: Array<{ text: string; params: unknown[] }> = [];
let pending = 0;
let committed = 0;
let beforeTransaction: Attachment[];

async function query(
  config: string | { text: string },
  params: unknown[] = []
) {
  const text = typeof config === "string" ? config : config.text;
  queries.push({ text, params });
  if (text === "begin") {
    beforeTransaction = attachments.map((file) => ({ ...file }));
    pending = 0;
  }
  if (text === "commit") committed += pending;
  if (text === "rollback") {
    attachments = beforeTransaction;
    pending = 0;
  }
  let rows: unknown[][] = [];
  if (text.startsWith("select") && text.includes('from "workspace_members"')) {
    rows = member ? [[userId]] : [];
  } else if (text.startsWith("select") && text.includes('from "projects"')) {
    rows = project ? [[projectId]] : [];
  } else if (
    text.startsWith("select") &&
    text.includes('from "support_attachments"')
  ) {
    rows = attachments
      .filter(
        (file) =>
          params.includes(file.id) &&
          params.includes(file.userId) &&
          params.includes(file.workspaceId)
      )
      .map((file) => [
        file.id,
        file.userId,
        file.workspaceId,
        file.projectId,
        file.requestId,
        file.name,
        file.contentType,
        file.size,
        file.bucket,
        file.storageKey,
        file.expiresAt.toISOString(),
        file.createdAt.toISOString(),
      ]);
  } else if (text.startsWith('insert into "support_requests"')) {
    pending++;
    rows = [[requestId, new Date().toISOString()]];
  } else if (text.startsWith('update "support_attachments"')) {
    const file = attachments.find((entry) => entry.id === params[2]);
    assert.ok(file);
    file.requestId = params[0] as string;
    file.storageKey = params[1] as string;
  }
  return { rows };
}

const pool = new Pool();
mock.method(pool, "query", query);
mock.method(pool, "connect", async () => ({ query, release() {} }));
mock.module(source("db/client.ts"), { namedExports: { db: drizzle(pool) } });
mock.module(source("support/storage.ts"), {
  namedExports: {
    SUPPORT_UPLOAD_TTL_SECONDS: 600,
    supportBucket: () => "private-support",
    createSupportUpload: async (data: Record<string, unknown>) => {
      granted.push(data);
      return {
        url: "https://private-support.s3.amazonaws.com",
        fields: { key: data.storageKey },
      };
    },
    finalizeSupportUpload: async (data: Attachment, key: string) => {
      if (storageFailure) throw new Error("S3 unavailable");
      finalized.push({ id: data.id, key });
    },
  },
});

let model: typeof import("./support.model");
before(async () => {
  model = await import("./support.model");
});
beforeEach(() => {
  member = true;
  project = true;
  storageFailure = false;
  attachments = [];
  finalized = [];
  granted = [];
  queries = [];
  committed = 0;
});

function attachment(patch: Partial<Attachment> = {}): Attachment {
  return {
    id: attachmentId,
    userId,
    workspaceId,
    projectId: null,
    requestId: null,
    name: "error.png",
    contentType: "image/png",
    size: 1234,
    bucket: "private-support",
    storageKey: `support/pending/${userId}/${attachmentId}`,
    expiresAt: new Date(Date.now() + 600_000),
    createdAt: new Date(),
    ...patch,
  };
}
function payload(ids: string[] = []) {
  return createSupportRequestSchema.parse({
    workspace_id: workspaceId,
    issue_id: "other",
    severity: "normal",
    subject: "Test",
    message: "Details",
    attachment_ids: ids,
  });
}

test("membership and project authorization are scoped to the authenticated user/workspace", async () => {
  const scope = { workspace_id: workspaceId, project_id: projectId };
  await model.assertSupportAccess(userId, scope);
  assert.deepEqual(queries[0]!.params, [userId, workspaceId, 1]);
  assert.deepEqual(queries[1]!.params, [projectId, workspaceId, 1]);
  member = false;
  await assert.rejects(model.assertSupportAccess(userId, scope), {
    statusCode: 403,
  });
  member = true;
  project = false;
  await assert.rejects(model.assertSupportAccess(userId, scope), {
    statusCode: 403,
  });
});

test("no-attachment submissions persist without touching S3 or upload rows", async () => {
  storageFailure = true;
  const result = await model.createSupportRequestModel(userId, payload());
  assert.equal(result.id, requestId);
  assert.equal(committed, 1);
  assert.equal(finalized.length, 0);
  assert.ok(!queries.some(({ text }) => text.includes("support_attachments")));
});

test("upload grants use server-generated keys and normalized MIME types", async () => {
  const data = supportUploadSchema.parse({
    workspace_id: workspaceId,
    files: [{ name: "debug.log", content_type: "", size: 1234 }],
  });
  const result = await model.createSupportUploadsModel(userId, data);
  assert.equal(granted[0]!.contentType, "text/plain");
  assert.match(
    granted[0]!.storageKey as string,
    new RegExp(`^support/pending/${userId}/[\\da-f-]+$`)
  );
  assert.equal(result.length, 1);
  assert.ok(
    queries.some(({ text }) =>
      text.startsWith('insert into "support_attachments"')
    )
  );
});

test("valid attachments are locked, finalized and atomically linked; reuse is rejected", async () => {
  attachments = [attachment()];
  await model.createSupportRequestModel(userId, payload([attachmentId]));
  assert.equal(committed, 1);
  assert.deepEqual(finalized, [
    { id: attachmentId, key: `support/requests/${requestId}/${attachmentId}` },
  ]);
  const selection = queries.find(({ text }) =>
    text.includes('from "support_attachments"')
  )!;
  assert.match(selection.text, /for update/);
  assert.match(selection.text, /"user_id" =/);
  assert.match(selection.text, /"workspace_id" =/);
  assert.equal(attachments[0]!.requestId, requestId);
  await assert.rejects(
    model.createSupportRequestModel(userId, payload([attachmentId])),
    { statusCode: 409 }
  );
  assert.equal(committed, 1);
});

test("foreign, missing, wrong-project, expired and consumed uploads cannot be attached", async () => {
  for (const patch of [
    { userId: otherId },
    { workspaceId: otherId },
    { projectId },
    { expiresAt: new Date(0) },
    { requestId },
  ]) {
    attachments = [attachment(patch)];
    await assert.rejects(
      model.createSupportRequestModel(userId, payload([attachmentId])),
      { statusCode: 409 }
    );
  }
  attachments = [];
  await assert.rejects(
    model.createSupportRequestModel(userId, payload([attachmentId])),
    { statusCode: 409 }
  );
  assert.equal(finalized.length, 0);
  assert.equal(committed, 0);
});

test("combined attachments from separate grants still obey the total limit", async () => {
  attachments = [
    attachment({ size: SUPPORT_MAX_FILE_SIZE }),
    attachment({ id: projectId, size: SUPPORT_MAX_FILE_SIZE }),
    attachment({ id: otherId, size: SUPPORT_MAX_FILE_SIZE }),
  ];
  await assert.rejects(
    model.createSupportRequestModel(
      userId,
      payload([attachmentId, projectId, otherId])
    ),
    { statusCode: 400 }
  );
  assert.equal(committed, 0);
});

test("storage failure rolls back the request and does not consume upload IDs", async () => {
  attachments = [attachment()];
  storageFailure = true;
  await assert.rejects(
    model.createSupportRequestModel(userId, payload([attachmentId])),
    /S3 unavailable/
  );
  assert.equal(committed, 0);
  assert.equal(attachments[0]!.requestId, null);
  assert.equal(queries[queries.length - 1]!.text, "rollback");
});
