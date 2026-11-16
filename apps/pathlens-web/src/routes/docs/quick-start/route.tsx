import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { DocSidebar } from '../-components/doc-sidebar'
import { NotFound } from '@/components/common/not-found'

export const Route = createFileRoute('/docs/quick-start')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  return (
    <SidebarProvider>
      <div className="w-full">
        <div className="flex">
          <DocSidebar />
          <SidebarInset>
            <div className="w-full">
              <Outlet />
            </div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
