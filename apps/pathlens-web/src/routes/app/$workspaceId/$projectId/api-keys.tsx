import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceByIdOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { NoPermissionView } from './-components/common/no-permission-view'
import { getProjectsOptions } from '@/queries/projects'
import VisitorsLoading from './-components/common/visitors-loading'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/app/$workspaceId/$projectId/api-keys')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()
  const { data, isLoading } = useQuery(getWorkspaceByIdOptions(workspaceId))
  const { data: keysData, isLoading: keysLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    })
  )

  if (isLoading || keysLoading) {
    return <VisitorsLoading />
  }

  if (!data?.data.permissions.includes('project.api_keys.view')) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-medium">API Keys</p>

          <p className="text-muted-foreground text-sm">
            View and monitor all events captured across your project.
          </p>
        </div>

        <Button>Create New API Key</Button>
      </div>

      <div></div>
    </div>
  )
}
