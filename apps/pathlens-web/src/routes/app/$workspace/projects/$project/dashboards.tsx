import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/dashboards'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Dashboards',
  },
})

function RouteComponent() {
  return <Outlet />
}
