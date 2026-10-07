import {
  useRemoveWorkspaceMember,
  useRevokeWorkspaceInvitation,
  useUpdateWorkspaceMember,
} from '@/mutations/workspace'
import {
  getWorkspaceInvitationsOptions,
  getWorkspaceMembersOptions,
  getWorkspacePermissionProfilesOptions,
} from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  ArrowUpRightIcon,
  EllipsisIcon,
  SearchIcon,
  UserPlusIcon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/$workspaceId/team')({
  component: RouteComponent,
})

type T_WorkspaceMember = {
  id: string
  name: string
  email: string
  avatar: string | null
  role: string
  permissionProfileId: string | null
  permissionProfileName: string | null
  joinedAt: string
}

function RouteComponent() {
  const { workspaceId } = Route.useParams()

  const [editMember, setEditMember] = useState<T_WorkspaceMember | null>(null)
  const [removeMember, setRemoveMember] = useState<T_WorkspaceMember | null>(
    null
  )

  const [permissionProfileId, setPermissionProfileId] = useState('')

  const { data: membersData, isPending: membersPending } = useQuery(
    getWorkspaceMembersOptions(workspaceId)
  )
  const { data: invitationsData, isPending: invitationsPending } = useQuery(
    getWorkspaceInvitationsOptions(workspaceId)
  )
  const { mutate: revokeInvitation, isPending: revokeInvitationPending } =
    useRevokeWorkspaceInvitation(workspaceId)
  const { data: profilesData } = useQuery(
    getWorkspacePermissionProfilesOptions(workspaceId)
  )

  const { mutate: updateMember, isPending: updateMemberPending } =
    useUpdateWorkspaceMember(workspaceId)

  const { mutate: removeWorkspaceMember, isPending: removeMemberPending } =
    useRemoveWorkspaceMember(workspaceId)

  const profiles = profilesData?.data ?? []
  const invitations = invitationsData?.data ?? []

  const getProfileLabel = (profileId: string | null, role: string) => {
    if (role === 'owner') return 'Owner'
    if (role === 'member') return 'Member'

    return (
      profiles.find((profile) => profile.id === profileId)?.name ??
      'Unassigned profile'
    )
  }

  const handleOpenEdit = (member: T_WorkspaceMember) => {
    setEditMember(member)
    setPermissionProfileId(member.permissionProfileId ?? '')
  }

  const handleEdit = () => {
    if (!editMember || !permissionProfileId) return

    updateMember(
      {
        userId: editMember.id,
        permissionProfileId,
      },
      {
        onSuccess: () => {
          setEditMember(null)
          setPermissionProfileId('')
        },
      }
    )
  }

  const handleRemove = () => {
    if (!removeMember) return

    removeWorkspaceMember(removeMember.id, {
      onSuccess: () => {
        setRemoveMember(null)
      },
    })
  }

  const permissionItems = profiles?.map((item) => ({
    label: item.name,
    value: item.id,
  }))

  return (
    <div>
      <div className="mx-auto p-6">
        <div className="space-y-5">
          <p className="text-2xl font-medium">Team</p>

          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-4">
                <InputGroup>
                  <InputGroupButton>
                    <SearchIcon />
                  </InputGroupButton>

                  <InputGroupInput placeholder="Search..." />
                </InputGroup>

                <Button
                  render={
                    <Link
                      params={{
                        workspaceId,
                      }}
                      to="/app/$workspaceId/invite"
                    />
                  }
                >
                  <UserPlusIcon />
                  Invite Member
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>

                      <TableHead className="w-40 text-center">Role</TableHead>

                      <TableHead className="w-40 text-center">
                        Access profile
                      </TableHead>

                      <TableHead className="w-20 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {membersPending
                      ? [...Array(5)].map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Skeleton className="h-6 w-50" />
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-6 w-30" />
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-6 w-30" />
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-8 w-8" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : membersData?.data?.map((item) => (
                          <TableRow
                            key={item.id}
                            className="hover:bg-card/40 cursor-pointer"
                          >
                            <TableCell>
                              <div className="max-w-80 overflow-hidden">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <p className="truncate text-sm font-medium">
                                    {item.name}
                                  </p>
                                </div>

                                <p className="text-muted-foreground truncate text-xs">
                                  {item.email}
                                </p>
                              </div>
                            </TableCell>

                            <TableCell className="text-center">
                              {getProfileLabel(
                                item.permissionProfileId,
                                item.role
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              {item.permissionProfileId ? (
                                <Button
                                  className="text-foreground"
                                  variant="link"
                                  render={
                                    <Link
                                      to="/app/$workspaceId/permissions/$permissionId"
                                      params={{
                                        workspaceId,
                                        permissionId: item.permissionProfileId,
                                      }}
                                    />
                                  }
                                >
                                  {item.permissionProfileName}
                                  <ArrowUpRightIcon />
                                </Button>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  —
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger
                                  render={
                                    <Button variant="ghost" size="icon" />
                                  }
                                >
                                  <EllipsisIcon />
                                </DropdownMenuTrigger>

                                <DropdownMenuContent
                                  align="end"
                                  className="w-32"
                                >
                                  <DropdownMenuItem
                                    disabled={item.role === 'owner'}
                                    onClick={() => handleOpenEdit(item)}
                                  >
                                    Edit
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem
                                    disabled={item.role === 'owner'}
                                    variant="destructive"
                                    onClick={() => setRemoveMember(item)}
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="w-[25%] space-y-2">
              <Card className="bg-card/30 gap-0 overflow-hidden rounded-none border-2 border-dashed p-0">
                <CardHeader className="border-b p-4">
                  <CardTitle>
                    {invitationsPending ? (
                      <Skeleton className="h-6 w-40" />
                    ) : (
                      <> Pending invitations ({invitations.length})</>
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="aspect-square divide-y overflow-auto p-2 px-4">
                  {invitationsPending ? (
                    <div className="space-y-2 py-4">
                      {[...Array(5)].map((_, index) => (
                        <Skeleton className="h-10 w-full" key={index} />
                      ))}
                    </div>
                  ) : !invitations.length ? (
                    <div className="py-4">
                      <p className="text-muted-foreground text-center">
                        No invitations yet.
                      </p>
                    </div>
                  ) : (
                    invitations.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 py-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p>{item.name}</p>
                            <Badge variant="secondary">
                              {item.permissionProfileName}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {item.email}
                          </p>
                        </div>

                        <Dialog>
                          <DialogTrigger
                            render={<Button variant="destructive" />}
                          >
                            Revoke
                          </DialogTrigger>

                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Revoke invitation</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to revoke this invitation?
                              </DialogDescription>
                            </DialogHeader>

                            <DialogFooter className="py-2">
                              <DialogClose
                                render={<Button variant="outline" />}
                              >
                                Cancel
                              </DialogClose>
                              <Button
                                onClick={() => revokeInvitation(item.id)}
                                variant="destructive"
                              >
                                <LoadingSwap
                                  isLoading={revokeInvitationPending}
                                >
                                  Confirm
                                </LoadingSwap>
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Edit member */}
      <Dialog
        open={!!editMember}
        onOpenChange={(open) => {
          if (!open) {
            setEditMember(null)
            setPermissionProfileId('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>

            <DialogDescription>
              Update the access profile for{' '}
              <span className="text-foreground font-medium">
                {editMember?.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium">Access profile</p>

            <Select
              items={permissionItems}
              value={permissionProfileId}
              onValueChange={(value) => setPermissionProfileId(value ?? '')}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select access profile" />
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false}>
                {permissionItems.map((profile) => (
                  <SelectItem key={profile.value} value={profile.value}>
                    {profile.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={updateMemberPending}
              onClick={() => {
                setEditMember(null)
                setPermissionProfileId('')
              }}
            >
              Cancel
            </Button>

            <Button
              disabled={
                updateMemberPending ||
                !permissionProfileId ||
                permissionProfileId === editMember?.permissionProfileId
              }
              onClick={handleEdit}
            >
              <LoadingSwap isLoading={updateMemberPending}>
                Save changes
              </LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove member */}
      <Dialog
        open={!!removeMember}
        onOpenChange={(open) => {
          if (!open) {
            setRemoveMember(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>

            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="text-foreground font-medium">
                {removeMember?.name}
              </span>{' '}
              from this workspace? They will lose access to the workspace.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={removeMemberPending}
              onClick={() => setRemoveMember(null)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={removeMemberPending}
              onClick={handleRemove}
            >
              <LoadingSwap isLoading={removeMemberPending}>Confirm</LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
