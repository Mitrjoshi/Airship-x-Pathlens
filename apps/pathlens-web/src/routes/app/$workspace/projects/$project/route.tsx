import { ProjectSwitcher } from '@/components/app-sidebar'
import { NotificationsPopover } from '@/components/common/notifications-popover'
import { Separator } from '@workspace/ui/components/separator'
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { FeedbackPopover } from '@/components/common/feedback-popover'
import { SearchOverAppDialog } from '@/components/common/search-over-app-dialog'

export const Route = createFileRoute('/app/$workspace/projects/$project')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()

  return (
    <>
      <header className="bg-background sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <div className="flex min-w-0 items-center gap-2">
          <ProjectSwitcher workspaceId={workspace} projectId={project} />
          <Separator orientation="vertical" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <FeedbackPopover workspaceId={workspace} projectId={project} />
          <Separator orientation="vertical" />
          <SearchOverAppDialog workspaceId={workspace} projectId={project} />
          <Separator orientation="vertical" />
          <NotificationsPopover />
        </div>
      </header>

      <Outlet />
    </>
  )
}
