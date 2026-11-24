import type Stripe from "stripe";
import type { InvoiceDocument } from "./invoice.types";

export const invoiceUserId = "11111111-1111-4111-8111-111111111111";
export const invoiceDate = new Date("2026-11-23T10:00:00.000Z");
export function invoiceFixture(): InvoiceDocument {
  return {
    seller: {
      name: "Example Business",
      address: "1 Example Street",
      email: "billing@example.com",
      taxId: null,
    },
    buyer: {
      name: "José Example",
      email: "buyer@example.com",
      address: ["2 Customer Street", "GB"],
    },
    paymentId: "pi_test",
    paymentDate: invoiceDate.toISOString(),
    paymentDateSource: "purchase_event",
    currency: "usd",
    items: [
      {
        description: "Pathlens lifetime access",
        quantity: 1,
        subtotal: 10000,
        total: 9900,
      },
    ],
    subtotal: 10000,
    discount: 1000,
    tax: 900,
    shipping: 0,
    total: 9900,
  };
}

export function stripeInvoiceFixture() {
  const payment = {
    id: "pi_test",
    status: "succeeded",
    customer: "cus_test",
    amount_received: 9900,
    currency: "usd",
    latest_charge: {
      id: "ch_test",
      paid: true,
      captured: true,
      payment_intent: "pi_test",
      amount_captured: 9900,
      currency: "usd",
      amount_refunded: 0,
      refunded: false,
      disputed: false,
      created: invoiceDate.getTime() / 1000,
      billing_details: {
        name: "Charge buyer",
        email: "charge@example.com",
        address: null,
      },
    },
  };
  const session = {
    id: "cs_test",
    client_reference_id: invoiceUserId,
    metadata: { user_id: invoiceUserId },
    payment_intent: "pi_test",
    mode: "payment",
    payment_status: "paid",
    customer: "cus_test",
    amount_subtotal: 10000,
    amount_total: 9900,
    currency: "usd",
    total_details: {
      amount_discount: 1000,
      amount_tax: 900,
      amount_shipping: 0,
    },
    shipping_cost: null,
    customer_details: {
      name: "José Example",
      email: "buyer@example.com",
      address: {
        line1: "2 Customer Street",
        line2: null,
        city: null,
        state: null,
        postal_code: null,
        country: "GB",
      },
    },
  };
  const lines = {
    has_more: false,
    data: [
      {
        description: "Pathlens lifetime access",
        currency: "usd",
        quantity: 1,
        amount_subtotal: 10000,
        amount_total: 9900,
        amount_tax: 900,
        amount_discount: 1000,
      },
    ],
  };
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const stripe = {
    paymentIntents: {
      retrieve: async (...args: unknown[]) => {
        calls.push({ method: "paymentIntents.retrieve", args });
        return payment;
      },
    },
    checkout: {
      sessions: {
        list: async (...args: unknown[]) => {
          calls.push({ method: "checkout.sessions.list", args });
          return { data: [session] };
        },
        listLineItems: async (...args: unknown[]) => {
          calls.push({ method: "checkout.sessions.listLineItems", args });
          return lines;
        },
      },
    },
  } as unknown as Stripe;
  return { payment, session, lines, stripe, calls };
}
