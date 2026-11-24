# Account entitlement

`GET /api/billing/entitlement` requires the existing Bearer session and returns:

```json
{
  "success": true,
  "data": {
    "user_id": "11111111-1111-4111-8111-111111111111",
    "lifetime_access": true,
    "stripe_customer_id": "cus_example",
    "stripe_payment_id": "pi_example",
    "purchased_at": "2026-11-23T10:00:00.000Z"
  }
}
```

`purchased_at` is a nullable UTC ISO timestamp recorded from the verified Stripe
event that grants paid lifetime access (`checkout.session.completed` or
`checkout.session.async_payment_succeeded`). Retries preserve the stored date.
It is not checkout-session creation time, account signup time, or request time.
Legacy purchases without a recorded date return `null`; backfill them only from
verified payment history. Unauthenticated requests return `401`; missing accounts
return `404`; database failures return `500`.

Apply the generated migration using `pnpm --filter @pathlens/api migrate`
before running the changed API. Test locally with `pnpm --filter @pathlens/api test:billing`;
these tests mock the database and verify locally signed webhook fixtures, not live Stripe deliveries.

## Pathlens payment invoice

`POST /api/billing/invoice` requires the same Bearer session; send no body (or `{}`).
The endpoint verifies the authenticated account's stored Stripe PaymentIntent,
paid Checkout session, ownership metadata, customer, captured charge, and actual
line-item totals. It never accepts a caller-supplied payment/customer ID or amount,
charges a card, creates a Stripe invoice, or sends email.

`201` creates a PDF; `200` reuses the same invoice and issues a new download link:

```json
{
  "success": true,
  "data": {
    "invoice_id": "11111111-1111-4111-8111-111111111111",
    "invoice_number": "PL-11111111-1111-4111-8111-111111111111",
    "payment_id": "pi_example",
    "download_url": "https://example.s3.amazonaws.com/billing/invoices/...",
    "expires_at": "2026-11-23T10:05:00.000Z",
    "issued_at": "2026-11-23T10:00:00.000Z",
    "payment_date": "2026-11-23T09:00:00.000Z",
    "currency": "usd",
    "amount_total": 9900
  }
}
```

Amounts are integer Stripe minor units; no current catalog price is substituted.
Discounts, tax and shipping come from the verified purchase, not new calculations.
The document uses the recorded purchase event timestamp; legacy purchases fall
back to the successful Stripe charge's **creation** date, labeled "Payment recorded".
An existing invoice keeps its original merchant/customer/amount snapshot.
Every request rechecks Stripe: refunded, disputed or unpaid payments return `409`.
Tax invoices, credit notes, sequential statutory numbering and jurisdiction-specific
compliance are outside this endpoint; review the merchant's legal requirements.

### Setup and behavior

- Apply the generated migration; it adds `billing_invoices` for durable, unique
  per-payment identities and immutable snapshots. Pending generations resume on retry;
  concurrent requests lock the same row rather than generating duplicate invoices.
- Configure `STRIPE_SECRET_KEY`, `S3_BUCKET`, `AWS_REGION`,
  `INVOICE_BUSINESS_NAME`, `INVOICE_BUSINESS_ADDRESS`, `INVOICE_BUSINESS_EMAIL`.
  `INVOICE_TAX_ID` is optional. Use the merchant's actual legal details.
- Keep S3 private. Grant the API role `s3:PutObject` and `s3:GetObject` on
  `billing/invoices/*`; exclude this prefix from temporary-upload lifecycle rules.
  PDFs are uploaded server-side, so generation does not require S3 upload CORS.
- Download URLs expire after five minutes and must be treated as private bearer links.
  Call the endpoint again for a fresh link. Do not cache the response.
- Fonts are bundled production dependencies; no external fonts are fetched at runtime.
- Errors: `400` unexpected body fields; `401` no session; `403` ownership mismatch;
  `404` no account/payment; `409` unverifiable, unpaid, refunded or disputed payment;
  `502` Stripe failure; `503` missing business/storage config or failed S3 upload;
  `500` unexpected generation/database failure. Internal provider errors aren't returned.
- The dashboard hook is `useCreateBillingInvoice` in `src/mutations/billing.ts`.
  It returns the typed metadata/link; no billing-page UI is changed.
- Run `pnpm --filter @pathlens/api test:invoices`. These checks exercise the real
  PDF renderer and local URL signing with mocked Stripe, database and S3 calls;
  they do not establish live provider access or deployed bucket permissions.
