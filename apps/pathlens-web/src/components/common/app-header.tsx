import { NavUser, type NavUserData } from '@/components/common/nav-user'
import { NotificationsPopover } from '@/components/common/notifications-popover'
import { Button } from '@workspace/ui/components/button'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function AppHeader({
  user,
  backToWorkspaces = false,
  actions,
}: {
  user: NavUserData
  backToWorkspaces?: boolean
  actions?: ReactNode
}) {
  return (
    <header className="flex min-h-16 items-center justify-between gap-4 border-b pb-5">
      <Link
        to="/app"
        className="flex items-center gap-2 font-semibold tracking-tight"
      >
        <img
          src="/logo.png"
          alt="PathLens"
          className="size-7 rounded-md object-contain"
        />
        PathLens
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        {backToWorkspaces && (
          <Button
            variant="ghost"
            render={<Link to="/app" />}
            className="hidden sm:inline-flex"
          >
            <ArrowLeftIcon />
            Workspaces
          </Button>
        )}
        {actions}
        <NotificationsPopover />
        <NavUser user={user} />
      </div>
    </header>
  )
}
