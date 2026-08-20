import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { ChevronsUpDownIcon, PlusIcon, SquareKanbanIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Permission } from '@workspace/contracts'
import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Link,
  useLocation,
  useNavigate,
  useRouteContext,
  useRouterState,
} from '@tanstack/react-router'
import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { navigationIcons } from '@/config/navigation-icons'
import {
  getPlanDefinition,
  getWorkspacePlan,
  hasPlanFeature,
  useWorkspacePlan,
  type PlanFeature,
  type PlanId,
} from '@/lib/billing'
import { Button } from '@workspace/ui/components/button'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  SidebarFooter,
} from '@workspace/ui/components/sidebar'
import { NavUser } from '@/components/common/nav-user'

type ProjectNavPath =
  | '/app/$workspace/projects/$project/dashboard'
  | '/app/$workspace/projects/$project/analytics'
  | '/app/$workspace/projects/$project/user-journey'
  | '/app/$workspace/projects/$project/funnels'
  | '/app/$workspace/projects/$project/goals'
  | '/app/$workspace/projects/$project/events'
  | '/app/$workspace/projects/$project/errors'
  | '/app/$workspace/projects/$project/campaigns'
  | '/app/$workspace/projects/$project/session-replay'
  | '/app/$workspace/projects/$project/heatmaps'
  | '/app/$workspace/projects/$project/visitors'
  | '/app/$workspace/projects/$project/performance'
  | '/app/$workspace/projects/$project/reports'
  | '/app/$workspace/projects/$project/ai-insights'
  | '/app/$workspace/projects/$project/keys'
  | '/app/$workspace/projects/$project/settings'

interface WorkspaceOption {
  id: string
  name: string
  logo: React.ReactNode
  plan: string
}

interface ProjectNavItem {
  title: string
  url: ProjectNavPath
  icon: LucideIcon
  isActive: boolean
  isPro: boolean
  permission: Permission
  planFeature?: PlanFeature
}

