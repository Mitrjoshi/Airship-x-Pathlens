import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { invoiceStripeClient, loadInvoicePayment } from "./invoice-payment";
import {
  invoiceDate,
  invoiceFixture,
  invoiceUserId,
  stripeInvoiceFixture,
} from "./invoice.fixture";

const account = {
  id: invoiceUserId,
  stripePaymentId: "pi_test",
  stripeCustomerId: "cus_test",
  purchasedAt: invoiceDate,
};
beforeEach(() => {
  process.env.INVOICE_BUSINESS_NAME = "Example Business";
  process.env.INVOICE_BUSINESS_ADDRESS = "1 Example Street";
  process.env.INVOICE_BUSINESS_EMAIL = "billing@example.com";
  delete process.env.INVOICE_TAX_ID;
});

test("uses only verified purchase amounts and billing details, with read-only Stripe calls", async () => {
  const { stripe, calls } = stripeInvoiceFixture();
  assert.deepEqual(await loadInvoicePayment(account, stripe), invoiceFixture());
  assert.deepEqual(calls, [
    {
      method: "paymentIntents.retrieve",
      args: ["pi_test", { expand: ["latest_charge"] }],
    },
    {
      method: "checkout.sessions.list",
      args: [{ payment_intent: "pi_test", limit: 100 }],
    },
    {
      method: "checkout.sessions.listLineItems",
      args: ["cs_test", { limit: 100 }],
    },
  ]);
});

test("legacy guest purchases still require matching Checkout user metadata", async () => {
  const { stripe, payment, session } = stripeInvoiceFixture();
  Object.assign(payment, { customer: null });
  Object.assign(session, { customer: null });
  const value = await loadInvoicePayment(
    { ...account, stripeCustomerId: null, purchasedAt: null },
    stripe
  );
  assert.equal(value.paymentDate, invoiceDate.toISOString());
  assert.equal(value.paymentDateSource, "stripe_charge");
});

test("unpaid or uncaptured payments never produce paid documents", async () => {
  for (const patch of [
    { status: "processing" },
    { status: "requires_payment_method" },
    { amount_received: 0 },
  ]) {
    const { stripe, payment } = stripeInvoiceFixture();
    Object.assign(payment, patch);
    await assert.rejects(loadInvoicePayment(account, stripe), {
      statusCode: 409,
    });
  }
  const { stripe, payment } = stripeInvoiceFixture();
  payment.latest_charge.captured = false;
  await assert.rejects(loadInvoicePayment(account, stripe), {
    statusCode: 409,
  });
});

test("customer mismatch, foreign Checkout metadata and foreign charge are rejected", async () => {
  for (const tamper of [
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.payment.customer = "cus_other";
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.session.metadata.user_id = "other-user";
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.session.client_reference_id = "other-user";
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.session.customer = "cus_other";
    },
  ]) {
    const fixture = stripeInvoiceFixture();
    tamper(fixture);
    await assert.rejects(loadInvoicePayment(account, fixture.stripe), {
      statusCode: 403,
    });
  }
  const { stripe, payment } = stripeInvoiceFixture();
  payment.latest_charge.payment_intent = "pi_other";
  await assert.rejects(loadInvoicePayment(account, stripe), {
    statusCode: 409,
  });
});

test("refunded and disputed payments require support instead of issuing a new paid invoice", async () => {
  for (const patch of [
    { amount_refunded: 100 },
    { refunded: true },
    { disputed: true },
  ]) {
    const { stripe, payment } = stripeInvoiceFixture();
    Object.assign(payment.latest_charge, patch);
    await assert.rejects(loadInvoicePayment(account, stripe), {
      statusCode: 409,
    });
  }
});

test("currency, captured amount, session totals and incomplete line items are verified", async () => {
  for (const tamper of [
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.payment.latest_charge.amount_captured = 1;
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.session.amount_total = 1;
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.session.currency = "eur";
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.lines.data[0]!.currency = "eur";
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.lines.data[0]!.amount_total = 1;
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.lines.has_more = true;
    },
    (fixture: ReturnType<typeof stripeInvoiceFixture>) => {
      fixture.lines.data = [];
    },
  ]) {
    const fixture = stripeInvoiceFixture();
    tamper(fixture);
    await assert.rejects(loadInvoicePayment(account, fixture.stripe), {
      statusCode: 409,
    });
  }
});

test("inclusive tax is not added a second time to the actual amount paid", async () => {
  const { stripe, payment, session, lines } = stripeInvoiceFixture();
  payment.amount_received = 9000;
  payment.latest_charge.amount_captured = 9000;
  session.amount_total = 9000;
  lines.data[0]!.amount_total = 9000;
  const value = await loadInvoicePayment(account, stripe);
  assert.equal(value.total, 9000);
  assert.equal(value.tax, 900);
});

test("missing payment and missing business/Stripe configuration fail clearly", async () => {
  const { stripe } = stripeInvoiceFixture();
  await assert.rejects(
    loadInvoicePayment({ ...account, stripePaymentId: null }, stripe),
    { statusCode: 404 }
  );
  delete process.env.INVOICE_BUSINESS_NAME;
  await assert.rejects(loadInvoicePayment(account, stripe), {
    statusCode: 503,
  });
  delete process.env.STRIPE_SECRET_KEY;
  assert.throws(invoiceStripeClient, { statusCode: 503 });
});
