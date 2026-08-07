import apiClient from '@/lib/apiClient'
import type { FunnelPayload } from '@/queries/funnels'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface FunnelMutationResponse {
  success: boolean
  message?: string
  data?: {
    id: string
  }
}

const createFunnel = async (payload: FunnelPayload) => {
  const response = await apiClient.post<FunnelMutationResponse>(
    '/funnels',
    payload
  )

  return response.data
}

const updateFunnel = async ({
  id,
  payload,
}: {
  id: string
  payload: FunnelPayload
}) => {
  const response = await apiClient.patch<FunnelMutationResponse>(
    `/funnels/${encodeURIComponent(id)}`,
    payload
  )

  return response.data
}

const deleteFunnel = async ({
  id,
  workspace_id,
  project_id,
}: {
  id: string
  workspace_id: string
  project_id: string
}) => {
  const response = await apiClient.delete<FunnelMutationResponse>(
    `/funnels/${encodeURIComponent(id)}`,
    {
      params: { workspace_id, project_id },
    }
  )

  return response.data
}

function invalidateFunnels(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['FUNNELS'] })
}

export function useCreateFunnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createFunnel,
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to create funnel.')

      await invalidateFunnels(queryClient)
      toast.success('Funnel created.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateFunnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateFunnel,
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to update funnel.')

      await invalidateFunnels(queryClient)
      toast.success('Funnel updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteFunnel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteFunnel,
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to delete funnel.')

      await invalidateFunnels(queryClient)
      toast.success('Funnel deleted.')
    },
    onError: (error) => toast.error(error.message),
  })
}
