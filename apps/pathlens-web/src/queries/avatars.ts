import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type AvatarOption = {
  id: string
  name: string
  category: string
  url: string | null
}

type AvatarOptionsResponse = {
  success: boolean
  data: AvatarOption[]
}

export const getAvatarOptions = () =>
  queryOptions({
    queryKey: ['AVATAR_OPTIONS'],
    queryFn: async (): Promise<AvatarOptionsResponse> => {
      const response = await apiClient.get('/auth/avatars')

      return response.data
    },
    staleTime: 30 * 60 * 1000,
  })
