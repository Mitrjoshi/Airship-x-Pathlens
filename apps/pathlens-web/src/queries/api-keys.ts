import apiClient from '@/lib/apiClient'
import type { TrackingScope } from '@workspace/contracts'
import { queryOptions } from '@tanstack/react-query'

export type T_ProjectApiKey = {
  id: string
  name: string
  keyPrefix: string
  secret: string | null
  scopes: TrackingScope[]
  expiresAt: string | null
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

export type T_CreatedProjectApiKey = T_ProjectApiKey & {
  secret: string
}

type ProjectApiKeysResponse = {
  success: boolean
  message?: string
  data: T_ProjectApiKey[]
}

const getProjectApiKeys = async (
  projectId: string
): Promise<ProjectApiKeysResponse> => {
  const response = await apiClient.get(`/projects/${projectId}/api-keys`)

  return response.data
}

export const getProjectApiKeysOptions = (projectId: string) =>
  queryOptions({
    queryKey: ['PROJECT_API_KEYS', projectId],
    queryFn: () => getProjectApiKeys(projectId),
    enabled: Boolean(projectId),
  })
