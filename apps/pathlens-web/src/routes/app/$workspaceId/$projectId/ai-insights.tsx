import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/ai-insights',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/$projectId/ai-insights"!</div>
}
