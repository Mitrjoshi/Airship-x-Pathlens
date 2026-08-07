import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/app/$workspaceId/projects/$projectId")({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/$workspaceId/projects/$projectId"!</div>
}
