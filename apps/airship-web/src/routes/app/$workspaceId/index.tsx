import PageLayout from "@/components/page-layout"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/app/$workspaceId/")({
  component: RouteComponent,
})

function RouteComponent() {
  return <PageLayout>Hello "/app/$workspace/"!</PageLayout>
}
