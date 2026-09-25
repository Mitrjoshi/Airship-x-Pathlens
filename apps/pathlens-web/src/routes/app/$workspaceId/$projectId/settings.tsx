import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/$projectId/settings"!</div>
}
