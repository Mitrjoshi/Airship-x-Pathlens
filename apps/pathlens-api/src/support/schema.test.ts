import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSupportRequestSchema,
  supportUploadSchema,
  supportContentType,
  supportIssues,
  supportServices,
  SUPPORT_MAX_FILE_SIZE,
} from "@workspace/contracts";

const scope = { workspace_id: "11111111-1111-4111-8111-111111111111" };
const request = {
  ...scope,
  issue_id: "other",
  severity: "low",
  subject: "  Cannot load dashboard  ",
  message: "  Details  ",
};
const file = { name: "error.png", content_type: "image/png", size: 100 };

test("attachments, project and services default to absent; text is trimmed", () => {
  const value = createSupportRequestSchema.parse(request);
  assert.equal(value.project_id, null);
  assert.deepEqual(value.attachment_ids, []);
  assert.deepEqual(value.service, []);
  assert.equal(value.subject, "Cannot load dashboard");
  assert.equal(value.message, "Details");
});

test("all form categories, services and severities are accepted", () => {
  for (const issue_id of supportIssues) {
    for (const severity of ["low", "normal", "high", "urgent"]) {
      assert.ok(
        createSupportRequestSchema.safeParse({
          ...request,
          issue_id,
          severity,
          service: [...supportServices],
        }).success
      );
    }
  }
});

test("required text, IDs, enums, and displayed character limits are enforced", () => {
  for (const patch of [
    { subject: " " },
    { subject: "a".repeat(201) },
    { message: "" },
    { message: "a".repeat(5001) },
    { issue_id: "invalid" },
    { service: [""] },
    { severity: "critical" },
    { workspace_id: "" },
    { project_id: "no" },
  ]) {
    assert.equal(
      createSupportRequestSchema.safeParse({ ...request, ...patch }).success,
      false
    );
  }
  assert.ok(
    createSupportRequestSchema.safeParse({
      ...request,
      message: "a".repeat(5000),
    }).success
  );
});

test("upload policies enforce count, individual size, total size and filename/type pairs", () => {
  for (const files of [
    [],
    Array(6).fill(file),
    [{ ...file, size: 0 }],
    [{ ...file, size: SUPPORT_MAX_FILE_SIZE + 1 }],
    Array(3).fill({ ...file, size: SUPPORT_MAX_FILE_SIZE }),
    [{ ...file, name: "script.html" }],
    [{ ...file, name: "../error.png" }],
    [{ ...file, content_type: "image/jpeg" }],
  ]) {
    assert.equal(
      supportUploadSchema.safeParse({ ...scope, files }).success,
      false
    );
  }
  assert.ok(
    supportUploadSchema.safeParse({
      ...scope,
      files: [{ ...file, size: SUPPORT_MAX_FILE_SIZE }],
    }).success
  );
});

test("text MIME fallbacks match the browser form", () => {
  assert.equal(
    supportContentType("debug.log", "application/octet-stream"),
    "text/plain"
  );
  assert.equal(supportContentType("debug.log", ""), "text/plain");
  assert.equal(supportContentType("data.json", ""), "application/json");
  assert.equal(supportContentType("PHOTO.PNG", "image/png"), "image/png");
  assert.equal(supportContentType("photo.png", ""), null);
  assert.equal(supportContentType("page.html", "text/plain"), null);
});

test("duplicate and invalid attachment references are rejected", () => {
  const id = "22222222-2222-4222-8222-222222222222";
  assert.equal(
    createSupportRequestSchema.safeParse({
      ...request,
      attachment_ids: [id, id],
    }).success,
    false
  );
  assert.equal(
    createSupportRequestSchema.safeParse({
      ...request,
      attachment_ids: ["arbitrary-s3-key"],
    }).success,
    false
  );
});
