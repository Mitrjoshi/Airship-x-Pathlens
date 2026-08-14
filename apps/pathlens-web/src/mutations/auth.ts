import apiClient from '@/lib/apiClient'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

interface LoginPayload {
  email: string
  password: string
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

interface PasswordResetRequestPayload {
  email: string
}

interface PasswordResetConfirmPayload {
  token: string
  password: string
  confirmPassword: string
}

interface PasswordResetResponse {
  success: boolean
  message: string
}

const requestPasswordReset = async (payload: PasswordResetRequestPayload) => {
  const res = await apiClient.post<PasswordResetResponse>(
    '/auth/password-reset/request',
    payload
  )
  return res.data
}

const confirmPasswordReset = async (payload: PasswordResetConfirmPayload) => {
  const res = await apiClient.post<PasswordResetResponse>(
    '/auth/password-reset/confirm',
    payload
  )
  return res.data
}

export const useRequestPasswordReset = () => {
  return useMutation({
    mutationFn: (payload: PasswordResetRequestPayload) =>
      requestPasswordReset(payload),
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

export const useConfirmPasswordReset = () => {
  return useMutation({
    mutationFn: (payload: PasswordResetConfirmPayload) =>
      confirmPasswordReset(payload),
    onSuccess: (data) => {
      if (!data.success) throw new Error(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
