import { getProjectsOptions, type T_Projects } from '@/queries/projects'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { navigationIcons } from '@/config/navigation-icons'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  AlertCircleIcon,
  DownloadIcon,
  EllipsisIcon,
  ExternalLinkIcon,
  InfoIcon,
  LoaderIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { formatNumber } from '@/utils/utils'
import { toast } from '@/lib/toast'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import React, { useState } from 'react'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { useDeleteProject } from '@/mutations/projects'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { NoPermissionView } from './$projectId/-components/common/no-permission-view'
import { ErrorScreen } from './$projectId/-components/common/error-screen'
import { Separator } from '@workspace/ui/components/separator'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { useGenerateReport } from '@/mutations/reports'

export const Route = createFileRoute('/app/$workspaceId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = React.useState<string | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState<string>('')

  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
    refetch: refetchPermissions,
    isRefetching: permissionsRefetching,
  } = useQuery(getWorkspacePermissionsOptions(workspaceId))

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('projects.view')
  const hasCreatePermission = permissions?.includes('projects.create')
  const hasDeletePermission = permissions?.includes('projects.delete')

  const {
    data: projectsData,
    isPending: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
    isRefetching: projectsRefetching,
  } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId,
    }),
    enabled: !!hasViewPermission,
  })

  const projects = projectsData?.data

  const { mutate: deleteProject, isPending: deleteProjectPending } =
    useDeleteProject()
  const { mutate: generateReport, isPending: generateReportPending } =
    useGenerateReport()

  const globalLoading = permissionsLoading || projectsLoading
  const globalError = permissionsError || projectsError
  const globalRefetching = permissionsRefetching || projectsRefetching

  const refetch = () => Promise.all([refetchPermissions(), refetchProjects()])

  const projectToDelete = projects?.find((project) => project.id === deleteOpen)

  return (
    <div>
      <Dialog
        open={!!deleteOpen}
        onOpenChange={(v) => {
          if (!v) {
            setDeleteOpen(null)
          }
        }}
      >
        <div className="mx-auto max-w-4xl p-6 pt-10">
          <div className="space-y-4">
            <div>
              <p className="text-xl font-medium">Projects</p>
              <p className="text-muted-foreground">
                Manage your projects, configure tracking, and monitor user
                activity across your websites.
              </p>
            </div>

            {globalError && !globalLoading ? (
              <ErrorScreen
                refetching={globalRefetching}
                workspace_id={workspaceId}
                refetch={refetch}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <InputGroup>
                    <InputGroupButton>
                      <SearchIcon />
                    </InputGroupButton>

                    <InputGroupInput placeholder="Search..." />
                  </InputGroup>

                  <Button
                    onClick={() => {
                      if (!hasCreatePermission)
                        return toast.error(
                          'You do not have permission to create projects.'
                        )

                      navigate({
                        to: '/app/$workspaceId/create',
                        params: {
                          workspaceId,
                        },
                      })
                    }}
                  >
                    <PlusIcon />
                    New Project
                  </Button>
                </div>

                {!hasViewPermission && !permissionsLoading ? (
                  <NoPermissionView
                    workspaceId={workspaceId}
                    permission="projects.view"
                  />
                ) : (
                  <>
                    <div className="space-y-2">
                      {globalLoading ? (
                        <>
                          {[...Array(3)].map((_, i) => (
                            <div
                              className="grid w-full grid-cols-[0.4fr_1fr] gap-4 border-2 border-dashed p-3 duration-150"
                              key={i}
                            >
                              <Skeleton className="aspect-video w-full rounded-none" />

                              <div className="flex flex-1 flex-col justify-between">
                                <div className="space-y-2">
                                  <Skeleton className="h-6 w-50" />
                                  <Skeleton className="h-6 w-32" />
                                </div>

                                <div className="flex items-center gap-8">
                                  <Skeleton className="h-6 w-20"></Skeleton>
                                  <Skeleton className="h-6 w-20"></Skeleton>
                                  <Skeleton className="h-6 w-20"></Skeleton>
                                  <Skeleton className="h-6 w-20"></Skeleton>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : !projects?.length ? (
                        <div className="flex items-center justify-center py-20">
                          <p className="text-muted-foreground text-sm">
                            No projects found. Click "
                            <span className="text-foreground font-medium">
                              New Project
                            </span>
                            " to create one.
                          </p>
                        </div>
                      ) : (
                        projects?.map((item) => {
                          return (
                            <ProjectCard
                              setDeleteOpen={setDeleteOpen}
                              item={item}
                              workspaceId={workspaceId}
                              hasDeletePermission={hasDeletePermission!}
                            />
                          )
                        })
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {deleteOpen && (
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
                Deleting your project will permanently remove all associated
                analytics data, including events, session recordings, heatmaps,
                and performance metrics. We recommend exporting your data before
                proceeding, as it cannot be recovered once deleted.
              </p>

              <Button
                onClick={() => {
                  generateReport({
                    workspace_id: workspaceId,
                    project_id: deleteOpen,
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
                        {projectToDelete?.name}
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

            <DialogFooter className="flex-col! bg-transparent">
              <div className="flex items-center justify-end gap-4">
                <Button
                  className={'w-full'}
                  disabled={deleteConfirmName !== projectToDelete?.name}
                  onClick={() => {
                    if (deleteConfirmName !== projectToDelete?.name) {
                      return toast.error('Incorrect project name')
                    }

                    if (!hasDeletePermission)
                      return toast.error(
                        'You do not have permission to delete this project'
                      )

                    deleteProject(
                      {
                        project_id: deleteOpen,
                        workspace_id: workspaceId,
                      },
                      {
                        onSuccess: () => {
                          setDeleteOpen(null)
                          setDeleteConfirmName('')
                        },
                      }
                    )
                  }}
                  variant="destructive"
                >
                  <LoadingSwap isLoading={deleteProjectPending}>
                    I understand, delete this project
                  </LoadingSwap>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

const ProjectCard = ({
  item,
  workspaceId,
  setDeleteOpen,
  hasDeletePermission,
}: {
  item: T_Projects
  workspaceId: string
  setDeleteOpen: React.Dispatch<React.SetStateAction<string | null>>
  hasDeletePermission: boolean
}) => {
  const navigate = useNavigate()

  const isActive = item.stats.status === 'active'
  const projectMenuItems = [
    {
      label: 'Go to Project',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/$projectId',
          params: {
            workspaceId,
            projectId: item.id,
          },
        })
      },
    },
    {
      label: 'Go to Domain Management',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/$projectId/domains',
          params: {
            workspaceId,
            projectId: item.id,
          },
        })
      },
    },

    {
      type: 'separator' as const,
    },

    {
      label: 'Manage Usage',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/$projectId/usage',
          params: {
            workspaceId,
            projectId: item.id,
          },
        })
      },
    },
    // {
    //   label: 'Manage Members',
    //   onClick: () => {
    //     navigate({
    //       to: '/app/$workspaceId/$projectId/members',
    //       params: {
    //         workspaceId,
    //         projectId: item.id,
    //       },
    //     })
    //   },
    // },
    {
      label: 'Manage API Keys',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/$projectId/api-keys',
          params: {
            workspaceId,
            projectId: item.id,
          },
        })
      },
    },

    {
      type: 'separator' as const,
    },

    {
      label: 'Edit Project',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/$projectId/settings',
          params: {
            workspaceId,
            projectId: item.id,
          },
        })
      },
    },
    {
      label: 'Copy Project ID',
      onClick: async () => {
        await navigator.clipboard.writeText(item.id)
        toast.success('Project ID copied to clipboard')
      },
    },

    {
      type: 'separator' as const,
    },

    {
      label: 'Delete',
      variant: 'destructive' as const,
      onClick: () => {
        if (!hasDeletePermission) {
          return toast.error(
            'You do not have permission to delete this project'
          )
        }
        setDeleteOpen(item.id)
      },
    },
  ]

  return (
    <Link
      key={item.id}
      to="/app/$workspaceId/$projectId"
      params={{
        workspaceId,
        projectId: item.id,
      }}
      className="hover:bg-card/50 bg-card/30 grid grid-cols-[0.4fr_1fr] gap-4 border-2 border-dashed p-3 duration-150"
    >
      {/* Project Preview */}
      <div className="aspect-video max-w-60 overflow-hidden">
        {item.paused ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center bg-yellow-400/10">
            <p className="flex items-center gap-2 text-xs font-medium text-yellow-400">
              <AlertCircleIcon size={14} />
              This project is paused
            </p>
          </div>
        ) : (
          <>
            {!item.snapshot.url ? (
              <>
                {item.snapshot.status === 'failed' ? (
                  <div className="bg-destructive/10 flex aspect-video w-full items-center justify-center">
                    <p className="text-destructive flex items-center gap-2 text-xs font-medium">
                      <AlertCircleIcon size={14} />
                      Failed to generate preview
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted-foreground/10 flex aspect-video w-full items-center justify-center">
                    {item.snapshot.status === 'processing' ||
                    item.snapshot.status === 'pending' ? (
                      <>
                        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <LoaderIcon className="animate-spin" size={14} />
                          Generating preview...
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                          <InfoIcon size={14} />
                          Preview not available.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <img
                src={item.snapshot.url}
                className="bg-muted-foreground/10 aspect-video w-full object-cover"
                alt={`${item.name} preview`}
              />
            )}
          </>
        )}
      </div>

      {/* Project Content */}
      <div className="flex min-w-0 flex-col justify-between gap-4 py-0.5">
        {/* Top Content */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-4">
            {/* Project Identity */}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 ${
                    isActive ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                />

                <p className="truncate font-medium">{item.name}</p>

                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] uppercase ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              {/* Domain */}
              <Button
                render={
                  <a
                    href={item.domain!}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation()
                    }}
                  />
                }
                variant="link"
                className="text-muted-foreground hover:text-foreground mt-1 h-auto max-w-full justify-start gap-1 p-0 font-normal"
              >
                <span className="truncate underline underline-offset-4">
                  {item.domain}
                </span>

                <ExternalLinkIcon size={12} className="shrink-0" />
              </Button>
            </div>

            {/* Project Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground -mt-1 -mr-1 shrink-0"
                  />
                }
              >
                <EllipsisIcon size={18} />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                className="w-fit min-w-52"
                align="end"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                {projectMenuItems.map((menuItem, index) => {
                  if (menuItem.type === 'separator') {
                    return <DropdownMenuSeparator key={`separator-${index}`} />
                  }

                  return (
                    <DropdownMenuItem
                      key={menuItem.label}
                      variant={menuItem.variant}
                      render={
                        <Button
                          className="w-full justify-start"
                          variant="ghost"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()

                            menuItem.onClick?.()
                          }}
                        />
                      }
                    >
                      {menuItem.label}
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {item.description && (
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {item.description}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 divide-x divide-dashed">
          <div className="min-w-0 pr-3">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-sm">
              <navigationIcons.visitors size={12} />
              <span>Visitors</span>
            </div>

            <p className="font-medium tabular-nums">
              {formatNumber(item.stats.visitors)}
            </p>
          </div>

          <div className="min-w-0 px-3">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-sm">
              <navigationIcons.sessions size={12} />
              <span>Sessions</span>
            </div>

            <p className="font-medium tabular-nums">
              {formatNumber(item.stats.sessions)}
            </p>
          </div>

          <div className="min-w-0 px-3">
            <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-sm">
              <navigationIcons.events size={12} />
              <span>Events</span>
            </div>

            <p className="font-medium tabular-nums">
              {formatNumber(item.stats.events)}
            </p>
          </div>

          <div className="min-w-0 pl-3">
            <p className="text-muted-foreground mb-1 text-sm">Conversion</p>

            <p className="font-medium tabular-nums">{item.stats.conversion}%</p>
          </div>
        </div>
      </div>
    </Link>
  )
}
