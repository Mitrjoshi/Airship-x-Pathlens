import { useAcceptNotification } from '@/mutations/workspace'
import { getNotificationsOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { BellOffIcon, CheckIcon, Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/(entry)/notifications')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending, isError } = useQuery(getNotificationsOptions())
  const acceptNotification = useAcceptNotification()
  const notifications = data?.data ?? []
  const unreadNotifications = notifications.filter(
    (notification) => !notification.readAt
  )

  const getNotificationMessage = (type: string) => {
    if (type.startsWith('usage_limit_exceeded:')) {
      const metric = type.slice('usage_limit_exceeded:'.length)
      return `Your workspace exceeded its ${metric} limit. You have 14 days to reduce usage before tracking is paused.`
    }

    if (type === 'workspace_paused') {
      return 'Your workspace has been paused because a usage limit was exceeded.'
    }

    return null
  }

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
    <div>
      <div className="mx-auto max-w-4xl py-10">
        <div className="space-y-6">
          <div>
            <p className="text-xl font-semibold">Notifications</p>
            <p className="text-muted-foreground text-sm">
              Stay updated on important activity and alerts.
            </p>
          </div>

          {isPending ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 px-2 py-8 text-xs"></div>
          ) : isError ? (
            <div className="flex h-60 flex-col items-center justify-center gap-2">
              <p className="text-destructive text-sm">
                Unable to load notifications.
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center gap-2">
              <p className="text-muted-foreground text-sm">
                You don&apos;t have any notifications yet. Check back later.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 8).map((notification) => (
                <div
                  key={notification.id}
                  className="bg-muted/30 flex items-start justify-between border-2 border-dashed p-2"
                >
                  <div>
                    <p className="text-sm leading-5">
                      {notification.type === 'workspace_invite' ? (
                        <>
                          <span className="font-medium">
                            {notification.senderName}
                          </span>{' '}
                          invited you to join a workspace.
                        </>
                      ) : (
                        getNotificationMessage(notification.type)
                      )}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {notification.workspaceName} ·{' '}
                      {notification.permissionProfileName ??
                        'Permission profile'}
                    </p>
                  </div>
                  {notification.type === 'workspace_invite' && (
                    <Button
                      variant={notification.acceptedAt ? 'outline' : 'default'}
                      disabled={
                        acceptNotification.isPending ||
                        !!notification.acceptedAt
                      }
                      onClick={() => accept(notification.id)}
                    >
                      <LoadingSwap isLoading={acceptNotification.isPending}>
                        {notification.acceptedAt
                          ? 'Invitation accepted'
                          : 'Accept invitation'}
                      </LoadingSwap>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
