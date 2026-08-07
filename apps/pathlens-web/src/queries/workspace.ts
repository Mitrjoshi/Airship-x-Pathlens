import apiClient from '@/lib/apiClient'
import type { Permission } from '@workspace/contracts'
import { queryOptions } from '@tanstack/react-query'

export type T_Workspace = {
  id: string
  userId: string
  name: string
  isDefault: boolean
  createdAt: string
  role?: string
  permissionProfileId: string | null
  permissionProfileName: string | null
  permissions: Permission[]
  projectCount: number
  memberCount: number
}

interface WorkspacesResponse {
  success: boolean
  data: T_Workspace[]
}

const getWorkspaces = async (): Promise<WorkspacesResponse> => {
  const response = await apiClient.get('/workspaces')

  return response.data
}

export const getWorkspacesOptions = () =>
  queryOptions({
    queryKey: ['WORKSPACES'],
    queryFn: getWorkspaces,
  })

export type T_WorkspaceMember = {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  permissionProfileId: string | null
  permissionProfileName: string | null
  joinedAt: string | null
}

export type T_WorkspaceInvitation = {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  permissionProfileId: string | null
  permissionProfileName: string | null
  createdAt: string | null
}

interface WorkspaceMembersResponse {
  success: boolean
  data: T_WorkspaceMember[]
}

export const getWorkspaceMembersOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['WORKSPACE_MEMBERS', workspaceId],
    queryFn: async (): Promise<WorkspaceMembersResponse> => {
      const response = await apiClient.get(`/workspaces/${workspaceId}/members`)

      return response.data
    },
    enabled: Boolean(workspaceId),
  })

export const getWorkspaceInvitationsOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['WORKSPACE_INVITATIONS', workspaceId],
    queryFn: async (): Promise<{
      success: boolean
      data: T_WorkspaceInvitation[]
    }> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/invitations`
      )

      return response.data
    },
    enabled: Boolean(workspaceId),
  })

export type T_PermissionProfile = {
  id: string
  workspaceId: string
  name: string
  description: string | null
  permissions: Permission[]
  isSystem: boolean
  createdAt: string
  updatedAt: string
  memberCount: number
  pendingInvitationCount: number
}

interface PermissionProfilesResponse {
  success: boolean
  data: T_PermissionProfile[]
}

export const getWorkspacePermissionProfilesOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['WORKSPACE_PERMISSION_PROFILES', workspaceId],
    queryFn: async (): Promise<PermissionProfilesResponse> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/permission-profiles`
      )

      return response.data
    },
    enabled: Boolean(workspaceId),
  })

export type T_WorkspaceNotification = {
  id: string
  type: string
  role: string
  permissionProfileId: string | null
  permissionProfileName: string | null
  workspaceId: string
  workspaceName: string
  senderName: string
  senderEmail: string
  readAt: string | null
  acceptedAt: string | null
  createdAt: string | null
}

interface NotificationsResponse {
  success: boolean
  data: T_WorkspaceNotification[]
}

export const getNotificationsOptions = () =>
  queryOptions({
    queryKey: ['NOTIFICATIONS'],
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await apiClient.get('/notifications')

      return response.data
    },
  })
