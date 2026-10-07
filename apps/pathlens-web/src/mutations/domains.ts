import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import apiClient from '@/lib/apiClient'

type ProjectDomainResponse = {
  success: boolean
  message?: string
  data: {
    id: string
    projectId: string
    userId: string
    domain: string
    isDefault: boolean
    createdAt: string
  }
}

export const useCreateProjectDomain = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (domain: string) => {
      const response = await apiClient.post<ProjectDomainResponse>(
        `/projects/${projectId}/domains`,
        { domain }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to add domain.')
      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_DOMAINS', projectId],
      })
      await queryClient.invalidateQueries({ queryKey: ['PROJECTS'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useUpdateProjectDomain = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: { domainId: string; domain: string }) => {
      const response = await apiClient.patch<ProjectDomainResponse>(
        `/projects/${projectId}/domains/${payload.domainId}`,
        { domain: payload.domain }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update domain.')
      }
      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_DOMAINS', projectId],
      })
      await queryClient.invalidateQueries({ queryKey: ['PROJECTS'] })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useDeleteProjectDomain = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (domainId: string) => {
      const response = await apiClient.delete<ProjectDomainResponse>(
        `/projects/${projectId}/domains/${domainId}`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to delete domain.')
      }
      await queryClient.invalidateQueries({
        queryKey: ['PROJECT_DOMAINS', projectId],
      })
      await queryClient.invalidateQueries({ queryKey: ['PROJECTS'] })
    },
    onError: (error) => toast.error(error.message),
  })
}
