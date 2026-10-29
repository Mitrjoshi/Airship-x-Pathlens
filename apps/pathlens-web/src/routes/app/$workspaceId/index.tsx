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
import { toast } from 'sonner'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import React from 'react'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { useDeleteProject } from '@/mutations/projects'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { NoPermissionView } from './$projectId/-components/common/no-permission-view'
import { ErrorScreen } from './$projectId/-components/common/error-screen'

export const Route = createFileRoute('/app/$workspaceId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = React.useState<string | null>(null)

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    getWorkspacePermissionsOptions(workspaceId)
  )

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('projects.view')
  const hasCreatePermission = permissions?.includes('projects.create')
  const hasDeletePermission = permissions?.includes('projects.delete')

  const {
    data: projects,
    isPending: projectsLoading,
    isError: projectsError,
    refetch,
  } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId,
    }),
    enabled: !!hasViewPermission,
  })

  const deleteProject = useDeleteProject()

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
            <p className="text-xl font-medium">Projects</p>

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
                <NoPermissionView />
              ) : (
                <>
                  <div className="space-y-2">
                    {projectsLoading ? (
                      <>
                        {[...Array(2)].map((_, i) => (
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
                    ) : projectsError ? (
                      <>
                        <ErrorScreen refetch={refetch} />
                      </>
                    ) : (
                      projects?.data.map((item) => {
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
          </div>
        </div>

        {deleteOpen && (
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this workspace?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="bg-transparent py-2">
              <DialogClose render={<Button variant="ghost">Cancel</Button>}>
                Close
              </DialogClose>
              <Button
                onClick={() => {
                  deleteProject.mutate(
                    {
                      project_id: deleteOpen,
                      workspace_id: workspaceId,
                    },
                    {
                      onSuccess: () => {
                        setDeleteOpen(null)
                      },
                    }
                  )
                }}
                variant="destructive"
              >
                <LoadingSwap isLoading={deleteProject.isPending}>
                  Delete
                </LoadingSwap>
              </Button>
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
                  variant="ghost"
                  className={`h-5 shrink-0 px-1.5 text-[10px] uppercase ${
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
