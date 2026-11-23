import { useMutation } from '@tanstack/react-query'
import { toast } from '@/lib/toast'

import apiClient from '@/lib/apiClient'
import { billingInvoiceSchema, type BillingInvoice } from '@workspace/contracts'

export function useCreateBillingInvoice() {
  return useMutation({
    mutationFn: async (): Promise<BillingInvoice> => {
      const response = await apiClient.post('/billing/invoice')
      if (!response.data.success) {
        throw new Error(response.data.message ?? 'Unable to create the invoice.')
      }
      return billingInvoiceSchema.parse(response.data.data)
    },
    retry: false,
    onError: (error) => toast.error(error.message),
  })
}

type CheckoutResponse = {
  success: boolean
  data?: { checkout_url: string | null }
  message?: string
}

export function useLifetimeCheckout() {
  return useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const response = await apiClient.post('/billing/lifetime/checkout')
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data?.checkout_url) {
        toast.error(data.message ?? 'Unable to start lifetime checkout.')
        return
      }

      window.location.assign(data.data.checkout_url)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Unable to start checkout.'
      )
    },
  })
}
