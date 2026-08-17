import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import apiClient from '@/lib/apiClient'

type AccountResponse = {
  success: boolean
  message?: string
}

type UpdateProfilePayload = {
  name: string
  email: string
}

type UpdateProfileResponse = AccountResponse & {
  data?: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: UpdateProfilePayload
    ): Promise<UpdateProfileResponse> => {
      const response = await apiClient.patch<UpdateProfileResponse>(
        '/auth/me',
        payload
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update your profile.')
      }

      await queryClient.invalidateQueries({ queryKey: ['ME'] })
      toast.success('Profile updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (
      payload: ChangePasswordPayload
    ): Promise<AccountResponse> => {
      const response = await apiClient.patch<AccountResponse>(
        '/auth/me/password',
        payload
      )

      return response.data
    },
    onSuccess: (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update your password.')
      }

      toast.success('Password updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useDeleteAccount = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: {
      password: string
    }): Promise<AccountResponse> => {
      const response = await apiClient.delete<AccountResponse>('/auth/me', {
        data: payload,
      })

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to delete your account.')
      }

      localStorage.removeItem('pathlens-token')
      queryClient.clear()
      toast.success('Your account has been deleted.')
      await navigate({ to: '/login', replace: true })
    },
    onError: (error) => toast.error(error.message),
  })
}
