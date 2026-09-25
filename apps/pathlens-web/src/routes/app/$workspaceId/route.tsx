import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
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
  ActivityIcon,
  BarChart3Icon,
  BotIcon,
  BugIcon,
  EyeIcon,
  FileBarChartIcon,
  FlameIcon,
  GaugeIcon,
  GoalIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
  MousePointerClickIcon,
  SettingsIcon,
  UsersIcon,
  SidebarIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  PlusIcon,
  CheckIcon,
  FolderIcon,
  ChartAreaIcon,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
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
import { Separator } from '@workspace/ui/components/separator'
import { navigationIcons } from '@/config/navigation-icons'

export const Route = createFileRoute('/app/$workspaceId')({
  component: RouteComponent,
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
          activeWorkspace={workspaceId}
          projectId={projectId}
        />
        <SidebarInset>
          <Header />
          <div className="px-5">
            <Outlet />
          </div>
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
    label: 'Dashboard',
    icon: navigationIcons.dashboard,
    to: '/app/$workspaceId/$projectId',
    isActive: (pathname: string, activeWorkspace: string, projectId?: string) =>
      pathname === `/app/${activeWorkspace}/${projectId}`,
  },
  {
    label: 'Analytics',
    icon: navigationIcons.analytics,
    to: '/app/$workspaceId/$projectId/analytics',
    isActive: (pathname: string) => pathname.includes('analytics'),
  },
  {
    label: 'User Journey',
    icon: navigationIcons.userJourney,
    to: '/app/$workspaceId/$projectId/user-journey',
    isActive: (pathname: string) => pathname.includes('user-journey'),
  },
  {
    label: 'Goals',
    icon: navigationIcons.goals,
    to: '/app/$workspaceId/$projectId/goals',
    isActive: (pathname: string) => pathname.includes('goals'),
  },
  {
    label: 'Events',
    icon: navigationIcons.events,
    to: '/app/$workspaceId/$projectId/events',
    isActive: (pathname: string) => pathname.includes('events'),
  },
  {
    label: 'Errors',
    icon: navigationIcons.errors,
    to: '/app/$workspaceId/$projectId/errors',
    isActive: (pathname: string) => pathname.includes('errors'),
  },
  {
    label: 'Campaigns',
    icon: navigationIcons.campaigns,
    to: '/app/$workspaceId/$projectId/campaigns',
    isActive: (pathname: string) => pathname.includes('campaigns'),
  },
  {
    label: 'Session Replay',
    icon: navigationIcons.sessionReplay,
    to: '/app/$workspaceId/$projectId/session-replay',
    isActive: (pathname: string) => pathname.includes('session-replay'),
  },
  {
    label: 'Heatmaps',
    icon: navigationIcons.heatmaps,
    to: '/app/$workspaceId/$projectId/heatmaps',
    isActive: (pathname: string) => pathname.includes('heatmaps'),
  },
  {
    label: 'Visitors',
    icon: navigationIcons.visitors,
    to: '/app/$workspaceId/$projectId/visitors',
    isActive: (pathname: string) => pathname.includes('visitors'),
  },
  {
    label: 'Performance',
    icon: navigationIcons.performance,
    to: '/app/$workspaceId/$projectId/performance',
    isActive: (pathname: string) => pathname.includes('performance'),
  },
  {
    label: 'Reports',
    icon: navigationIcons.reports,
    to: '/app/$workspaceId/$projectId/reports',
    isActive: (pathname: string) => pathname.includes('reports'),
  },
  {
    label: 'AI Insights',
    icon: navigationIcons.aiInsights,
    to: '/app/$workspaceId/$projectId/ai-insights',
    isActive: (pathname: string) => pathname.includes('ai-insights'),
  },
  {
    label: 'Domains',
    icon: navigationIcons.domain,
    to: '/app/$workspaceId/$projectId/domains',
    isActive: (pathname: string) => pathname.includes('domains'),
  },
  {
    label: 'API Keys',
    icon: navigationIcons.apiKeys,
    to: '/app/$workspaceId/$projectId/api-keys',
    isActive: (pathname: string) => pathname.includes('api-keys'),
  },
  {
    label: 'Settings',
    icon: navigationIcons.settings,
    to: '/app/$workspaceId/$projectId/settings',
    isActive: (pathname: string) => pathname.includes('settings'),
  },
]

const sidebarWorkspaceItems = [
  {
    label: 'Projects',
    icon: navigationIcons.projects,
    to: '/app/$workspaceId',
    isActive: (pathname: string, activeWorkspace: string) =>
      pathname === `/app/${activeWorkspace}`,
  },
  {
    label: 'Team',
    icon: navigationIcons.team,
    to: '/app/$workspaceId/team',
    isActive: (pathname: string) => pathname.includes('team'),
  },
  {
    label: 'Usage',
    icon: navigationIcons.usage,
    to: '/app/$workspaceId/usage',
    isActive: (pathname: string) => pathname.includes('usage'),
  },
  {
    label: 'Settings',
    icon: navigationIcons.workspaceSettings,
    to: '/app/$workspaceId/settings',
    isActive: (pathname: string) => pathname.includes('settings'),
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
        <SidebarHeader className="bg-background shrink-0 flex-row items-center gap-0 border-b py-2">
          <Link to="/app" className="shrink-0">
            <img
              src="/logo.png"
              className="size-10 dark:invert"
              alt="Pathlens"
            />
          </Link>

          <WorkspaceSwitcher
            workspaceDataLoading={workspaceDataLoading}
            workspaceData={workspaceData!}
            activeWorkspace={activeWorkspace}
          />
        </SidebarHeader>
        <SidebarContent className="bg-background">
          <SidebarGroup>
            <SearchOverAppDialog />
          </SidebarGroup>

          <Separator />
          <SidebarGroup>
            <SidebarGroupLabel>General</SidebarGroupLabel>

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
                {workspaceDataLoading ? (
                  <div>
                    {[...Array(4)].map((_, i) => (
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
                ) : (
                  <motion.div key={`${activeWorkspace}-${projectId}`}>
                    {(projectId
                      ? sidebarProjectsItems
                      : sidebarWorkspaceItems
                    ).map((item, index) => {
                      const Icon = item.icon

                      const active = projectId
                        ? item.isActive(pathname, activeWorkspace, projectId)
                        : item.isActive(pathname, activeWorkspace)

                      return (
                        <div
                          key={item.label}
                          className="relative h-8 overflow-hidden rounded-md"
                        >
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
                                    variant={active ? 'secondary' : 'ghost'}
                                    render={<Link to={item.to} />}
                                  />
                                }
                              >
                                <Icon />
                                {item.label}
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </motion.div>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="bg-background border-t">
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
  const workspace = workspaceData?.find((w) => w.id === activeWorkspace)

  return (
    <>
      <DropdownMenu>
        <div className="flex w-full items-center justify-between overflow-hidden pl-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={workspaceDataLoading ? 'loading' : workspace?.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="truncate text-[15px]"
            >
              {workspaceDataLoading ? 'Loading...' : workspace?.name}
            </motion.p>
          </AnimatePresence>
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
        </div>

        <DropdownMenuContent className={'w-80'}>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup className={'h-60! overflow-auto'}>
            {workspaceData?.map((item, index) => (
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
                <p>{item.name}</p>
                {activeWorkspace === item.id && <CheckIcon />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            render={
              <Button variant="ghost" className={'w-full justify-start'} />
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
