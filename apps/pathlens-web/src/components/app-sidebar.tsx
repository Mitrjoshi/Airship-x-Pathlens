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
} from '@tanstack/react-router'
import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { navigationIcons } from '@/config/navigation-icons'
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
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@workspace/ui/components/sidebar'
import { Badge } from '@workspace/ui/components/badge'
import { NavUser } from '@/components/common/nav-user'
import { PageLayout } from '@/components/common/page-layout'

type ProjectNavPath =
  | '/app/$workspace/projects/$project/dashboard'
  | '/app/$workspace/projects/$project/analytics'
  | '/app/$workspace/projects/$project/visitors'
  | '/app/$workspace/projects/$project/session-replay'
  | '/app/$workspace/projects/$project/events'
  | '/app/$workspace/projects/$project/funnels'
  | '/app/$workspace/projects/$project/goals'
  | '/app/$workspace/projects/$project/ai-insights'
  | '/app/$workspace/projects/$project/reports'
  | '/app/$workspace/projects/$project/performance'
  | '/app/$workspace/projects/$project/keys'
  | '/app/$workspace/projects/$project/settings'

interface WorkspaceOption {
  id: string
  name: string
  logo: React.ReactNode
  plan: string
}

export function AppSidebar({
  workspaceId,
  projectId,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  workspaceId: string
  projectId?: string
}) {
  const { pathname } = useLocation()
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const { data: workspaceData } = useQuery(getWorkspacesOptions())

  const workspaceList =
    workspaceData?.data ??
    (user?.defaultWorkspace ? [user.defaultWorkspace] : [])
  const workspaces: WorkspaceOption[] = workspaceList.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    logo: <SquareKanbanIcon />,
    plan: workspace.isDefault ? 'Default workspace' : 'Workspace',
  }))
  const activeWorkspace = workspaceList.find(
    (workspace) => workspace.id === workspaceId
  )
  const projectBasePath = projectId
    ? `/app/${workspaceId}/projects/${projectId}`
    : ''

  const navMain = [
    {
      title: 'Dashboard',
      url: '/app/$workspace/projects/$project/dashboard' as const,
      icon: navigationIcons.dashboard,
      isActive: pathname === `${projectBasePath}/dashboard`,
      isNew: false,
      permission: 'analytics.dashboard.view' as const,
    },
    {
      title: 'Analytics',
      url: '/app/$workspace/projects/$project/analytics' as const,
      icon: navigationIcons.analytics,
      isActive: pathname === `${projectBasePath}/analytics`,
      isNew: false,
      permission: 'analytics.analytics.view' as const,
    },
    {
      title: 'Visitors',
      url: '/app/$workspace/projects/$project/visitors' as const,
      icon: navigationIcons.visitors,
      isActive: pathname === `${projectBasePath}/visitors`,
      isNew: false,
      permission: 'analytics.visitors.view' as const,
    },
    {
      title: 'Performance',
      url: '/app/$workspace/projects/$project/performance' as const,
      icon: navigationIcons.performance,
      isActive: pathname === `${projectBasePath}/performance`,
      isNew: true,
      permission: 'analytics.performance.view' as const,
    },
    {
      title: 'Session Replay',
      url: '/app/$workspace/projects/$project/session-replay' as const,
      icon: navigationIcons.sessionReplay,
      isActive: pathname === `${projectBasePath}/session-replay`,
      isNew: false,
      permission: 'analytics.session_replay.view' as const,
    },
    {
      title: 'Events',
      url: '/app/$workspace/projects/$project/events' as const,
      icon: navigationIcons.events,
      isActive: pathname === `${projectBasePath}/events`,
      isNew: true,
      permission: 'analytics.events.view' as const,
    },
    {
      title: 'Funnels',
      url: '/app/$workspace/projects/$project/funnels' as const,
      icon: navigationIcons.funnels,
      isActive: pathname === `${projectBasePath}/funnels`,
      isNew: true,
      permission: 'analytics.funnels.view' as const,
    },
    {
      title: 'Goals',
      url: '/app/$workspace/projects/$project/goals' as const,
      icon: navigationIcons.goals,
      isActive: pathname === `${projectBasePath}/goals`,
      isNew: true,
      permission: 'analytics.goals.view' as const,
    },
    {
      title: 'AI Insights',
      url: '/app/$workspace/projects/$project/ai-insights' as const,
      icon: navigationIcons.aiInsights,
      isActive: pathname === `${projectBasePath}/ai-insights`,
      isNew: true,
      permission: 'analytics.ai_insights.view' as const,
    },
    {
      title: 'Reports',
      url: '/app/$workspace/projects/$project/reports' as const,
      icon: navigationIcons.reports,
      isActive: pathname === `${projectBasePath}/reports`,
      isNew: false,
      permission: 'analytics.reports.view' as const,
    },
    {
      title: 'API Keys',
      url: '/app/$workspace/projects/$project/keys' as const,
      icon: navigationIcons.apiKeys,
      isActive: pathname === `${projectBasePath}/keys`,
      isNew: false,
      permission: 'project.api_keys.view' as const,
    },
    {
      title: 'Settings',
      url: '/app/$workspace/projects/$project/settings' as const,
      icon: navigationIcons.settings,
      isActive: pathname === `${projectBasePath}/settings`,
      isNew: false,
      permission: 'project.settings.view' as const,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher teams={workspaces} activeWorkspaceId={workspaceId} />
      </SidebarHeader>
      <SidebarContent>
        {!projectId && (
          <WorkspaceNav
            workspaceId={workspaceId}
            role={activeWorkspace?.role}
            permissions={activeWorkspace?.permissions ?? []}
          />
        )}
        {projectId && (
          <NavMain
            items={navMain.filter(
              (item) =>
                activeWorkspace?.role === 'owner' ||
                activeWorkspace?.permissions?.includes(item.permission)
            )}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        )}
      </SidebarContent>

      <SidebarRail />

      <SidebarFooter>
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

export function WorkspaceSidebarLayout({
  workspaceId,
  children,
}: {
  workspaceId: string
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar workspaceId={workspaceId} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}

export function WorkspacePageLayout({
  workspaceId,
  children,
}: {
  workspaceId: string
  children: React.ReactNode
}) {
  return (
    <WorkspaceSidebarLayout workspaceId={workspaceId}>
      <PageLayout>{children}</PageLayout>
    </WorkspaceSidebarLayout>
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
              <span className="truncate text-xs">{activeTeam.plan}</span>
            </div>
            <ChevronsUpDownIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="group-data-[collapsible=icon]:hidden"
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
                  {team.name}
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
}: {
  workspaceId: string
  role?: string
  permissions: Permission[]
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
        {canViewPermissionProfiles && (
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
            isActive={pathname.includes('/billing')}
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
    isNew: boolean
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
              {item.isNew && <Badge variant="secondary">New</Badge>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
