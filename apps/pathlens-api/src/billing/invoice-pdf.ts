import PDFDocument from "pdfkit";
import type { InvoiceDocument } from "./invoice.types";

const ZERO_DECIMAL = new Set([
  "bif",
  "clp",
  "djf",
  "gnf",
  "jpy",
  "kmf",
  "krw",
  "mga",
  "pyg",
  "rwf",
  "vnd",
  "vuv",
  "xaf",
  "xof",
  "xpf",
]);
const THREE_DECIMAL = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export function formatInvoiceAmount(amount: number, currency: string) {
  const code = currency.toLowerCase();
  // ISK/UGX use two decimal API amounts despite ISO's zero-decimal display.
  const decimals = ZERO_DECIMAL.has(code) ? 0 : THREE_DECIMAL.has(code) ? 3 : 2;
  return `${code.toUpperCase()} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount / 10 ** decimals)}`;
}

export function renderInvoicePdf(
  number: string,
  issuedAt: Date,
  invoice: InvoiceDocument
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      margin: 48,
      info: {
        Title: `Pathlens Invoice ${number}`,
        Author: invoice.seller.name,
      },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);
    try {
      // Bundled production dependencies: no runtime font downloads or OS fonts.
      document.registerFont(
        "Regular",
        require.resolve("@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff")
      );
      document.registerFont(
        "Bold",
        require.resolve("@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff")
      );
      const text = (value: string, size = 10, bold = false) => {
        document
          .font(bold ? "Bold" : "Regular")
          .fontSize(size)
          .fillColor("#17202a")
          .text(
            value
              .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
              .slice(0, 5000)
          );
      };
      const money = (amount: number) =>
        formatInvoiceAmount(amount, invoice.currency);
      const date = (value: Date) => value.toISOString().slice(0, 10);
      text("PATHLENS", 14, true);
      text("INVOICE · PAID", 22, true);
      document.moveDown();
      text(`Invoice number: ${number}`);
      text(`Issued: ${date(issuedAt)} (UTC)`);
      text(
        `${invoice.paymentDateSource === "stripe_charge" ? "Payment recorded" : "Payment date"}: ${date(new Date(invoice.paymentDate))} (UTC)`
      );
      text(`Payment reference: ${invoice.paymentId}`, 9);
      document.moveDown();
      text("From", 11, true);
      text(invoice.seller.name);
      text(invoice.seller.address);
      text(invoice.seller.email);
      if (invoice.seller.taxId) text(`Tax ID: ${invoice.seller.taxId}`);
      document.moveDown();
      text("Bill to", 11, true);
      text(invoice.buyer.name);
      if (invoice.buyer.email) text(invoice.buyer.email);
      invoice.buyer.address.forEach((line) => text(line));
      document.moveDown();
      text("Purchase details", 12, true);
      for (const item of invoice.items) {
        document.moveDown(0.5);
        text(item.description, 10, true);
        text(
          `Quantity: ${item.quantity}    Subtotal: ${money(item.subtotal)}    Total: ${money(item.total)}`,
          9
        );
      }
      document.moveDown();
      text(`Subtotal: ${money(invoice.subtotal)}`);
      text(`Discount: -${money(invoice.discount)}`);
      text(`Tax within total: ${money(invoice.tax)}`);
      text(`Shipping: ${money(invoice.shipping)}`);
      text(`Total paid: ${money(invoice.total)}`, 14, true);
      document.moveDown();
      text("Payment already received. No further payment is due.", 9);
      text(
        "Issued by the merchant through Pathlens; this is not a Stripe-generated invoice.",
        8
      );
      document.end();
    } catch (error) {
      document.destroy();
      reject(error);
    }
  });
}
