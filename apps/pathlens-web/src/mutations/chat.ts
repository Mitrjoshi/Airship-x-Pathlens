import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import type {
  ChatChannel,
  ChatMessage,
  ChatMessagesResponse,
  ChatNotification,
  ChatPinnedMessage,
  ChatReaction,
} from '@workspace/contracts'

import apiClient from '@/lib/apiClient'

const CHAT_CHANNELS = (workspaceId: string) => ['CHAT_CHANNELS', workspaceId] as const
const CHAT_MESSAGES = (workspaceId: string, channelId: string) =>
  ['CHAT_MESSAGES', workspaceId, channelId] as const
const CHAT_CHANNEL_DETAIL = (workspaceId: string, channelId: string) =>
  ['CHAT_CHANNEL_DETAIL', workspaceId, channelId] as const
const CHAT_PINS = (workspaceId: string, channelId: string) =>
  ['CHAT_PINS', workspaceId, channelId] as const

export type CreateChatChannelPayload = {
  workspace_id: string
  name: string
  description?: string
  topic?: string
  visibility: 'public' | 'private'
  member_ids?: string[]
}

export const useCreateChatChannel = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (
      payload: CreateChatChannelPayload
    ): Promise<{ success: boolean; data: ChatChannel; message?: string }> => {
      const response = await apiClient.post('/chat/channels', payload)

      return response.data
    },
    onSuccess: async (data, payload) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to create channel.')
      }

      await queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(payload.workspace_id) })
      toast.success(`#${data.data.name} created.`)
      navigate({ to: '/app/$workspace/chat/$channelId', params: { channelId: data.data.id } })
    },
    onError: (error) => toast.error(error.message),
  })
}

export type CreateDmPayload = {
  workspace_id: string
  user_ids: string[]
}

export const useCreateDm = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (
      payload: CreateDmPayload
    ): Promise<{ success: boolean; data: ChatChannel; message?: string }> => {
      const response = await apiClient.post('/chat/dms', payload)

      return response.data
    },
    onSuccess: async (data, payload) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to open conversation.')
      }

      await queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(payload.workspace_id) })
      navigate({ to: '/app/$workspace/chat/$channelId', params: { channelId: data.data.id } })
    },
    onError: (error) => toast.error(error.message),
  })
}

export type UpdateChatChannelPayload = {
  workspace_id: string
  name?: string
  description?: string
  topic?: string
  visibility?: 'public' | 'private'
}

export const useUpdateChatChannel = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: UpdateChatChannelPayload
    ): Promise<{ success: boolean; data?: ChatChannel; message?: string }> => {
      const response = await apiClient.patch(`/chat/channels/${channelId}`, payload)

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update channel.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNEL_DETAIL(workspaceId, channelId) }),
      ])
      toast.success('Channel updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useArchiveChatChannel = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.patch(`/chat/channels/${channelId}/archive`, {
        workspace_id: workspaceId,
        archived: true,
      })

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to archive channel.')
      }

      await queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
      toast.success('Channel archived.')
      navigate({ to: '/app/$workspace/chat', params: {} })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useDeleteChatChannel = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.delete(`/chat/channels/${channelId}`, {
        data: { workspace_id: workspaceId },
      })

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to delete channel.')
      }

      await queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
      toast.success('Channel deleted.')
      navigate({ to: '/app/$workspace/chat', params: {} })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useAddChannelMember = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      userId: string
    ): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.post(`/chat/channels/${channelId}/members`, {
        workspace_id: workspaceId,
        user_id: userId,
      })

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to add member.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNEL_DETAIL(workspaceId, channelId) }),
      ])
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useRemoveChannelMember = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      userId: string
    ): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.delete(
        `/chat/channels/${channelId}/members/${userId}`,
        { data: { workspace_id: workspaceId } }
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to remove member.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNEL_DETAIL(workspaceId, channelId) }),
      ])
    },
    onError: (error) => toast.error(error.message),
  })
}

export type SendChatMessagePayload = {
  workspace_id: string
  content: string
  reply_to_message_id?: number
}

export const useSendChatMessage = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: SendChatMessagePayload
    ): Promise<{ success: boolean; data: ChatMessage; message?: string }> => {
      const response = await apiClient.post(`/chat/channels/${channelId}/messages`, payload)

      return response.data
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: CHAT_MESSAGES(workspaceId, channelId) })

      const previous = queryClient.getQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId)
      )

      const me = queryClient.getQueryData<{ data: { id: string; name: string; email: string; avatar: string | null } }>(['ME'])

      if (previous && me) {
        const pendingMessage: ChatMessage = {
          id: -Date.now(),
          channelId,
          senderId: me.data.id,
          senderName: me.data.name,
          senderEmail: me.data.email,
          senderAvatar: me.data.avatar,
          content: payload.content,
          replyToMessageId: payload.reply_to_message_id ?? null,
          editedAt: null,
          deletedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reactions: [],
          isPinned: false,
          replyCount: 0,
          pending: true,
        }

        queryClient.setQueryData<ChatMessagesResponse>(
          CHAT_MESSAGES(workspaceId, channelId),
          (current) => {
            const existing = current?.data ?? []
            const withoutFailed = existing.filter((message) => !message.failed)
            const hasPending = withoutFailed.some((message) => message.pending)

            return {
              ...(current ?? { success: true, hasMore: false }),
              data: hasPending ? withoutFailed : [...withoutFailed, pendingMessage],
            }
          }
        )
      }

      return { previous }
    },
    onSuccess: async (data, payload, context) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to send message.')
      }

      queryClient.setQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId),
        (current) => {
          const existing = current?.data ?? []

          return {
            ...(current ?? { success: true, hasMore: false }),
            data: [...existing.filter((message) => !message.pending), data.data],
          }
        }
      )

      await queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
      await queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
    },
    onError: (error, payload, context) => {
      const previous = context?.previous as ChatMessagesResponse | undefined

      if (previous) {
        queryClient.setQueryData(CHAT_MESSAGES(workspaceId, channelId), previous)
      } else {
        queryClient.setQueryData<ChatMessagesResponse>(
          CHAT_MESSAGES(workspaceId, channelId),
          (current) => {
            const existing = current?.data ?? []

            return {
              ...(current ?? { success: true, hasMore: false }),
              data: existing.map((message) =>
                message.pending ? { ...message, pending: false, failed: true } : message
              ),
            }
          }
        )
      }

      toast.error(error.message)
    },
  })
}

