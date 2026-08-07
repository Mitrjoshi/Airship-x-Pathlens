import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)')({
  component: RouteComponent,
  beforeLoad: () => {
    const token = localStorage.getItem('pathlens-token')

    if (token) {
      throw redirect({ to: '/app' })
    }
  },
})

function RouteComponent() {
  return (
    <>
      <Outlet />
    </>
  )
}
