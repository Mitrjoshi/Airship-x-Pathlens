import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import apiClient from '@/lib/apiClient'

type CreateWorkspacePayload = {
  name: string
}

type CreateWorkspaceResponse = {
  success: boolean
  data: {
    id: string
    name: string
  }
  message?: string
}

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: CreateWorkspacePayload
    ): Promise<CreateWorkspaceResponse> => {
      const response = await apiClient.post('/workspaces', payload)

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success)
        throw new Error(data.message ?? 'Unable to create workspace.')

      await queryClient.invalidateQueries({ queryKey: ['WORKSPACES'] })
      toast.success('Workspace created.')
    },
    onError: (error) => toast.error(error.message),
  })
}

type UpdateWorkspacePayload = {
  name: string
}

type UpdateWorkspaceResponse = {
  success: boolean
  data?: {
    id: string
    name: string
  }
  message?: string
}

export const useUpdateWorkspace = (workspaceId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: UpdateWorkspacePayload
    ): Promise<UpdateWorkspaceResponse> => {
      const response = await apiClient.patch<UpdateWorkspaceResponse>(
        `/workspaces/${workspaceId}`,
        payload
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update workspace.')
      }

      await queryClient.invalidateQueries({ queryKey: ['WORKSPACES'] })
      toast.success('Workspace updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

type DeleteWorkspaceResponse = {
  success: boolean
  data?: {
    id: string
  }
  message?: string
}

export const useDeleteWorkspace = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      workspaceId: string
    ): Promise<DeleteWorkspaceResponse> => {
      const response = await apiClient.delete<DeleteWorkspaceResponse>(
        `/workspaces/${workspaceId}`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to delete workspace.')
      }

      await queryClient.invalidateQueries({ queryKey: ['WORKSPACES'] })
      toast.success('Workspace deleted.')
      navigate({ to: '/app', replace: true })
    },
    onError: (error) => toast.error(error.message),
  })
}

type CreateInviteResponse = {
  success: boolean
  data: {
    id: string
    createdAt: string | null
  }
  message?: string
}

type CreateInvitationPayload = {
  email: string
  role: 'admin' | 'member'
}

export const useCreateWorkspaceInvitation = (workspaceId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: CreateInvitationPayload
    ): Promise<CreateInviteResponse> => {
      const response = await apiClient.post(
        `/workspaces/${workspaceId}/invitations`,
        payload
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to send invitation.')
      }

      await queryClient.invalidateQueries({
        queryKey: ['WORKSPACE_INVITATIONS', workspaceId],
      })
      toast.success('Invitation sent.')
    },
    onError: (error) => toast.error(error.message),
  })
}

type WorkspaceMemberPayload = {
  userId: string
  role: 'admin' | 'member'
}

type WorkspaceMemberResponse = {
  success: boolean
  data?: {
    workspaceId: string
    userId: string
    role: string
  }
  message?: string
}

export const useUpdateWorkspaceMember = (workspaceId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: WorkspaceMemberPayload
    ): Promise<WorkspaceMemberResponse> => {
      const response = await apiClient.patch(
        `/workspaces/${workspaceId}/members/${payload.userId}`,
        { role: payload.role }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update member.')
      }

      await queryClient.invalidateQueries({
        queryKey: ['WORKSPACE_MEMBERS', workspaceId],
      })
      toast.success('Member role updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

type RemoveWorkspaceMemberResponse = {
  success: boolean
  message?: string
}

export const useRemoveWorkspaceMember = (workspaceId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      userId: string
    ): Promise<RemoveWorkspaceMemberResponse> => {
      const response = await apiClient.delete(
        `/workspaces/${workspaceId}/members/${userId}`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to remove member.')
      }

      await queryClient.invalidateQueries({
        queryKey: ['WORKSPACE_MEMBERS', workspaceId],
      })
      toast.success('Member removed.')
    },
    onError: (error) => toast.error(error.message),
  })
}

type AcceptNotificationResponse = {
  success: boolean
  data: {
    workspaceId: string
    role: string
  }
  message?: string
}

export const useAcceptNotification = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      notificationId: string
    ): Promise<AcceptNotificationResponse> => {
      const response = await apiClient.post(
        `/notifications/${notificationId}/accept`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) return

      await queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
      await queryClient.invalidateQueries({ queryKey: ['WORKSPACES'] })
    },
    onError: (error) => toast.error(error.message),
  })
}
