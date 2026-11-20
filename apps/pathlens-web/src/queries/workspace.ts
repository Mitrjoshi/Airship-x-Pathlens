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
  external: boolean
  permissionProfileId: string | null
  permissionProfileName: string | null
  permissions: Permission[]
  projectCount: number
  memberCount: number
  usageStatus?: 'active' | 'warning' | 'paused'
  usageWarningAt?: string | null
  usagePausedAt?: string | null
  unlimitedUsage?: boolean
}

interface WorkspacesResponse {
  success: boolean
  data: T_Workspace[]
}

const getWorkspaces = async (search: string): Promise<WorkspacesResponse> => {
  const response = await apiClient.get('/workspaces', {
    params: search ? { search } : undefined,
  })

  return response.data
}

export const getWorkspacesOptions = (search?: string) => {
  const term = search?.trim() ?? ''

  return queryOptions({
    queryKey: term ? ['WORKSPACES', term] : ['WORKSPACES'],
    queryFn: () => getWorkspaces(term),
  })
}

interface WorkspaceResponse {
  success: boolean
  data: T_Workspace
}

export const getWorkspaceByIdOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['WORKSPACE', workspaceId],
    queryFn: async (): Promise<WorkspaceResponse> => {
      const response = await apiClient.get(`/workspaces/${workspaceId}`)

      return response.data
    },
    enabled: Boolean(workspaceId),
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

export const getWorkspaceMembersOptions = (
  workspaceId: string,
  search?: string
) => {
  const term = search?.trim()
  const queryKey = ['WORKSPACE_MEMBERS', workspaceId]

  return queryOptions({
    queryKey: term ? [...queryKey, term] : queryKey,
    queryFn: async (): Promise<WorkspaceMembersResponse> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/members`,
        { params: term ? { search: term } : undefined }
      )

      return response.data
    },
  })
}

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
  })

export const getWorkspacePermissionsOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['WORKSPACE_PERMISSIONS', workspaceId],
    queryFn: async (): Promise<{
      success: boolean
      data: Permission[]
    }> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/permissions`
      )

      return response.data
    },
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

export const getWorkspacePermissionProfilesOptions = (
  workspaceId: string,
  search?: string
) => {
  const term = search?.trim()
  const queryKey = ['WORKSPACE_PERMISSION_PROFILES', workspaceId]

  return queryOptions({
    queryKey: term ? [...queryKey, term] : queryKey,
    queryFn: async (): Promise<PermissionProfilesResponse> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/permission-profiles`,
        { params: term ? { search: term } : undefined }
      )

      return response.data
    },
  })
}

export interface PermissionProfileResponse {
  success: boolean
  data: T_PermissionProfile
}

export const getWorkspacePermissionProfileOptions = (
  workspaceId: string,
  profileId: string
) =>
  queryOptions({
    queryKey: ['WORKSPACE_PERMISSION_PROFILE', workspaceId, profileId],
    queryFn: async (): Promise<PermissionProfileResponse> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/permission-profiles/${profileId}`
      )

      return response.data
    },
    enabled: Boolean(workspaceId && profileId),
  })

export type T_WorkspaceNotification = {
  id: string
  type: string
  role: string
  permissionProfileId: string | null
  permissionProfileName: string | null
  permissionRequestId: string | null
  permissionRequestStatus: 'pending' | 'approved' | 'denied' | null
  requestedPermission: Permission | null
  requestReason: string | null
  payload: Record<string, unknown> | null
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

export const getPermissionRequestStatusOptions = (
  workspaceId: string,
  permission: Permission
) =>
  queryOptions({
    queryKey: ['PERMISSION_REQUEST_STATUS', workspaceId, permission],
    queryFn: async (): Promise<{
      success: boolean
      data: {
        status: 'none' | 'pending' | 'approved' | 'denied'
        requestId: string | null
        createdAt: string | null
      }
    }> => {
      const response = await apiClient.get(
        `/workspaces/${workspaceId}/permission-requests/status`,
        { params: { permission } }
      )

      return response.data
    },
    enabled: Boolean(workspaceId && permission),
  })
