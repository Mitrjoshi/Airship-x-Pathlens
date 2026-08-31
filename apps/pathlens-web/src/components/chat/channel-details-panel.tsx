import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  Loader2,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'

import { getChatChannelDetailOptions } from '@/queries/chat'
import { getWorkspaceMembersOptions } from '@/queries/workspace'
import {
  useAddChannelMember,
  useArchiveChatChannel,
  useDeleteChatChannel,
  useRemoveChannelMember,
} from '@/mutations/chat'
import { getInitials } from './chat-utils'

export function ChannelDetailsPanel({
  workspaceId,
  channelId,
  canManageMembers,
  canManageChannel,
  onClose,
}: {
  workspaceId: string
  channelId: string
  canManageMembers: boolean
  canManageChannel: boolean
  onClose: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const { data, isPending } = useQuery(
    getChatChannelDetailOptions(workspaceId, channelId)
  )
  const { data: membersData } = useQuery(getWorkspaceMembersOptions(workspaceId))

  const addMember = useAddChannelMember(workspaceId, channelId)
  const removeMember = useRemoveChannelMember(workspaceId, channelId)
  const archiveChannel = useArchiveChatChannel(workspaceId, channelId)
  const deleteChannel = useDeleteChatChannel(workspaceId, channelId)

  const channel = data?.data.channel
  const members = data?.data.members ?? []
  const allWorkspaceMembers = membersData?.data ?? []

  if (isPending || !channel) {
    return (
      <div className="flex h-full min-w-0 flex-1 flex-col border-l bg-background">
        <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <p className="text-sm font-semibold">Details</p>
          <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-xs">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      </div>
    )
  }

  const availableMembers = allWorkspaceMembers.filter(
    (member) => !members.some((item) => item.userId === member.id)
  )

  const addMemberToChannel = (userId: string) => {
    addMember.mutate(userId, {
      onSuccess: (response) => {
        if (response.success) setPickerOpen(false)
      },
    })
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col border-l bg-background">
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
        <p className="text-sm font-semibold">Details</p>
        <Button variant="ghost" size="icon" className="size-8" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-4 py-4">
          <p className="text-lg font-semibold">
            {channel.type === 'channel'
              ? `#${channel.name}`
              : channel.name}
          </p>
          {channel.description && (
            <p className="text-muted-foreground mt-1 text-sm">
              {channel.description}
            </p>
          )}
          {channel.topic && (
            <p className="text-muted-foreground mt-1 text-xs">Topic: {channel.topic}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="secondary">
              {channel.visibility === 'public' ? 'Public' : 'Private'}
            </Badge>
            <Badge variant="outline">
              {channel.type === 'dm'
                ? 'Direct message'
                : channel.type === 'group_dm'
                  ? 'Group message'
                  : 'Channel'}
            </Badge>
          </div>
        </div>

        <div className="border-t px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              Members <span className="text-muted-foreground">({members.length})</span>
            </p>
            {canManageMembers && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                <UserPlus className="size-4" />
                Add
              </Button>
            )}
          </div>

          <div className="space-y-1">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50"
              >
                <Avatar className="size-8">
                  <AvatarImage src={member.avatar ?? undefined} />
                  <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {member.email}
                  </p>
                </div>
                {canManageMembers && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Remove ${member.name}`}
                    onClick={() => removeMember.mutate(member.userId)}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {canManageChannel && channel.type === 'channel' && (
          <div className="border-t px-4 py-4">
            <p className="text-sm font-semibold">Channel actions</p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmArchive(true)}
              >
                <Archive className="size-4" />
                Archive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add members</DialogTitle>
            <DialogDescription>
              Choose a workspace member to add to this channel.
            </DialogDescription>
          </DialogHeader>
          <div className="border-muted max-h-64 space-y-0.5 overflow-y-auto rounded-md border p-1">
            {availableMembers.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center text-xs">
                Everyone in the workspace is already a member.
              </p>
            ) : (
              availableMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  disabled={addMember.isPending}
                  onClick={() => addMemberToChannel(member.id)}
                  className="hover:bg-muted/50 flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-left"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={member.avatar ?? undefined} />
                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {member.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {member.email}
                    </span>
                  </span>
                  <UserPlus className="text-muted-foreground size-4" />
                </button>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this channel?</AlertDialogTitle>
            <AlertDialogDescription>
              The channel stays available but is hidden from the conversation
              list. You can restore it anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveChannel.mutate()}>
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this channel?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the channel and all of its messages.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteChannel.mutate()}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
