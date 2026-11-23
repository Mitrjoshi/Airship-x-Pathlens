import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@workspace/ui/components/sidebar'
import { Button } from '@workspace/ui/components/button'
import {
  SidebarIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  ArrowUpRightIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { useQuery } from '@tanstack/react-query'
import { getWorkspacesOptions, type T_Workspace } from '@/queries/workspace'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Header } from '../-components/header'
import { SearchOverAppDialog } from '@/components/common/search-over-app-dialog'
import { navigationIcons } from '@/config/navigation-icons'
import { GracePeriod } from '../-components/grace-period'
import { ProjectPaused } from './$projectId/-components/common/project-paused'
import { NotFound } from '@/components/common/not-found'
import { Badge } from '@workspace/ui/components/badge'

export const Route = createFileRoute('/app/$workspaceId')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  const { workspaceId, projectId } = useParams({
    strict: false,
  })
  const { data: workspaceData, isLoading: workspaceDataLoading } = useQuery(
    getWorkspacesOptions()
  )

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          workspaceDataLoading={workspaceDataLoading}
          workspaceData={workspaceData?.data as T_Workspace[]}
          activeWorkspace={workspaceId!}
          projectId={projectId}
        />
        <SidebarInset className="min-w-0">
          <Header />
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </>
  )
}

interface I_AppSidebarProps {
  workspaceData: T_Workspace[]
  workspaceDataLoading: boolean
  activeWorkspace: string
  projectId?: string
}

