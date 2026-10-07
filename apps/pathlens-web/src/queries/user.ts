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

export type T_PublicUser = Omit<T_User, 'defaultWorkspace'> & {
  role: string
  permissionProfileId: string | null
  permissionProfileName: string | null
}

export interface PublicUserResponse {
  success: boolean
  data: T_PublicUser
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

const getUserById = async (
  userId: string,
  workspaceId: string
): Promise<PublicUserResponse> => {
  const res = await apiClient.get(`/auth/users/${userId}`, {
    params: { workspace_id: workspaceId },
  })

  return res.data
}

export const getUserByIdOptions = (userId: string, workspaceId: string) =>
  queryOptions({
    queryKey: ['USER', userId, workspaceId],
    queryFn: () => getUserById(userId, workspaceId),
    enabled: Boolean(userId && workspaceId),
  })
