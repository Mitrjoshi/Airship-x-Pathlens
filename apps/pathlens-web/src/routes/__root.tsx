import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import type { AnyRouteMatch } from '@tanstack/react-router'

interface RouterContext {
  queryClient: QueryClient
}

declare module '@tanstack/react-router' {
  interface StaticDataRouteOption {
    breadcrumb?: string | ((match: AnyRouteMatch) => string)
  }
}

const RootLayout = () => (
  <>
    <Outlet />
  </>
)

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})
