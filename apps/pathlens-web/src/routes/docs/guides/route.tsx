import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SidebarInset, SidebarProvider } from '@workspace/ui/components/sidebar'
import { DocSidebar } from '../-components/doc-sidebar'

export const Route = createFileRoute('/docs/guides')({
  component: RouteComponent,
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
