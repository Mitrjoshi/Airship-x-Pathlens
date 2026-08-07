import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getUsersOptions } from '@/queries/user'

export const Route = createFileRoute('/app')({
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const token = localStorage.getItem('pathlens-token')
    if (!token) {
      throw redirect({ to: '/login' })
    }

    const res = await context.queryClient.ensureQueryData(getUsersOptions())
    return { user: res.data }
  },
})

function RouteComponent() {
  return <Outlet />
}
