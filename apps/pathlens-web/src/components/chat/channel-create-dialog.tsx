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
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

import { useCreateChatChannel } from '@/mutations/chat'
import { getWorkspaceMembersOptions } from '@/queries/workspace'

export function ChannelCreateDialog({
  workspaceId,
  open,
  onOpenChange,
}: {
  workspaceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [topic, setTopic] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [memberIds, setMemberIds] = useState<string[]>([])
  const createChannel = useCreateChatChannel()
  const { data: membersData, isPending: membersPending } = useQuery(
    getWorkspaceMembersOptions(workspaceId)
  )
  const members = membersData?.data ?? []

  const toggleMember = (userId: string) => {
    setMemberIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    )
  }

  const reset = () => {
    setName('')
    setDescription('')
    setTopic('')
    setVisibility('public')
    setMemberIds([])
  }

  const submit = () => {
    createChannel.mutate(
      {
        workspace_id: workspaceId,
        name: name.trim().toLowerCase().replace(/\s+/g, '-'),
        description: description.trim() || undefined,
        topic: topic.trim() || undefined,
        visibility,
        member_ids: visibility === 'private' ? memberIds : undefined,
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
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where your team shares updates, questions, and ideas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel name</Label>
            <Input
              id="channel-name"
              placeholder="e.g. product-launch"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-topic">Topic (optional)</Label>
            <Input
              id="channel-topic"
              placeholder="What is this channel about?"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel-description">Description (optional)</Label>
            <Textarea
              id="channel-description"
              placeholder="A short description for new members."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value as 'public' | 'private')
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {visibility === 'public'
                    ? 'Public — everyone in the workspace can see it'
                    : 'Private — only invited members'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  Public — everyone in the workspace can see it
                </SelectItem>
                <SelectItem value="private">
                  Private — only invited members
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === 'private' && (
            <div className="space-y-2">
              <Label>Add members</Label>
              {membersPending ? (
                <p className="text-muted-foreground text-xs">
                  Loading members...
                </p>
              ) : members.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No other members in this workspace yet.
                </p>
              ) : (
                <div className="border-muted max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
                  {members.map((member) => (
                    <label
                      key={member.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={memberIds.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                        className="accent-primary size-4"
                      />
                      <span className="font-medium">{member.name}</span>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {member.email}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim() || createChannel.isPending}
            onClick={submit}
          >
            {createChannel.isPending && <Loader2 className="animate-spin" />}
            Create channel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
