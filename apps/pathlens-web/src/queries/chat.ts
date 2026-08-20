import apiClient from '@/lib/apiClient'
import type {
  ChatChannel,
  ChatChannelsResponse,
  ChatMessage,
  ChatMessagesResponse,
  ChatNotification,
  ChatPinnedMessage,
  ChatSearchResults,
} from '@workspace/contracts'
import { queryOptions } from '@tanstack/react-query'

export type { ChatChannel, ChatMessage, ChatPinnedMessage, ChatSearchResults }

export interface ChatChannelDetailResponse {
  success: boolean
  data: {
    channel: ChatChannel
    members: {
      channelId: string
      userId: string
      name: string
      email: string
      avatar: string | null
      joinedAt: string
    }[]
  }
}

export interface ChatPinsResponse {
  success: boolean
  data: ChatPinnedMessage[]
}

export interface ChatSearchResponse {
  success: boolean
  data: ChatSearchResults
}

const getChatChannels = async (workspaceId: string): Promise<ChatChannelsResponse> => {
  const response = await apiClient.get('/chat/channels', {
    params: { workspace_id: workspaceId },
  })

  return response.data
}

export const getChatChannelsOptions = (workspaceId: string) =>
  queryOptions({
    queryKey: ['CHAT_CHANNELS', workspaceId],
    queryFn: () => getChatChannels(workspaceId),
    enabled: Boolean(workspaceId),
  })

const getChatChannelDetail = async (
  workspaceId: string,
  channelId: string
): Promise<ChatChannelDetailResponse> => {
  const response = await apiClient.get(`/chat/channels/${channelId}`, {
    params: { workspace_id: workspaceId },
  })

  return response.data
}

export const getChatChannelDetailOptions = (
  workspaceId: string,
  channelId: string
) =>
  queryOptions({
    queryKey: ['CHAT_CHANNEL_DETAIL', workspaceId, channelId],
    queryFn: () => getChatChannelDetail(workspaceId, channelId),
    enabled: Boolean(workspaceId && channelId),
  })

const getChatMessages = async (
  workspaceId: string,
  channelId: string
): Promise<ChatMessagesResponse> => {
  const response = await apiClient.get(`/chat/channels/${channelId}/messages`, {
    params: { workspace_id: workspaceId },
  })

  return response.data
}

export const getChatMessagesOptions = (workspaceId: string, channelId: string) =>
  queryOptions({
    queryKey: ['CHAT_MESSAGES', workspaceId, channelId],
    queryFn: () => getChatMessages(workspaceId, channelId),
    enabled: Boolean(workspaceId && channelId),
    refetchOnWindowFocus: false,
  })

export const fetchChatMessagesBefore = async (
  workspaceId: string,
  channelId: string,
  before: number
): Promise<ChatMessagesResponse> => {
  const response = await apiClient.get(`/chat/channels/${channelId}/messages`, {
    params: { workspace_id: workspaceId, before },
  })

  return response.data
}

const getChatPins = async (
  workspaceId: string,
  channelId: string
): Promise<ChatPinsResponse> => {
  const response = await apiClient.get(`/chat/channels/${channelId}/pins`, {
    params: { workspace_id: workspaceId },
  })

  return response.data
}

export const getChatPinsOptions = (workspaceId: string, channelId: string) =>
  queryOptions({
    queryKey: ['CHAT_PINS', workspaceId, channelId],
    queryFn: () => getChatPins(workspaceId, channelId),
    enabled: Boolean(workspaceId && channelId),
  })

const searchChat = async (
  workspaceId: string,
  q: string
): Promise<ChatSearchResponse> => {
  const response = await apiClient.get('/chat/search', {
    params: { workspace_id: workspaceId, q },
  })

  return response.data
}

export const getChatSearchOptions = (workspaceId: string, q: string) =>
  queryOptions({
    queryKey: ['CHAT_SEARCH', workspaceId, q],
    queryFn: () => searchChat(workspaceId, q),
    enabled: Boolean(workspaceId && q.trim().length >= 2),
    staleTime: 30_000,
  })

export type { ChatNotification }