import {
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@workspace/ui/components/alert-dialog'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { useDeleteWorkspace, useUpdateWorkspace } from '@/mutations/workspace'
import type { Permission } from '@workspace/contracts'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  FolderIcon,
  Loader2,
  ShieldCheckIcon,
  Trash2,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react'

import { getWorkspacesOptions } from '@/queries/workspace'
import { formatNumber } from '@/utils/utils'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/workspace-settings'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Settings',
  },
})

const nameSchema = z
  .string()
  .min(2, 'Workspace name must be at least 2 characters')

const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .regex(
    /^[a-z0-9-]+$/,
    'Slug can only contain lowercase letters, numbers, and hyphens'
  )

const generalSchema = z.object({
  name: nameSchema,
  slug: slugSchema,
})

function FieldError({
  errors,
}: {
  errors: Array<{ message?: string } | string | undefined>
}) {
  if (!errors.length) return null

  return (
    <p className="text-destructive text-sm">
      {typeof errors[0] === 'string' ? errors[0] : errors[0]?.message}
    </p>
  )
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const { data: workspacesData, isPending: workspacesPending } = useQuery(
    getWorkspacesOptions()
  )
  const updateWorkspace = useUpdateWorkspace(workspace)
  const deleteWorkspace = useDeleteWorkspace()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const currentWorkspace = workspacesData?.data.find(
    (item) => item.id === workspace
  )
  const hasPermission = (permission: Permission) =>
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes(permission)
  const canEditWorkspace = hasPermission('workspace.settings.update')
  const canViewMembers = hasPermission('workspace.members.view')
  const canInviteMembers = hasPermission('workspace.members.invite')
  const canViewPermissionProfiles =
    hasPermission('workspace.permission_profiles.view') ||
    hasPermission('workspace.permission_profiles.create') ||
    hasPermission('workspace.permission_profiles.update') ||
    hasPermission('workspace.permission_profiles.delete')
  const canDeleteWorkspace = hasPermission('workspace.delete')
  const canConfirmDelete =
    Boolean(currentWorkspace) &&
    deleteConfirmation.trim() === currentWorkspace?.name
  const roleLabel = currentWorkspace
    ? currentWorkspace.role === 'owner'
      ? 'Owner'
      : (currentWorkspace.permissionProfileName ?? 'Unassigned profile')
    : '—'
  const form = useForm({
    defaultValues: {
      name: '',
      slug: workspace,
    },
    validators: {
      onChange: generalSchema,
    },
    onSubmit: async ({ value }) => {
      await updateWorkspace.mutateAsync({ name: value.name })
      form.reset({
        name: value.name,
        slug: workspace,
      })
    },
  })

  useEffect(() => {
    if (!currentWorkspace || form.state.isDirty) return

    form.reset({
      name: currentWorkspace.name,
      slug: workspace,
    })
  }, [currentWorkspace, form, workspace])

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace"
          title="Workspace settings"
          description="Manage your workspace, members, and access preferences."
        />

        <div className="space-y-6">
          {/* General */}
          <ProjectPanel>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                form.handleSubmit()
              }}
            >
              <CardHeader className="border-b px-5 py-5">
                <CardTitle>Workspace details</CardTitle>
                <CardDescription>
                  Update your workspace name and URL slug.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-5 p-5 md:grid-cols-2">
                <form.Field name="name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Workspace Name</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        disabled={
                          !canEditWorkspace || updateWorkspace.isPending
                        }
                        placeholder={currentWorkspace?.name ?? 'Workspace name'}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </form.Field>
              </CardContent>

              <CardFooter className="justify-end px-5 py-4">
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={
                        !canSubmit ||
                        isSubmitting ||
                        workspacesPending ||
                        !canEditWorkspace ||
                        updateWorkspace.isPending
                      }
                    >
                      {(isSubmitting || updateWorkspace.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </form.Subscribe>
              </CardFooter>
            </form>
          </ProjectPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <ProjectPanel>
              <CardHeader className="border-b px-5 py-5">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="size-5" />
                  People & access
                </CardTitle>
                <CardDescription>
                  Review who can access this workspace and invite teammates.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <UsersIcon className="size-3.5" />
                    Members
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {workspacesPending || !currentWorkspace
                      ? '—'
                      : formatNumber(currentWorkspace?.memberCount)}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    People with workspace access
                  </p>
                </div>

                <div className="rounded-xl border p-4">
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <ShieldCheckIcon className="size-3.5" />
                    Your access profile
                  </p>
                  <Badge className="mt-3" variant="outline">
                    {roleLabel}
                  </Badge>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {canViewMembers
                      ? 'You can view workspace access.'
                      : 'Contact the workspace owner to change access.'}
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap justify-end gap-2 border-t px-5 py-4">
                {canViewMembers && (
                  <Button
                    variant="outline"
                    render={
                      <Link
                        to="/app/$workspace/projects/$project/members"
                        params={{ workspace, project }}
                      />
                    }
                  >
                    <UsersIcon />
                    Manage members
                  </Button>
                )}
                {canViewPermissionProfiles && (
                  <Button
                    variant="outline"
                    render={
                      <Link
                        to="/app/$workspace/projects/$project/permission-profiles"
                        params={{ workspace, project }}
                      />
                    }
                  >
                    <ShieldCheckIcon />
                    Permission profiles
                  </Button>
                )}
                {canInviteMembers && (
                  <Button
                    render={
                      <Link
                        to="/app/$workspace/projects/$project/invite"
                        params={{ workspace, project }}
                      />
                    }
                  >
                    <UserPlusIcon />
                    Invite member
                  </Button>
                )}
              </CardFooter>
            </ProjectPanel>

            <ProjectPanel>
              <CardHeader className="border-b px-5 py-5">
                <CardTitle className="flex items-center gap-2">
                  <FolderIcon className="size-5" />
                  Projects & tracking
                </CardTitle>
                <CardDescription>
                  Keep projects organized and review how tracking is connected.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 p-5">
                <div className="rounded-xl border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Connected projects</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        Each project has its own analytics data and tracking
                        key.
                      </p>
                    </div>
                    <p className="text-2xl font-semibold tracking-tight">
                      {workspacesPending || !currentWorkspace
                        ? '—'
                        : formatNumber(currentWorkspace?.projectCount)}
                    </p>
                  </div>
                </div>

                <div className="bg-muted/40 flex gap-3 rounded-xl p-4">
                  <ShieldCheckIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <p className="text-muted-foreground text-xs leading-5">
                    Project API keys identify tracked sites. Share them only
                    with the sites that belong to this workspace.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="justify-end border-t px-5 py-4">
                <Button
                  variant="outline"
                  render={
                    <Link
                      to="/app/$workspace/projects"
                      params={{ workspace }}
                    />
                  }
                >
                  View projects
                  <ArrowUpRight />
                </Button>
              </CardFooter>
            </ProjectPanel>
          </div>

          {/* Danger Zone */}
          <ProjectPanel className="border-destructive/50">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-5 w-5" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                These actions are irreversible. Proceed with caution.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Delete Workspace</p>
                  <p className="text-muted-foreground text-sm">
                    Permanently delete this workspace and all its projects,
                    analytics data, and members.
                  </p>
                </div>

                <AlertDialog
                  open={isDeleteOpen}
                  onOpenChange={(open) => {
                    setIsDeleteOpen(open)

                    if (!open && !deleteWorkspace.isPending) {
                      setDeleteConfirmation('')
                    }
                  }}
                >
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="destructive"
                        disabled={
                          !canDeleteWorkspace || deleteWorkspace.isPending
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Workspace
                      </Button>
                    }
                  />

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Delete this workspace?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the{' '}
                        <span className="font-medium">
                          {currentWorkspace?.name ?? 'this workspace'}
                        </span>
                        , including all projects and analytics data. This action
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-workspace">
                        Type{' '}
                        <span className="font-mono">
                          {currentWorkspace?.name ?? 'workspace name'}
                        </span>{' '}
                        to confirm
                      </Label>
                      <Input
                        id="confirm-workspace"
                        value={deleteConfirmation}
                        onChange={(event) =>
                          setDeleteConfirmation(event.target.value)
                        }
                        disabled={deleteWorkspace.isPending}
                        placeholder={currentWorkspace?.name ?? 'Workspace name'}
                      />
                    </div>

                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deleteWorkspace.isPending}>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={
                          !canConfirmDelete || deleteWorkspace.isPending
                        }
                        onClick={() => deleteWorkspace.mutate(workspace)}
                      >
                        {deleteWorkspace.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Delete workspace
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </ProjectPanel>
        </div>
      </div>
    </ProjectPageLayout>
  )
}
