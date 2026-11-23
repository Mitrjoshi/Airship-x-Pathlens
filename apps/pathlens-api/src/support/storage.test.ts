import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { S3Client, type HeadObjectCommandOutput } from "@aws-sdk/client-s3";
import {
  createSupportUpload,
  finalizeSupportUpload,
  supportBucket,
} from "./storage";

let head: Partial<HeadObjectCommandOutput>;
const commands: Array<{ name: string; input: Record<string, unknown> }> = [];
let headFailure: unknown;
let copyFailure: unknown;
mock.method(
  S3Client.prototype,
  "send",
  async (command: {
    constructor: { name: string };
    input: Record<string, unknown>;
  }) => {
    const name = command.constructor.name;
    commands.push({ name, input: command.input });
    if (name === "HeadObjectCommand") {
      if (headFailure) throw headFailure;
      return head;
    }
    if (copyFailure) throw copyFailure;
    return {};
  }
);

const upload = {
  bucket: "private-support",
  storageKey: "support/pending/user/id",
  contentType: "image/png",
  size: 1234,
};
beforeEach(() => {
  process.env.AWS_REGION = "ap-south-1";
  process.env.AWS_ACCESS_KEY_ID = "test-access";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
  process.env.S3_BUCKET = upload.bucket;
  commands.length = 0;
  head = {
    ContentLength: upload.size,
    ContentType: upload.contentType,
    ETag: '"test-etag"',
  };
  headFailure = undefined;
  copyFailure = undefined;
});

test("presigned POST policy locks the key, content type, exact byte count and expiry", async () => {
  const result = await createSupportUpload(upload);
  const policy = JSON.parse(
    Buffer.from(result.fields.Policy!, "base64").toString()
  );
  assert.equal(result.fields.key, upload.storageKey);
  assert.equal(result.fields["Content-Type"], upload.contentType);
  assert.ok(
    policy.conditions.some(
      (value: unknown) =>
        JSON.stringify(value) ===
        JSON.stringify(["content-length-range", 1234, 1234])
    )
  );
  const remaining = Date.parse(policy.expiration) - Date.now();
  assert.ok(remaining > 590_000 && remaining <= 600_000);
  assert.equal(commands.length, 0, "signing does not upload the file");
});

test("finalization verifies metadata and freezes the source with a conditional copy", async () => {
  await finalizeSupportUpload(upload, "support/requests/request/id");
  assert.deepEqual(
    commands.map((command) => command.name),
    ["HeadObjectCommand", "CopyObjectCommand"]
  );
  assert.equal(commands[1]!.input.CopySourceIfMatch, '"test-etag"');
  assert.equal(commands[1]!.input.Key, "support/requests/request/id");
  assert.equal(commands[1]!.input.ContentDisposition, "attachment");
  assert.equal(commands[1]!.input.MetadataDirective, "REPLACE");
});

test("mismatched size, type or absent ETag cannot be finalized", async () => {
  for (const patch of [
    { ContentLength: 999 },
    { ContentType: "text/html" },
    { ETag: undefined },
  ]) {
    head = {
      ContentLength: upload.size,
      ContentType: upload.contentType,
      ETag: '"test"',
      ...patch,
    };
    await assert.rejects(finalizeSupportUpload(upload, "final"), {
      statusCode: 400,
    });
  }
  assert.ok(commands.every((command) => command.name === "HeadObjectCommand"));
});

test("missing objects and replacement races return actionable conflicts", async () => {
  headFailure = { $metadata: { httpStatusCode: 404 } };
  await assert.rejects(finalizeSupportUpload(upload, "final"), {
    statusCode: 409,
  });
  headFailure = undefined;
  copyFailure = { $metadata: { httpStatusCode: 412 } };
  await assert.rejects(finalizeSupportUpload(upload, "final"), {
    statusCode: 409,
  });
});

test("S3 outages propagate without pretending to accept attachments", async () => {
  headFailure = new Error("S3 unavailable");
  await assert.rejects(
    finalizeSupportUpload(upload, "final"),
    /S3 unavailable/
  );
});

test("missing upload configuration fails explicitly", async () => {
  delete process.env.S3_BUCKET;
  assert.throws(supportBucket, { statusCode: 503 });
  delete process.env.AWS_REGION;
  await assert.rejects(createSupportUpload(upload), { statusCode: 503 });
});