export const useEditChatMessage = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: { message_id: number; content: string }
    ): Promise<{ success: boolean; data: ChatMessage; message?: string }> => {
      const response = await apiClient.patch(`/chat/messages/${payload.message_id}`, {
        workspace_id: workspaceId,
        channel_id: channelId,
        content: payload.content,
      })

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to edit message.')
      }

      queryClient.setQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId),
        (current) => {
          const existing = current?.data ?? []

          return {
            ...(current ?? { success: true, hasMore: false }),
            data: existing.map((message) => (message.id === data.data.id ? data.data : message)),
          }
        }
      )

      await queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useDeleteChatMessage = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      messageId: number
    ): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.delete(`/chat/messages/${messageId}`, {
        data: { workspace_id: workspaceId, channel_id: channelId },
      })

      return response.data
    },
    onSuccess: async (data, messageId) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to delete message.')
      }

      queryClient.setQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId),
        (current) => {
          const existing = current?.data ?? []

          return {
            ...(current ?? { success: true, hasMore: false }),
            data: existing.map((message) =>
              message.id === messageId
                ? { ...message, deletedAt: new Date().toISOString(), content: '' }
                : message
            ),
          }
        }
      )

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: CHAT_PINS(workspaceId, channelId) }),
      ])
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useToggleChatReaction = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: { message_id: number; emoji: string }
    ): Promise<{ success: boolean; data: { reactions: ChatReaction[] }; message?: string }> => {
      const response = await apiClient.post(`/chat/messages/${payload.message_id}/reactions`, {
        workspace_id: workspaceId,
        channel_id: channelId,
        emoji: payload.emoji,
      })

      return response.data
    },
    onSuccess: async (data, payload) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update reaction.')
      }

      queryClient.setQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId),
        (current) => {
          const existing = current?.data ?? []

          return {
            ...(current ?? { success: true, hasMore: false }),
            data: existing.map((message) =>
              message.id === payload.message_id
                ? { ...message, reactions: data.data.reactions }
                : message
            ),
          }
        }
      )
    },
    onError: (error) => toast.error(error.message),
  })
}

export const usePinChatMessage = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      messageId: number
    ): Promise<{ success: boolean; data: ChatPinnedMessage; message?: string }> => {
      const response = await apiClient.post(`/chat/messages/${messageId}/pin`, {
        workspace_id: workspaceId,
        channel_id: channelId,
      })

      return response.data
    },
    onSuccess: async (data, messageId) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to pin message.')
      }

      queryClient.setQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId),
        (current) => {
          const existing = current?.data ?? []

          return {
            ...(current ?? { success: true, hasMore: false }),
            data: existing.map((message) =>
              message.id === messageId ? { ...message, isPinned: true } : message
            ),
          }
        }
      )

      await queryClient.invalidateQueries({ queryKey: CHAT_PINS(workspaceId, channelId) })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useUnpinChatMessage = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      messageId: number
    ): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.delete(`/chat/messages/${messageId}/pin`, {
        data: { workspace_id: workspaceId, channel_id: channelId },
      })

      return response.data
    },
    onSuccess: async (data, messageId) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to unpin message.')
      }

      queryClient.setQueryData<ChatMessagesResponse>(
        CHAT_MESSAGES(workspaceId, channelId),
        (current) => {
          const existing = current?.data ?? []

          return {
            ...(current ?? { success: true, hasMore: false }),
            data: existing.map((message) =>
              message.id === messageId ? { ...message, isPinned: false } : message
            ),
          }
        }
      )

      await queryClient.invalidateQueries({ queryKey: CHAT_PINS(workspaceId, channelId) })
    },
    onError: (error) => toast.error(error.message),
  })
}

export const useMarkChatRead = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      lastReadMessageId: number
    ): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.post(`/chat/channels/${channelId}/read`, {
        workspace_id: workspaceId,
        last_read_message_id: lastReadMessageId,
      })

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) return

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) }),
        queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] }),
      ])
    },
  })
}

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      notificationId: string
    ): Promise<{ success: boolean; message?: string }> => {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`)

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) return

      await queryClient.invalidateQueries({ queryKey: ['NOTIFICATIONS'] })
    },
  })
}