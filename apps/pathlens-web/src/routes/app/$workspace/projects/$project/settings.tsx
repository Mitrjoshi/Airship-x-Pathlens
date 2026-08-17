import {
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { useDeleteProject, useUpdateProject } from '@/mutations/projects'
import { getProjectsOptions, type T_Projects } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
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
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { FieldError } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Separator } from '@workspace/ui/components/separator'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/settings'
)({
  component: RouteComponent,
})

const projectSettingsSchema = z.object({
  name: z
    .string()
    .min(2, 'Project name must be at least 2 characters')
    .max(80, 'Project name must be 80 characters or less'),
  description: z
    .string()
    .max(100, 'Project description must be 100 characters or less'),
  domain: z.string().max(2048, 'Project domain is too long'),
  captureReplay: z.boolean(),
  capturePerformance: z.boolean(),
  captureErrors: z.boolean(),
})

type ProjectSettingsValues = z.infer<typeof projectSettingsSchema>

function getProjectSettingsValues(project: T_Projects): ProjectSettingsValues {
  return {
    name: project.name,
    description: project.description ?? '',
    domain: project.domain ?? '',
    captureReplay: project.captureReplay,
    capturePerformance: project.capturePerformance,
    captureErrors: project.captureErrors,
  }
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const { data } = useQuery(
    getProjectsOptions({
      workspace_id: workspace,
      project_id: project,
    })
  )
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const updateProject = useUpdateProject(project)
  const { mutate: deleteMutate, isPending: deletePending } = useDeleteProject()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  const projectData = data?.data[0]
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canUpdateProject =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('project.settings.update')
  const canDeleteProject =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('projects.delete')
  const canConfirmDelete =
    Boolean(projectData) && deleteConfirmation.trim() === projectData?.name
  const form = useForm({
    defaultValues: {
      name: '',
      description: '',
      domain: '',
      captureReplay: true,
      capturePerformance: true,
      captureErrors: false,
    },
    validators: {
      onChange: projectSettingsSchema,
    },
    onSubmit: async ({ value }) => {
      if (!projectData || !canUpdateProject) return

      const nextValues = {
        name: value.name.trim(),
        description: value.description.trim(),
        domain: value.domain.trim(),
        captureReplay: value.captureReplay,
        capturePerformance: value.capturePerformance,
        captureErrors: value.captureErrors,
      }

      await updateProject.mutateAsync({
        ...nextValues,
        description: nextValues.description || null,
        domain: nextValues.domain || null,
      })
      form.reset(nextValues)
    },
  })

  useEffect(() => {
    if (!projectData || form.state.isDirty) return

    form.reset(getProjectSettingsValues(projectData))
  }, [form, projectData])

  const projectStatus = projectData?.stats.status ?? 'inactive'

  return (
    <ProjectPageLayout>
      <div className="mx-auto w-full space-y-8">
        <ProjectPageHeader
          eyebrow="Configuration"
          title="Project settings"
          description={
            projectData
              ? `Manage ${projectData.name}, its tracking preferences, and connection details.`
              : 'Manage your project configuration and tracking preferences.'
          }
        />

        <form
          className="space-y-8"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            form.handleSubmit()
          }}
        >
          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>General</CardTitle>
              <CardDescription>
                Basic information about your project.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Project name</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        disabled={!canUpdateProject || updateProject.isPending}
                        aria-invalid={!field.state.meta.isValid}
                        placeholder="Project name"
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </form.Field>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <div>
                    <Badge
                      variant={
                        projectStatus === 'active' ? 'default' : 'secondary'
                      }
                    >
                      {projectData ? projectStatus : 'Loading'}
                    </Badge>
                  </div>
                </div>
              </div>

              <form.Field name="description">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Description</Label>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      rows={4}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      disabled={!canUpdateProject || updateProject.isPending}
                      aria-invalid={!field.state.meta.isValid}
                      placeholder="Describe what this project tracks."
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </div>
                )}
              </form.Field>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Tracking</CardTitle>
              <CardDescription>
                Configure what events are collected.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 p-5">
              <form.Field name="captureReplay">
                {(field) => (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Session Replay</p>
                      <p className="text-muted-foreground text-sm">
                        Record user sessions.
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={!canUpdateProject || updateProject.isPending}
                      aria-label="Enable session replay"
                    />
                  </div>
                )}
              </form.Field>

              <Separator />

              <form.Field name="capturePerformance">
                {(field) => (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Performance Metrics</p>
                      <p className="text-muted-foreground text-sm">
                        Capture Core Web Vitals and page performance.
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={!canUpdateProject || updateProject.isPending}
                      aria-label="Enable performance metrics"
                    />
                  </div>
                )}
              </form.Field>

              <Separator />

              <form.Field name="captureErrors">
                {(field) => (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">Error Tracking</p>
                      <p className="text-muted-foreground text-sm">
                        Record uncaught JavaScript errors.
                      </p>
                    </div>
                    <Switch
                      checked={field.state.value}
                      onCheckedChange={field.handleChange}
                      disabled={!canUpdateProject || updateProject.isPending}
                      aria-label="Enable error tracking"
                    />
                  </div>
                )}
              </form.Field>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Domain</CardTitle>
              <CardDescription>
                The primary domain where the tracker is installed.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 p-5">
              <form.Field name="domain">
                {(field) => (
                  <>
                    <Label htmlFor={field.name}>Website URL</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="url"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      disabled={!canUpdateProject || updateProject.isPending}
                      aria-invalid={!field.state.meta.isValid}
                      placeholder="https://yourwebsite.com"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </>
                )}
              </form.Field>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel>
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>API</CardTitle>
              <CardDescription>Public project credentials.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="project-id">Project ID</Label>
                <Input id="project-id" readOnly value={projectData?.id ?? ''} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project-api-key">Public API Key</Label>
                <Input
                  id="project-api-key"
                  readOnly
                  value={projectData?.apiKey ?? ''}
                />
              </div>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel className="border-destructive">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>These actions cannot be undone.</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Delete project</p>
                <p className="text-muted-foreground text-sm">
                  Permanently delete this project and all collected analytics.
                </p>
              </div>

              <AlertDialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                  setIsDeleteOpen(open)

                  if (!open && !deletePending) {
                    setDeleteConfirmation('')
                  }
                }}
              >
                <AlertDialogTrigger
                  render={
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={
                        deletePending || !canDeleteProject || !projectData
                      }
                    >
                      <LoadingSwap isLoading={deletePending}>
                        Delete project
                      </LoadingSwap>
                    </Button>
                  }
                />

                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes{' '}
                      <span className="font-medium">
                        {projectData?.name ?? 'this project'}
                      </span>{' '}
                      and all of its analytics data. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-project">
                      Type{' '}
                      <span className="font-mono">
                        {projectData?.name ?? 'project name'}
                      </span>{' '}
                      to confirm
                    </Label>
                    <Input
                      id="confirm-project"
                      value={deleteConfirmation}
                      onChange={(event) =>
                        setDeleteConfirmation(event.target.value)
                      }
                      disabled={deletePending}
                      placeholder={projectData?.name ?? 'Project name'}
                      autoComplete="off"
                    />
                  </div>

                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deletePending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={!canConfirmDelete || deletePending}
                      onClick={() =>
                        deleteMutate({
                          project_id: project,
                          workspace_id: workspace,
                        })
                      }
                    >
                      {deletePending && <Loader2 className="animate-spin" />}
                      Delete project
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </ProjectPanel>

          <div className="flex justify-end gap-2">
            <form.Subscribe
              selector={(state) => [
                state.canSubmit,
                state.isDirty,
                state.isSubmitting,
              ]}
            >
              {([canSubmit, isDirty, isSubmitting]) => (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      !isDirty || isSubmitting || updateProject.isPending
                    }
                    onClick={() => {
                      if (projectData)
                        form.reset(getProjectSettingsValues(projectData))
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      !projectData ||
                      !canUpdateProject ||
                      !canSubmit ||
                      !isDirty ||
                      isSubmitting ||
                      updateProject.isPending
                    }
                  >
                    <LoadingSwap
                      isLoading={isSubmitting || updateProject.isPending}
                    >
                      Save changes
                    </LoadingSwap>
                  </Button>
                </>
              )}
            </form.Subscribe>
          </div>
        </form>
      </div>
    </ProjectPageLayout>
  )
}
