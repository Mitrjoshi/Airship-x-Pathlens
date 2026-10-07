import { useState } from 'react'
import { useRemoveWorkspaceMember } from '@/mutations/workspace'
import { getUserByIdOptions } from '@/queries/user'
import { getWorkspaceByIdOptions } from '@/queries/workspace'
import { capitalizeFirstLetter } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Separator } from '@workspace/ui/components/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ArrowUpRightIcon, ExternalLinkIcon } from 'lucide-react'
import { useNavigate, useRouteContext } from '@tanstack/react-router'
import { cn } from '@workspace/ui'

export const UserDetailsSheet = ({
  userId,
  workspaceId,
}: {
  userId: string
  workspaceId: string
}) => {
  const { user } = useRouteContext({
    from: '/app',
  })
  const navigate = useNavigate()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)

  const { data, isFetching } = useQuery(getUserByIdOptions(userId, workspaceId))

  const { data: workspaceData, isFetching: workspaceDataFetching } = useQuery(
    getWorkspaceByIdOptions(workspaceId)
  )

  const { mutate, isPending } = useRemoveWorkspaceMember(userId)

  const userData = data?.data
  const workspace = workspaceData?.data

  const isLoading = isFetching || workspaceDataFetching

  const initials =
    userData?.name
      ?.split(' ')
      .map((name) => name.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'U'

  const canRemoveUser =
    userData?.role !== 'owner' &&
    workspace?.permissions.includes('workspace.members.remove') &&
    user.id !== userId

  const handleRemoveUser = () => {
    mutate(workspaceId, {
      onSuccess: () => {
        setRemoveDialogOpen(false)
        setSheetOpen(false)
      },
    })
  }

  return (
    <>
      {/* ========================================
          SHEET
      ======================================== */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          disabled={isLoading}
          render={
            <Button className="text-foreground gap-1.5 px-0" variant="link" />
          }
        >
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <>
              {userData?.email}

              <ArrowUpRightIcon className="size-4" />
            </>
          )}
        </SheetTrigger>

        <SheetContent className="gap-0">
          <SheetHeader className="border-b">
            <SheetTitle>User Details</SheetTitle>

            <SheetDescription>
              View account and profile information.
            </SheetDescription>
          </SheetHeader>

          {userData && (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* ========================================
                  PROFILE
              ======================================== */}
              <div className="flex flex-col items-center border-b px-6 py-8">
                <Avatar className="size-40">
                  <AvatarImage
                    src={userData.avatar ?? undefined}
                    alt={userData.name}
                  />

                  <AvatarFallback className="text-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="mt-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-lg font-semibold">{userData.name}</p>

                    <Badge variant="secondary">
                      {capitalizeFirstLetter(userData.role)}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mt-1 text-sm">
                    {userData.email}
                  </p>
                </div>
              </div>

              {/* ========================================
                  USER DETAILS
              ======================================== */}
              <div className="divide-y px-6">
                <UserDetailRow label="Name" value={userData.name} />

                <UserDetailRow label="Email" value={userData.email} />

                <UserDetailRow
                  label="Joined"
                  value={new Date(userData.createdAt).toLocaleDateString(
                    'en-IN',
                    {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }
                  )}
                />
                <UserDetailRow
                  onClick={() => {
                    navigate({
                      to: '/app/$workspaceId/permissions/$permissionId',
                      params: {
                        workspaceId: workspaceId,
                        permissionId: userData.permissionProfileId!,
                      },
                    })
                  }}

                  label="Permission Profile"
                  value={userData.permissionProfileName!}
                />
              </div>
              <Separator />

              {/* ========================================
                  ACTIONS
              ======================================== */}
              {canRemoveUser && (
                <>
                  <SheetFooter>
                    {/* IMPORTANT:
                        Don't use DialogTrigger here.
                        Manually open the sibling dialog.
                    */}
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full"
                      onClick={() => setRemoveDialogOpen(true)}
                    >
                      Remove User
                    </Button>
                  </SheetFooter>
                </>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================
          DIALOG

          IMPORTANT:
          This is OUTSIDE the Sheet.
      ======================================== */}
      <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <DialogContent className="z-[9999] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove User</DialogTitle>

            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="text-foreground font-medium">
                {userData?.name}
              </span>{' '}
              from this workspace? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <DialogClose
              render={<Button variant="outline" disabled={isPending} />}
            >
              Cancel
            </DialogClose>

            <Button
              variant="destructive"
              size="lg"
              disabled={isPending}
              onClick={handleRemoveUser}
            >
              <LoadingSwap isLoading={isPending}>Remove User</LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type UserDetailRowProps = {
  label: string
  value: string
  onClick?: () => void
}

const UserDetailRow = ({ label, value, onClick }: UserDetailRowProps) => {
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>

        <div
          onClick={onClick}
          className={cn(
            'flex items-center gap-2 underline-offset-4',
            onClick && 'cursor-pointer hover:underline'
          )}
        >
          <p className="truncate text-sm font-medium">{value}</p>

          {onClick && <ExternalLinkIcon size={16} />}
        </div>
      </div>
    </div>
  )
}