export function AppSidebar({
  workspaceId,
  projectId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  workspaceId?: string
  projectId?: string
}) {
  const { pathname } = useLocation()
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const routeParams = useRouterState({
    select: (state) => {
      for (let i = state.matches.length - 1; i >= 0; i--) {
        const params = state.matches[i].params as {
          workspace?: string
          project?: string
        }

        if (params.workspace) return params
      }

      return undefined
    },
  })
  const activeWorkspaceId = workspaceId ?? routeParams?.workspace ?? ''
  const resolvedWorkspaceId =
    activeWorkspaceId || (user?.defaultWorkspace?.id ?? '')
  const resolvedProjectId = projectId ?? routeParams?.project
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const activePlanId = useWorkspacePlan(resolvedWorkspaceId)

  const workspaceList =
    workspaceData?.data ??
    (user?.defaultWorkspace ? [user.defaultWorkspace] : [])
  const workspaces: WorkspaceOption[] = workspaceList.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    logo: <SquareKanbanIcon />,
    plan: `${getPlanDefinition(getWorkspacePlan(workspace.id)).name} plan`,
  }))
  const activeWorkspace = workspaceList.find(
    (workspace) => workspace.id === resolvedWorkspaceId
  )
  const projectBasePath = resolvedProjectId
    ? `/app/${resolvedWorkspaceId}/projects/${resolvedProjectId}`
    : ''

  const navMain: ProjectNavItem[] = [
    {
      title: 'Dashboard',
      url: '/app/$workspace/projects/$project/dashboard' as const,
      icon: navigationIcons.dashboard,
      isActive: pathname === `${projectBasePath}/dashboard`,
      isPro: false,
      permission: 'analytics.dashboard.view' as const,
    },
    {
      title: 'Analytics',
      url: '/app/$workspace/projects/$project/analytics' as const,
      icon: navigationIcons.analytics,
      isActive: pathname === `${projectBasePath}/analytics`,
      isPro: false,
      permission: 'analytics.analytics.view' as const,
    },
    {
      title: 'User Journey',
      url: '/app/$workspace/projects/$project/user-journey' as const,
      icon: navigationIcons.userJourney,
      isActive: pathname === `${projectBasePath}/user-journey`,
      isPro: true,
      planFeature: 'userJourney' as const,
      permission: 'analytics.analytics.view' as const,
    },
    {
      title: 'Funnels',
      url: '/app/$workspace/projects/$project/funnels' as const,
      icon: navigationIcons.funnels,
      isActive: pathname === `${projectBasePath}/funnels`,
      isPro: true,
      permission: 'analytics.funnels.view' as const,
    },
    {
      title: 'Goals',
      url: '/app/$workspace/projects/$project/goals' as const,
      icon: navigationIcons.goals,
      isActive: pathname === `${projectBasePath}/goals`,
      isPro: true,
      permission: 'analytics.goals.view' as const,
    },
    {
      title: 'Events',
      url: '/app/$workspace/projects/$project/events' as const,
      icon: navigationIcons.events,
      isActive: pathname === `${projectBasePath}/events`,
      isPro: false,
      permission: 'analytics.events.view' as const,
    },
    {
      title: 'Errors',
      url: '/app/$workspace/projects/$project/errors' as const,
      icon: navigationIcons.errors,
      isActive: pathname === `${projectBasePath}/errors`,
      isPro: true,
      planFeature: 'errorTracking' as const,
      permission: 'analytics.analytics.view' as const,
    },
    {
      title: 'Campaigns',
      url: '/app/$workspace/projects/$project/campaigns' as const,
      icon: navigationIcons.campaigns,
      isActive: pathname === `${projectBasePath}/campaigns`,
      isPro: true,
      planFeature: 'campaignTracking' as const,
      permission: 'analytics.goals.view' as const,
    },
    {
      title: 'Session Replay',
      url: '/app/$workspace/projects/$project/session-replay' as const,
      icon: navigationIcons.sessionReplay,
      isActive: pathname === `${projectBasePath}/session-replay`,
      isPro: true,
      planFeature: 'sessionReplay' as const,
      permission: 'analytics.session_replay.view' as const,
    },
    {
      title: 'Heatmaps',
      url: '/app/$workspace/projects/$project/heatmaps' as const,
      icon: navigationIcons.heatmaps,
      isActive: pathname === `${projectBasePath}/heatmaps`,
      isPro: true,
      planFeature: 'heatmaps' as const,
      permission: 'analytics.analytics.view' as const,
    },
    {
      title: 'Visitors',
      url: '/app/$workspace/projects/$project/visitors' as const,
      icon: navigationIcons.visitors,
      isActive: pathname === `${projectBasePath}/visitors`,
      isPro: false,
      permission: 'analytics.visitors.view' as const,
    },
    {
      title: 'Performance',
      url: '/app/$workspace/projects/$project/performance' as const,
      icon: navigationIcons.performance,
      isActive: pathname === `${projectBasePath}/performance`,
      isPro: true,
      planFeature: 'performanceAnalytics' as const,
      permission: 'analytics.performance.view' as const,
    },
    {
      title: 'Reports',
      url: '/app/$workspace/projects/$project/reports' as const,
      icon: navigationIcons.reports,
      isActive: pathname === `${projectBasePath}/reports`,
      isPro: true,
      planFeature: 'reports' as const,
      permission: 'analytics.reports.view' as const,
    },
    {
      title: 'AI Insights',
      url: '/app/$workspace/projects/$project/ai-insights' as const,
      icon: navigationIcons.aiInsights,
      isActive: pathname === `${projectBasePath}/ai-insights`,
      isPro: true,
      planFeature: 'aiInsights' as const,
      permission: 'analytics.ai_insights.view' as const,
    },
    {
      title: 'API Keys',
      url: '/app/$workspace/projects/$project/keys' as const,
      icon: navigationIcons.apiKeys,
      isActive: pathname === `${projectBasePath}/keys`,
      isPro: false,
      permission: 'project.api_keys.view' as const,
    },
    {
      title: 'Settings',
      url: '/app/$workspace/projects/$project/settings' as const,
      icon: navigationIcons.settings,
      isActive: pathname === `${projectBasePath}/settings`,
      isPro: false,
      permission: 'project.settings.view' as const,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher
          teams={workspaces}
          activeWorkspaceId={resolvedWorkspaceId}
        />
      </SidebarHeader>
      <SidebarContent>
        {resolvedProjectId ? (
          <>
            <WorkspaceNav
              workspaceId={resolvedWorkspaceId}
              role={activeWorkspace?.role}
              permissions={activeWorkspace?.permissions ?? []}
              planId={activePlanId}
            />
            <NavMain
              items={navMain
                .filter(
                  (item) =>
                    activeWorkspace?.role === 'owner' ||
                    activeWorkspace?.permissions?.includes(item.permission)
                )
                .filter(
                  (item) =>
                    !item.planFeature ||
                    hasPlanFeature(activePlanId, item.planFeature)
                )}
              workspaceId={resolvedWorkspaceId}
              projectId={resolvedProjectId}
            />
          </>
        ) : activeWorkspaceId ? (
          <WorkspaceNav
            workspaceId={resolvedWorkspaceId}
            role={activeWorkspace?.role}
            permissions={activeWorkspace?.permissions ?? []}
            planId={activePlanId}
          />
        ) : (
          <GeneralNav />
        )}
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter className="border-t">
        <div className="flow-row flex items-center justify-between">
          <NavUser
            user={{
              name: user?.name ?? 'PathLens user',
              email: user?.email ?? '',
              avatar: user?.avatar,
            }}
          />

          <SidebarTrigger
            className={'duration-200 group-data-[state=collapsed]:hidden'}
            render={<Button variant="secondary" />}
          />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function GeneralNav() {
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>General</SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/app' || pathname === '/app/'}
            render={<Link to="/app" />}
          >
            <navigationIcons.projects className="size-4" />
            <span>Workspaces</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/app/account'}
            render={<Link to="/app/account" />}
          >
            <navigationIcons.settings className="size-4" />
            <span>Account</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname === '/app/plans'}
            render={<Link to="/app/plans" />}
          >
            <navigationIcons.billing className="size-4" />
            <span>Plans</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function WorkspaceSwitcher({
  teams,
  activeWorkspaceId,
}: {
  teams: WorkspaceOption[]
  activeWorkspaceId: string
}) {
  const navigate = useNavigate()
  const activeTeam =
    teams.find((team) => team.id === activeWorkspaceId) ?? teams[0]

  if (!activeTeam) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground"
              />
            }
          >
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              {activeTeam.logo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{activeTeam.name}</span>
              <span className="text-muted-foreground truncate text-xs">
                {activeTeam.plan}
              </span>
            </div>
            <ChevronsUpDownIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-60 group-data-[collapsible=icon]:hidden"
            side={'bottom'}
            align="start"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Workspaces
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={index}
                  onClick={() =>
                    navigate({
                      to: '/app/$workspace',
                      params: { workspace: team.id },
                    })
                  }
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  <div>
                    <p className="truncate">{team.name}</p>
                    <p className="text-muted-foreground ml-auto text-xs">
                      {team.plan}
                    </p>
                  </div>
                  {team.id === activeWorkspaceId && (
                    <span className="text-muted-foreground ml-auto text-xs">
                      Current
                    </span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => navigate({ to: '/app' })}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <navigationIcons.settings className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Manage workspaces
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function WorkspaceNav({
  workspaceId,
  role,
  permissions,
  planId,
}: {
  workspaceId: string
  role?: string
  permissions: Permission[]
  planId: PlanId
}) {
  const { pathname } = useLocation()
  const canViewMembers =
    role === 'owner' || permissions.includes('workspace.members.view')
  const canViewPermissionProfiles =
    role === 'owner' ||
    permissions.some((permission) =>
      [
        'workspace.permission_profiles.view',
        'workspace.permission_profiles.create',
        'workspace.permission_profiles.update',
        'workspace.permission_profiles.delete',
      ].includes(permission)
    )
  const canViewSettings =
    role === 'owner' || permissions.includes('workspace.settings.view')
  const projectsPath =
    /^\/app\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={projectsPath.test(pathname)}
            render={
              <Link to="/app/$workspace" params={{ workspace: workspaceId }} />
            }
          >
            <navigationIcons.projects className="size-4" />
            <span>Projects</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        {canViewMembers && (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.includes('/members')}
              render={
                <Link
                  to="/app/$workspace/members"
                  params={{ workspace: workspaceId }}
                />
              }
            >
              <navigationIcons.members className="size-4" />
              <span>Members</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        {canViewPermissionProfiles &&
          hasPlanFeature(planId, 'advancedPermissions') && (
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.includes('/permission-profiles')}
                render={
                  <Link
                    to="/app/$workspace/permission-profiles"
                    params={{ workspace: workspaceId }}
                  />
                }
              >
                <navigationIcons.permissions className="size-4" />
                <span>Permissions</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        {canViewSettings && (
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname.includes('/workspace-settings')}
              render={
                <Link
                  to="/app/$workspace/workspace-settings"
                  params={{ workspace: workspaceId }}
                />
              }
            >
              <navigationIcons.workspaceSettings className="size-4" />
              <span>Workspace Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.includes('/usage')}
            render={
              <Link
                to="/app/$workspace/usage"
                params={{ workspace: workspaceId }}
              />
            }
          >
            <navigationIcons.usage className="size-4" />
            <span>Usage</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={
              pathname.includes('/billing') || pathname.includes('/checkout')
            }
            render={
              <Link
                to="/app/$workspace/billing"
                params={{ workspace: workspaceId }}
              />
            }
          >
            <navigationIcons.billing className="size-4" />
            <span>Billing</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function ProjectSwitcher({
  workspaceId,
  projectId,
}: {
  workspaceId: string
  projectId: string
}) {
  const navigate = useNavigate()
  const { data, isPending } = useQuery(
    getProjectsOptions({ workspace_id: workspaceId })
  )
  const activeProject = data?.data.find((project) => project.id === projectId)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="lg"
            className="hover:bg-muted data-open:bg-muted h-auto w-64 min-w-0 px-2"
          />
        }
      >
        <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
          <navigationIcons.projects className="size-4" />
        </div>
        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
          <span className="text-muted-foreground text-[11px]">Project</span>
          <span className="truncate font-medium">
            {isPending ? 'Loading...' : (activeProject?.name ?? 'Project')}
          </span>
        </div>
        <ChevronsUpDownIcon className="text-muted-foreground ml-1 size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" sideOffset={6}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Projects
          </DropdownMenuLabel>
          {(data?.data ?? []).map((project) => (
            <DropdownMenuItem
              key={project.id}
              className="gap-2 p-2"
              onClick={() =>
                navigate({
                  to: '/app/$workspace/projects/$project/dashboard',
                  params: { workspace: workspaceId, project: project.id },
                })
              }
            >
              <div className="bg-muted flex size-7 items-center justify-center rounded-md">
                <navigationIcons.projects className="size-4" />
              </div>
              <span className="truncate">{project.name}</span>
              {project.id === projectId && (
                <span className="text-muted-foreground ml-auto text-xs">
                  Current
                </span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 p-2"
          onClick={() =>
            navigate({
              to: '/app/$workspace',
              params: { workspace: workspaceId },
            })
          }
        >
          <PlusIcon className="size-4" />
          Manage projects
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NavMain({
  items,
  workspaceId,
  projectId,
}: {
  items: {
    title: string
    url: ProjectNavPath
    icon: LucideIcon
    isActive: boolean
    isPro: boolean
    permission: Permission
  }[]
  workspaceId: string
  projectId: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Project</SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              isActive={item.isActive}
              render={
                <Link
                  to={item.url}
                  params={{ workspace: workspaceId, project: projectId }}
                />
              }
              className="flex justify-between"
            >
              <div className="flex items-center gap-2">
                <item.icon className="size-4 shrink-0" />
                <span>{item.title}</span>
              </div>
              {/* {item.isPro && (
                <Badge
                  variant="outline"
                  className="border-green-60 border-3 bg-green-400/20"
                >
                  Pro
                </Badge>
              )} */}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
