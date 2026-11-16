import { NotFound } from '@/components/common/not-found'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)')({
  component: RouteComponent,
  notFoundComponent: () => <NotFound />,
  beforeLoad: () => {
    const token = localStorage.getItem('pathlens-token')

    if (token) {
      throw redirect({ to: '/app' })
    }
  },
})

function RouteComponent() {
  return <Outlet />
}
