import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/app/$workspaceId/permissions/$permissionId'
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/permissions/$permissionId"!</div>
}
