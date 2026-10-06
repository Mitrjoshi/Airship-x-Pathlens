import apiClient from '@/lib/apiClient'
import type { TrackingScope } from '@workspace/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  T_CreatedProjectApiKey,
  T_ProjectApiKey,
} from '@/queries/api-keys'

type ProjectApiKeyPayload = {
  name: string
  scopes: TrackingScope[]
  expiresAt: string | null
}

type ProjectApiKeyResponse = {
  success: boolean
  message?: string
  data: T_ProjectApiKey
}

type CreateProjectApiKeyResponse = Omit<ProjectApiKeyResponse, 'data'> & {
  data: T_CreatedProjectApiKey
}

type RevokeProjectApiKeyResponse = {
  success: boolean
  message?: string
  data: {
    id: string
    revokedAt: string
  }
}

const invalidateProjectApiKeys = async (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string
) => {
  await queryClient.invalidateQueries({
    queryKey: ['PROJECT_API_KEYS', projectId],
  })
}

export const useCreateProjectApiKey = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: ProjectApiKeyPayload
    ): Promise<CreateProjectApiKeyResponse> => {
      const response = await apiClient.post<CreateProjectApiKeyResponse>(
        `/projects/${projectId}/api-keys`,
        payload
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to create API key.')
      }

      await invalidateProjectApiKeys(queryClient, projectId)
      toast.success('API key created.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useUpdateProjectApiKey = (projectId: string, keyId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: ProjectApiKeyPayload
    ): Promise<ProjectApiKeyResponse> => {
      const response = await apiClient.patch<ProjectApiKeyResponse>(
        `/projects/${projectId}/api-keys/${keyId}`,
        payload
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update API key.')
      }

      await invalidateProjectApiKeys(queryClient, projectId)
      toast.success('API key updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useRevokeProjectApiKey = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (keyId: string): Promise<RevokeProjectApiKeyResponse> => {
      const response = await apiClient.delete<RevokeProjectApiKeyResponse>(
        `/projects/${projectId}/api-keys/${keyId}`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to revoke API key.')
      }

      await invalidateProjectApiKeys(queryClient, projectId)
      toast.success('API key revoked.')
    },
    onError: (error) => toast.error(error.message),
  })
}
