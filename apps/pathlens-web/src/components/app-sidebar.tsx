import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  BarChart3Icon,
  BotIcon,
  ChartColumnIncreasingIcon,
  ChevronsUpDownIcon,
  ClapperboardIcon,
  Columns3CogIcon,
  FolderClosedIcon,
  GaugeIcon,
  GoalIcon,
  KeyRoundIcon,
  MousePointerClickIcon,
  PlusIcon,
  SettingsIcon,
  SquareKanbanIcon,
  UsersIcon,
  WorkflowIcon,
} from 'lucide-react'
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
} from '@workspace/ui/components/sidebar'
import { Badge } from '@workspace/ui/components/badge'

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
  projectId: string
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
  const projectBasePath = `/app/${workspaceId}/projects/${projectId}`

  const navMain = [
    {
      title: 'Dashboard',
      url: '/app/$workspace/projects/$project/dashboard' as const,
      icon: <GaugeIcon />,
      isActive: pathname === `${projectBasePath}/dashboard`,
      isNew: false,
    },
    {
      title: 'Analytics',
      url: '/app/$workspace/projects/$project/analytics' as const,
      icon: <ChartColumnIncreasingIcon />,
      isActive: pathname === `${projectBasePath}/analytics`,
      isNew: false,
    },
    {
      title: 'Visitors',
      url: '/app/$workspace/projects/$project/visitors' as const,
      icon: <UsersIcon />,
      isActive: pathname === `${projectBasePath}/visitors`,
      isNew: false,
    },
    {
      title: 'Performance',
      url: '/app/$workspace/projects/$project/performance' as const,
      icon: <GaugeIcon />,
      isActive: pathname === `${projectBasePath}/performance`,
      isNew: true,
    },
    {
      title: 'Session Replay',
      url: '/app/$workspace/projects/$project/session-replay' as const,
      icon: <ClapperboardIcon />,
      isActive: pathname === `${projectBasePath}/session-replay`,
      isNew: false,
    },
    {
      title: 'Events',
      url: '/app/$workspace/projects/$project/events' as const,
      icon: <MousePointerClickIcon />,
      isActive: pathname === `${projectBasePath}/events`,
      isNew: true,
    },
    {
      title: 'Funnels',
      url: '/app/$workspace/projects/$project/funnels' as const,
      icon: <WorkflowIcon />,
      isActive: pathname === `${projectBasePath}/funnels`,
      isNew: true,
    },
    {
      title: 'Goals',
      url: '/app/$workspace/projects/$project/goals' as const,
      icon: <GoalIcon />,
      isActive: pathname === `${projectBasePath}/goals`,
      isNew: true,
    },
    {
      title: 'AI Insights',
      url: '/app/$workspace/projects/$project/ai-insights' as const,
      icon: <BotIcon />,
      isActive: pathname === `${projectBasePath}/ai-insights`,
      isNew: true,
    },
    {
      title: 'Reports',
      url: '/app/$workspace/projects/$project/reports' as const,
      icon: <BarChart3Icon />,
      isActive: pathname === `${projectBasePath}/reports`,
      isNew: false,
    },
    {
      title: 'API Keys',
      url: '/app/$workspace/projects/$project/keys' as const,
      icon: <KeyRoundIcon />,
      isActive: pathname === `${projectBasePath}/keys`,
      isNew: false,
    },
    {
      title: 'Settings',
      url: '/app/$workspace/projects/$project/settings' as const,
      icon: <SettingsIcon />,
      isActive: pathname === `${projectBasePath}/settings`,
      isNew: false,
    },
  ]

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <WorkspaceSwitcher teams={workspaces} activeWorkspaceId={workspaceId} />
      </SidebarHeader>
      <SidebarContent>
        <WorkspaceNav workspaceId={workspaceId} projectId={projectId} />
        <NavMain
          items={navMain}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
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
    <SidebarMenu className="flex flex-row items-center justify-between">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            className={'w-50'}
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground data-open:hidden"
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
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 group-data-[collapsible=icon]:hidden"
            align="start"
            side={'bottom'}
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Workspaces
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() =>
                    navigate({
                      to: '/app/$workspace/projects',
                      params: { workspace: team.id },
                    })
                  }
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  {team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
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
                  <SettingsIcon className="size-4" />
                </div>
                <div className="text-muted-foreground font-medium">
                  Manage workspaces
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <SidebarTrigger render={<Button variant="secondary" />} />
    </SidebarMenu>
  )
}

function WorkspaceNav({
  workspaceId,
  projectId,
}: {
  workspaceId: string
  projectId: string
}) {
  const { pathname } = useLocation()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workspace</SidebarGroupLabel>
      <SidebarMenu className="space-y-1">
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.includes('/members')}
            render={
              <Link
                to="/app/$workspace/projects/$project/members"
                params={{ workspace: workspaceId, project: projectId }}
              />
            }
          >
            <UsersIcon />
            <span>Members</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <SidebarMenuButton
            isActive={pathname.includes('/workspace-settings')}
            render={
              <Link
                to="/app/$workspace/projects/$project/workspace-settings"
                params={{ workspace: workspaceId, project: projectId }}
              />
            }
          >
            <Columns3CogIcon />
            <span>Settings</span>
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
            className="hover:bg-muted data-open:bg-muted w-64 min-w-0 px-2"
          />
        }
      >
        <div className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-md">
          <FolderClosedIcon className="size-4" />
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
                <FolderClosedIcon className="size-4" />
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
              to: '/app/$workspace/projects',
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
    icon: React.ReactNode
    isActive: boolean
    isNew: boolean
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
                {item.icon}
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
