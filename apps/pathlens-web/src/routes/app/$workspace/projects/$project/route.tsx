import { AppSidebar, ProjectSwitcher } from '@/components/app-sidebar'
import { ModeToggle } from '@/components/common/mode-toggle'
import { NotificationsPopover } from '@/components/common/notifications-popover'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Separator } from '@workspace/ui/components/separator'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouteContext,
} from '@tanstack/react-router'
import {
  BadgeCheckIcon,
  CreditCardIcon,
  LogOutIcon,
  SparklesIcon,
} from 'lucide-react'

export const Route = createFileRoute('/app/$workspace/projects/$project')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()

  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  return (
    <SidebarProvider>
      <AppSidebar workspaceId={workspace} projectId={project} />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex min-w-0 items-center gap-2">
            <ProjectSwitcher workspaceId={workspace} projectId={project} />
            <Separator orientation="vertical" />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <NotificationsPopover />
            <ModeToggle />
            <NavUser
              user={{
                name: user?.name ?? 'PathLens user',
                email: user?.email ?? '',
                avatar: user?.avatar,
              }}
            />
          </div>
        </header>

        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}

function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string | null
  }
}) {
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon" variant="ghost" />}>
        <Avatar>
          <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
          <AvatarFallback>PL</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        side={'bottom'}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar>
                <AvatarImage src={user.avatar ?? undefined} alt={user.name} />
                <AvatarFallback>PL</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/app/plans" />}>
            <SparklesIcon />
            Upgrade to Pro
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link to="/app/account" />}>
            <BadgeCheckIcon />
            Account
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/app/billing" />}>
            <CreditCardIcon />
            Billing
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            localStorage.removeItem('pathlens-token')
            navigate({ to: '/login', replace: true })
          }}
        >
          <LogOutIcon />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
