import { useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { CHAT_REACTION_EMOJIS } from '@workspace/contracts'

export function ReactionBar({
  onReact,
  disabled,
}: {
  onReact: (emoji: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Add reaction"
            disabled={disabled}
          />
        }
      >
        <SmilePlus className="size-4" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1">
        <div className="flex items-center gap-0.5">
          {CHAT_REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="hover:bg-muted rounded-md px-2 py-1 text-xl transition-colors"
              onClick={() => {
                onReact(emoji)
                setOpen(false)
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}