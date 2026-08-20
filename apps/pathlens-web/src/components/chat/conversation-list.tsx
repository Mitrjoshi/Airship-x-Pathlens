import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Hash,
  Lock,
  MessageSquarePlus,
  MessagesSquare,
  Search,
  Users,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { useState } from 'react'
import type { ChatChannel } from '@workspace/contracts'

import { getChatChannelsOptions } from '@/queries/chat'
import { formatRelativeTime } from './chat-utils'

function ChannelRow({
  channel,
  active,
}: {
  channel: ChatChannel
  active: boolean
}) {
  const isDm = channel.type === 'dm' || channel.type === 'group_dm'
  const hasUnread = channel.unreadCount > 0
  const hasMention = channel.mentionCount > 0

  return (
    <Link
      to="/app/$workspace/chat/$channelId"
      params={{ channelId: channel.id }}
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
        active
          ? 'bg-accent text-accent-foreground'
          : hasUnread
            ? 'bg-muted/40 text-foreground hover:bg-muted/70'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      }`}
    >
      {isDm ? (
        <Users className="size-4 shrink-0 opacity-70" />
      ) : channel.visibility === 'private' ? (
        <Lock className="size-4 shrink-0 opacity-70" />
      ) : (
        <Hash className="size-4 shrink-0 opacity-70" />
      )}
      <span className={`min-w-0 flex-1 truncate ${hasUnread ? 'font-medium' : ''}`}>
        {isDm ? channel.name : `#${channel.name}`}
      </span>
      {hasMention ? (
        <span className="bg-destructive text-destructive-foreground flex min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold">
          {channel.mentionCount > 9 ? '9+' : channel.mentionCount}
        </span>
      ) : hasUnread ? (
        <span className="bg-primary text-primary-foreground flex min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold">
          {channel.unreadCount > 9 ? '9+' : channel.unreadCount}
        </span>
      ) : null}
    </Link>
  )
}

export function ConversationList({
  workspaceId,
  activeChannelId,
  onOpenCreateChannel,
  onOpenNewDm,
  onOpenSearch,
  canCreateChannels,
}: {
  workspaceId: string
  activeChannelId: string | null
  onOpenCreateChannel: () => void
  onOpenNewDm: () => void
  onOpenSearch: () => void
  canCreateChannels: boolean
}) {
  const { data, isPending, isError } = useQuery(getChatChannelsOptions(workspaceId))
  const [query, setQuery] = useState('')
  const channels = data?.data ?? []

  const filtered = query.trim()
    ? channels.filter((channel) =>
        channel.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : channels

  const channelsOnly = filtered.filter((channel) => channel.type === 'channel')
  const conversations = filtered.filter(
    (channel) => channel.type === 'dm' || channel.type === 'group_dm'
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <p className="text-sm font-semibold">Chat</p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Search chat"
            onClick={onOpenSearch}
          >
            <Search className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="New conversation"
            onClick={onOpenNewDm}
          >
            <MessageSquarePlus className="size-4" />
          </Button>
          {canCreateChannels && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Create channel"
              onClick={onOpenCreateChannel}
            >
              <MessagesSquare className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="px-3 pb-2">
        <Input
          placeholder="Filter conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="h-8"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-0.5 px-2 pb-4">
          {isPending ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-xs">
              Loading conversations...
            </p>
          ) : isError ? (
            <p className="text-destructive px-2 py-6 text-center text-xs">
              Unable to load chat.
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-xs">
              {query.trim()
                ? 'No conversations match your filter.'
                : 'No conversations yet. Start one with a teammate or create a channel.'}
            </p>
          ) : (
            <>
              {channelsOnly.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-muted-foreground px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide uppercase">
                    Channels
                  </p>
                  {channelsOnly.map((channel) => (
                    <ChannelRow
                      key={channel.id}
                      channel={channel}
                      active={channel.id === activeChannelId}
                    />
                  ))}
                </div>
              )}
              {conversations.length > 0 && (
                <div className="space-y-0.5">
                  <p className="text-muted-foreground px-2 pt-3 pb-1 text-[11px] font-medium tracking-wide uppercase">
                    Direct messages
                  </p>
                  {conversations.map((channel) => (
                    <ChannelRow
                      key={channel.id}
                      channel={channel}
                      active={channel.id === activeChannelId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="text-muted-foreground border-t px-3 py-2 text-[11px]">
        {channels.length > 0 && (
          <p className="truncate">
            {channels[0].lastMessageAt
              ? `Last activity ${formatRelativeTime(channels[0].lastMessageAt)}`
              : 'No messages yet'}
          </p>
        )}
      </div>
    </div>
  )
}