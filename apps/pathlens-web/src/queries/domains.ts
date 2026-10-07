import { queryOptions } from '@tanstack/react-query'

import apiClient from '@/lib/apiClient'

export type T_ProjectDomain = {
  id: string
  projectId: string
  userId: string
  domain: string
  isDefault: boolean
  createdAt: string
}

export interface ProjectDomainsResponse {
  success: boolean
  data: T_ProjectDomain[]
}

export const getProjectDomainsOptions = (projectId: string) =>
  queryOptions({
    queryKey: ['PROJECT_DOMAINS', projectId],
    queryFn: async (): Promise<ProjectDomainsResponse> => {
      const response = await apiClient.get(`/projects/${projectId}/domains`)

      return response.data
    },
    enabled: Boolean(projectId),
  })
