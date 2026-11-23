import type { Response } from "express";
import Stripe from "stripe";
import { ZodError } from "zod";
import { createBillingInvoiceSchema, type BillingInvoice } from "@workspace/contracts";
import type { AuthRequest } from "../lib/jwt";
import { getAccountEntitlement } from "../models/billing.model";
import { createBillingInvoiceModel } from "../models/billing-invoice.model";
import { loadInvoicePayment } from "../billing/invoice-payment";
import { invoiceBucket, invoiceDownload } from "../billing/invoice-storage";
import { InvoiceError } from "../billing/invoice.types";

export async function createBillingInvoice(req: AuthRequest, res: Response) {
  if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized." });
  res.setHeader("Cache-Control", "private, no-store");
  try {
    createBillingInvoiceSchema.parse(req.body ?? {});
    const account = await getAccountEntitlement(req.user.id);
    if (!account) throw new InvoiceError(404, "Account not found.");
    if (!account.stripePaymentId) throw new InvoiceError(404, "No payment found for this account.");
    const document = await loadInvoicePayment(account);
    const { invoice, created } = await createBillingInvoiceModel(req.user.id, document, invoiceBucket());
    const download = await invoiceDownload(invoice);
    const data: BillingInvoice = {
      invoice_id: invoice.id, invoice_number: invoice.invoiceNumber,
      payment_id: invoice.stripePaymentId, download_url: download.url,
      expires_at: download.expiresAt.toISOString(), issued_at: invoice.createdAt.toISOString(),
      payment_date: invoice.document.paymentDate, currency: invoice.document.currency,
      amount_total: invoice.document.total,
    };
    return res.status(created ? 201 : 200).json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError) return res.status(400).json({ success: false, message: "This endpoint does not accept payment or invoice details." });
    if (error instanceof InvoiceError) return res.status(error.statusCode).json({ success: false, message: error.message });
    console.error("Invoice generation failed.", error);
    const upstream = error instanceof Stripe.errors.StripeError;
    return res.status(upstream ? 502 : 500).json({
      success: false,
      message: upstream ? "Unable to verify the payment with Stripe. Please try again." : "Unable to create the invoice. Please try again.",
    });
  }
}
