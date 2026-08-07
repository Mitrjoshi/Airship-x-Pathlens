import {
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import type { Permission } from '@workspace/contracts'
import {
  getWorkspaceInvitationsOptions,
  getWorkspaceMembersOptions,
  getWorkspacePermissionProfilesOptions,
  getWorkspacesOptions,
  type T_WorkspaceInvitation,
  type T_WorkspaceMember,
} from '@/queries/workspace'
import {
  useRemoveWorkspaceMember,
  useUpdateWorkspaceMember,
} from '@/mutations/workspace'
import { Button } from '@workspace/ui/components/button'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/members'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [memberToEdit, setMemberToEdit] = useState<T_WorkspaceMember | null>(
    null
  )
  const [memberToRemove, setMemberToRemove] =
    useState<T_WorkspaceMember | null>(null)
  const [memberPermissionProfileId, setMemberPermissionProfileId] = useState('')

  const {
    data: membersData,
    isPending: membersPending,
    isError: membersError,
  } = useQuery(getWorkspaceMembersOptions(workspace))
  const {
    data: invitationsData,
    isPending: invitationsPending,
    isError: invitationsError,
  } = useQuery(getWorkspaceInvitationsOptions(workspace))
  const { data: profilesData, isPending: profilesPending } = useQuery(
    getWorkspacePermissionProfilesOptions(workspace)
  )
  const updateMember = useUpdateWorkspaceMember(workspace)
  const removeMember = useRemoveWorkspaceMember(workspace)
  const members = membersData?.data ?? []
  const pendingInvitations: T_WorkspaceInvitation[] =
    invitationsData?.data ?? []
  const { data: workspaceData } = useQuery(getWorkspacesOptions())

  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )

  const hasPermission = (permission: Permission) =>
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes(permission)
  const canInviteMembers = hasPermission('workspace.members.invite')
  const canUpdateMembers = hasPermission('workspace.members.update')
  const canRemoveMembers = hasPermission('workspace.members.remove')
  const profiles = profilesData?.data ?? []

  const getProfileLabel = (profileId: string | null, role: string) => {
    if (role === 'owner') return 'Owner'

    return (
      profiles.find((profile) => profile.id === profileId)?.name ??
      'Unassigned profile'
    )
  }

  return (
    <ProjectPageLayout>
      <div>
        <ProjectPageHeader
          eyebrow="Team"
          title="Workspace members"
          description="Manage your members and access preferences."
        />

        {/* Members */}
        <ProjectPanel>
          <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Manage who has access to this workspace.
              </CardDescription>
            </div>

            {canInviteMembers && (
              <Button
                render={
                  <Link
                    to="/app/$workspace/projects/$project/invite"
                    params={{ workspace, project }}
                  />
                }
              >
                Invite Member
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Member</TableHead>
                    <TableHead>Access profile</TableHead>
                    <TableHead className="w-[180px]">Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {membersPending || invitationsPending ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground text-center"
                      >
                        Loading workspace access...
                      </TableCell>
                    </TableRow>
                  ) : membersError || invitationsError ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-destructive text-center"
                      >
                        Unable to load workspace access.
                      </TableCell>
                    </TableRow>
                  ) : members.length === 0 &&
                    pendingInvitations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground text-center"
                      >
                        No members or pending invitations.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {members.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={member.avatar ?? undefined}
                                  alt={member.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>

                              <div>
                                <div className="font-medium">{member.name}</div>
                                <div className="text-muted-foreground text-xs">
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                member.role === 'owner' ? 'default' : 'outline'
                              }
                            >
                              {getProfileLabel(
                                member.permissionProfileId,
                                member.role
                              )}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center justify-between gap-2">
                              <Badge variant="default">Active</Badge>
                              {(canUpdateMembers || canRemoveMembers) &&
                                member.role !== 'owner' && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      render={
                                        <Button variant="ghost" size="icon">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      }
                                    />

                                    <DropdownMenuContent
                                      className={'w-fit'}
                                      align="end"
                                    >
                                      {canUpdateMembers && (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setMemberToEdit(member)
                                            setMemberPermissionProfileId(
                                              member.permissionProfileId ?? ''
                                            )
                                          }}
                                        >
                                          Change permission profile
                                        </DropdownMenuItem>
                                      )}
                                      {canRemoveMembers && (
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() =>
                                            setMemberToRemove(member)
                                          }
                                        >
                                          Remove Member
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}

                      {pendingInvitations.map((invitation) => (
                        <TableRow key={`invitation-${invitation.id}`}>
                          <TableCell className="pl-6">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={invitation.avatar ?? undefined}
                                  alt={invitation.name}
                                />
                                <AvatarFallback className="text-xs">
                                  {getInitials(invitation.name)}
                                </AvatarFallback>
                              </Avatar>

                              <div>
                                <div className="font-medium">
                                  {invitation.name}
                                </div>
                                <div className="text-muted-foreground text-xs">
                                  {invitation.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline">
                              {invitation.permissionProfileName ??
                                'Unassigned profile'}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary">Pending</Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </ProjectPanel>
      </div>

      <Dialog
        open={Boolean(memberToEdit)}
        onOpenChange={(open) => {
          if (!open) setMemberToEdit(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change permission profile</DialogTitle>
            <DialogDescription>
              Choose the access profile for {memberToEdit?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="member-permission-profile">
              Permission profile
            </Label>
            <Select
              value={memberPermissionProfileId}
              onValueChange={(value) => {
                if (value) setMemberPermissionProfileId(value)
              }}
              disabled={profilesPending || profiles.length === 0}
            >
              <SelectTrigger id="member-permission-profile" className="w-full">
                <SelectValue placeholder="Choose a permission profile" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToEdit(null)}>
              Cancel
            </Button>
            <Button
              disabled={
                !memberToEdit ||
                !memberPermissionProfileId ||
                updateMember.isPending
              }
              onClick={() => {
                if (!memberToEdit) return

                updateMember.mutate(
                  {
                    userId: memberToEdit.id,
                    permissionProfileId: memberPermissionProfileId,
                  },
                  {
                    onSuccess: (data) => {
                      if (data.success) setMemberToEdit(null)
                    },
                  }
                )
              }}
            >
              {updateMember.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              {memberToRemove?.name} will lose access to this workspace.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberToRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!memberToRemove || removeMember.isPending}
              onClick={() => {
                if (!memberToRemove) return

                removeMember.mutate(memberToRemove.id, {
                  onSuccess: (data) => {
                    if (data.success) setMemberToRemove(null)
                  },
                })
              }}
            >
              {removeMember.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectPageLayout>
  )
}
