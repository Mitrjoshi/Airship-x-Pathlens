import {
  useAcceptNotification,
  useReviewPermissionRequest,
} from '@/mutations/workspace'
import { getNotificationsOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { toast } from '@/lib/toast'
import { Skeleton } from '@workspace/ui/components/skeleton'

export const Route = createFileRoute('/app/(entry)/notifications')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isPending, isError } = useQuery(getNotificationsOptions())
  const { mutate: acceptNotification, isPending: acceptPending } =
    useAcceptNotification()
  const { mutate: reviewPermissionRequest, isPending: reviewPending } =
    useReviewPermissionRequest()
  const notifications = data?.data ?? []

  const getNotificationMessage = (type: string) => {
    if (type.startsWith('usage_limit_exceeded:')) {
      const metric = type.slice('usage_limit_exceeded:'.length)
      return `Your workspace exceeded its ${metric} limit. You have 14 days to reduce usage before tracking is paused.`
    }

    if (type === 'workspace_paused') {
      return 'Your workspace has been paused because a usage limit was exceeded.'
    }

    if (type === 'permission_request') {
      return 'A member requested view access.'
    }

    if (type === 'permission_request_approved') {
      return 'Your view access request was approved.'
    }

    if (type === 'permission_request_denied') {
      return 'Your view access request was denied.'
    }

    return null
  }

  const accept = (notificationId: string) => {
    acceptNotification(notificationId, {
      onSuccess: (response) => {
        if (!response.success) {
          toast.error(response.message ?? 'Unable to accept invitation.')
          return
        }

        toast.success('You joined the workspace.')
      },
    })
  }

  const review = (
    workspaceId: string,
    requestId: string,
    decision: 'approved' | 'denied'
  ) => {
    reviewPermissionRequest(
      { workspaceId, requestId, decision },
      {
        onSuccess: () =>
          toast.success(
            decision === 'approved'
              ? 'Permission request approved.'
              : 'Permission request denied.'
          ),
      }
    )
  }

  return (
    <div>
      <div className="mx-auto w-full max-w-4xl p-6 pt-10">
        <div className="space-y-6">
          <div>
            <p className="text-xl font-medium">Notifications</p>
            <p className="text-muted-foreground text-sm">
              Stay updated on important activity and alerts.
            </p>
          </div>

          {isPending ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-muted/30 flex items-start justify-between border-2 border-dashed p-2"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-30" />
                    <Skeleton className="h-4 w-60" />
                  </div>
                  <Skeleton className="h-8 w-30" />
                </div>
              ))}
            </div>
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
              {notifications.map((notification) => (
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
                      ) : notification.type === 'permission_request' ? (
                        <>
                          <span className="font-medium">
                            {notification.senderName}
                          </span>{' '}
                          requested access to{' '}
                          <span className="font-medium">
                            {notification.requestedPermission ?? 'a view'}
                          </span>
                          .
                        </>
                      ) : (
                        getNotificationMessage(notification.type)
                      )}
                    </p>
                    {notification.type === 'permission_request' &&
                      notification.requestReason && (
                        <p className="text-muted-foreground mt-2 text-xs">
                          “{notification.requestReason}”
                        </p>
                      )}
                    <p className="text-muted-foreground mt-1 text-xs">
                      {notification.workspaceName} ·{' '}
                      {notification.permissionProfileName ??
                        'Permission profile'}
                    </p>
                  </div>
                  {notification.type === 'workspace_invite' && (
                    <Button
                      variant={notification.acceptedAt ? 'outline' : 'default'}
                      disabled={acceptPending || !!notification.acceptedAt}
                      onClick={() => accept(notification.id)}
                    >
                      <LoadingSwap isLoading={acceptPending}>
                        {notification.acceptedAt
                          ? 'Invitation accepted'
                          : 'Accept invitation'}
                      </LoadingSwap>
                    </Button>
                  )}
                  {notification.type === 'permission_request' &&
                    notification.permissionRequestId &&
                    notification.permissionRequestStatus === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          disabled={reviewPending}
                          onClick={() =>
                            review(
                              notification.workspaceId,
                              notification.permissionRequestId!,
                              'approved'
                            )
                          }
                        >
                          <LoadingSwap isLoading={reviewPending}>
                            Approve
                          </LoadingSwap>
                        </Button>
                        <Button
                          variant="outline"
                          disabled={reviewPending}
                          onClick={() =>
                            review(
                              notification.workspaceId,
                              notification.permissionRequestId!,
                              'denied'
                            )
                          }
                        >
                          <LoadingSwap isLoading={reviewPending}>
                            Deny
                          </LoadingSwap>
                        </Button>
                      </div>
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
