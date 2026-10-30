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
import { useState } from 'react'
import { ErrorScreen } from '../$workspaceId/$projectId/-components/common/error-screen'

export const Route = createFileRoute('/app/(entry)/usage')({
  component: RouteComponent,
})

function RouteComponent() {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(
    null
  )
  const [selectedProjectId, setSelectedProjectId] = useState('all')

  // Fetch workspaces
  const { data: workspaceData, isPending: workspaceDataLoading } = useQuery(
    getWorkspacesOptions()
  )

  const workspaces = workspaceData?.data ?? []

  // Resolve workspace ID automatically
  const workspaceId =
    workspaces.find((workspace) => String(workspace.id) === selectedWorkspaceId)
      ?.id ??
    workspaces[0]?.id ??
    null

  const resolvedWorkspaceId = workspaceId !== null ? String(workspaceId) : null

  // Fetch projects for selected workspace
  const {
    data: projectsData,
    isFetching: projectsDataLoading,
    isError: projectsError,
  } = useQuery({
    ...getProjectsOptions({
      workspace_id: resolvedWorkspaceId ?? '',
    }),
    enabled: resolvedWorkspaceId !== null,
  })

  const projects = projectsData?.data ?? []

  // Only allow a project ID that belongs to the selected workspace.
  // While projects are loading, default to "all".
  const projectId =
    selectedProjectId === 'all' ||
    !resolvedWorkspaceId ||
    projectsError ||
    projects.some((project) => String(project.id) === selectedProjectId)
      ? selectedProjectId
      : 'all'

  // Fetch usage for selected workspace/project
  const {
    data: usageData,
    isPending: usageDataLoading,
    isError: usageError,
    refetch,
  } = useQuery({
    ...getUsageOptions(
      resolvedWorkspaceId ?? '',
      projectId === 'all' ? undefined : projectId
    ),
    enabled:
      resolvedWorkspaceId !== null &&
      selectedProjectId === projectId &&
      (!projectsDataLoading || projectId === 'all') &&
      !projectsError,
  })

  const usage = usageData?.data

  // Workspace select options
  const workspaceItems = workspaces.map((item) => ({
    label: item.name,
    value: String(item.id),
    external: item.external,
    default: item.isDefault,
  }))

  // Project select options
  const projectItems = [
    {
      label: 'All Projects',
      value: 'all',
    },
    ...projects.map((item) => ({
      label: item.name,
      value: String(item.id),
    })),
  ]

  // Usage statistics
  const calculatePercentage = (
    value?: number | null,
    limit?: number | null
  ): number => {
    if (limit == null || limit <= 0) return 0

    return Math.min(100, ((value ?? 0) / limit) * 100)
  }

  const usageItems = [
    {
      label: 'Page Views',
      value: formatNumber(usage?.usage?.pageViews),
      percentage: calculatePercentage(
        usage?.usage?.pageViews,
        usage?.limits?.pageViews
      ),
      limit: usage?.limits?.pageViews,
    },
    {
      label: 'Events',
      value: formatNumber(usage?.usage?.events),
      percentage: calculatePercentage(
        usage?.usage?.events,
        usage?.limits?.events
      ),
      limit: usage?.limits?.events,
    },
    {
      label: 'Recordings',
      value: formatNumber(usage?.usage?.recordings),
      percentage: calculatePercentage(
        usage?.usage?.recordings,
        usage?.limits?.recordings
      ),
      limit: usage?.limits?.recordings,
    },
    {
      label: 'Storage',
      value: formatBytes(usage?.usage?.storageBytes ?? 0),
      percentage: 0,
      limit: null,
    },
    {
      label: 'Projects',
      value: formatNumber(usage?.usage?.projects),
      percentage: calculatePercentage(
        usage?.usage?.projects,
        usage?.limits?.projects
      ),
      limit: usage?.limits?.projects,
    },
    {
      label: 'Team Members',
      value: formatNumber(usage?.usage?.members),
      percentage: calculatePercentage(
        usage?.usage?.members,
        usage?.limits?.members
      ),
      limit: usage?.limits?.members,
    },
    {
      label: 'Funnels',
      value: formatNumber(usage?.usage?.funnels),
      percentage: calculatePercentage(
        usage?.usage?.funnels,
        usage?.limits?.funnels
      ),
      limit: usage?.limits?.funnels,
    },
    {
      label: 'Goals',
      value: formatNumber(usage?.usage?.goals),
      percentage: calculatePercentage(
        usage?.usage?.goals,
        usage?.limits?.goals
      ),
      limit: usage?.limits?.goals,
    },
    {
      label: 'Workspaces',
      value: formatNumber(usage?.usage?.workspaces),
      percentage: calculatePercentage(
        usage?.usage?.workspaces,
        usage?.limits?.workspaces
      ),
      limit: usage?.limits?.workspaces,
    },
    {
      label: 'Heatmaps',
      value: formatNumber(usage?.usage?.heatmapPages),
      percentage: calculatePercentage(
        usage?.usage?.heatmapPages,
        usage?.limits?.heatmapPages
      ),
      limit: usage?.limits?.heatmapPages,
    },
  ]

  const showUsageSkeleton =
    workspaceDataLoading ||
    (resolvedWorkspaceId !== null &&
      (usageDataLoading ||
        (projectsDataLoading && selectedProjectId !== 'all')))

  return (
    <div>
      <div className="mx-auto w-full max-w-4xl p-6 pt-10">
        <div className="flex items-center justify-between gap-4 pb-5">
          <div>
            <p className="text-xl font-medium">Usage</p>
            <p className="text-muted-foreground text-sm">
              Track your usage and resources.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            {/* Workspace selector */}
            <Select
              items={workspaceItems}
              value={resolvedWorkspaceId}
              onValueChange={(value) => {
                setSelectedWorkspaceId(value)
                setSelectedProjectId('all')
              }}
            >
              <SelectTrigger
                disabled={workspaceDataLoading || workspaces.length === 0}
              >
                <SelectValue placeholder="Select Workspace" />
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false} className="w-fit">
                {workspaceItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
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

            {/* Project selector */}
            <Select
              items={projectItems}
              value={projectId}
              onValueChange={(value) => {
                setSelectedProjectId(value ?? 'all')
              }}
            >
              <SelectTrigger
                disabled={
                  !resolvedWorkspaceId || projectsDataLoading || projectsError
                }
              >
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false}>
                {projectItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Error states */}
        {usageError ? (
          <ErrorScreen refetch={refetch} />
        ) : (
          <>
            {/* Usage statistics */}
            <div className="grid grid-cols-3 gap-2">
              {usageItems.map((item) => (
                <Card
                  key={item.label}
                  className="bg-card/30 rounded-none border-2 border-dashed"
                >
                  <CardHeader>
                    {showUsageSkeleton ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-5 w-20" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="mt-2 h-6 w-16" />
                      </div>
                    ) : (
                      <>
                        <CardDescription className="flex items-center justify-between">
                          {item.label}{' '}
                          <span
                            className="font-medium"
                            style={{
                              color: `hsl(${120 - Math.min(100, Math.max(0, item.percentage)) * 1.2}, 75%, 42%)`,
                            }}
                          >
                            {item.percentage.toFixed(0)}%
                          </span>
                        </CardDescription>
                        <CardTitle className="text-xl">{item.value}</CardTitle>
                      </>
                    )}
                  </CardHeader>
                </Card>
              ))}
            </div>

            {/* Account lifetime access */}
            {usage?.accountLifetimeAccess && (
              <p className="text-muted-foreground mt-10 text-center text-sm">
                Lifetime account access is active. No limits are applied.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
