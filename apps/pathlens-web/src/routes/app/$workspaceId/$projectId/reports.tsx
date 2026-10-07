import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/reports')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  return (
    <div>
      <div className="mx-auto space-y-6 p-6">
        {/* Heading */}
        <div>
          <p className="text-xl font-medium">Reports</p>

          <p className="text-muted-foreground text-sm">
            View and analyze reports generated across your project.
          </p>
        </div>
      </div>
    </div>
  )
}
