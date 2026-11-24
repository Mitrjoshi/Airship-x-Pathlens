import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { S3Client } from "@aws-sdk/client-s3";
import {
  invoiceBucket,
  invoiceDownload,
  storeInvoicePdf,
} from "./invoice-storage";

const invoice = {
  bucket: "private-invoices",
  storageKey: "billing/invoices/user/id.pdf",
  invoiceNumber: "PL-TEST",
};
let commands: Array<{ name: string; input: Record<string, unknown> }>;
let failure: unknown;
mock.method(
  S3Client.prototype,
  "send",
  async (command: {
    constructor: { name: string };
    input: Record<string, unknown>;
  }) => {
    commands.push({ name: command.constructor.name, input: command.input });
    if (failure) throw failure;
    return {};
  }
);
beforeEach(() => {
  process.env.AWS_REGION = "ap-south-1";
  process.env.S3_BUCKET = invoice.bucket;
  process.env.AWS_ACCESS_KEY_ID = "test-access";
  process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
  commands = [];
  failure = undefined;
});

test("stores private downloadable PDFs without overwriting completed invoice objects", async () => {
  const pdf = Buffer.from("%PDF-test");
  await storeInvoicePdf(invoice, pdf);
  assert.equal(commands[0]!.name, "PutObjectCommand");
  assert.equal(commands[0]!.input.Bucket, invoice.bucket);
  assert.equal(commands[0]!.input.Key, invoice.storageKey);
  assert.equal(commands[0]!.input.Body, pdf);
  assert.equal(commands[0]!.input.IfNoneMatch, "*");
  assert.equal(commands[0]!.input.ContentType, "application/pdf");
  assert.equal(commands[0]!.input.CacheControl, "private, no-store");
  assert.equal(commands[0]!.input.ACL, undefined);
});

test("retry after an interrupted DB update reuses an already uploaded object", async () => {
  failure = { $metadata: { httpStatusCode: 412 } };
  await storeInvoicePdf(invoice, Buffer.from("pdf"));
});

test("S3 failures do not masquerade as completed invoices", async () => {
  const log = mock.method(console, "error", () => {});
  failure = new Error("Access denied");
  try {
    await assert.rejects(storeInvoicePdf(invoice, Buffer.from("pdf")), {
      statusCode: 503,
    });
  } finally {
    log.mock.restore();
  }
});

test("download links are short-lived attachment URLs and are not public objects", async () => {
  const result = await invoiceDownload(invoice);
  const url = new URL(result.url);
  assert.equal(url.searchParams.get("X-Amz-Expires"), "300");
  assert.equal(
    url.searchParams.get("response-content-type"),
    "application/pdf"
  );
  assert.equal(
    url.searchParams.get("response-content-disposition"),
    'attachment; filename="PL-TEST.pdf"'
  );
  assert.ok(result.expiresAt.getTime() - Date.now() <= 300_000);
  assert.equal(commands.length, 0);
});

test("S3_BUCKET and AWS_REGION are required for invoice storage", async () => {
  delete process.env.S3_BUCKET;
  assert.throws(invoiceBucket, { statusCode: 503 });
  delete process.env.AWS_REGION;
  await assert.rejects(storeInvoicePdf(invoice, Buffer.from("pdf")), {
    statusCode: 503,
  });
});
