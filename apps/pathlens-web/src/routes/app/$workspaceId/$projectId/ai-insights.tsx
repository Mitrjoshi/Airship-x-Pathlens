import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/ai-insights'
)({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <div className="mx-auto space-y-6 p-6">
        {/* Heading */}
        <div>
          <p className="text-xl font-medium">AI Insights</p>

          <p className="text-muted-foreground text-sm">
            AI-generated reports and insights from your project data.
          </p>
        </div>

        <div className="mt-40 flex flex-col items-center justify-center space-y-2 text-center">
          <p className="text-lg font-medium">AI Insights is coming soon</p>
          <p className="text-muted-foreground max-w-md text-sm">
            We're working on AI-powered reports to help you uncover trends,
            understand user behavior, and discover actionable insights from your
            project data.
          </p>
        </div>
      </div>
    </div>
  )
}
