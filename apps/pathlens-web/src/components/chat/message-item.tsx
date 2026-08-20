import { useState } from 'react'
import {
  Loader2,
  MessageSquareReply,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import type { ChatMessage } from '@workspace/contracts'

import { getInitials, formatChatTime } from './chat-utils'
import { ReactionBar } from './reaction-bar'

function renderContent(content: string) {
  return content.split(/(@[\w.-]+)/g).map((part, index) => {
    if (part.startsWith('@') && part.length > 1) {
      return (
        <span key={index} className="bg-primary/10 text-primary rounded px-0.5">
          {part}
        </span>
      )
    }

    return <span key={index}>{part}</span>
  })
}

export function MessageItem({
  message,
  isMine,
  canDeleteAny,
  canPin,
  canReact,
  showHeader,
  onReply,
  onToggleReaction,
  onPinToggle,
  onDelete,
  onEdit,
}: {
  message: ChatMessage
  isMine: boolean
  canDeleteAny: boolean
  canPin: boolean
  canReact: boolean
  showHeader: boolean
  onReply: (message: ChatMessage) => void
  onToggleReaction: (message: ChatMessage, emoji: string) => void
  onPinToggle: (message: ChatMessage) => void
  onDelete: (message: ChatMessage) => void
  onEdit: (message: ChatMessage, content: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

  if (message.deletedAt) {
    return (
      <div className="text-muted-foreground px-4 py-0.5 text-sm italic">
        This message was deleted.
      </div>
    )
  }

  return (
    <div
      className={`group relative flex gap-3 px-4 py-1 hover:bg-muted/30 ${
        message.pending ? 'opacity-70' : ''
      }`}
    >
      {showHeader ? (
        <Avatar className="mt-0.5 size-9 shrink-0">
          <AvatarImage src={message.senderAvatar ?? undefined} />
          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="w-9 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        {showHeader && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{message.senderName}</span>
            <span className="text-muted-foreground text-xs">
              {formatChatTime(message.createdAt)}
            </span>
            {message.editedAt && (
              <span className="text-muted-foreground text-xs">(edited)</span>
            )}
            {message.isPinned && (
              <span className="text-muted-foreground flex items-center gap-0.5 text-xs">
                <Pin className="size-3" /> pinned
              </span>
            )}
          </div>
        )}

        {editing ? (
          <div className="space-y-2 py-1">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={2}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!draft.trim()}
                onClick={() => {
                  onEdit(message, draft.trim())
                  setEditing(false)
                }}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setDraft(message.content)
                  setEditing(false)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm leading-6 break-words">
            {renderContent(message.content)}
          </p>
        )}

        {message.failed && (
          <p className="text-destructive mt-1 text-xs">
            Message failed to send. Click retry to try again.
          </p>
        )}

        {(message.reactions.length > 0 || message.replyCount > 0) && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                type="button"
                disabled={!canReact || message.pending || message.failed}
                onClick={() => onToggleReaction(message, reaction.emoji)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  reaction.reactedByMe
                    ? 'bg-primary/10 border-primary/30'
                    : 'hover:bg-muted border-border'
                }`}
              >
                {reaction.emoji} {reaction.count}
              </button>
            ))}
            {message.replyCount > 0 && (
              <button
                type="button"
                onClick={() => onReply(message)}
                className="text-primary hover:underline text-xs font-medium"
              >
                {message.replyCount}{' '}
                {message.replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        )}
      </div>

      {!message.pending && !message.failed && (
        <div className="absolute top-1 right-4 hidden items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex">
          {canReact && (
            <ReactionBar
              onReact={(emoji) => onToggleReaction(message, emoji)}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Reply"
            onClick={() => onReply(message)}
          >
            <MessageSquareReply className="size-4" />
          </Button>
          {canPin && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={message.isPinned ? 'Unpin' : 'Pin'}
              onClick={() => onPinToggle(message)}
            >
              {message.isPinned ? (
                <PinOff className="size-4" />
              ) : (
                <Pin className="size-4" />
              )}
            </Button>
          )}
          {(isMine || canDeleteAny) && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label="Message actions"
                  />
                }
              >
                <Pencil className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isMine && (
                  <DropdownMenuItem onSelect={() => setEditing(true)}>
                    Edit message
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onSelect={() => onDelete(message)}
                >
                  <Trash2 className="size-4" /> Delete message
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}