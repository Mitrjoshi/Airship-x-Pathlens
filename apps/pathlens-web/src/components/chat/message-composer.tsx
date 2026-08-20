import { useState } from 'react'
import { ArrowUp, Loader2, X } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Textarea } from '@workspace/ui/components/textarea'
import type { ChatMessage } from '@workspace/contracts'

import { useSendChatMessage } from '@/mutations/chat'

export function MessageComposer({
  workspaceId,
  channelId,
  replyTo,
  onClearReply,
  placeholder,
}: {
  workspaceId: string
  channelId: string
  replyTo?: ChatMessage | null
  onClearReply?: () => void
  placeholder?: string
}) {
  const [content, setContent] = useState('')
  const sendMessage = useSendChatMessage(workspaceId, channelId)

  const submit = () => {
    const trimmed = content.trim()

    if (!trimmed || sendMessage.isPending) return

    sendMessage.mutate(
      {
        workspace_id: workspaceId,
        content: trimmed,
        ...(replyTo ? { reply_to_message_id: replyTo.id } : {}),
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            setContent('')
            onClearReply?.()
          }
        },
      }
    )
  }

  return (
    <div className="shrink-0 px-4 pt-2 pb-4">
      {replyTo && (
        <div className="bg-muted/50 mb-2 flex items-center gap-2 rounded-md px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="text-primary text-xs font-medium">
              Replying to {replyTo.senderName}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {replyTo.content}
            </p>
          </div>
          {onClearReply && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label="Clear reply"
              onClick={onClearReply}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-lg border bg-background p-2 focus-within:ring-2 focus-within:ring-ring">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder ?? 'Message #channel'}
          className="max-h-40 min-h-10 resize-none border-0 bg-transparent p-1 shadow-none focus-visible:ring-0"
          rows={1}
        />
        <Button
          size="icon"
          className="size-9 shrink-0"
          aria-label="Send message"
          disabled={!content.trim() || sendMessage.isPending}
          onClick={submit}
        >
          {sendMessage.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ArrowUp className="size-4" />
          )}
        </Button>
      </div>
    </div>
  )
}