export class InvoiceError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
  }
}

// Persist this snapshot before PDF generation so retries cannot change invoices.
export interface InvoiceDocument {
  seller: { name: string; address: string; email: string; taxId: string | null };
  buyer: { name: string; email: string; address: string[] };
  paymentId: string;
  paymentDate: string;
  paymentDateSource: "purchase_event" | "stripe_charge";
  currency: string;
  items: Array<{ description: string; quantity: number; subtotal: number; total: number }>;
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
}
