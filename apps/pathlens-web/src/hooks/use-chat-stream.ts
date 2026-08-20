import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  ChatLiveEvent,
  ChatMessage,
  ChatMessagesResponse,
} from '@workspace/contracts'

import apiClient from '@/lib/apiClient'

const CHAT_MESSAGES = (workspaceId: string, channelId: string) =>
  ['CHAT_MESSAGES', workspaceId, channelId] as const
const CHAT_CHANNELS = (workspaceId: string) => ['CHAT_CHANNELS', workspaceId] as const
const CHAT_CHANNEL_DETAIL = (workspaceId: string, channelId: string) =>
  ['CHAT_CHANNEL_DETAIL', workspaceId, channelId] as const
const CHAT_PINS = (workspaceId: string, channelId: string) =>
  ['CHAT_PINS', workspaceId, channelId] as const

function mergeMessage(
  current: ChatMessagesResponse | undefined,
  message: ChatMessage
): ChatMessagesResponse {
  const existing = current?.data ?? []
  const withoutPending = existing.filter(
    (item) => item.id !== message.id && !item.pending
  )

  return {
    ...(current ?? { success: true, hasMore: false }),
    data: [...withoutPending, message],
  }
}

function updateMessage(
  current: ChatMessagesResponse | undefined,
  messageId: number,
  updater: (message: ChatMessage) => ChatMessage
): ChatMessagesResponse {
  const existing = current?.data ?? []

  return {
    ...(current ?? { success: true, hasMore: false }),
    data: existing.map((message) =>
      message.id === messageId ? updater(message) : message
    ),
  }
}

export function useChatStream(
  workspaceId: string,
  channelId: string,
  handlers?: {
    onChannelDeleted?: (deletedChannelId: string) => void
  }
) {
  const queryClient = useQueryClient()
  const abortRef = useRef<AbortController | null>(null)
  const handlersRef = useRef(handlers)

  handlersRef.current = handlers

  useEffect(() => {
    if (!workspaceId || !channelId) return

    let disposed = false
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const connect = async () => {
      if (disposed) return

      const controller = new AbortController()
      abortRef.current = controller

      const url = apiClient.getUri({
        url: '/chat/stream',
        params: {
          workspace_id: workspaceId,
          channel_id: channelId,
        },
      })

      try {
        const token = localStorage.getItem('pathlens-token')

        const response = await fetch(url, {
          headers: {
            'x-api-key': import.meta.env.VITE_API_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          throw new Error('Stream unavailable.')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (!disposed) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const messages = buffer.split('\n\n')
          buffer = messages.pop() ?? ''

          for (const message of messages) {
            let event = 'message'
            let data = ''

            for (const line of message.split('\n')) {
              if (line.startsWith('event:')) event = line.slice(6).trim()
              if (line.startsWith('data:')) data += line.slice(5).trim()
            }

            if (!data) continue

            const parsed = JSON.parse(data) as ChatLiveEvent

            handleEvent(parsed)
          }
        }
      } catch {
        // Connection dropped or aborted.
      }

      if (disposed) return

      retryTimer = setTimeout(connect, 2500)
    }

    const handleEvent = (event: ChatLiveEvent) => {
      const messagesKey = CHAT_MESSAGES(workspaceId, channelId)

      switch (event.type) {
        case 'message.created':
          queryClient.setQueryData<ChatMessagesResponse>(messagesKey, (current) =>
            mergeMessage(current, event.message)
          )
          queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
          break
        case 'message.updated':
          queryClient.setQueryData<ChatMessagesResponse>(messagesKey, (current) =>
            updateMessage(current, event.message.id, () => event.message)
          )
          break
        case 'message.deleted':
          queryClient.setQueryData<ChatMessagesResponse>(messagesKey, (current) =>
            updateMessage(current, event.messageId, (message) => ({
              ...message,
              deletedAt: new Date().toISOString(),
              content: '',
            }))
          )
          queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
          break
        case 'reaction.updated':
          queryClient.setQueryData<ChatMessagesResponse>(messagesKey, (current) =>
            updateMessage(current, event.messageId, (message) => ({
              ...message,
              reactions: event.reactions,
            }))
          )
          break
        case 'message.pinned':
          queryClient.setQueryData<ChatMessagesResponse>(messagesKey, (current) =>
            updateMessage(current, event.pinned.messageId, (message) => ({
              ...message,
              isPinned: true,
            }))
          )
          queryClient.invalidateQueries({ queryKey: CHAT_PINS(workspaceId, channelId) })
          break
        case 'message.unpinned':
          queryClient.setQueryData<ChatMessagesResponse>(messagesKey, (current) =>
            updateMessage(current, event.messageId, (message) => ({
              ...message,
              isPinned: false,
            }))
          )
          queryClient.invalidateQueries({ queryKey: CHAT_PINS(workspaceId, channelId) })
          break
        case 'channel.updated':
          queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
          queryClient.invalidateQueries({
            queryKey: CHAT_CHANNEL_DETAIL(workspaceId, channelId),
          })
          break
        case 'channel.deleted':
          queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
          handlersRef.current?.onChannelDeleted?.(event.channelId)
          break
        case 'member.added':
        case 'member.removed':
          queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
          queryClient.invalidateQueries({
            queryKey: CHAT_CHANNEL_DETAIL(workspaceId, channelId),
          })
          break
        case 'read.updated':
          queryClient.invalidateQueries({ queryKey: CHAT_CHANNELS(workspaceId) })
          break
      }
    }

    connect()

    return () => {
      disposed = true

      if (retryTimer) clearTimeout(retryTimer)

      abortRef.current?.abort()
    }
  }, [workspaceId, channelId, queryClient])
}