const sidebarProjectsItems = [
  {
    label: 'Overview',
    items: [
      {
        label: 'Dashboard',
        icon: navigationIcons.dashboard,
        to: '/app/$workspaceId/$projectId',
        external: false,
        isActive: (
          pathname: string,
          activeWorkspace: string,
          projectId?: string
        ) => pathname === `/app/${activeWorkspace}/${projectId}`,
      },
    ],
  },

  {
    label: 'Analytics',
    items: [
      {
        label: 'Events',
        icon: navigationIcons.events,
        to: '/app/$workspaceId/$projectId/events',
        external: false,
        isActive: (pathname: string) => pathname.includes('events'),
      },
      {
        label: 'Visitors',
        icon: navigationIcons.visitors,
        to: '/app/$workspaceId/$projectId/visitors',
        external: false,
        isActive: (pathname: string) => pathname.includes('visitors'),
      },
      {
        label: 'Funnels',
        icon: navigationIcons.funnels,
        to: '/app/$workspaceId/$projectId/funnels',
        external: false,
        isActive: (pathname: string) => pathname.includes('funnels'),
      },
      {
        label: 'User Journey',
        icon: navigationIcons.userJourney,
        to: '/app/$workspaceId/$projectId/user-journey',
        external: false,
        isActive: (pathname: string) => pathname.includes('user-journey'),
      },
      {
        label: 'Goals',
        icon: navigationIcons.goals,
        to: '/app/$workspaceId/$projectId/goals',
        external: false,
        isActive: (pathname: string) => pathname.includes('goals'),
      },
      {
        label: 'Campaigns',
        icon: navigationIcons.campaigns,
        to: '/app/$workspaceId/$projectId/campaigns',
        external: false,
        isActive: (pathname: string) => pathname.includes('campaigns'),
      },
    ],
  },

  {
    label: 'Behavior',
    items: [
      {
        label: 'Heatmaps',
        icon: navigationIcons.heatmaps,
        to: '/app/$workspaceId/$projectId/heatmaps',
        external: false,
        isActive: (pathname: string) => pathname.includes('heatmaps'),
      },
      {
        label: 'Session Replay',
        icon: navigationIcons.sessionReplay,
        to: '/app/$workspaceId/$projectId/session-replay',
        external: false,
        isActive: (pathname: string) => pathname.includes('session-replay'),
      },
    ],
  },

  {
    label: 'Monitoring',
    items: [
      {
        label: 'Performance',
        icon: navigationIcons.performance,
        to: '/app/$workspaceId/$projectId/performance',
        external: false,
        isActive: (pathname: string) => pathname.includes('performance'),
      },
      {
        label: 'Errors',
        icon: navigationIcons.errors,
        to: '/app/$workspaceId/$projectId/errors',
        external: false,
        isActive: (pathname: string) => pathname.includes('errors'),
      },
    ],
  },

  {
    label: 'Insights',
    items: [
      {
        label: 'AI Insights',
        icon: navigationIcons.aiInsights,
        to: '/app/$workspaceId/$projectId/ai-insights',
        external: false,
        isActive: (pathname: string) => pathname.includes('ai-insights'),
      },
      {
        label: 'Reports',
        icon: navigationIcons.reports,
        to: '/app/$workspaceId/$projectId/reports',
        external: false,
        isActive: (pathname: string) => pathname.includes('reports'),
      },
    ],
  },

  {
    label: 'Configuration',
    items: [
      {
        label: 'Domains',
        icon: navigationIcons.domain,
        to: '/app/$workspaceId/$projectId/domains',
        external: false,
        isActive: (pathname: string) => pathname.includes('domains'),
      },
      {
        label: 'Setup',
        icon: navigationIcons.setup,
        to: '/app/$workspaceId/$projectId/setup',
        external: false,
        isActive: (pathname: string) => pathname.includes('setup'),
      },
      {
        label: 'Integrations',
        icon: navigationIcons.integrations,
        to: '/app/$workspaceId/$projectId/integrations',
        external: false,
        isActive: (pathname: string) => pathname.includes('integrations'),
      },
      {
        label: 'API Keys',
        icon: navigationIcons.apiKeys,
        to: '/app/$workspaceId/$projectId/api-keys',
        external: false,
        isActive: (pathname: string) => pathname.includes('api-keys'),
      },
      {
        label: 'Settings',
        icon: navigationIcons.settings,
        to: '/app/$workspaceId/$projectId/settings',
        external: false,
        isActive: (pathname: string) => pathname.includes('settings'),
      },
    ],
  },

  {
    label: 'Activity',
    items: [
      {
        label: 'Usage',
        icon: navigationIcons.usage,
        to: '/app/$workspaceId/$projectId/usage',
        external: false,
        isActive: (pathname: string) => pathname.includes('usage'),
      },
      {
        label: 'Audit Logs',
        icon: navigationIcons.audit,
        to: '/app/$workspaceId/$projectId/audit-logs',
        external: false,
        isActive: (pathname: string) => pathname.includes('audit-logs'),
      },
    ],
  },

  {
    label: 'Resources',
    items: [
      {
        label: 'Docs',
        icon: navigationIcons.documentation,
        to: '/docs',
        isActive: () => false,
        external: true,
      },
      {
        label: 'Terms of Service',
        icon: navigationIcons.terms,
        to: '/terms',
        isActive: () => false,
        external: true,
      },
      {
        label: 'Privacy',
        icon: navigationIcons.privacy,
        to: '/terms',
        isActive: () => false,
        external: true,
      },
    ],
  },
]

const sidebarWorkspaceItems = [
  {
    label: 'General',
    items: [
      {
        label: 'Projects',
        icon: navigationIcons.projects,
        to: '/app/$workspaceId',
        external: false,
        isActive: (pathname: string, activeWorkspace: string) =>
          pathname === `/app/${activeWorkspace}` || pathname.includes('create'),
      },
      {
        label: 'Team',
        icon: navigationIcons.team,
        to: '/app/$workspaceId/team',
        external: false,
        isActive: (pathname: string) =>
          pathname.includes('team') || pathname.includes('invite'),
      },
    ],
  },

  {
    label: 'Access & Security',
    items: [
      {
        label: 'Permissions',
        icon: navigationIcons.permissions,
        to: '/app/$workspaceId/permissions',
        external: false,
        isActive: (pathname: string) => pathname.includes('permissions'),
      },
      {
        label: 'Audit Logs',
        icon: navigationIcons.audit,
        to: '/app/$workspaceId/audit-logs',
        external: false,
        isActive: (pathname: string) => pathname.includes('audit-logs'),
      },
    ],
  },

  {
    label: 'Management',
    items: [
      {
        label: 'Usage',
        icon: navigationIcons.usage,
        to: '/app/$workspaceId/usage',
        external: false,
        isActive: (pathname: string) => pathname.includes('usage'),
      },
      {
        label: 'Workspace Settings',
        icon: navigationIcons.workspaceSettings,
        to: '/app/$workspaceId/settings',
        external: false,
        isActive: (pathname: string) => pathname.includes('settings'),
      },
    ],
  },
  {
    label: 'Resources',
    items: [
      {
        label: 'Docs',
        icon: navigationIcons.documentation,
        to: '/docs',
        isActive: () => false,
        external: true,
      },
      {
        label: 'Terms of Service',
        icon: navigationIcons.terms,
        to: '/terms',
        isActive: () => false,
        external: true,
      },
      {
        label: 'Privacy',
        icon: navigationIcons.privacy,
        to: '/terms',
        isActive: () => false,
        external: true,
      },
    ],
  },
]

