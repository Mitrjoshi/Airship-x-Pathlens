import { z } from 'zod'

export const CHAT_REACTION_EMOJIS = ['👍', '🚀', '👀', '❤️'] as const

export const chatReactionSchema = z.object({
  emoji: z.enum(CHAT_REACTION_EMOJIS),
})

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number]

export const chatChannelTypeSchema = z.enum(['channel', 'dm', 'group_dm'])

export type ChatChannelType = z.infer<typeof chatChannelTypeSchema>

export const chatChannelVisibilitySchema = z.enum(['public', 'private'])

export type ChatChannelVisibility = z.infer<typeof chatChannelVisibilitySchema>

export const createChatChannelSchema = z.object({
  workspace_id: z.uuid(),
  project_id: z.uuid().optional(),
  name: z
    .string()
    .trim()
    .min(1, 'Channel name is required.')
    .max(40, 'Channel name must be 40 characters or less.')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and dashes only.'),
  description: z.string().trim().max(200, 'Description is too long.').optional(),
  topic: z.string().trim().max(200, 'Topic is too long.').optional(),
  visibility: chatChannelVisibilitySchema.default('public'),
  member_ids: z.array(z.uuid()).max(500).optional(),
})

export type CreateChatChannelPayload = z.infer<typeof createChatChannelSchema>

export const updateChatChannelSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Channel name is required.')
    .max(40, 'Channel name must be 40 characters or less.')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers, and dashes only.')
    .optional(),
  description: z.string().trim().max(200, 'Description is too long.').optional(),
  topic: z.string().trim().max(200, 'Topic is too long.').optional(),
  visibility: chatChannelVisibilitySchema.optional(),
})

export type UpdateChatChannelPayload = z.infer<typeof updateChatChannelSchema>

export const sendChatMessageSchema = z.object({
  channel_id: z.uuid(),
  content: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty.')
    .max(10000, 'Message is too long.'),
  reply_to_message_id: z.number().int().positive().optional(),
})

export type SendChatMessagePayload = z.infer<typeof sendChatMessageSchema>

export const createDmSchema = z.object({
  workspace_id: z.uuid(),
  user_ids: z.array(z.uuid()).min(1, 'Choose at least one person.').max(100),
})

export type CreateDmPayload = z.infer<typeof createDmSchema>

export const chatSearchParamsSchema = z.object({
  workspace_id: z.uuid(),
  q: z.string().trim().min(1, 'Search query is required.').max(200),
})

export type ChatSearchParams = z.infer<typeof chatSearchParamsSchema>

export interface ChatChannelMember {
  channelId: string
  userId: string
  name: string
  email: string
  avatar: string | null
  joinedAt: string
}

export interface ChatReaction {
  emoji: ChatReactionEmoji
  count: number
  reactedByMe: boolean
}

export interface ChatMessage {
  id: number
  channelId: string
  senderId: string
  senderName: string
  senderEmail: string
  senderAvatar: string | null
  content: string
  replyToMessageId: number | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  reactions: ChatReaction[]
  isPinned: boolean
  replyCount: number
  pending?: boolean
  failed?: boolean
}

export interface ChatChannel {
  id: string
  workspaceId: string
  projectId: string | null
  projectName: string | null
  type: ChatChannelType
  name: string
  description: string | null
  topic: string | null
  visibility: ChatChannelVisibility
  createdBy: string
  archivedAt: string | null
  createdAt: string
  updatedAt: string
  memberCount: number
  unreadCount: number
  mentionCount: number
  lastMessagePreview: string | null
  lastMessageAt: string | null
  lastReadMessageId: number | null
}

export interface ChatUnreadSummary {
  totalUnread: number
  totalMentions: number
}

export interface ChatChannelsResponse {
  success: boolean
  data: ChatChannel[]
  unread: ChatUnreadSummary
}

export interface ChatMessagesResponse {
  success: boolean
  data: ChatMessage[]
  hasMore: boolean
}

export interface ChatPinnedMessage {
  id: string
  messageId: number
  pinnedBy: string
  pinnedByName: string
  pinnedAt: string
  message: ChatMessage
}

export interface ChatSearchResults {
  messages: ChatMessage[]
  channels: {
    id: string
    name: string
    type: ChatChannelType
    visibility: ChatChannelVisibility
    memberCount: number
    isMember: boolean
  }[]
  people: {
    userId: string
    name: string
    email: string
    avatar: string | null
    role: string
  }[]
}

export interface ChatNotification {
  id: string
  type: 'chat_mention' | 'chat_reply' | 'chat_dm' | 'channel_invite'
  readAt: string | null
  createdAt: string
  senderName: string
  senderEmail: string
  workspaceId: string
  workspaceName: string
  channelId: string | null
  channelName: string | null
  messageId: number | null
  messagePreview: string | null
}

export type ChatLiveEvent =
  | { type: 'message.created'; channelId: string; message: ChatMessage }
  | { type: 'message.updated'; channelId: string; message: ChatMessage }
  | { type: 'message.deleted'; channelId: string; messageId: number }
  | {
      type: 'reaction.updated'
      channelId: string
      messageId: number
      reactions: ChatReaction[]
    }
  | {
      type: 'message.pinned'
      channelId: string
      pinned: ChatPinnedMessage
    }
  | { type: 'message.unpinned'; channelId: string; messageId: number }
  | { type: 'channel.updated'; channelId: string; channel: unknown }
  | { type: 'channel.deleted'; channelId: string }
  | {
      type: 'member.added'
      channelId: string
      member: {
        userId: string
        name: string
        email: string
        avatar: string | null
      }
    }
  | { type: 'member.removed'; channelId: string; userId: string }
  | {
      type: 'read.updated'
      channelId: string
      userId: string
      lastReadMessageId: number | null
    }