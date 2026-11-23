import Stripe from "stripe";
import { InvoiceError, type InvoiceDocument } from "./invoice.types";

function merchant(): InvoiceDocument["seller"] {
  const name = process.env.INVOICE_BUSINESS_NAME?.trim();
  const address = process.env.INVOICE_BUSINESS_ADDRESS?.trim();
  const email = process.env.INVOICE_BUSINESS_EMAIL?.trim();
  if (!name || !address || !email) {
    throw new InvoiceError(503, "Invoice business details are not configured.");
  }
  return { name, address, email, taxId: process.env.INVOICE_TAX_ID?.trim() || null };
}

function objectId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function invoiceStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new InvoiceError(503, "Billing is not configured.");
  return new Stripe(key, { timeout: 15_000, maxNetworkRetries: 1 });
}

export async function loadInvoicePayment(
  account: {
    id: string;
    stripePaymentId: string | null;
    stripeCustomerId: string | null;
    purchasedAt: Date | null;
  },
  stripe = invoiceStripeClient()
): Promise<InvoiceDocument> {
  if (!account.stripePaymentId) throw new InvoiceError(404, "No payment found for this account.");
  const payment = await stripe.paymentIntents.retrieve(account.stripePaymentId, {
    expand: ["latest_charge"],
  });
  if (
    payment.id !== account.stripePaymentId ||
    (account.stripeCustomerId && objectId(payment.customer) !== account.stripeCustomerId)
  ) {
    throw new InvoiceError(403, "Payment ownership could not be verified.");
  }
  if (payment.status !== "succeeded" || payment.amount_received <= 0) {
    throw new InvoiceError(409, "An invoice is only available for a successful payment.");
  }
  const charge = payment.latest_charge;
  if (
    !charge || typeof charge === "string" || !charge.paid || !charge.captured ||
    objectId(charge.payment_intent) !== payment.id ||
    charge.amount_captured !== payment.amount_received || charge.currency !== payment.currency
  ) {
    throw new InvoiceError(409, "The completed payment could not be verified.");
  }
  if (charge.amount_refunded > 0 || charge.refunded || charge.disputed) {
    throw new InvoiceError(409, "This payment was refunded or disputed. Please contact support for billing documentation.");
  }

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: payment.id, limit: 100,
  });
  const session = sessions.data.find((entry) =>
    entry.client_reference_id === account.id && entry.metadata?.user_id === account.id &&
    objectId(entry.payment_intent) === payment.id && entry.mode === "payment" &&
    entry.payment_status === "paid"
  );
  if (!session || (account.stripeCustomerId && objectId(session.customer) !== account.stripeCustomerId)) {
    throw new InvoiceError(403, "Payment ownership could not be verified.");
  }
  const lines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
  if (!lines.data.length || lines.has_more) {
    throw new InvoiceError(409, "The payment's invoice items could not be verified.");
  }
  const details = session.customer_details;
  const address = details?.address ?? charge.billing_details.address;
  const subtotal = session.amount_subtotal;
  const total = session.amount_total;
  const discount = session.total_details?.amount_discount ?? 0;
  const tax = session.total_details?.amount_tax ?? 0;
  const shipping = session.total_details?.amount_shipping ?? 0;
  const items = lines.data.map((line) => ({
    description: line.description || "Pathlens purchase",
    quantity: line.quantity ?? 1,
    subtotal: line.amount_subtotal,
    total: line.amount_total,
  }));
  if (
    session.currency !== payment.currency || total !== payment.amount_received ||
    subtotal === null || total === null ||
    lines.data.some((line) => line.currency !== payment.currency) ||
    items.reduce((sum, line) => sum + line.subtotal, 0) !== subtotal ||
    subtotal - discount + tax + shipping !== total ||
    items.reduce((sum, line) => sum + line.total, 0) + (session.shipping_cost?.amount_total ?? 0) !== total
  ) {
    throw new InvoiceError(409, "The payment's invoice totals could not be verified.");
  }
  const paymentDate = account.purchasedAt ?? new Date(charge.created * 1000);
  return {
    seller: merchant(),
    buyer: {
      name: details?.name || charge.billing_details.name || "Customer",
      email: details?.email || charge.billing_details.email || "",
      address: address
        ? [address.line1, address.line2, address.city, address.state, address.postal_code, address.country]
          .filter((value): value is string => Boolean(value))
        : [],
    },
    paymentId: payment.id,
    paymentDate: paymentDate.toISOString(),
    paymentDateSource: account.purchasedAt ? "purchase_event" : "stripe_charge",
    currency: payment.currency,
    items, subtotal, discount, tax, shipping, total,
  };
}