export const AppSidebar = ({
  workspaceData,
  workspaceDataLoading,
  activeWorkspace,
  projectId,
}: I_AppSidebarProps) => {
  const { pathname } = useLocation()

  return (
    <>
      <Sidebar>
        <SidebarHeader className="bg-background h-14.25 shrink-0 flex-row items-center gap-0 border-b py-2">
          <WorkspaceSwitcher
            workspaceDataLoading={workspaceDataLoading}
            workspaceData={workspaceData!}
            activeWorkspace={activeWorkspace}
          />
        </SidebarHeader>
        <SidebarContent className="bg-background">
          <SidebarGroup className="bg-background sticky top-0 z-1000 border-b">
            <SearchOverAppDialog
              projectId={projectId}
              workspaceId={activeWorkspace}
            />
          </SidebarGroup>

          <SidebarGroup>
            <AnimatePresence mode="wait">
              <motion.div
                key={projectId ? 'project-menu' : 'workspace-menu'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{
                  duration: 0.18,
                  ease: 'easeOut',
                }}
              >
                <motion.div
                  className="space-y-2"
                  key={`${activeWorkspace}-${projectId}`}
                >
                  {(projectId
                    ? sidebarProjectsItems
                    : sidebarWorkspaceItems
                  ).map((label, index) => {
                    return (
                      <div className="pb-2">
                        <SidebarGroupLabel key={index}>
                          {label.label}
                        </SidebarGroupLabel>

                        {label.items.map((item, index) => {
                          const Icon = item.icon

                          const active = projectId
                            ? item.isActive(
                                pathname,
                                activeWorkspace,
                                projectId
                              )
                            : item.isActive(pathname, activeWorkspace)

                          return workspaceDataLoading ? (
                            <>
                              <div className="pb-1">
                                {[...Array(label.items)].map((_, i) => (
                                  <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{
                                      duration: 0.2,
                                      delay: i * 0.04,
                                    }}
                                  >
                                    <Skeleton className="h-8 w-full" />
                                  </motion.div>
                                ))}
                              </div>
                            </>
                          ) : (
                            <div key={item.label}>
                              <div className="relative h-8 overflow-hidden rounded-md">
                                {/* Temporary loading background */}
                                <motion.div
                                  className="bg-muted/20 absolute inset-0 mb-1 rounded-md"
                                  initial={{ opacity: 1 }}
                                  animate={{ opacity: 0 }}
                                  transition={{
                                    duration: 0.2,
                                    delay: index * 0.01,
                                  }}
                                />

                                {/* Actual sidebar item */}
                                <motion.div
                                  initial={{
                                    opacity: 0,
                                    y: 3,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                  }}
                                  transition={{
                                    duration: 0.18,
                                    delay: index * 0.01,
                                    ease: 'easeOut',
                                  }}
                                >
                                  <SidebarMenuItem>
                                    <SidebarMenuButton
                                      render={
                                        <Button
                                          className="justify-start"
                                          variant={
                                            active ? 'secondary' : 'ghost'
                                          }
                                          render={<Link to={item.to} />}
                                        />
                                      }
                                    >
                                      <Icon />
                                      {item.label}
                                      {item.external && (
                                        <ArrowUpRightIcon className="text-muted-foreground ml-auto" />
                                      )}
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                </motion.div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="bg-background border-t">
          <GracePeriod />

          {projectId && (
            <ProjectPaused
              workspaceId={activeWorkspace}
              projectId={projectId}
            />
          )}

          <SidebarTrigger>
            <Button variant="ghost" size="icon">
              <SidebarIcon />
            </Button>
          </SidebarTrigger>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </>
  )
}

export const WorkspaceSwitcher = ({
  workspaceData,
  workspaceDataLoading,
  activeWorkspace,
}: I_AppSidebarProps) => {
  const navigate = useNavigate()
  const workspace = workspaceData?.find((w) => w.id === activeWorkspace)
  const { projectId } = useParams({ strict: false })

  const switchWorkspace = (workspaceId: string) => {
    if (projectId) {
      navigate({
        to: '/app/$workspaceId',
        params: { workspaceId },
      })
      return
    }

    navigate({
      to: '.',
      params: (prev) => ({
        ...prev,
        workspaceId,
      }),
      search: true,
    })
  }

  return (
    <>
      <div className="flex w-full items-center justify-start gap-2">
        <Link to="/app" className="flex items-center gap-2">
          <img src="/logo.svg" className="size-8 scale-90" alt="Pathlens" />
        </Link>
        <Button
          onClick={() => {
            navigate({
              to: '/app/$workspaceId',
              params: {
                workspaceId: activeWorkspace,
              },
            })
          }}
          variant="link"
          size="lg"
          className={
            'text-foreground text-md w-full flex-1 items-center justify-start overflow-hidden pl-0'
          }
        >
          {workspaceDataLoading ? (
            <Skeleton className="h-4 w-30" />
          ) : (
            <p className="w-full truncate text-left">{workspace?.name}</p>
          )}
        </Button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={workspaceDataLoading}
          render={
            <Button
              size="icon"
              variant={'ghost'}
              className={'overflow-hidden'}
            />
          }
        >
          <ChevronsUpDownIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent className={'w-80'}>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup
            className={'h-60! overflow-auto overflow-x-hidden'}
          >
            <DropdownMenuLabel>Owned Workspaces</DropdownMenuLabel>
            {workspaceData
              ?.filter((item) => !item.external)
              ?.map((item, index) => (
                <DropdownMenuItem
                  key={index}
                  render={
                    <Button
                      size="lg"
                      variant={
                        activeWorkspace === item.id ? 'secondary' : 'ghost'
                      }
                      className={'w-full justify-between'}
                      onClick={() => switchWorkspace(item.id)}
                    />
                  }
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <p className="truncate">{item.name}</p>
                    {item.isDefault && (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground"
                      >
                        Default
                      </Badge>
                    )}
                  </div>
                  {activeWorkspace === item.id && <CheckIcon />}
                </DropdownMenuItem>
              ))}

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Shared Workspaces</DropdownMenuLabel>

            {workspaceData?.filter((item) => item.external).length ? (
              workspaceData
                ?.filter((item) => item.external)
                ?.map((item, index) => (
                  <DropdownMenuItem
                    key={index}
                    render={
                      <Button
                        size="lg"
                        variant={
                          activeWorkspace === item.id ? 'secondary' : 'ghost'
                        }
                        className={'w-full justify-between'}
                        render={
                          <Link
                            to={'/app/$workspaceId'}
                            params={{
                              workspaceId: item.id,
                            }}
                          />
                        }
                      />
                    }
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <p className="truncate">{item.name}</p>
                      {item.isDefault && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Default
                        </Badge>
                      )}
                    </div>
                    {activeWorkspace === item.id && <CheckIcon />}
                  </DropdownMenuItem>
                ))
            ) : (
              <div className="py-5">
                <p className="text-muted-foreground text-center text-xs">
                  You're not a member of any workspace.
                </p>
              </div>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            render={
              <Button
                render={<Link to="/app" search={{ create: true }} />}
                variant="ghost"
                className={'w-full justify-start'}
              />
            }
          >
            <PlusIcon />
            Create Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
