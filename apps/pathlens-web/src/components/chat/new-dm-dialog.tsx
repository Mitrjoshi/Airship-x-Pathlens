import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'

import { useCreateDm } from '@/mutations/chat'
import { getWorkspaceMembersOptions } from '@/queries/workspace'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { getInitials } from './chat-utils'

export function NewDmDialog({
  workspaceId,
  currentUserId,
  open,
  onOpenChange,
}: {
  workspaceId: string
  currentUserId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const createDm = useCreateDm()
  const { data: membersData, isPending: membersPending } = useQuery(
    getWorkspaceMembersOptions(workspaceId)
  )
  const members = (membersData?.data ?? []).filter(
    (member) => member.id !== currentUserId
  )

  const toggleMember = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    )
  }

  const reset = () => setSelectedIds([])

  const submit = () => {
    createDm.mutate(
      {
        workspace_id: workspaceId,
        user_ids: selectedIds,
      },
      {
        onSuccess: (data) => {
          if (data.success) {
            onOpenChange(false)
            reset()
          }
        },
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New conversation</DialogTitle>
          <DialogDescription>
            Choose one or more teammates to message directly.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {membersPending ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              Loading members...
            </p>
          ) : members.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-xs">
              No other members in this workspace yet.
            </p>
          ) : (
            <div className="border-muted max-h-72 space-y-0.5 overflow-y-auto rounded-md border p-1">
              {members.map((member) => {
                const checked = selectedIds.includes(member.id)

                return (
                  <label
                    key={member.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted/50 ${
                      checked ? 'bg-muted/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(member.id)}
                      className="size-4 accent-primary"
                    />
                    <Avatar className="size-8">
                      <AvatarImage src={member.avatar ?? undefined} />
                      <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {member.name}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {member.email}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={selectedIds.length === 0 || createDm.isPending}
            onClick={submit}
          >
            {createDm.isPending && <Loader2 className="animate-spin" />}
            Start conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}