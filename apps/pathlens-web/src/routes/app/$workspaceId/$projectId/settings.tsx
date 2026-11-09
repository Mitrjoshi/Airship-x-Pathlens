import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { cn } from '@workspace/ui'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Separator } from '@workspace/ui/components/separator'
import { DownloadIcon, InfoIcon } from 'lucide-react'
import { useState, type PropsWithChildren } from 'react'
import { z } from 'zod'
import { NoPermissionView } from './-components/common/no-permission-view'
import { getProjectsOptions } from '@/queries/projects'
import { ErrorScreen } from './-components/common/error-screen'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useForm } from '@tanstack/react-form'
import {
  useDeleteProject,
  useUpdateProject,
  usePauseProject,
  useResetProjectAnalytics,
  useResumeProject,
} from '@/mutations/projects'
import { toast } from 'sonner'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@workspace/ui/components/input-group'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
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
import { useGenerateReport } from '@/mutations/reports'

export const Route = createFileRoute('/app/$workspaceId/$projectId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()
  const navigate = useNavigate()

  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('')
  const [pauseOpen, setPauseOpen] = useState(false)

  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
    refetch: refetchPermissions,
    isRefetching: permissionsRefetching,
  } = useQuery(getWorkspacePermissionsOptions(workspaceId))

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('project.settings.view')
  const hasUpdatePermission = permissions?.includes('project.settings.update')
  const hasDeletePermission = permissions?.includes('projects.delete')

  const { mutate: updateProject, isPending: updateProjectPending } =
    useUpdateProject(projectId)
  const { mutate: deleteProject, isPending: deleteProjectPending } =
    useDeleteProject()
  const { mutate: pauseProject, isPending: pauseProjectPending } =
    usePauseProject(projectId)
  const { mutate: resetProject, isPending: resetProjectPending } =
    useResetProjectAnalytics(projectId)
  const { mutate: resumeProject, isPending: resumeProjectPending } =
    useResumeProject(projectId)

  const { mutate: generateReport, isPending: generateReportPending } =
    useGenerateReport()

  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProjects,
    isRefetching: projectRefetching,
  } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    }),
    enabled: !!hasViewPermission,
  })

  const project = projectData?.data[0]

  const projectSchema = z.object({
    name: z.string().min(2, 'Project name is required').max(80, {
      error: 'Project name must be 80 characters or less.',
    }),
    description: z.string().max(100, {
      error: 'Project description must be 100 characters or less.',
    }),
  })

  const form = useForm({
    defaultValues: {
      name: project?.name ?? '',
      description: project?.description ?? '',
    },
    validators: {
      onSubmit: projectSchema,
    },
    onSubmit: async ({ value }) => {
      if (!hasUpdatePermission)
        return toast.error('You do not have permission to update this project.')

      updateProject({
        captureErrors: project?.captureErrors!,
        capturePerformance: project?.capturePerformance!,
        captureReplay: project?.captureReplay!,
        description: value.description,
        name: value.name,
        domain: project?.domain ?? '',
      })
    },
  })

  const globalLoading = permissionsLoading || projectLoading
  const globalError = permissionsError || projectError
  const globalRefetching = permissionsRefetching || projectRefetching
  const refetch = () => Promise.all([refetchPermissions(), refetchProjects()])

  return (
    <div>
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div>
          <p className="text-xl font-medium">Settings</p>
          <p className="text-muted-foreground text-sm">
            Manage your project's settings and configurations.
          </p>
        </div>

        {globalError && !globalLoading ? (
          <ErrorScreen
            refetching={globalRefetching}
            workspace_id={workspaceId}
            project_id={projectId}
            refetch={refetch}
          />
        ) : (
          <>
            {!hasViewPermission && !permissionsLoading ? (
              <NoPermissionView />
            ) : (
              <>
                <div className="space-y-4">
                  {globalLoading ? (
                    <>
                      <Skeleton className="h-60 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-30 w-full" />
                      <Skeleton className="h-30 w-full" />
                    </>
                  ) : (
                    <>
                      <SettingsCard>
                        <CardHeader className="gap-0">
                          <CardTitle>Project Settings</CardTitle>
                          <CardDescription>
                            Manage your project's general settings,
                            configuration, and preferences.
                          </CardDescription>
                        </CardHeader>

                        <Separator />

                        <CardContent className="pt-0">
                          <form
                            id="edit-project"
                            onSubmit={(e) => {
                              e.preventDefault()
                              form.handleSubmit()
                            }}
                          >
                            <FieldGroup>
                              <form.Field
                                name="name"
                                children={(field) => {
                                  const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid
                                  return (
                                    <Field data-invalid={isInvalid}>
                                      <FieldLabel htmlFor={field.name}>
                                        Name
                                      </FieldLabel>
                                      <Input
                                        id={field.name}
                                        name={field.name}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) =>
                                          field.handleChange(e.target.value)
                                        }
                                        placeholder="Acme Inc."
                                        aria-invalid={isInvalid}
                                      />
                                      {isInvalid && (
                                        <FieldError
                                          errors={field.state.meta.errors}
                                        />
                                      )}
                                    </Field>
                                  )
                                }}
                              />
                              <form.Field
                                name="description"
                                children={(field) => {
                                  const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid
                                  return (
                                    <Field data-invalid={isInvalid}>
                                      <FieldLabel htmlFor={field.name}>
                                        Description
                                      </FieldLabel>
                                      <InputGroup>
                                        <InputGroupTextarea
                                          id={field.name}
                                          name={field.name}
                                          value={field.state.value}
                                          onBlur={field.handleBlur}
                                          onChange={(e) =>
                                            field.handleChange(e.target.value)
                                          }
                                          placeholder="Your project description."
                                          rows={6}
                                          className="min-h-24 resize-none"
                                          aria-invalid={isInvalid}
                                        />
                                        <InputGroupAddon align="block-end">
                                          <InputGroupText className="tabular-nums">
                                            {field.state.value.length}/100
                                            characters
                                          </InputGroupText>
                                        </InputGroupAddon>
                                      </InputGroup>

                                      {isInvalid && (
                                        <FieldError
                                          errors={field.state.meta.errors}
                                        />
                                      )}
                                    </Field>
                                  )
                                }}
                              />
                            </FieldGroup>
                          </form>
                        </CardContent>

                        <CardFooter className="justify-end gap-2 rounded-none border-t-2 border-dashed bg-transparent">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => form.reset()}
                          >
                            Reset
                          </Button>
                          <Button
                            type="submit"
                            form="edit-project"
                            onClick={() => {
                              if (!hasUpdatePermission)
                                return toast.error(
                                  'You do not have permission to edit project details'
                                )
                            }}
                          >
                            <LoadingSwap isLoading={updateProjectPending}>
                              Save changes
                            </LoadingSwap>
                          </Button>
                        </CardFooter>
                      </SettingsCard>

                      {project?.paused ? (
                        <SettingsCard>
                          <CardHeader className="gap-0">
                            <CardTitle>Resume Project</CardTitle>
                            <CardDescription>
                              You can resume your project at any time.
                            </CardDescription>
                          </CardHeader>

                          <CardFooter className="items-center justify-between gap-4 rounded-none border-t-2 border-dashed bg-transparent">
                            <div className="text-muted-foreground flex items-center gap-2">
                              <InfoIcon className="size-4" />
                              <span>
                                Resume tracking to start collecting new
                                activity.
                              </span>
                            </div>

                            <Button
                              onClick={() => {
                                resumeProject()
                              }}
                            >
                              <LoadingSwap isLoading={resumeProjectPending}>
                                Resume Project
                              </LoadingSwap>
                            </Button>
                          </CardFooter>
                        </SettingsCard>
                      ) : (
                        <SettingsCard>
                          <CardHeader className="gap-0">
                            <CardTitle>Pause Project</CardTitle>
                            <CardDescription>
                              Temporarily pause your project to halt all
                              activities and notifications. You can resume the
                              project at any time.
                            </CardDescription>
                          </CardHeader>

                          <CardFooter className="items-center justify-between gap-4 rounded-none border-t-2 border-dashed bg-transparent">
                            <div className="text-muted-foreground flex items-center gap-2">
                              <InfoIcon className="size-4" />
                              <span>
                                Existing analytics data will remain accessible.
                              </span>
                            </div>

                            <Dialog
                              open={pauseOpen}
                              onOpenChange={setPauseOpen}
                            >
                              <DialogTrigger
                                render={
                                  <Button
                                    disabled={project?.paused}
                                    variant="destructive"
                                    onClick={() => {
                                      setPauseOpen(true)
                                    }}
                                  >
                                    Pause Project
                                  </Button>
                                }
                              />

                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Pause Project</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to pause this project?
                                  </DialogDescription>
                                </DialogHeader>

                                <DialogFooter className="bg-transparent py-2">
                                  <DialogClose
                                    render={<Button variant={'outline'} />}
                                  >
                                    Cancel
                                  </DialogClose>
                                  <Button
                                    onClick={() => {
                                      if (project?.paused)
                                        return toast.error(
                                          'Project is already paused.'
                                        )

                                      if (!hasUpdatePermission)
                                        return toast.error(
                                          'You do not have permission to pause this project'
                                        )

                                      pauseProject(undefined, {
                                        onSuccess: () => {
                                          setPauseOpen(false)
                                        },
                                      })
                                    }}
                                    variant="destructive"
                                  >
                                    <LoadingSwap
                                      isLoading={pauseProjectPending}
                                    >
                                      Pause Project
                                    </LoadingSwap>
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </CardFooter>
                        </SettingsCard>
                      )}

                      <SettingsCard>
                        <CardHeader className="gap-0">
                          <CardTitle>Reset Project</CardTitle>
                          <CardDescription>
                            Reset your project and remove all data.
                          </CardDescription>
                        </CardHeader>

                        <CardFooter className="items-center justify-between gap-4 rounded-none border-t-2 border-dashed bg-transparent">
                          <div className="text-muted-foreground flex items-center gap-2">
                            <InfoIcon className="size-4" />
                            <span>This action cannot be undone.</span>
                          </div>
                          <Dialog>
                            <DialogTrigger
                              render={
                                <Button variant={'destructive'}>
                                  Reset Project
                                </Button>
                              }
                            />

                            <DialogContent>
                              <DialogHeader className="">
                                <DialogTitle>Reset Project</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to reset this project?
                                  This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <Separator />

                                <p className="text-muted-foreground text-sm">
                                  Resetting this project will permanently delete
                                  all collected analytics data, including
                                  events, session recordings, heatmaps, and
                                  performance metrics. Your project settings and
                                  tracking configuration will remain unchanged.
                                </p>

                                <Button
                                  onClick={() => {
                                    generateReport({
                                      workspace_id: workspaceId,
                                      project_id: projectId,
                                      device: 'all',
                                      range: '90d',
                                      report_type: 'full',
                                      domain: undefined,
                                    })
                                  }}
                                  variant="outline"
                                  className={'w-full'}
                                >
                                  <LoadingSwap
                                    className="flex items-center gap-2"
                                    isLoading={generateReportPending}
                                  >
                                    <DownloadIcon />
                                    Export
                                  </LoadingSwap>
                                </Button>

                                <Separator />

                                <div className="w-full">
                                  <FieldGroup>
                                    <Field>
                                      <FieldLabel
                                        htmlFor="confirm"
                                        className="text-muted-foreground gap-1"
                                      >
                                        Type{' '}
                                        <span className="text-foreground font-medium">
                                          {project?.name}
                                        </span>{' '}
                                        to confirm.
                                      </FieldLabel>
                                      <Input
                                        id="confirm"
                                        onChange={(e) => {
                                          setDeleteConfirmName(e.target.value)
                                        }}
                                        placeholder="Type the project name here"
                                      />
                                    </Field>
                                  </FieldGroup>
                                </div>
                              </div>

                              <DialogFooter className="flex-col! bg-transparent py-2">
                                <div className="flex items-center justify-end gap-4">
                                  <Button
                                    className={'w-full'}
                                    disabled={
                                      deleteConfirmName !== project?.name
                                    }
                                    onClick={() => {
                                      if (deleteConfirmName !== project?.name) {
                                        return toast.error(
                                          'Incorrect project name'
                                        )
                                      }

                                      if (!hasUpdatePermission)
                                        return toast.error(
                                          'You do not have permission to reset this project'
                                        )

                                      resetProject(undefined, {
                                        onSuccess: () => {
                                          navigate({
                                            to: '/app/$workspaceId/$projectId/setup',
                                            params: {
                                              workspaceId,
                                              projectId,
                                            },
                                          })
                                        },
                                      })
                                    }}
                                    variant="destructive"
                                  >
                                    <LoadingSwap
                                      isLoading={resetProjectPending}
                                    >
                                      I understand, reset this project
                                    </LoadingSwap>
                                  </Button>
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardFooter>
                      </SettingsCard>

                      <SettingsCard>
                        <CardHeader className="gap-0">
                          <CardTitle>Delete Project</CardTitle>
                          <CardDescription>
                            Permanently delete your project and all its
                            associated data. This action cannot be undone.
                          </CardDescription>
                        </CardHeader>

                        <CardFooter className="items-center justify-between gap-4 rounded-none border-t-2 border-dashed bg-transparent">
                          <div className="text-muted-foreground flex items-center gap-2">
                            <InfoIcon className="size-4" />
                            <span>This action cannot be undone.</span>
                          </div>
                          <Dialog>
                            <DialogTrigger
                              render={
                                <Button variant={'destructive'}>
                                  Delete Project
                                </Button>
                              }
                            />

                            <DialogContent>
                              <DialogHeader className="">
                                <DialogTitle>Confirm Delete</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this project?
                                </DialogDescription>
                              </DialogHeader>

                              <div className="space-y-4">
                                <Separator />
                                <p className="text-muted-foreground text-sm">
                                  Deleting your project will permanently remove
                                  all associated analytics data, including
                                  events, session recordings, heatmaps, and
                                  performance metrics. We recommend exporting
                                  your data before proceeding, as it cannot be
                                  recovered once deleted.
                                </p>

                                <Button
                                  onClick={() => {
                                    generateReport({
                                      workspace_id: workspaceId,
                                      project_id: projectId,
                                      device: 'all',
                                      range: '90d',
                                      report_type: 'full',
                                      domain: undefined,
                                    })
                                  }}
                                  variant="outline"
                                  className={'w-full'}
                                >
                                  <LoadingSwap
                                    className="flex items-center gap-2"
                                    isLoading={generateReportPending}
                                  >
                                    <DownloadIcon />
                                    Export
                                  </LoadingSwap>
                                </Button>

                                <Separator />

                                <div className="w-full">
                                  <FieldGroup>
                                    <Field>
                                      <FieldLabel
                                        htmlFor="confirm"
                                        className="text-muted-foreground gap-1"
                                      >
                                        Type{' '}
                                        <span className="text-foreground font-medium">
                                          {project?.name}
                                        </span>{' '}
                                        to confirm.
                                      </FieldLabel>
                                      <Input
                                        id="confirm"
                                        onChange={(e) => {
                                          setDeleteConfirmName(e.target.value)
                                        }}
                                        placeholder="Type the project name here"
                                      />
                                    </Field>
                                  </FieldGroup>
                                </div>
                              </div>

                              <DialogFooter className="flex-col! bg-transparent py-2">
                                <div className="flex items-center justify-end gap-4">
                                  <Button
                                    className={'w-full'}
                                    disabled={
                                      deleteConfirmName !== project?.name
                                    }
                                    onClick={() => {
                                      if (deleteConfirmName !== project?.name) {
                                        return toast.error(
                                          'Incorrect project name'
                                        )
                                      }

                                      if (!hasDeletePermission)
                                        return toast.error(
                                          'You do not have permission to delete this project'
                                        )

                                      deleteProject(
                                        {
                                          project_id: projectId,
                                          workspace_id: workspaceId,
                                        },
                                        {
                                          onSuccess: () => {
                                            navigate({
                                              to: '/app/$workspaceId',
                                              replace: true,
                                              params: {
                                                workspaceId,
                                              },
                                            })
                                          },
                                        }
                                      )
                                    }}
                                    variant="destructive"
                                  >
                                    <LoadingSwap
                                      isLoading={deleteProjectPending}
                                    >
                                      I understand, delete this project
                                    </LoadingSwap>
                                  </Button>
                                </div>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardFooter>
                      </SettingsCard>
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

const SettingsCard = ({
  children,
  variant = 'default',
  className,
}: PropsWithChildren<{
  variant?: 'default' | 'destructive'
  className?: HTMLDivElement['className']
}>) => {
  const variantClasses = {
    default: 'bg-card/30  border-border',
    destructive:
      'bg-card/30 border-destructive/50 rounded-none border-2 border-dashed',
  }

  return (
    <Card
      className={cn(
        'relative rounded-none border-2 border-dashed',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </Card>
  )
}
