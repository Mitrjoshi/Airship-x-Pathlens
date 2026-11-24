import assert from "node:assert/strict";
import { test } from "node:test";
import { formatInvoiceAmount, renderInvoicePdf } from "./invoice-pdf";
import { invoiceDate, invoiceFixture } from "./invoice.fixture";

test("currency formatting respects zero/three-decimal and Stripe special-case amounts", () => {
  assert.equal(formatInvoiceAmount(9900, "usd"), "USD 99.00");
  assert.equal(formatInvoiceAmount(9900, "jpy"), "JPY 9,900");
  assert.equal(formatInvoiceAmount(12345, "kwd"), "KWD 12.345");
  assert.equal(formatInvoiceAmount(500, "isk"), "ISK 5.00");
  assert.equal(formatInvoiceAmount(500, "ugx"), "UGX 5.00");
});

test("renders a real PDF with bundled fonts and no external font requests", async () => {
  const pdf = await renderInvoicePdf("PL-TEST", invoiceDate, invoiceFixture());
  assert.equal(pdf.subarray(0, 5).toString(), "%PDF-");
  assert.ok(pdf.length > 5000);
  assert.match(pdf.toString("latin1"), /\/FontFile2/);
  assert.match(pdf.toString("latin1"), /%%EOF/);
});

test("long item lists paginate and control characters do not break the document", async () => {
  const invoice = invoiceFixture();
  invoice.buyer.name = "José\u0000 Example";
  invoice.items = Array.from({ length: 100 }, (_, index) => ({
    ...invoice.items[0]!,
    description: `Product ${index} ${"details ".repeat(20)}`,
  }));
  const pdf = await renderInvoicePdf("PL-MULTIPAGE", invoiceDate, invoice);
  assert.ok(
    (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length > 1
  );
});
