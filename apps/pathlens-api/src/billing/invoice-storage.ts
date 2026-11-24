import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { InvoiceError } from "./invoice.types";

export const INVOICE_URL_TTL_SECONDS = 300;
let s3: S3Client | undefined;
function client() {
  const region = process.env.AWS_REGION?.trim();
  if (!region)
    throw new InvoiceError(503, "Invoice storage is not configured.");
  return (s3 ??= new S3Client({ region }));
}
export function invoiceBucket() {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket)
    throw new InvoiceError(503, "Invoice storage is not configured.");
  return bucket;
}
type StoredInvoice = {
  bucket: string;
  storageKey: string;
  invoiceNumber: string;
};

export async function storeInvoicePdf(invoice: StoredInvoice, body: Buffer) {
  try {
    await client().send(
      new PutObjectCommand({
        Bucket: invoice.bucket,
        Key: invoice.storageKey,
        Body: body,
        ContentType: "application/pdf",
        ContentDisposition: `attachment; filename="${invoice.invoiceNumber}.pdf"`,
        CacheControl: "private, no-store",
        // A retry after an upload/DB interruption reuses the immutable object.
        IfNoneMatch: "*",
      })
    );
  } catch (error) {
    if (
      (error as { $metadata?: { httpStatusCode?: number } }).$metadata
        ?.httpStatusCode === 412
    )
      return;
    if (error instanceof InvoiceError) throw error;
    console.error("Invoice storage failed.", error);
    throw new InvoiceError(
      503,
      "Unable to store the invoice. Please try again."
    );
  }
}

export async function invoiceDownload(invoice: StoredInvoice) {
  const url = await getSignedUrl(
    client(),
    new GetObjectCommand({
      Bucket: invoice.bucket,
      Key: invoice.storageKey,
      ResponseContentType: "application/pdf",
      ResponseContentDisposition: `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      ResponseCacheControl: "private, no-store",
    }),
    { expiresIn: INVOICE_URL_TTL_SECONDS }
  );
  return {
    url,
    expiresAt: new Date(Date.now() + INVOICE_URL_TTL_SECONDS * 1000),
  };
}
