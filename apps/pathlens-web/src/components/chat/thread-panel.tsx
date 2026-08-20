import { useQuery } from '@tanstack/react-query'
import { Loader2, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import type { ChatMessage } from '@workspace/contracts'

import { getChatMessagesOptions } from '@/queries/chat'
import { MessageItem } from './message-item'
import { MessageComposer } from './message-composer'
import { formatChatTimestamp } from './chat-utils'

export function ThreadPanel({
  workspaceId,
  channelId,
  parent,
  myUserId,
  canDeleteAny,
  canPin,
  canReact,
  onClose,
  onToggleReaction,
  onPinToggle,
  onDelete,
  onEdit,
}: {
  workspaceId: string
  channelId: string
  parent: ChatMessage
  myUserId: string
  canDeleteAny: boolean
  canPin: boolean
  canReact: boolean
  onClose: () => void
  onToggleReaction: (message: ChatMessage, emoji: string) => void
  onPinToggle: (message: ChatMessage) => void
  onDelete: (message: ChatMessage) => void
  onEdit: (message: ChatMessage, content: string) => void
}) {
  const { data, isPending, isError } = useQuery(
    getChatMessagesOptions(workspaceId, channelId)
  )
  const markRead = useMarkChatRead(workspaceId, channelId)

const messages = (data?.data ?? []).filter(
    (message) => message.replyToMessageId === parent.id
  )

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col border-l bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Thread</p>
          <p className="text-muted-foreground truncate text-xs">
            {parent.senderName} · {formatChatTimestamp(parent.createdAt)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Close thread"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-3">
        <MessageItem
          message={parent}
          isMine={parent.senderId === myUserId}
          canDeleteAny={canDeleteAny}
          canPin={canPin}
          canReact={canReact}
          showHeader
          onReply={() => {}}
          onToggleReaction={onToggleReaction}
          onPinToggle={onPinToggle}
          onDelete={onDelete}
          onEdit={onEdit}
        />
        <div className="bg-border my-3 ml-4 h-px" />
        {isPending ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-xs">
            <Loader2 className="size-4 animate-spin" />
            Loading replies...
          </div>
        ) : isError ? (
          <p className="text-destructive py-6 text-center text-xs">
            Unable to load replies.
          </p>
        ) : messages.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-xs">
            No replies yet. Start the conversation.
          </p>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isMine={message.senderId === myUserId}
              canDeleteAny={canDeleteAny}
              canPin={canPin}
              canReact={canReact}
              showHeader
              onReply={() => {}}
              onToggleReaction={onToggleReaction}
              onPinToggle={onPinToggle}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))
        )}
      </div>

      <MessageComposer
        workspaceId={workspaceId}
        channelId={channelId}
        replyTo={parent}
        placeholder="Reply to thread"
      />
    </div>
  )
}