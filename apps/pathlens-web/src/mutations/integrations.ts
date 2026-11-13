import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'

import type {
  PageSpeedResponse,
  PageSpeedStrategy,
  SearchConsoleResponse,
  SlackProjectSettings,
} from '@workspace/contracts'

import apiClient from '@/lib/apiClient'

interface SlackMutationResponse {
  success: boolean
  message?: string
}

interface ConnectSlackResponse extends SlackMutationResponse {
  url?: string
}

interface PageSpeedMutationResponse extends SlackMutationResponse {
  data?: PageSpeedResponse['data']
}

interface SearchConsoleMutationResponse extends SlackMutationResponse {
  data?: SearchConsoleResponse['data']
}

function invalidateIntegrationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  projectId: string
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ['PROJECT_INTEGRATIONS', workspaceId, projectId],
    }),
    queryClient.invalidateQueries({ queryKey: ['INTEGRATIONS'] }),
    queryClient.invalidateQueries({ queryKey: ['INTEGRATION'] }),
  ])
}

export const useConnectSlack = (workspaceId: string, projectId: string) =>
  useMutation({
    mutationFn: async (returnPath: string) => {
      const response = await apiClient.get<ConnectSlackResponse>(
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

      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.url) {
        throw new Error(data.message ?? 'Unable to connect Slack.')
      }

      window.location.assign(data.url)
    },
    onError: (error) => toast.error(error.message),
  })

export const useInstallGooglePageSpeed = (
  workspaceId: string,
  projectId: string
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<SlackMutationResponse>(
        `/projects/${projectId}/integrations/pagespeed-insights`,
        null,
        { params: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(
          data.message ?? 'Unable to install Google PageSpeed Insights.'
        )
      }

      await invalidateIntegrationQueries(queryClient, workspaceId, projectId)
      toast.success('Google PageSpeed Insights installed.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useCheckGooglePageSpeed = (
  workspaceId: string,
  projectId: string
) =>
  useMutation({
    mutationFn: async (input: {
      domainId: string
      strategy: PageSpeedStrategy
    }) => {
      const response = await apiClient.post<PageSpeedMutationResponse>(
        `/projects/${projectId}/integrations/pagespeed-insights/check`,
        input,
        { params: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data) {
        throw new Error(data.message ?? 'Unable to check this domain.')
      }
    },
    onError: (error) => toast.error(error.message),
  })

export const useConnectGoogleSearchConsole = (
  workspaceId: string,
  projectId: string
) =>
  useMutation({
    mutationFn: async (returnPath: string) => {
      const response = await apiClient.get<{ success: boolean; url?: string }>(
        '/integrations/google-search-console/connect',
        {
          params: {
            workspace_id: workspaceId,
            project_id: projectId,
            return_path: returnPath,
            response: 'json',
          },
        }
      )
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.url) {
        throw new Error(
          'Unable to connect Google Search Console. Please try again.'
        )
      }
      window.location.assign(data.url)
    },
    onError: (error) => toast.error(error.message),
  })

export const useCheckGoogleSearchConsole = (
  workspaceId: string,
  projectId: string
) =>
  useMutation({
    mutationFn: async (input: { domainId: string; days: 7 | 28 | 90 }) => {
      const response = await apiClient.post<SearchConsoleMutationResponse>(
        `/projects/${projectId}/integrations/google-search-console/check`,
        input,
        { params: { workspace_id: workspaceId } }
      )
      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.data) {
        throw new Error(data.message ?? 'Unable to load Search Console data.')
      }
    },
    onError: (error) => toast.error(error.message),
  })

export const useDisconnectSlack = (workspaceId: string, projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete<SlackMutationResponse>(
        `/projects/${projectId}/integrations/slack`,
        { params: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to disconnect Slack.')
      }

      await invalidateIntegrationQueries(queryClient, workspaceId, projectId)
      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_SLACK_SETTINGS', workspaceId, projectId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_SLACK_CHANNELS', workspaceId, projectId],
      })
      toast.success('Slack disconnected.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useSaveSlackSettings = (
  workspaceId: string,
  projectId: string
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (settings: SlackProjectSettings) => {
      const response = await apiClient.put<SlackMutationResponse>(
        `/projects/${projectId}/integrations/slack/settings`,
        settings,
        { params: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to save Slack settings.')
      }

      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_SLACK_SETTINGS', workspaceId, projectId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_INTEGRATIONS', workspaceId, projectId],
      })
      toast.success('Slack settings saved.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useInviteSlackToChannel = (
  workspaceId: string,
  projectId: string
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (channelId: string) => {
      const response = await apiClient.post<SlackMutationResponse>(
        `/projects/${projectId}/integrations/slack/channels/${channelId}/invite`,
        null,
        { params: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to invite Pathlens.')
      }

      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_SLACK_CHANNELS', workspaceId, projectId],
      })
      toast.success('Pathlens invited to the Slack channel.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useSendSlackTestMessage = (
  workspaceId: string,
  projectId: string
) =>
  useMutation({
    mutationFn: async (input: { channelId: string }) => {
      const response = await apiClient.post<SlackMutationResponse>(
        `/projects/${projectId}/integrations/slack/test`,
        input,
        { params: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to send Slack test message.')
      }

      toast.success('Slack test message sent.')
    },
    onError: (error) => toast.error(error.message),
  })

export const useConnectStripe = (workspaceId: string, projectId: string) =>
  useMutation({
    mutationFn: async (returnPath: string) => {
      const response = await apiClient.get<ConnectSlackResponse>(
        '/integrations/stripe/connect',
        {
          params: {
            workspace_id: workspaceId,
            project_id: projectId,
            return_path: returnPath,
            response: 'json',
          },
        }
      )

      return response.data
    },
    onSuccess: (data) => {
      if (!data.success || !data.url) {
        throw new Error(data.message ?? 'Unable to connect Slack.')
      }

      window.location.assign(data.url)
    },
    onError: (error) => toast.error(error.message),
  })
