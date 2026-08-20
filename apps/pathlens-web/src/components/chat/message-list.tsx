import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDown, Loader2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import type { ChatMessage } from '@workspace/contracts'

import { fetchChatMessagesBefore, getChatMessagesOptions } from '@/queries/chat'
import { useMarkChatRead } from '@/mutations/chat'
import { formatChatDay } from './chat-utils'
import { MessageItem } from './message-item'

const GROUP_WINDOW_MS = 5 * 60 * 1000

function shouldShowHeader(previous: ChatMessage | undefined, current: ChatMessage) {
  if (!previous) return true
  if (previous.senderId !== current.senderId) return true

  return (
    new Date(current.createdAt).getTime() -
      new Date(previous.createdAt).getTime() >
    GROUP_WINDOW_MS
  )
}

export function MessageList({
  workspaceId,
  channelId,
  myUserId,
  canDeleteAny,
  canPin,
  canReact,
  onReply,
  onToggleReaction,
  onPinToggle,
  onDelete,
  onEdit,
}: {
  workspaceId: string
  channelId: string
  myUserId: string
  canDeleteAny: boolean
  canPin: boolean
  canReact: boolean
  onReply: (message: ChatMessage) => void
  onToggleReaction: (message: ChatMessage, emoji: string) => void
  onPinToggle: (message: ChatMessage) => void
  onDelete: (message: ChatMessage) => void
  onEdit: (message: ChatMessage, content: string) => void
}) {
  const { data, isPending, isError } = useQuery(
    getChatMessagesOptions(workspaceId, channelId)
  )
  const [older, setOlder] = useState<ChatMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [showJumpToBottom, setShowJumpToBottom] = useState(false)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const nearBottomRef = useRef(true)
  const firstLoadRef = useRef(true)
  const markRead = useMarkChatRead(workspaceId, channelId)
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const latest = data?.data ?? []
  const messages = [...older, ...latest]

  useEffect(() => {
    setOlder([])
    setHasMore(false)
    setLoadingOlder(false)
    firstLoadRef.current = true
    nearBottomRef.current = true

    const container = containerRef.current

    if (container) container.scrollTop = container.scrollHeight
  }, [channelId])

  useEffect(() => {
    const container = containerRef.current

    if (container && (firstLoadRef.current || nearBottomRef.current)) {
      container.scrollTop = container.scrollHeight
    }

    firstLoadRef.current = false
  }, [messages.length])

  useEffect(() => {
    if (messages.length === 0) return

    const last = messages[messages.length - 1]

    if (last.pending || last.failed || last.id < 0) return

    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current)

    markReadTimerRef.current = setTimeout(() => {
      markRead.mutate(last.id)
    }, 800)

    return () => {
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current)
    }
  }, [messages.length])

  const loadOlder = async () => {
    if (loadingOlder) return

    const cursor = messages[0]?.id

    if (!cursor) return

    setLoadingOlder(true)

    try {
      const response = await fetchChatMessagesBefore(workspaceId, channelId, cursor)

      if (response.success) {
        const previousTop = containerRef.current?.scrollHeight ?? 0

        setOlder((current) => [...response.data, ...current])
        setHasMore(response.hasMore)

        requestAnimationFrame(() => {
          const container = containerRef.current

          if (container) {
            container.scrollTop = container.scrollHeight - previousTop
          }
        })
      }
    } finally {
      setLoadingOlder(false)
    }
  }

  const handleScroll = () => {
    const container = containerRef.current

    if (!container) return

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight

    nearBottomRef.current = distanceFromBottom < 120
    setShowJumpToBottom(distanceFromBottom > 300)

    if (distanceFromBottom < 400 && hasMore && !loadingOlder) {
      loadOlder()
    }
  }

  const jumpToBottom = () => {
    const container = containerRef.current

    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
  }

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading messages...
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-destructive">
        Unable to load messages.
      </div>
    )
  }

  let dayBoundary = ''

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative min-h-0 flex-1 overflow-y-auto py-3"
    >
      {hasMore && (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? <Loader2 className="size-4 animate-spin" /> : null}
            Load earlier messages
          </Button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-sm">
          <p className="font-medium">No messages yet</p>
          <p className="text-xs">Send the first message to get the conversation going.</p>
        </div>
      ) : (
        messages.map((message, index) => {
          const previous = messages[index - 1]
          const currentDay = formatChatDay(message.createdAt)

          const dayChanged = currentDay !== dayBoundary

          dayBoundary = currentDay

          return (
            <div key={message.id}>
              {dayChanged && (
                <div className="my-4 flex items-center gap-3 px-4">
                  <div className="bg-border h-px flex-1" />
                  <span className="text-muted-foreground text-xs font-medium">
                    {currentDay}
                  </span>
                  <div className="bg-border h-px flex-1" />
                </div>
              )}
              <MessageItem
                message={message}
                isMine={message.senderId === myUserId}
                canDeleteAny={canDeleteAny}
                canPin={canPin}
                canReact={canReact}
                showHeader={shouldShowHeader(previous, message)}
                onReply={onReply}
                onToggleReaction={onToggleReaction}
                onPinToggle={onPinToggle}
                onDelete={onDelete}
                onEdit={onEdit}
              />
            </div>
          )
        })
      )}

      {showJumpToBottom && (
        <Button
          size="icon"
          className="absolute right-4 bottom-4 rounded-full shadow-md"
          aria-label="Jump to latest messages"
          onClick={jumpToBottom}
        >
          <ArrowDown className="size-4" />
        </Button>
      )}

      <div ref={bottomRef} />
    </div>
  )
}