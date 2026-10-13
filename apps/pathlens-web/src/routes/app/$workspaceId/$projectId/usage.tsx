import { getUsageOptions } from '@/queries/usage'
import { formatBytes, formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { SparklesIcon } from 'lucide-react'

export const Route = createFileRoute('/app/$workspaceId/$projectId/usage')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const { data: usageData, isLoading: usageLoading } = useQuery(
    getUsageOptions(workspaceId, projectId)
  )

  const usage = usageData?.data?.usage
  const limits = usageData?.data?.limits

  const usageItems = [
    {
      key: 'pageViews',
      label: 'Page Views',
      value: formatNumber(usage?.pageViews ?? 0),
      limit: limits?.pageViews,
      format: formatNumber,
    },
    {
      key: 'events',
      label: 'Events',
      value: formatNumber(usage?.events ?? 0),
      limit: limits?.events,
      format: formatNumber,
    },
    {
      key: 'recordings',
      label: 'Recordings',
      value: formatNumber(usage?.recordings ?? 0),
      limit: limits?.recordings,
      format: formatNumber,
    },
    {
      key: 'storageBytes',
      label: 'Storage',
      value: formatBytes(usage?.storageBytes ?? 0),
      limit: undefined,
      format: formatBytes,
    },
    {
      key: 'funnels',
      label: 'Funnels',
      value: formatNumber(usage?.funnels ?? 0),
      limit: limits?.funnels,
      format: formatNumber,
    },
    {
      key: 'goals',
      label: 'Goals',
      value: formatNumber(usage?.goals ?? 0),
      limit: limits?.goals,
      format: formatNumber,
    },
    {
      key: 'heatmapPages',
      label: 'Heatmap Pages',
      value: formatNumber(usage?.heatmapPages ?? 0),
      limit: limits?.heatmapPages,
      format: formatNumber,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xl font-medium">Usage</p>
        <p className="text-muted-foreground text-sm">
          Monitor your project usage, limits, and resource consumption.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {usageLoading
          ? usageItems?.map((_, index) => (
              <Card
                key={index}
                className="bg-card/30 rounded-none border-2 border-dashed"
              >
                <CardHeader>
                  <div>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-2 h-7 w-16" />
                  </div>
                </CardHeader>

                <div className="px-4">
                  <Skeleton className="h-1.5 w-full" />
                </div>
              </Card>
            ))
          : usageData?.data?.accountLifetimeAccess
            ? usageItems?.map((item, index) => (
                <Card
                  key={index}
                  className="bg-card/30 rounded-none border-2 border-dashed"
                >
                  <CardHeader>
                    <CardDescription>{item.label}</CardDescription>
                    <CardTitle className="text-xl">{item.value}</CardTitle>
                  </CardHeader>
                </Card>
              ))
            : usageItems.map((item) => {
                const hasLimit = item.limit != null && item.limit > 0

                const percentage = hasLimit
                  ? Math.min((item.value / item.limit!) * 100, 100)
                  : 0

                return (
                  <Card
                    key={item.key}
                    className="bg-card/30 rounded-none border-2 border-dashed"
                  >
                    <CardHeader>
                      <CardDescription>{item.label}</CardDescription>
                      <CardTitle className="text-2xl">
                        {item.format(item.value)}
                        {hasLimit && (
                          <span className="text-muted-foreground text-sm font-normal">
                            {' '}
                            / {item.format(item.limit!)} (
                            {percentage.toFixed(1)}
                            %)
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      {hasLimit && <Progress value={percentage} />}
                    </CardContent>
                  </Card>
                )
              })}
      </div>

      {!usageLoading && (
        <div className="">
          {!usageData?.data?.accountLifetimeAccess ? (
            <Button>
              <SparklesIcon />
              Upgrade to Pro
            </Button>
          ) : (
            <p className="text-muted-foreground text-sm">
              Lifetime account access is active. No limits are applied.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
