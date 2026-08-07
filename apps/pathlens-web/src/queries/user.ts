import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type { T_Workspace } from './workspace'

export type T_User = {
  id: string
  name: string
  email: string
  avatar: string | null
  createdAt: string
  defaultWorkspace: T_Workspace
}

export interface UsersResponse {
  success: boolean
  data: T_User
}

const getUsers = async (): Promise<UsersResponse> => {
  const res = await apiClient.get('/auth/me')

  return res.data
}

export const getUsersOptions = () =>
  queryOptions({
    queryKey: ['ME'],
    queryFn: () => getUsers(),
  })
