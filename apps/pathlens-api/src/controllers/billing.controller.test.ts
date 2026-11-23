import assert from "node:assert/strict";
import { join } from "node:path";
import { before, beforeEach, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import type { Response } from "express";
import Stripe from "stripe";
import type { AuthRequest } from "../lib/jwt";

const userId = "11111111-1111-4111-8111-111111111111";
const purchasedAt = new Date("2026-11-23T10:00:00.000Z");
let account: {
  id: string;
  lifetimeAccess: boolean;
  stripeCustomerId: string | null;
  stripePaymentId: string | null;
  purchasedAt: Date | null;
} | null;
let lookupUser: string | undefined;
let grants: Array<Record<string, unknown>>;
let eventType: string;
let paymentStatus: string;
let failure: boolean;
const source = (path: string) =>
  pathToFileURL(join(process.cwd(), "src", path)).href;

mock.module(source("models/billing.model.ts"), {
  namedExports: {
    getAccountEntitlement: async (id: string) => {
      lookupUser = id;
      if (failure) throw new Error("Database unavailable");
      return account;
    },
    grantAccountLifetimeEntitlement: async (data: Record<string, unknown>) => {
      grants.push(data);
      return { id: userId };
    },
  },
});

let controller: typeof import("./billing.controller");
before(async () => {
  controller = await import("./billing.controller");
});
beforeEach(() => {
  account = {
    id: userId,
    lifetimeAccess: true,
    stripeCustomerId: "cus_test",
    stripePaymentId: "pi_test",
    purchasedAt,
  };
  lookupUser = undefined;
  grants = [];
  eventType = "checkout.session.completed";
  paymentStatus = "paid";
  failure = false;
  process.env.STRIPE_SECRET_KEY = "sk_test_fake";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";
  process.env.STRIPE_LIFETIME_PRICE_ID = "price_lifetime";
});

function signedWebhook() {
  const payload = JSON.stringify({
    type: eventType,
    created: purchasedAt.getTime() / 1000,
    data: {
      object: {
        mode: "payment",
        payment_status: paymentStatus,
        // Checkout creation is not the time an asynchronous payment succeeds.
        created: 1,
        metadata: { user_id: userId, price_id: "price_lifetime" },
        customer: "cus_test",
        payment_intent: "pi_test",
      },
    },
  });
  const signature = new Stripe(
    "sk_test_fake"
  ).webhooks.generateTestHeaderString({
    payload,
    secret: process.env.STRIPE_WEBHOOK_SECRET!,
  });
  return {
    headers: { "stripe-signature": signature },
    body: Buffer.from(payload),
  };
}

async function call(
  action: typeof controller.getEntitlement,
  request: Partial<AuthRequest>
) {
  let status = 200;
  let body: any;
  const response = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = JSON.parse(JSON.stringify(value));
      return this;
    },
  };
  await action(request as AuthRequest, response as Response);
  return { status, body };
}

test("GET entitlement returns purchased_at as an ISO timestamp", async () => {
  const result = await call(controller.getEntitlement, {
    user: { id: userId } as AuthRequest["user"],
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.purchased_at, purchasedAt.toISOString());
  assert.equal(result.body.data.lifetime_access, true);
  assert.equal(result.body.data.stripe_payment_id, "pi_test");
  assert.equal(lookupUser, userId);
});

test("unpaid and legacy accounts return null rather than a fabricated date", async () => {
  account!.purchasedAt = null;
  for (const lifetimeAccess of [false, true]) {
    account!.lifetimeAccess = lifetimeAccess;
    const result = await call(controller.getEntitlement, {
      user: { id: userId } as AuthRequest["user"],
    });
    assert.equal(result.body.data.purchased_at, null);
  }
});

test("authentication, missing-account and database errors keep their existing statuses", async () => {
  assert.equal((await call(controller.getEntitlement, {})).status, 401);
  assert.equal(lookupUser, undefined);
  account = null;
  const req = { user: { id: userId } as AuthRequest["user"] };
  assert.equal((await call(controller.getEntitlement, req)).status, 404);
  failure = true;
  const log = mock.method(console, "error", () => {});
  try {
    assert.equal((await call(controller.getEntitlement, req)).status, 500);
  } finally {
    log.mock.restore();
  }
});

test("paid checkout and async success record the verified event's purchase time", async () => {
  for (const type of [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
  ]) {
    eventType = type;
    const result = await call(controller.handleStripeWebhook, signedWebhook());
    assert.equal(result.status, 200);
    assert.deepEqual(grants[grants.length - 1]!.purchasedAt, purchasedAt);
  }
  assert.equal(grants.length, 2);
});

test("unpaid and invalid-signature webhooks cannot record a purchase", async () => {
  paymentStatus = "unpaid";
  const request = signedWebhook();
  assert.equal(
    (await call(controller.handleStripeWebhook, request)).status,
    200
  );
  request.headers["stripe-signature"] = "invalid-signature";
  const log = mock.method(console, "error", () => {});
  try {
    assert.equal(
      (await call(controller.handleStripeWebhook, request)).status,
      400
    );
  } finally {
    log.mock.restore();
  }
  assert.equal(grants.length, 0);
});
