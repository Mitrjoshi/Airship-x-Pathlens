import type {
  CreateFeedbackPayload,
  FeedbackCategory,
} from '@workspace/contracts'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import apiClient from '@/lib/apiClient'

interface CreateFeedbackResponse {
  success: boolean
  data: {
    id: string
    category: FeedbackCategory
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

export const useCreateFeedback = () =>
  useMutation({
    mutationFn: createFeedback,
    onSuccess: () => toast.success('Thanks for sharing your feedback.'),
    onError: (error) => toast.error(error.message),
  })
