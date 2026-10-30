import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type T_Projects = {
  id: string
  workspaceId: string
  name: string
  domain: string | null
  domains: string[]
  faviconUrl: string | null
  description: string | null
  captureReplay: boolean
  capturePerformance: boolean
  captureErrors: boolean
  apiKey: string
  createdAt: string
  snapshot: {
    status: 'pending' | 'processing' | 'ready' | 'stale' | 'failed'
    url: string | null
    capturedAt: string | null
    isStale: boolean
  }
  stats: {
    visitors: number
    sessions: number
    pageViews: number
    events: number
    conversion: number
    status: 'active' | 'inactive'
    lastActivityAt: string | null
    performance: {
      label: string
      value: string | null
      samples: number
    }[]
    recentActivity: {
      id: string
      label: string
      meta: string
      occurredAt: string
    }[]
  }
}
export interface UsersResponse {
  success: boolean
  data: T_Projects[]
}

export interface ActiveProjectDomainsCountResponse {
  success: boolean
  data: {
    count: number
  }
}

const getProjects = async (params: {
  workspace_id: string
  project_id?: string
}): Promise<UsersResponse> => {
  const res = await apiClient.get('/projects', {
    params,
  })

  return res.data
}

export const getProjectsOptions = (params: {
  workspace_id: string
  project_id?: string
}) =>
  queryOptions({
    queryKey: ['PROJECTS', params],
    queryFn: () => getProjects(params),
  })

export const getActiveProjectDomainsCount =
  async (): Promise<ActiveProjectDomainsCountResponse> => {
    const res = await apiClient.get('/projects/active')

    return res.data
  }

export const getActiveProjectDomainsCountOptions = () =>
  queryOptions({
    queryKey: ['ACTIVE_PROJECT_DOMAINS_COUNT'],
    queryFn: getActiveProjectDomainsCount,
  })
