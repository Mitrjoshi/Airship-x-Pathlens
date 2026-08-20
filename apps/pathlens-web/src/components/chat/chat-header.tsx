import { Hash, Lock, Pin, Search, Users } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import type { ChatChannel } from '@workspace/contracts'

export function ChatHeader({
  channel,
  onOpenSearch,
  onOpenPins,
  onOpenDetails,
}: {
  channel: ChatChannel
  onOpenSearch: () => void
  onOpenPins: () => void
  onOpenDetails: () => void
}) {
  const isDm = channel.type === 'dm' || channel.type === 'group_dm'

  return (
    <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      {isDm ? (
        <Users className="text-muted-foreground size-5" />
      ) : channel.visibility === 'private' ? (
        <Lock className="text-muted-foreground size-5" />
      ) : (
        <Hash className="text-muted-foreground size-5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {isDm ? channel.name : `#${channel.name}`}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {channel.topic ?? `${channel.memberCount} members`}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Search chat"
        onClick={onOpenSearch}
      >
        <Search className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Pinned messages"
        onClick={onOpenPins}
      >
        <Pin className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Channel details"
        onClick={onOpenDetails}
      >
        <Users className="size-4" />
      </Button>
    </div>
  )
}