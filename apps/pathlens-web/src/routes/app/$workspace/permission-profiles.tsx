import {
  ProjectPageHeader,
  ProjectPanel,
} from '@/components/common/project-page'
import { WorkspacePageLayout } from '@/components/app-sidebar'
import { PlanFeatureNotice } from '@/components/common/plan-gate'
import {
  useCreateWorkspacePermissionProfile,
  useDeleteWorkspacePermissionProfile,
  useUpdateWorkspacePermissionProfile,
} from '@/mutations/workspace'
import {
  getWorkspacePermissionProfilesOptions,
  getWorkspacesOptions,
  type T_PermissionProfile,
} from '@/queries/workspace'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { Permission } from '@workspace/contracts'
import {
  PERMISSION_GROUPS,
  type PermissionDefinition,
} from '@workspace/contracts'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
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
import { Dialog, DialogContent } from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  ArrowLeftIcon,
  CopyIcon,
  Loader2Icon,
  LockKeyholeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
  UsersIcon,
} from 'lucide-react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { hasPlanFeature, useWorkspacePlan } from '@/lib/billing'

export const Route = createFileRoute('/app/$workspace/permission-profiles')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Permission profiles',
  },
})

type PermissionProfileDraft = {
  name: string
  description: string
  permissions: Permission[]
}

const emptyDraft: PermissionProfileDraft = {
  name: '',
  description: '',
  permissions: [],
}

