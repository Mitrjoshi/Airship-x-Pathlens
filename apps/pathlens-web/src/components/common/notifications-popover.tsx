import { Button } from '@workspace/ui/components/button'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { useAcceptNotification } from '@/mutations/workspace'
import { getNotificationsOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { BellIcon, CheckIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

export function NotificationsPopover() {
  const { data, isPending, isError } = useQuery(getNotificationsOptions())
  const acceptNotification = useAcceptNotification()
  const notifications = data?.data ?? []
  const pendingInvitations = notifications.filter(
    (notification) =>
      notification.type === 'workspace_invite' && !notification.acceptedAt
  )

  const accept = (notificationId: string) => {
    acceptNotification.mutate(notificationId, {
      onSuccess: (response) => {
        if (!response.success) {
          toast.error(response.message ?? 'Unable to accept invitation.')
          return
        }

        toast.success('You joined the workspace.')
      },
    })
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="icon"
            aria-label={
              pendingInvitations.length > 0
                ? `${pendingInvitations.length} pending notifications`
                : 'Notifications'
            }
          />
        }
      >
        <span className="relative">
          <BellIcon />
          {pendingInvitations.length > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-2 -right-2 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4">
              {pendingInvitations.length > 9 ? '9+' : pendingInvitations.length}
            </span>
          )}
        </span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80">
        <PopoverHeader className="px-1 py-0.5">
          <PopoverTitle>Notifications</PopoverTitle>
        </PopoverHeader>

        {isPending ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 px-2 py-8 text-xs">
            <Loader2Icon className="size-4 animate-spin" />
            Loading notifications...
          </div>
        ) : isError ? (
          <p className="text-destructive px-2 py-8 text-center text-xs">
            Unable to load notifications.
          </p>
        ) : pendingInvitations.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-2 py-8 text-center text-xs">
            <CheckIcon className="size-5" />
            You&apos;re all caught up.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingInvitations.map((notification) => (
              <div
                key={notification.id}
                className="bg-muted/50 space-y-3 rounded-lg p-3"
              >
                <div>
                  <p className="text-sm leading-5">
                    <span className="font-medium">
                      {notification.senderName}
                    </span>{' '}
                    invited you to join a workspace.
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {notification.workspaceName} ·{' '}
                    {notification.role.charAt(0).toUpperCase() +
                      notification.role.slice(1)}
                  </p>
                </div>
                <Button
                  className="w-full"
                  disabled={acceptNotification.isPending}
                  onClick={() => accept(notification.id)}
                >
                  {acceptNotification.isPending && (
                    <Loader2Icon className="animate-spin" />
                  )}
                  Accept invitation
                </Button>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
