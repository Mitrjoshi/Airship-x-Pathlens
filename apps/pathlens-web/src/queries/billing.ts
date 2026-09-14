import { queryOptions } from '@tanstack/react-query'

import apiClient from '@/lib/apiClient'

export type BillingEntitlement = {
  user_id: string
  lifetime_access: boolean
  stripe_customer_id: string | null
  stripe_payment_id: string | null
}

type BillingEntitlementResponse = {
  success: boolean
  data: BillingEntitlement
  message?: string
}

export const getBillingEntitlementOptions = () =>
  queryOptions({
    queryKey: ['BILLING_ENTITLEMENT'],
    queryFn: async (): Promise<BillingEntitlementResponse> => {
      const response = await apiClient.get('/billing/entitlement')

      return response.data
    },
  })
