import assert from "node:assert/strict";
import { createServer } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { before, beforeEach, mock, test } from "node:test";
import express from "express";
import Stripe from "stripe";
import { billingInvoiceSchema } from "@workspace/contracts";
import { InvoiceError } from "../billing/invoice.types";
import {
  invoiceDate,
  invoiceFixture,
  invoiceUserId,
} from "../billing/invoice.fixture";

const source = (path: string) =>
  pathToFileURL(join(process.cwd(), "src", path)).href;
let failure: Error | undefined;
let accountExists = true;
let hasPayment = true;
let created = true;
let generated = 0;
let lookedUpUser: string | undefined;
mock.module(source("lib/jwt.ts"), {
  namedExports: {
    verifyJwt: (token: string) => {
      if (token !== "valid") throw new Error("Invalid token");
      return { id: invoiceUserId };
    },
  },
});
mock.module(source("models/billing.model.ts"), {
  namedExports: {
    getAccountEntitlement: async (userId: string) => {
      lookedUpUser = userId;
      return accountExists
        ? {
            id: invoiceUserId,
            stripeCustomerId: "cus_test",
            stripePaymentId: hasPayment ? "pi_test" : null,
            purchasedAt: invoiceDate,
            lifetimeAccess: true,
          }
        : null;
    },
    grantAccountLifetimeEntitlement: async () => null,
  },
});
mock.module(source("billing/invoice-payment.ts"), {
  namedExports: {
    loadInvoicePayment: async () => {
      if (failure) throw failure;
      return invoiceFixture();
    },
  },
});
mock.module(source("models/billing-invoice.model.ts"), {
  namedExports: {
    createBillingInvoiceModel: async (userId: string) => {
      assert.equal(userId, invoiceUserId);
      generated++;
      return {
        created,
        invoice: {
          id: "22222222-2222-4222-8222-222222222222",
          userId,
          stripePaymentId: "pi_test",
          invoiceNumber: "PL-TEST",
          bucket: "private-invoices",
          storageKey: "billing/invoices/test.pdf",
          document: invoiceFixture(),
          status: "ready",
          createdAt: invoiceDate,
        },
      };
    },
  },
});
mock.module(source("billing/invoice-storage.ts"), {
  namedExports: {
    invoiceBucket: () => "private-invoices",
    invoiceDownload: async () => ({
      url: "https://private-invoices.s3.amazonaws.com/billing/invoices/test.pdf?signature=test",
      expiresAt: new Date(invoiceDate.getTime() + 300_000),
    }),
  },
});
let router: express.Router;
before(async () => {
  router = (await import("./billing.route")).default;
});
beforeEach(() => {
  failure = undefined;
  accountExists = true;
  hasPayment = true;
  created = true;
  generated = 0;
  lookedUpUser = undefined;
});
async function post(body?: unknown, token = "valid") {
  const app = express();
  app.use(express.json());
  app.use("/api/billing", router);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/billing/invoice`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: token ? `Bearer ${token}` : "",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }
    );
    return {
      status: response.status,
      body: await response.json(),
      cache: response.headers.get("cache-control"),
    };
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

test("invoice creation requires a valid Bearer session before looking up a payment", async () => {
  assert.equal((await post(undefined, "")).status, 401);
  assert.equal((await post(undefined, "invalid")).status, 401);
  assert.equal(lookedUpUser, undefined);
  assert.equal(generated, 0);
});

test("new invoice returns the shared response contract and a private download URL", async () => {
  const result = await post();
  assert.equal(result.status, 201);
  assert.equal(result.cache, "private, no-store");
  assert.ok(billingInvoiceSchema.safeParse(result.body.data).success);
  assert.equal(result.body.data.amount_total, 9900);
  assert.equal(lookedUpUser, invoiceUserId);
});

test("repeat requests return 200 with the existing invoice", async () => {
  created = false;
  const result = await post({});
  assert.equal(result.status, 200);
  assert.equal(result.body.data.invoice_number, "PL-TEST");
});

test("caller-supplied payment IDs, customer IDs and amounts are rejected", async () => {
  for (const body of [
    { payment_id: "pi_other" },
    { user_id: "other" },
    { amount: 1 },
  ]) {
    assert.equal((await post(body)).status, 400);
  }
  assert.equal(generated, 0);
  assert.equal(lookedUpUser, undefined);
});

test("missing account and manual entitlements without a real payment return 404", async () => {
  accountExists = false;
  assert.equal((await post()).status, 404);
  accountExists = true;
  hasPayment = false;
  assert.equal((await post()).status, 404);
  assert.equal(generated, 0);
});

test("ownership, payment-state and configuration errors do not generate a PDF", async () => {
  for (const status of [403, 409, 503]) {
    failure = new InvoiceError(status, "Actionable billing error");
    assert.equal((await post()).status, status);
  }
  assert.equal(generated, 0);
});

test("Stripe failures and unexpected exceptions do not expose private provider data", async () => {
  const log = mock.method(console, "error", () => {});
  try {
    failure = new Stripe.errors.StripeConnectionError({
      message: "private-provider-info",
    });
    const stripe = await post();
    assert.equal(stripe.status, 502);
    assert.ok(!JSON.stringify(stripe.body).includes("private-provider-info"));
    failure = new Error("database-password=secret");
    const database = await post();
    assert.equal(database.status, 500);
    assert.ok(!JSON.stringify(database.body).includes("database-password"));
  } finally {
    log.mock.restore();
  }
});
