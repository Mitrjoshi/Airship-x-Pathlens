import { queryOptions } from '@tanstack/react-query'

import apiClient from '@/lib/apiClient'

interface FeedbackStatusResponse {
  success: boolean
  data: {
    submitted: boolean
  }
}

export const getFeedbackStatusOptions = () =>
  queryOptions({
    queryKey: ['FEEDBACK_STATUS'],
    queryFn: async () => {
      const response =
        await apiClient.get<FeedbackStatusResponse>('/feedback/status')

      return response.data
    },
  })
