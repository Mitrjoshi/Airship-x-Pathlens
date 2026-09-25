import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/campaigns')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/$projectId/campaigns"!</div>
}
