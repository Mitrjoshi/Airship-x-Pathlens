import apiClient from '@/lib/apiClient'
import type { GoalPayload } from '@/queries/goals'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface GoalMutationResponse {
  success: boolean
  message?: string
  data?: {
    id: string
  }
}

const createGoal = async (payload: GoalPayload) => {
  const response = await apiClient.post<GoalMutationResponse>('/goals', payload)

  return response.data
}

const updateGoal = async ({
  id,
  payload,
}: {
  id: string
  payload: GoalPayload
}) => {
  const response = await apiClient.patch<GoalMutationResponse>(
    `/goals/${encodeURIComponent(id)}`,
    payload
  )

  return response.data
}

const deleteGoal = async ({
  id,
  workspace_id,
  project_id,
}: {
  id: string
  workspace_id: string
  project_id: string
}) => {
  const response = await apiClient.delete<GoalMutationResponse>(
    `/goals/${encodeURIComponent(id)}`,
    {
      params: { workspace_id, project_id },
    }
  )

  return response.data
}

function invalidateGoals(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['GOALS'] })
}

export function useCreateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createGoal,
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to create goal.')

      await invalidateGoals(queryClient)
      toast.success('Goal created.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateGoal,
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to update goal.')

      await invalidateGoals(queryClient)
      toast.success('Goal updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to delete goal.')

      await invalidateGoals(queryClient)
      toast.success('Goal deleted.')
    },
    onError: (error) => toast.error(error.message),
  })
}
