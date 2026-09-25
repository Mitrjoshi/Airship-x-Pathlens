import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/analytics')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/$projectId/analytics"!</div>
}