function getDraftFromProfile(
  profile: T_PermissionProfile
): PermissionProfileDraft {
  return {
    name: profile.name,
    description: profile.description ?? '',
    permissions: [...profile.permissions],
  }
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`
}

function PermissionSwitch({
  permission,
  checked,
  onCheckedChange,
}: {
  permission: PermissionDefinition
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const inputId = `permission-${permission.key.replaceAll('.', '-')}`

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <Label
        className="flex cursor-pointer flex-col items-start"
        htmlFor={inputId}
      >
        <span className="block text-sm font-medium">{permission.label}</span>
        <span className="text-muted-foreground block text-xs leading-5">
          {permission.description}
        </span>
      </Label>
      <Switch
        id={inputId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={permission.label}
      />
    </div>
  )
}

function ProfileEditor({
  draft,
  setDraft,
  isPending,
  onSubmit,
  onCancel,
}: {
  draft: PermissionProfileDraft
  setDraft: Dispatch<SetStateAction<PermissionProfileDraft>>
  isPending: boolean
  onSubmit: () => void
  onCancel: () => void
}) {
  const togglePermission = (permission: Permission, checked: boolean) => {
    setDraft((current) => {
      const permissions = new Set(current.permissions)

      if (checked) permissions.add(permission)
      else permissions.delete(permission)

      return {
        ...current,
        permissions: [...permissions],
      }
    })
  }

  const toggleGroup = (
    groupPermissions: readonly PermissionDefinition[],
    checked: boolean
  ) => {
    setDraft((current) => {
      const permissions = new Set(current.permissions)

      for (const permission of groupPermissions) {
        if (checked) permissions.add(permission.key)
        else permissions.delete(permission.key)
      }

      return {
        ...current,
        permissions: [...permissions],
      }
    })
  }

  const canSubmit =
    draft.name.trim().length >= 2 && draft.permissions.length > 0

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="profile-name">Profile name</Label>
          <Input
            id="profile-name"
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            placeholder="Product analyst"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-description">Description</Label>
          <Textarea
            id="profile-description"
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                description: event.target.value,
              }))
            }
            placeholder="What this profile can access"
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Permissions</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose the exact areas this profile can access or manage.
          </p>
        </div>

        <div className="space-y-4">
          {PERMISSION_GROUPS.map((group) => {
            const allSelected = group.permissions.every((permission) =>
              draft.permissions.includes(permission.key)
            )

            return (
              <div key={group.id} className="rounded-2xl border p-4">
                <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-medium">{group.label}</h4>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {group.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-muted-foreground text-xs">
                      Select all
                    </Label>
                    <Switch
                      checked={allSelected}
                      onCheckedChange={(checked) =>
                        toggleGroup(group.permissions, checked)
                      }
                      aria-label={`Select all ${group.label} permissions`}
                    />
                  </div>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {group.permissions.map((permission) => (
                    <PermissionSwitch
                      key={permission.key}
                      permission={permission}
                      checked={draft.permissions.includes(permission.key)}
                      onCheckedChange={(checked) =>
                        togglePermission(permission.key, checked)
                      }
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {draft.permissions.length === 0 && (
        <p className="text-destructive text-sm">
          Select at least one permission before saving.
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={!canSubmit || isPending}>
          {isPending && <Loader2Icon className="animate-spin" />}
          Save profile
        </Button>
      </div>
    </div>
  )
}

function RouteComponent() {
  const { workspace } = Route.useParams()
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const {
    data: profilesData,
    isPending: profilesPending,
    isError: profilesError,
  } = useQuery(getWorkspacePermissionProfilesOptions(workspace))
  const createProfile = useCreateWorkspacePermissionProfile(workspace)
  const updateProfile = useUpdateWorkspacePermissionProfile(workspace)
  const deleteProfile = useDeleteWorkspacePermissionProfile(workspace)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] =
    useState<T_PermissionProfile | null>(null)
  const [draft, setDraft] = useState<PermissionProfileDraft>(emptyDraft)
  const [profileToDelete, setProfileToDelete] =
    useState<T_PermissionProfile | null>(null)

  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const hasPermission = (permission: Permission) =>
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes(permission)
  const canCreate = hasPermission('workspace.permission_profiles.create')
  const canUpdate = hasPermission('workspace.permission_profiles.update')
  const canDelete = hasPermission('workspace.permission_profiles.delete')
  const currentPlanId = useWorkspacePlan(workspace)
  const hasAdvancedPermissions = hasPlanFeature(
    currentPlanId,
    'advancedPermissions'
  )
  const profiles = profilesData?.data ?? []
  const assignedMembers = profiles.reduce(
    (total, profile) => total + profile.memberCount,
    0
  )

  if (!hasAdvancedPermissions) {
    return (
      <WorkspacePageLayout workspaceId={workspace}>
        <div className="space-y-8">
          <ProjectPageHeader
            eyebrow="Workspace access"
            title="Permission profiles"
            description="Create advanced access profiles for larger teams."
          />
          <PlanFeatureNotice
            workspaceId={workspace}
            feature="advancedPermissions"
            description="Advanced permissions and custom access profiles are available on the Business plan."
          />
        </div>
      </WorkspacePageLayout>
    )
  }

  const openCreateDialog = () => {
    setEditingProfile(null)
    setDraft(emptyDraft)
    setDialogOpen(true)
  }

  const openEditDialog = (profile: T_PermissionProfile) => {
    if (profile.isSystem || !canUpdate) return

    setEditingProfile(profile)
    setDraft(getDraftFromProfile(profile))
    setDialogOpen(true)
  }

  const openDuplicateDialog = (profile: T_PermissionProfile) => {
    setEditingProfile(null)
    setDraft({
      ...getDraftFromProfile(profile),
      name: `${profile.name} copy`,
    })
    setDialogOpen(true)
  }

  const submitProfile = () => {
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      permissions: draft.permissions,
    }

    if (editingProfile) {
      updateProfile.mutate(
        { profileId: editingProfile.id, payload },
        {
          onSuccess: (data) => {
            if (data.success) setDialogOpen(false)
          },
        }
      )
    } else {
      createProfile.mutate(payload, {
        onSuccess: (data) => {
          if (data.success) setDialogOpen(false)
        },
      })
    }
  }

  const profileMutationPending =
    createProfile.isPending || updateProfile.isPending

  return (
    <WorkspacePageLayout workspaceId={workspace}>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace access"
          title="Permission profiles"
          description="Create reusable access rules and assign them to workspace members instead of managing broad roles."
          actions={
            <>
              <Button
                variant="outline"
                render={
                  <Link to="/app/$workspace/members" params={{ workspace }} />
                }
              >
                <ArrowLeftIcon />
                Members
              </Button>
              {canCreate && (
                <Button onClick={openCreateDialog}>
                  <PlusIcon />
                  New profile
                </Button>
              )}
            </>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <ProjectPanel className="p-5">
            <p className="text-muted-foreground text-xs">Profiles</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {profilesPending ? '—' : profiles.length}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Reusable access rules
            </p>
          </ProjectPanel>
          <ProjectPanel className="p-5">
            <p className="text-muted-foreground text-xs">Assigned members</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {profilesPending ? '—' : assignedMembers}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Members using a profile
            </p>
          </ProjectPanel>
          <ProjectPanel className="p-5">
            <p className="text-muted-foreground text-xs">Permission areas</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {PERMISSION_GROUPS.length}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Workspace, projects, and analytics
            </p>
          </ProjectPanel>
        </div>

        {profilesError ? (
          <div className="text-destructive rounded-2xl border border-dashed px-5 py-12 text-center text-sm">
            You do not have permission to view these profiles.
          </div>
        ) : profilesPending ? (
          <ProjectPanel className="p-8 text-center text-sm">
            Loading permission profiles...
          </ProjectPanel>
        ) : profiles.length === 0 ? (
          <ProjectPanel className="p-8 text-center">
            <ShieldCheckIcon className="text-muted-foreground mx-auto size-8" />
            <p className="mt-3 font-medium">No permission profiles yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a profile to define the access new members receive.
            </p>
          </ProjectPanel>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {profiles.map((profile) => (
              <ProjectPanel key={profile.id}>
                <CardHeader className="border-b px-5 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {profile.name}
                        <Badge
                          variant={profile.isSystem ? 'secondary' : 'outline'}
                        >
                          {profile.isSystem ? 'Built-in' : 'Custom'}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {profile.description ?? 'No description provided.'}
                      </CardDescription>
                    </div>
                    <DropdownMenuActions
                      profile={profile}
                      canCreate={canCreate}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                      onEdit={() => openEditDialog(profile)}
                      onDuplicate={() => openDuplicateDialog(profile)}
                      onDelete={() => setProfileToDelete(profile)}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      <ShieldCheckIcon />
                      {formatCount(profile.permissions.length, 'permission')}
                    </Badge>
                    <Badge variant="outline">
                      <UsersIcon />
                      {formatCount(profile.memberCount, 'member')}
                    </Badge>
                    {profile.pendingInvitationCount > 0 && (
                      <Badge variant="outline">
                        {formatCount(
                          profile.pendingInvitationCount,
                          'pending invitation'
                        )}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs leading-5">
                    {profile.isSystem ? (
                      <>
                        <LockKeyholeIcon className="size-3.5" />
                        Built-in profiles are protected. Duplicate one to
                        customize it.
                      </>
                    ) : (
                      'Permissions take effect immediately for assigned members.'
                    )}
                  </div>
                </CardContent>
              </ProjectPanel>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!profileMutationPending) setDialogOpen(open)
        }}
      >
        <DialogContent className="max-h-[90vh] w-full max-w-2xl! overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              {editingProfile
                ? 'Edit permission profile'
                : 'New permission profile'}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Define a reusable set of permissions for your workspace.
            </p>
          </div>
          <ProfileEditor
            draft={draft}
            setDraft={setDraft}
            isPending={profileMutationPending}
            onSubmit={submitProfile}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(profileToDelete)}
        onOpenChange={(open) => {
          if (!open) setProfileToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permission profile?</AlertDialogTitle>
            <AlertDialogDescription>
              {profileToDelete?.name} will be permanently removed. Profiles with
              assigned members or pending invitations cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteProfile.isPending}
              onClick={() => {
                if (!profileToDelete) return

                deleteProfile.mutate(profileToDelete.id, {
                  onSuccess: (data) => {
                    if (data.success) setProfileToDelete(null)
                  },
                })
              }}
            >
              {deleteProfile.isPending && (
                <Loader2Icon className="animate-spin" />
              )}
              Delete profile
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePageLayout>
  )
}

function DropdownMenuActions({
  profile,
  canCreate,
  canUpdate,
  canDelete,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  profile: T_PermissionProfile
  canCreate: boolean | undefined
  canUpdate: boolean | undefined
  canDelete: boolean | undefined
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${profile.name}`}
          />
        }
      >
        <MoreHorizontalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={'w-auto'} align="end">
        {canUpdate && !profile.isSystem && (
          <DropdownMenuItem className={'text-nowrap'} onClick={onEdit}>
            <PencilIcon />
            Edit profile
          </DropdownMenuItem>
        )}
        {canCreate && (
          <DropdownMenuItem className={'text-nowrap'} onClick={onDuplicate}>
            <CopyIcon />
            Duplicate profile
          </DropdownMenuItem>
        )}
        {canDelete && !profile.isSystem && (
          <DropdownMenuItem
            className="text-destructive text-nowrap"
            onClick={onDelete}
          >
            <Trash2Icon />
            Delete profile
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
