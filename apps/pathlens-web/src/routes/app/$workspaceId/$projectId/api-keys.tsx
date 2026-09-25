import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/api-keys')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/$projectId/api-keys"!</div>
}
