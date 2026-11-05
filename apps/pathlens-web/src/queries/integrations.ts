import { queryOptions } from '@tanstack/react-query'
import type {
  GetSlackChannelsResponse,
  GetIntegrationsResponse,
  GetProjectIntegrationsResponse,
  GetSlackSettingsResponse,
  SlackProjectSettings,
} from '@workspace/contracts'

import apiClient from '@/lib/apiClient'

const getIntegrations = async (): Promise<GetIntegrationsResponse> => {
  const response = await apiClient.get('/integrations')

  return response.data
}

export const getIntegrationsOptions = () =>
  queryOptions({
    queryKey: ['INTEGRATIONS'],
    queryFn: getIntegrations,
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

export const connectSlack = async (
  workspaceId: string,
  projectId: string,
  returnPath: string
) => {
  const response = await apiClient.get<{ success: boolean; url: string }>(
    '/integrations/slack/connect',
    {
      params: {
        workspace_id: workspaceId,
        project_id: projectId,
        return_path: returnPath,
        response: 'json',
      },
    }
  )
  window.location.assign(response.data.url)
}

export const disconnectSlack = async (
  workspaceId: string,
  projectId: string
) => {
  const response = await apiClient.delete(
    `/projects/${projectId}/integrations/slack`,
    { params: { workspace_id: workspaceId } }
  )
  return response.data
}

export const getSlackChannelsOptions = (
  workspaceId: string,
  projectId: string,
  enabled: boolean
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
    enabled,
  })

export const getSlackSettingsOptions = (
  workspaceId: string,
  projectId: string,
  enabled: boolean
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
    enabled,
  })

export const saveSlackSettings = async (
  workspaceId: string,
  projectId: string,
  settings: SlackProjectSettings
) => {
  const response = await apiClient.put(
    `/projects/${projectId}/integrations/slack/settings`,
    settings,
    { params: { workspace_id: workspaceId } }
  )
  return response.data
}

export const sendSlackTestMessage = async (
  workspaceId: string,
  projectId: string
) => {
  const response = await apiClient.post(
    `/projects/${projectId}/integrations/slack/test`,
    null,
    { params: { workspace_id: workspaceId } }
  )
  return response.data
}
