import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/(open)/products/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
