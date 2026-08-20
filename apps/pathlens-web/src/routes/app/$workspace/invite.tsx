import {
  ProjectPageHeader,
  ProjectPanel,
} from '@/components/common/project-page'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import { PageLayout } from '@/components/common/page-layout'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { useCreateWorkspaceInvitation } from '@/mutations/workspace'
import {
  getWorkspacePermissionProfilesOptions,
  getWorkspaceInvitationsOptions,
  getWorkspacesOptions,
} from '@/queries/workspace'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { Permission } from '@workspace/contracts'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  Loader2Icon,
  MailPlusIcon,
  ShieldCheckIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/app/$workspace/invite')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Invite members',
  },
})

const emailSchema = z.email()

function RouteComponent() {
  const { workspace } = Route.useParams()
  const { data: workspacesData } = useQuery(getWorkspacesOptions())
  const currentWorkspace = workspacesData?.data.find(
    (item) => item.id === workspace
  )
  const hasPermission = (permission: Permission) =>
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes(permission)
  const canViewMembers = hasPermission('workspace.members.view')
  const { data: profilesData, isPending: profilesPending } = useQuery(
    getWorkspacePermissionProfilesOptions(workspace)
  )
  const { data: invitationsData } = useQuery({
    ...getWorkspaceInvitationsOptions(workspace),
    enabled: canViewMembers,
  })
  const createInvitation = useCreateWorkspaceInvitation(workspace)
  const [email, setEmail] = useState('')
  const [permissionProfileId, setPermissionProfileId] = useState('')

  const workspaceName =
    workspacesData?.data.find((item) => item.id === workspace)?.name ??
    'this workspace'
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const memberLimit = currentPlan.limits.members
  const pendingInvitationCount = invitationsData?.data.length ?? 0
  const invitationCountKnown = !canViewMembers || invitationsData !== undefined
  const canAddMember =
    memberLimit === null ||
    Boolean(
      currentWorkspace &&
      invitationCountKnown &&
      currentWorkspace.memberCount + pendingInvitationCount < memberLimit
    )
  const memberLimitReached =
    currentWorkspace !== undefined &&
    invitationCountKnown &&
    memberLimit !== null &&
    currentWorkspace.memberCount + pendingInvitationCount >= memberLimit
  const isEmailValid = emailSchema.safeParse(email.trim()).success
  const profiles = profilesData?.data ?? []
  const defaultProfile =
    profiles.find((profile) => profile.name === 'Viewer') ?? profiles[0]
  const selectedPermissionProfileId =
    permissionProfileId || defaultProfile?.id || ''
  const selectedProfile = profiles.find(
    (profile) => profile.id === selectedPermissionProfileId
  )

  const submitInvitation = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const recipientEmail = email.trim()
    if (
      !emailSchema.safeParse(recipientEmail).success ||
      !selectedPermissionProfileId ||
      !canAddMember
    ) {
      return
    }

    createInvitation.mutate(
      {
        email: recipientEmail,
        permissionProfileId: selectedPermissionProfileId,
      },
      {
        onSuccess: (data) => {
          if (!data.success) return

          setEmail('')
        },
      }
    )
  }

  return (
    <PageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace members"
          title="Invite teammates"
          description={`Add someone to ${workspaceName} by sending them an in-app invitation.`}
          actions={
            <Button
              variant="outline"

              render={
                <Link
                  to="/app/$workspace/workspace-settings"
                  params={{ workspace }}
                />
              }
            >
              <ArrowLeftIcon />
              Workspace settings
            </Button>
          }
        />

        {memberLimitReached && memberLimit !== null && (
          <PlanLimitNotice
            workspaceId={workspace}
            resource="team member"
            limit={memberLimit}
          />
        )}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <CardTitle className="flex items-center gap-2">
                <MailPlusIcon className="size-5" />
                Send an invitation
              </CardTitle>
              <CardDescription>
                The recipient must already have a PathLens account.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <form className="space-y-5" onSubmit={submitInvitation}>
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teammate@company.com"
                    autoComplete="email"
                    autoFocus
                    aria-invalid={email.length > 0 && !isEmailValid}
                  />
                  {email.length > 0 && !isEmailValid && (
                    <p className="text-destructive text-xs">
                      Enter a valid email address.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-permission-profile">
                    Permission profile
                  </Label>
                  <Select
                    value={selectedPermissionProfileId}
                    onValueChange={(value) => {
                      if (value) setPermissionProfileId(value)
                    }}
                    disabled={profilesPending || profiles.length === 0}
                  >
                    <SelectTrigger
                      id="invite-permission-profile"
                      className="w-full"
                    >
                      <SelectValue placeholder="Choose a permission profile">
                        {
                          profiles.find(
                            (profile) =>
                              profile.id === selectedPermissionProfileId
                          )?.name
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedProfile ? (
                    <p className="text-muted-foreground text-xs leading-5">
                      {selectedProfile.description ??
                        `${selectedProfile.permissions.length} permissions assigned.`}
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs leading-5">
                      Create a permission profile before inviting teammates.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={
                    !isEmailValid ||
                    !selectedPermissionProfileId ||
                    profilesPending ||
                    !canAddMember ||
                    createInvitation.isPending
                  }
                >
                  {createInvitation.isPending && (
                    <Loader2Icon className="animate-spin" />
                  )}
                  Send invitation
                  {!createInvitation.isPending && <ArrowUpRightIcon />}
                </Button>
              </form>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel className="bg-muted/30 h-fit">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>How it works</CardTitle>
              <CardDescription>
                Invitations stay inside PathLens.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="flex gap-3">
                <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border">
                  <MailPlusIcon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">
                    Send to an existing user
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    Use the email address tied to their PathLens account.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border">
                  <UsersIcon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">They get a notification</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    The invitation appears from the bell in the app header.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="bg-background flex size-8 shrink-0 items-center justify-center rounded-lg border">
                  <ShieldCheckIcon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Access starts on accept</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    The workspace is added only after they accept the
                    invitation.
                  </p>
                </div>
              </div>
            </CardContent>
          </ProjectPanel>
        </div>
      </div>
    </PageLayout>
  )
}
