import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type T_WorkspaceUsage = {
  period: {
    start: string
    end: string
  }
  usage: {
    pageViews: number
    events: number
    recordings: number
    storageBytes: number
    projects: number
    members: number
    funnels: number
    goals: number
    workspaces: number
  }
}

interface WorkspaceUsageResponse {
  success: boolean
  data: T_WorkspaceUsage
}

export const getUsageOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['WORKSPACE_USAGE', workspaceId],
    queryFn: async (): Promise<WorkspaceUsageResponse> => {
      const response = await apiClient.get(`/workspaces/${workspaceId}/usage`)

      return response.data
    },
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  })
