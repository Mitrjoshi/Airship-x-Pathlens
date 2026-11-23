import { z } from 'zod'

export const createBillingInvoiceSchema = z.object({}).strict()

export const billingInvoiceSchema = z.object({
  invoice_id: z.uuid(),
  invoice_number: z.string(),
  payment_id: z.string(),
  download_url: z.url(),
  expires_at: z.iso.datetime(),
  issued_at: z.iso.datetime(),
  payment_date: z.iso.datetime(),
  currency: z.string(),
  amount_total: z.number().int().positive(),
})

export type BillingInvoice = z.infer<typeof billingInvoiceSchema>
