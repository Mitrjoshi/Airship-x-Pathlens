import type { GetDashboardIntegrationsResponse } from '@workspace/contracts'
import type {
  GoogleSearchConsoleDashboardResponse,
  PageSpeedDashboardResponse,
  StripeDashboardResponse,
} from '@workspace/contracts'
import {
  googleSearchConsoleDashboardResponseSchema,
  getDashboardIntegrationsResponseSchema,
  pageSpeedDashboardResponseSchema,
  stripeDashboardResponseSchema,
} from '@workspace/contracts'
import { queryOptions } from '@tanstack/react-query'

import apiClient from '@/lib/apiClient'
import type { DashboardRange } from './dashboard'

export const getDashboardIntegrationsOptions = (
  workspaceId: string,
  projectId: string
) =>
  queryOptions({
    queryKey: ['DASHBOARD_INTEGRATIONS', workspaceId, projectId],
    queryFn: async (): Promise<GetDashboardIntegrationsResponse> => {
      const response = await apiClient.get(
        `/projects/${projectId}/dashboard-integrations`,
        { params: { workspace_id: workspaceId } }
      )

      return getDashboardIntegrationsResponseSchema.parse(response.data)
    },
    enabled: Boolean(workspaceId && projectId),
  })

export const getGoogleSearchConsoleDashboardOptions = (input: {
  workspaceId: string
  projectId: string
  domain: string
  range: DashboardRange
  enabled?: boolean
}) =>
  queryOptions({
    queryKey: [
      'DASHBOARD_INTEGRATION',
      input.workspaceId,
      input.projectId,
      'google-search-console',
      input.domain,
      input.range,
    ],
    queryFn: async (): Promise<GoogleSearchConsoleDashboardResponse> => {
      const response = await apiClient.get(
        `/projects/${input.projectId}/dashboard-integrations/google-search-console`,
        {
          params: {
            workspace_id: input.workspaceId,
            domain: input.domain,
            range: input.range,
          },
        }
      )
      return googleSearchConsoleDashboardResponseSchema.parse(response.data)
    },
    enabled:
      Boolean(input.workspaceId && input.projectId && input.domain) &&
      (input.enabled ?? true),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

export const getStripeDashboardOptions = (input: {
  workspaceId: string
  projectId: string
  range: DashboardRange
  enabled?: boolean
}) =>
  queryOptions({
    queryKey: [
      'DASHBOARD_INTEGRATION',
      input.workspaceId,
      input.projectId,
      'stripe',
      input.range,
    ],
    queryFn: async (): Promise<StripeDashboardResponse> => {
      const response = await apiClient.get(
        `/projects/${input.projectId}/dashboard-integrations/stripe`,
        {
          params: {
            workspace_id: input.workspaceId,
            range: input.range,
          },
        }
      )
      return stripeDashboardResponseSchema.parse(response.data)
    },
    enabled:
      Boolean(input.workspaceId && input.projectId) && (input.enabled ?? false),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })

export const getPageSpeedDashboardOptions = (input: {
  workspaceId: string
  projectId: string
  domain: string
  strategy: 'mobile' | 'desktop'
  enabled?: boolean
}) =>
  queryOptions({
    queryKey: [
      'DASHBOARD_INTEGRATION',
      input.workspaceId,
      input.projectId,
      'pagespeed-insights',
      input.domain,
      input.strategy,
    ],
    queryFn: async (): Promise<PageSpeedDashboardResponse> => {
      const response = await apiClient.get(
        `/projects/${input.projectId}/dashboard-integrations/pagespeed-insights`,
        {
          params: {
            workspace_id: input.workspaceId,
            domain: input.domain,
            strategy: input.strategy,
          },
        }
      )
      return pageSpeedDashboardResponseSchema.parse(response.data)
    },
    enabled:
      Boolean(input.workspaceId && input.projectId && input.domain) &&
      (input.enabled ?? false),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  })
