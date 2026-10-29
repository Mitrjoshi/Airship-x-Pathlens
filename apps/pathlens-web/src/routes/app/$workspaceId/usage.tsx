import { getProjectsOptions } from '@/queries/projects'
import { getUsageOptions } from '@/queries/usage'
import { formatBytes, formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useState } from 'react'
import { NoPermissionView } from './$projectId/-components/common/no-permission-view'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'

export const Route = createFileRoute('/app/$workspaceId/usage')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()

  const [projectId, setProjectId] = useState('all')

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    getWorkspacePermissionsOptions(workspaceId)
  )

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('workspace.usage.view')
  const hasViewProjectsPermission = permissions?.includes('projects.view')

  const { data: projectsData, isLoading: projectsDataLoading } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId,
    }),
    enabled: !!hasViewProjectsPermission,
  })

  const { data: usageData, isLoading: usageDataLoading } = useQuery({
    ...getUsageOptions(
      workspaceId,
      projectId === 'all' ? undefined : projectId
    ),
    enabled: !!hasViewPermission,
  })

  const usage = usageData?.data
  const projects = projectsData?.data

  const usageItems = [
    { label: 'Page Views', value: formatNumber(usage?.usage?.pageViews) },
    { label: 'Events', value: formatNumber(usage?.usage?.events) },
    { label: 'Recordings', value: formatNumber(usage?.usage?.recordings) },
    {
      label: 'Storage',
      value: usage?.usage?.storageBytes
        ? formatBytes(usage?.usage?.storageBytes as number)
        : '0B',
    },
    { label: 'Projects', value: formatNumber(usage?.usage?.projects) },
    { label: 'Members', value: formatNumber(usage?.usage?.members) },
    { label: 'Funnels', value: formatNumber(usage?.usage?.funnels) },
    { label: 'Goals', value: formatNumber(usage?.usage?.goals) },
    { label: 'Workspaces', value: formatNumber(usage?.usage?.workspaces) },
    { label: 'Heatmap Pages', value: formatNumber(usage?.usage?.heatmapPages) },
  ]

  const projectItems = [
    {
      label: 'All Projects',
      value: 'all',
    },
    ...(projects?.map((item) => ({
      label: item.name,
      value: String(item.id),
    })) ?? []),
  ]

  return (
    <div>
      <div className="mx-auto max-w-4xl p-6 pt-10">
        <div className="flex items-center justify-between space-y-4">
          <div>
            <p className="text-xl font-medium">Usage</p>
          </div>

          <Select
            disabled={!hasViewPermission || !hasViewProjectsPermission}
            items={projectItems}
            value={projectId}
            onValueChange={(value) => {
              setProjectId(value ?? 'all')
            }}
          >
            <SelectTrigger disabled={projectsDataLoading || usageDataLoading}>
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>

            <SelectContent alignItemWithTrigger={false}>
              {projectItems?.map((item, index) => (
                <SelectItem key={index} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!hasViewPermission && !permissionsLoading ? (
          <NoPermissionView />
        ) : (
          <>
            <div>
              <div className="grid grid-cols-3 gap-2">
                {usageItems?.map((item, index) => (
                  <Card
                    key={index}
                    className="bg-card/30 rounded-none border-2 border-dashed"
                  >
                    <CardHeader>
                      {usageDataLoading ? (
                        <div>
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="mt-2 h-7 w-16" />
                        </div>
                      ) : (
                        <>
                          <CardDescription>{item.label}</CardDescription>
                          <CardTitle className="text-xl">
                            {item.value}
                          </CardTitle>
                        </>
                      )}
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {usage?.accountLifetimeAccess && (
                <p className="text-muted-foreground mt-10 text-center text-sm">
                  Lifetime account access is active. No limits are applied.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
