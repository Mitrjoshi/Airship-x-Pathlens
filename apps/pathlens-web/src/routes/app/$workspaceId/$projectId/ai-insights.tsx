import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { NoPermissionView } from './-components/common/no-permission-view'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/ai-insights'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    getWorkspacePermissionsOptions(workspaceId)
  )

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('analytics.ai_insights.view')

  return (
    <div>
      <div className="mx-auto space-y-4 p-6">
        {/* Heading */}
        <div>
          <p className="text-xl font-medium">AI Insights</p>

          <p className="text-muted-foreground text-sm">
            AI-generated reports and insights from your project data.
          </p>
        </div>

        {!hasViewPermission && !permissionsLoading ? (
          <NoPermissionView />
        ) : (
          <>
            <div className="mt-40 flex flex-col items-center justify-center space-y-2 text-center">
              <p className="text-lg font-medium">AI Insights is coming soon</p>
              <p className="text-muted-foreground max-w-md text-sm">
                We're working on AI-powered reports to help you uncover trends,
                understand user behavior, and discover actionable insights from
                your project data.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
