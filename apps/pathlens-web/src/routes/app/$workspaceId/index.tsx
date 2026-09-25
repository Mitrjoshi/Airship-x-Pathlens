import { getProjectsOptions } from '@/queries/projects'
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
  EllipsisIcon,
  GlobeIcon,
  InfoIcon,
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

export const Route = createFileRoute('/app/$workspaceId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const navigate = useNavigate()

  const {
    data: projects,
    isPending: projectsLoading,
    isError: projectsError,
  } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
    })
  )

  type ProjectItem = NonNullable<typeof projects>['data'][number]

  const getProjectMenuItems = (item: ProjectItem) => [
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
          to: '/app/$workspaceId/$projectId/settings',
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
    {
      label: 'Manage Members',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/$projectId/members',
          params: {
            workspaceId,
            projectId: item.id,
          },
        })
      },
    },
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
        // Add delete project logic here
      },
    },
  ]

  if (projectsLoading) {
    return (
      <div className="mx-auto max-w-4xl pt-10">
        <p className="text-muted-foreground text-sm">Loading projects...</p>
      </div>
    )
  }

  if (projectsError) {
    return (
      <div className="mx-auto max-w-4xl pt-10">
        <p className="text-destructive text-sm">Failed to load projects.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mx-auto max-w-4xl pt-10">
        <div className="space-y-5">
          <p className="text-2xl font-medium">
            Projects ({projects?.data.length ?? 0})
          </p>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <InputGroup>
                <InputGroupButton>
                  <SearchIcon />
                </InputGroupButton>

                <InputGroupInput placeholder="Search..." />
              </InputGroup>

              <Button
                onClick={() => {
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

            <div className="space-y-2">
              {projects?.data.map((item) => {
                const isActive = item.stats.status === 'active'
                const projectMenuItems = getProjectMenuItems(item)

                return (
                  <Link
                    key={item.id}
                    to="/app/$workspaceId/$projectId"
                    params={{
                      workspaceId,
                      projectId: item.id,
                    }}
                    className="hover:bg-card/30 grid grid-cols-[0.4fr_1fr] gap-4 rounded-lg border-2 border-dashed p-5 duration-150"
                  >
                    {/* Project Preview */}
                    <div className="aspect-video max-w-60 overflow-hidden">
                      {!item.snapshot.url ? (
                        <div className="bg-muted-foreground/10 flex aspect-video w-full items-center justify-center">
                          <p className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                            <InfoIcon size={14} />
                            Preview not available.
                          </p>
                        </div>
                      ) : (
                        <img
                          src={item.snapshot.url}
                          className="bg-muted-foreground/10 aspect-video w-full object-cover"
                          alt={`${item.name} preview`}
                        />
                      )}
                    </div>

                    {/* Project Content */}
                    <div className="flex min-w-0 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`${
                                isActive
                                  ? 'bg-primary'
                                  : 'bg-muted-foreground/20'
                              } h-2 w-2 shrink-0`}
                            />

                            <p className="truncate">{item.name}</p>

                            <Badge
                              className={
                                isActive
                                  ? 'text-primary'
                                  : 'text-muted-foreground'
                              }
                              variant="ghost"
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Badge>
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
                                />
                              }
                            >
                              <EllipsisIcon />
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
                                  return (
                                    <DropdownMenuSeparator
                                      key={`separator-${index}`}
                                    />
                                  )
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

                        {/* Domain */}
                        <p className="text-muted-foreground mt-1 flex items-center gap-2 px-0 text-sm underline underline-offset-4 duration-200">
                          <GlobeIcon size={14} />
                          {item.domain}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-8">
                        <div>
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <navigationIcons.visitors size={12} />
                            Visitors
                          </p>

                          <p>{formatNumber(item.stats.visitors)}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <navigationIcons.sessions size={12} />
                            Sessions
                          </p>

                          <p>{formatNumber(item.stats.sessions)}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground flex items-center gap-1 text-xs">
                            <navigationIcons.events size={12} />
                            Events
                          </p>

                          <p>{formatNumber(item.stats.events)}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground text-xs">
                            Conversions
                          </p>

                          <p>{item.stats.conversion}%</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
