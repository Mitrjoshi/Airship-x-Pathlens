import { queryOptions } from '@tanstack/react-query'
import type {
  GetSlackChannelsResponse,
  GetIntegrationResponse,
  GetIntegrationCategoriesResponse,
  GetIntegrationsResponse,
  GetSlackSettingsResponse,
  GetSlackNotificationHistoryResponse,
} from '@workspace/contracts'

import apiClient from '@/lib/apiClient'

export type IntegrationFilters = {
  category?: string
  filter?: 'all' | 'installed'
  projectId?: string
}

const getIntegrations = async (
  filters: IntegrationFilters = {}
): Promise<GetIntegrationsResponse> => {
  const response = await apiClient.get('/integrations', {
    params: {
      category: filters.category,
      filter: filters.filter,
      project_id: filters.projectId,
    },
  })

  return response.data
}

const getIntegrationById = async (
  integrationId: string,
  projectId?: string
): Promise<GetIntegrationResponse> => {
  const response = await apiClient.get(`/integrations/${integrationId}`, {
    params: projectId ? { project_id: projectId } : undefined,
  })

  return response.data
}

export const getIntegrationsOptions = (filters: IntegrationFilters = {}) =>
  queryOptions({
    queryKey: ['INTEGRATIONS', filters],
    queryFn: () => getIntegrations(filters),
  })

const getIntegrationCategories =
  async (): Promise<GetIntegrationCategoriesResponse> => {
    const response = await apiClient.get('/integrations/categories')

    return response.data
  }

export const getIntegrationCategoriesOptions = () =>
  queryOptions({
    queryKey: ['INTEGRATION_CATEGORIES'],
    queryFn: getIntegrationCategories,
  })

export const getIntegrationByIdOptions = (
  integrationId: string,
  projectId?: string
) =>
  queryOptions({
    queryKey: ['INTEGRATION', integrationId, projectId],
    queryFn: () => getIntegrationById(integrationId, projectId),
    enabled: Boolean(integrationId),
  })

export const getSlackChannelsOptions = (
  workspaceId: string,
  projectId: string
) =>
  queryOptions({
    queryKey: ['PROJECT_SLACK_CHANNELS', workspaceId, projectId],
    queryFn: async (): Promise<GetSlackChannelsResponse> => {
      const response = await apiClient.get(
        `/projects/${projectId}/integrations/slack/channels`,
        { params: { workspace_id: workspaceId } }
      )
      return response.data
    },
  })

export const getSlackSettingsOptions = (
  workspaceId: string,
  projectId: string
) =>
  queryOptions({
    queryKey: ['PROJECT_SLACK_SETTINGS', workspaceId, projectId],
    queryFn: async (): Promise<GetSlackSettingsResponse> => {
      const response = await apiClient.get(
        `/projects/${projectId}/integrations/slack/settings`,
        { params: { workspace_id: workspaceId } }
      )
      return response.data
    },
  })

export const getSlackNotificationHistoryOptions = (
  workspaceId: string,
  projectId: string
) => ({
  queryKey: [
    'PROJECT_SLACK_NOTIFICATION_HISTORY',
    workspaceId,
    projectId,
    'slack',
  ],
  queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
    const response = await apiClient.get<GetSlackNotificationHistoryResponse>(
      `/projects/${projectId}/integrations/slack/notifications`,
      {
        params: {
          workspace_id: workspaceId,
          limit: 20,
          cursor: pageParam,
        },
      }
    )
    return response.data
  },
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage: GetSlackNotificationHistoryResponse) =>
    lastPage.data.nextCursor ?? undefined,
})

export interface StripeOverviewResponse {
  success: boolean
  data: StripeOverviewData
}

export interface StripeOverviewData {
  period: StripeOverviewPeriod
  account: StripeOverviewAccount
  revenue: StripeOverviewRevenue
  payments: StripeOverviewPayments
  subscriptions: StripeOverviewSubscriptions
  revenue_by_day: StripeRevenueByDay[]
}

export interface StripeOverviewPeriod {
  start: string
  end: string
  days: number
}

export interface StripeOverviewAccount {
  id: string
}

export interface StripeOverviewRevenue {
  gross: Record<string, number>
  refunds: Record<string, number>
  net_after_refunds: Record<string, number>
  unit: 'minor'
  fees_included: boolean
}

export interface StripeOverviewPayments {
  successful_charges: number
  failed_payment_intents: number
  total_payment_intents: number
}

export interface StripeOverviewSubscriptions {
  active: number
  trialing: number
  canceled: number
  total: number
  snapshot: boolean
}

export interface StripeRevenueByDay {
  date: string
  gross: Record<string, number>
  refunds: Record<string, number>
}

export type StripeOverviewParams = {
  project_id: string
  workspace_id: string
  days: number
}

const getStripeOverview = async (
  params: StripeOverviewParams
): Promise<StripeOverviewResponse> => {
  const response = await apiClient.get(
    `/projects/${params.project_id}/integrations/stripe/overview`,
    {
      params,
    }
  )

  return response.data
}

export const getStripeOverviewOptions = (params: StripeOverviewParams) =>
  queryOptions({
    queryKey: ['STRIPE_OVERVIEW', params.project_id, params.days],
    queryFn: () => getStripeOverview(params),
  })
