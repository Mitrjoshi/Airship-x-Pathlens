import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { billingInvoices } from "../db/schema";
import { InvoiceError, type InvoiceDocument } from "../billing/invoice.types";
import { renderInvoicePdf } from "../billing/invoice-pdf";
import { storeInvoicePdf } from "../billing/invoice-storage";

export async function createBillingInvoiceModel(
  userId: string,
  document: InvoiceDocument,
  bucket: string
) {
  const id = randomUUID();
  // Commit the stable identity and snapshot before any external side effects.
  // A process crash leaves a resumable pending invoice, not a new invoice number.
  await db
    .insert(billingInvoices)
    .values({
      id,
      userId,
      stripePaymentId: document.paymentId,
      invoiceNumber: `PL-${id.toUpperCase()}`,
      bucket,
      storageKey: `billing/invoices/${userId}/${id}.pdf`,
      document,
    })
    .onConflictDoNothing({ target: billingInvoices.stripePaymentId });
  return db.transaction(async (tx) => {
    const [invoice] = await tx
      .select()
      .from(billingInvoices)
      .where(
        and(
          eq(billingInvoices.userId, userId),
          eq(billingInvoices.stripePaymentId, document.paymentId)
        )
      )
      .for("update");
    if (!invoice) throw new InvoiceError(403, "Invoice access denied.");
    if (invoice.status === "ready") return { invoice, created: false };
    const pdf = await renderInvoicePdf(
      invoice.invoiceNumber,
      invoice.createdAt,
      invoice.document
    );
    await storeInvoicePdf(invoice, pdf);
    await tx
      .update(billingInvoices)
      .set({ status: "ready" })
      .where(eq(billingInvoices.id, invoice.id));
    return { invoice: { ...invoice, status: "ready" }, created: true };
  });
}
