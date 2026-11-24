import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { before, beforeEach, mock, test } from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  invoiceDate,
  invoiceFixture,
  invoiceUserId,
} from "../billing/invoice.fixture";
import type { billingInvoices } from "../db/schema";

type Invoice = typeof billingInvoices.$inferSelect;
const source = (path: string) =>
  pathToFileURL(join(process.cwd(), "src", path)).href;
let records = new Map<string, Invoice>();
let queries: Array<{ text: string; params: unknown[] }> = [];
let rendered: Array<{ number: string; document: unknown }> = [];
let uploaded: string[] = [];
let storageFails = false;
let transactionSnapshot: Map<string, Invoice>;
let transactionQueue: Promise<void> = Promise.resolve();

async function query(
  config: string | { text: string },
  params: unknown[] = []
) {
  const text = typeof config === "string" ? config : config.text;
  queries.push({ text, params });
  let rows: unknown[][] = [];
  if (text.startsWith('insert into "billing_invoices"')) {
    const [id, userId, paymentId, number, bucket, storageKey, document] =
      params as string[];
    if (!records.has(paymentId!)) {
      records.set(paymentId!, {
        id: id!,
        userId: userId!,
        stripePaymentId: paymentId!,
        invoiceNumber: number!,
        bucket: bucket!,
        storageKey: storageKey!,
        document: JSON.parse(document!),
        status: "pending",
        createdAt: invoiceDate,
      });
    }
  } else if (text === "begin") {
    transactionSnapshot = new Map(
      [...records].map(([key, value]) => [key, { ...value }])
    );
  } else if (text === "rollback") {
    records = transactionSnapshot;
  } else if (text.startsWith("select")) {
    const record = records.get(params[1] as string);
    if (record?.userId === params[0]) {
      rows = [
        [
          record.id,
          record.userId,
          record.stripePaymentId,
          record.invoiceNumber,
          record.bucket,
          record.storageKey,
          record.document,
          record.status,
          record.createdAt.toISOString(),
        ],
      ];
    }
  } else if (text.startsWith('update "billing_invoices"')) {
    const record = [...records.values()].find(
      (value) => value.id === params[1]
    );
    assert.ok(record);
    record.status = params[0] as string;
  }
  return { rows };
}
const pool = new Pool();
mock.method(pool, "query", query);
mock.method(pool, "connect", async () => {
  let unlock: (() => void) | undefined;
  return {
    query: async (config: string | { text: string }, params?: unknown[]) => {
      const text = typeof config === "string" ? config : config.text;
      // Emulate serialized row-lock holders; SQL assertions below verify FOR UPDATE.
      if (text === "begin") {
        const previous = transactionQueue;
        transactionQueue = new Promise<void>((resolve) => {
          unlock = resolve;
        });
        await previous;
      }
      const result = await query(config, params);
      if (text === "commit" || text === "rollback") unlock?.();
      return result;
    },
    release() {},
  };
});
mock.module(source("db/client.ts"), { namedExports: { db: drizzle(pool) } });
mock.module(source("billing/invoice-pdf.ts"), {
  namedExports: {
    renderInvoicePdf: async (
      number: string,
      _date: Date,
      document: unknown
    ) => {
      rendered.push({ number, document });
      return Buffer.from("%PDF-test");
    },
  },
});
mock.module(source("billing/invoice-storage.ts"), {
  namedExports: {
    storeInvoicePdf: async (invoice: Invoice) => {
      if (storageFails) throw new Error("S3 unavailable");
      uploaded.push(invoice.storageKey);
    },
  },
});
let createInvoice: typeof import("./billing-invoice.model").createBillingInvoiceModel;
before(async () => {
  createInvoice = (await import("./billing-invoice.model"))
    .createBillingInvoiceModel;
});
beforeEach(() => {
  records = new Map();
  queries = [];
  rendered = [];
  uploaded = [];
  storageFails = false;
  transactionQueue = Promise.resolve();
});

test("new invoices commit their stable identity before rendering and uploading", async () => {
  const result = await createInvoice(
    invoiceUserId,
    invoiceFixture(),
    "private-invoices"
  );
  assert.equal(result.created, true);
  assert.equal(result.invoice.status, "ready");
  assert.equal(records.size, 1);
  assert.match(result.invoice.invoiceNumber, /^PL-[0-9A-F-]{36}$/);
  assert.match(
    result.invoice.storageKey,
    new RegExp(`^billing/invoices/${invoiceUserId}/`)
  );
  assert.match(
    queries[0]!.text,
    /on conflict \("stripe_payment_id"\) do nothing/
  );
  assert.equal(queries[1]!.text, "begin");
  assert.match(queries[2]!.text, /for update/);
  assert.deepEqual(queries[2]!.params, [invoiceUserId, "pi_test"]);
  assert.equal(uploaded.length, 1);
});

test("repeat requests preserve number, snapshot and PDF without regenerating", async () => {
  const first = await createInvoice(
    invoiceUserId,
    invoiceFixture(),
    "private-invoices"
  );
  const changed = invoiceFixture();
  changed.seller.name = "Changed business";
  changed.buyer.name = "Changed customer";
  const second = await createInvoice(invoiceUserId, changed, "other-bucket");
  assert.equal(second.created, false);
  assert.equal(first.invoice.id, second.invoice.id);
  assert.equal(second.invoice.bucket, "private-invoices");
  assert.deepEqual(second.invoice.document, invoiceFixture());
  assert.equal(rendered.length, 1);
  assert.equal(uploaded.length, 1);
});

test("concurrent requests share one invoice and one successful generation", async () => {
  const results = await Promise.all([
    createInvoice(invoiceUserId, invoiceFixture(), "private-invoices"),
    createInvoice(invoiceUserId, invoiceFixture(), "private-invoices"),
    createInvoice(invoiceUserId, invoiceFixture(), "private-invoices"),
  ]);
  assert.equal(new Set(results.map((value) => value.invoice.id)).size, 1);
  assert.equal(results.filter((value) => value.created).length, 1);
  assert.equal(rendered.length, 1);
  assert.equal(uploaded.length, 1);
});

test("storage failure leaves a resumable pending row with the same invoice number", async () => {
  storageFails = true;
  await assert.rejects(
    createInvoice(invoiceUserId, invoiceFixture(), "private-invoices"),
    /S3 unavailable/
  );
  const pending = records.get("pi_test")!;
  assert.equal(pending.status, "pending");
  assert.equal(queries[queries.length - 1]!.text, "rollback");
  storageFails = false;
  const result = await createInvoice(
    invoiceUserId,
    invoiceFixture(),
    "private-invoices"
  );
  assert.equal(result.invoice.id, pending.id);
  assert.equal(result.invoice.invoiceNumber, pending.invoiceNumber);
  assert.equal(result.invoice.status, "ready");
});

test("a conflicting invoice owned by another user cannot be read or regenerated", async () => {
  const first = await createInvoice(
    invoiceUserId,
    invoiceFixture(),
    "private-invoices"
  );
  await assert.rejects(
    createInvoice(
      "22222222-2222-4222-8222-222222222222",
      invoiceFixture(),
      "private-invoices"
    ),
    { statusCode: 403 }
  );
  assert.equal(records.get("pi_test")!.id, first.invoice.id);
  assert.equal(uploaded.length, 1);
});
