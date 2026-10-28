import { getProjectsOptions } from '@/queries/projects'
import { getUsageOptions } from '@/queries/usage'
import { getWorkspacesOptions } from '@/queries/workspace'
import { formatBytes, formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
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
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/app/(entry)/usage')({
  component: RouteComponent,
})

function RouteComponent() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState('all')

  const { data: workspaceData, isLoading: workspaceDataLoading } = useQuery(
    getWorkspacesOptions()
  )

  const { data: projectsData, isFetching: projectsDataLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId!,
    })
  )

  const { data: usageData, isLoading: usageDataLoading } = useQuery(
    getUsageOptions(workspaceId!, projectId === 'all' ? undefined : projectId)
  )

  useEffect(() => {
    if (workspaceData && workspaceData.data.length > 0) {
      setWorkspaceId(workspaceData.data[0].id)
    }
  }, [workspaceData])

  const workspace = workspaceData?.data
  const projects = projectsData?.data
  const usage = usageData?.data

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

  const workspaceItems = [
    ...(workspace?.map((item) => ({
      label: item.name,
      value: String(item.id),
      external: item.external,
      default: item.isDefault,
    })) ?? []),
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
      <div className="mx-auto w-full max-w-4xl pt-10">
        <div className="flex items-center justify-between space-y-5">
          <div>
            <p className="text-xl font-medium">Usage</p>
            <p className="text-muted-foreground text-sm">
              Track your usage and resources.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Select
              items={workspaceItems}
              value={workspaceId}
              onValueChange={(value) => {
                setWorkspaceId(value ?? 'all')
              }}
            >
              <SelectTrigger
                disabled={workspaceDataLoading || usageDataLoading}
              >
                <SelectValue />
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false} className={'w-fit'}>
                {workspaceItems?.map((item, index) => (
                  <SelectItem key={index} value={item.value}>
                    {item.label}

                    {item.external ? (
                      <Badge variant="secondary">External</Badge>
                    ) : (
                      item.default && <Badge variant="secondary">Default</Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
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
        </div>

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
                    <CardTitle className="text-xl">{item.value}</CardTitle>
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
    </div>
  )
}
