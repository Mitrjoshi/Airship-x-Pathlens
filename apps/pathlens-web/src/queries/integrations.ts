import { queryOptions } from '@tanstack/react-query'
import type {
  GetSlackChannelsResponse,
  GetIntegrationResponse,
  GetIntegrationCategoriesResponse,
  GetIntegrationsResponse,
  GetSlackSettingsResponse,
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
