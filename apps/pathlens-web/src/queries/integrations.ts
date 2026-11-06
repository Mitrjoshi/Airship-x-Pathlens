import { queryOptions } from '@tanstack/react-query'
import type {
  GetSlackChannelsResponse,
  GetIntegrationResponse,
  GetIntegrationsResponse,
  GetProjectIntegrationsResponse,
  GetSlackSettingsResponse,
} from '@workspace/contracts'

import apiClient from '@/lib/apiClient'

const getIntegrations = async (): Promise<GetIntegrationsResponse> => {
  const response = await apiClient.get('/integrations')

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

export const getIntegrationsOptions = () =>
  queryOptions({
    queryKey: ['INTEGRATIONS'],
    queryFn: getIntegrations,
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

const getProjectIntegrations = async (
  workspaceId: string,
  projectId: string
): Promise<GetProjectIntegrationsResponse> => {
  const response = await apiClient.get(`/projects/${projectId}/integrations`, {
    params: { workspace_id: workspaceId },
  })
  return response.data
}

export const getProjectIntegrationsOptions = (
  workspaceId: string,
  projectId: string
) =>
  queryOptions({
    queryKey: ['PROJECT_INTEGRATIONS', workspaceId, projectId],
    queryFn: () => getProjectIntegrations(workspaceId, projectId),
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
