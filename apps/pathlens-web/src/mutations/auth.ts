import apiClient from '@/lib/apiClient'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from '@/lib/toast'

interface LoginPayload {
  email: string
  password: string
  redirect?: string
}

interface LoginResponse {
  success: boolean
  message: string
  data: {
    token: string
    workspace_id: string
  }
}

const login = async (payload: LoginPayload) => {
  const res = await apiClient.post<LoginResponse>('/auth/login', payload)
  return res.data
}

export const useLogin = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: (data, variables) => {
      if (!data.success) throw new Error(data.message)
      localStorage.setItem('pathlens-token', data.data.token)
      navigate({
        to: variables.redirect || '/app',
        replace: true,
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface ResetPasswordPayload {
  email: string
}

interface ResetPasswordResponse {
  success: boolean
  message: string
}

const resetPassword = async (payload: ResetPasswordPayload) => {
  const res = await apiClient.post<ResetPasswordResponse>(
    '/auth/password-reset/request',
    payload
  )

  if (!res.data.success) {
    throw new Error(res.data.message)
  }

  return res.data
}

export const useResetPassword = () => {
  return useMutation({
    mutationFn: resetPassword,
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface ConfirmPasswordResetPayload {
  token: string
  password: string
  confirmPassword: string
}

export const useConfirmPasswordReset = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (payload: ConfirmPasswordResetPayload) => {
      const res = await apiClient.post<ResetPasswordResponse>(
        '/auth/password-reset/confirm',
        payload
      )

      if (!res.data.success) {
        throw new Error(res.data.message)
      }

      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      navigate({ to: '/login', replace: true })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface SignUpPayload {
  email: string
  password: string
  confirmPassword: string
  name: string
}

interface SignUpResponse {
  success: boolean
  message: string
  data: {
    token: string
    workspace_id: string
  }
}

const signUp = async (payload: SignUpPayload) => {
  const res = await apiClient.post<SignUpResponse>('/auth/sign-up', payload)
  return res.data
}

export const useSignUp = () => {
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: SignUpPayload) => signUp(payload),
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message)
      localStorage.setItem('pathlens-token', data.data.token)
      navigate({
        to: '/app',
        replace: true,
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
