import { getCampaignsOptions } from '@/queries/campaigns'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/campaigns')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const { data, isLoading } = useQuery(
    getCampaignsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range: '90d',
      device: 'all',
      goal_id: undefined,
      page: 1,
      page_size: 50,
    })
  )

  return <div>Hello "/app/$workspaceId/$projectId/campaigns"!</div>
}
