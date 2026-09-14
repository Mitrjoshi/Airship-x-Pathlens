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
    heatmapPages: number
  }
  limits: {
    pageViews: number
    events: number
    recordings: number
    heatmapPages: number
    projects: number
    funnels: number
    goals: number
  }
  status: 'active' | 'warning' | 'paused'
  warningAt: string | null
  pauseAt: string | null
  pausedAt: string | null
  accountLifetimeAccess: boolean
  projectBreakdown: Array<{
    projectId: string
    pageViews: number
    events: number
    recordings: number
    heatmapPages: number
    funnels: number
    goals: number
  }>
}

interface WorkspaceUsageResponse {
  success: boolean
  data: T_WorkspaceUsage
}

export const getUsageOptions = (workspaceId: string, projectId?: string) =>
  queryOptions({
    queryKey: ['WORKSPACE_USAGE', workspaceId, projectId],
    queryFn: async (): Promise<WorkspaceUsageResponse> => {
      const response = await apiClient.get(`/workspaces/${workspaceId}/usage`, {
        params: { project_id: projectId },
      })

      return response.data
    },
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  })
