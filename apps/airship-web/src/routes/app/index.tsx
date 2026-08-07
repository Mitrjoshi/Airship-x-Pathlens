import PageLayout from "@/components/page-layout"
import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/app/")({
  beforeLoad: () => {
    throw redirect({
      to: "/app/$workspaceId",
      params: { workspaceId: "workspace-1" },
    })
  },
  component: RouteComponent,
})

function RouteComponent() {
  return <PageLayout>Hello "/app/"!</PageLayout>
}
