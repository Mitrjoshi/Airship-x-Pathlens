import type { CreateFeedbackPayload } from '@workspace/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import apiClient from '@/lib/apiClient'

interface CreateFeedbackResponse {
  success: boolean
  data: {
    id: string
    createdAt: string
  }
  message?: string
}

const createFeedback = async (
  payload: CreateFeedbackPayload
): Promise<CreateFeedbackResponse> => {
  const response = await apiClient.post<CreateFeedbackResponse>(
    '/feedback',
    payload
  )

  if (!response.data.success) {
    throw new Error(response.data.message ?? 'Unable to send feedback.')
  }

  return response.data
}

export const useCreateFeedback = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createFeedback,
    onSuccess: () => {
      queryClient.setQueryData(['FEEDBACK_STATUS'], {
        success: true,
        data: { submitted: true },
      })
      toast.success('Thanks for sharing your feedback.')
    },
    onError: (error) => toast.error(error.message),
  })
}
