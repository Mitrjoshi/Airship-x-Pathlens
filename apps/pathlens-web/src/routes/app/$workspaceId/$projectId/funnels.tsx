import { useCreateFunnel, useDeleteFunnel } from '@/mutations/funnels'
import { getFunnelsOptions, type FunnelRange } from '@/queries/funnels'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { getProjectDomainsOptions } from '@/queries/domains'
import { Separator } from '@workspace/ui/components/separator'
import { useRelativeTime } from '@/hooks/use-relative-time'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  EllipsisIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCcwIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Progress } from '@workspace/ui/components/progress'
import { formatDate } from '@/utils/utils'
import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui'

export const Route = createFileRoute('/app/$workspaceId/$projectId/funnels')({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const rangeLocal = localStorage.getItem('range')
  const [range, setRange] = useState<FunnelRange>(
    (rangeLocal || '7d') as FunnelRange
  )
  const [domain, setDomain] = useState('')
  const [liveMode, setLiveMode] = useState(false)

  const {
    data: funnelsData,
    refetch,
    dataUpdatedAt,
    isRefetching,
    isLoading,
  } = useQuery(
    getFunnelsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range: '7d',
      domain: undefined,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const funnels = funnelsData?.data
  const domains = domainsData?.data
  const activeDomain = domain || domains?.[0]?.domain || ''

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const { mutate: createFunnel } = useCreateFunnel()
  const { mutate: deleteFunnel } = useDeleteFunnel()

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <DomainSwitcher
            loading={domainsLoading}
            domain={activeDomain}
            setDomain={setDomain}
            domains={domains!}
            refetch={refetch}
          />

          <Separator orientation="vertical" />

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Last updated {lastUpdated ? lastUpdated : '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-live={liveMode}
            onClick={() => setLiveMode(!liveMode)}
            className="data-[live=true]:bg-primary/20! data-[live=true]:border-primary! data-[live=true]:text-primary! duration-200 data-[live=true]:border-dashed!"
            variant="outline"
          >
            {liveMode ? <PauseIcon /> : <PlayIcon />}
            Live Refresh
          </Button>
          <Button
            disabled={isRefetching}
            onClick={() => {
              refetch()
            }}
            variant="outline"
          >
            <RefreshCcwIcon
              className={`${isRefetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Separator orientation="vertical" />

          <Select
            items={rangeLabels}
            value={range}
            onValueChange={(value) => {
              if (!value) return
              setRange(value as FunnelRange)
              localStorage.setItem('range', value)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {rangeLabels.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">Funnels</p>

            <p className="text-muted-foreground text-sm">
              Track user journeys, analyze conversion rates, and identify where
              visitors drop off.
            </p>
          </div>

          <Button>
            <PlusIcon />
            Create Funnel
          </Button>
        </div>

        <div>
          <div className="grid grid-cols-4 gap-2">
            {isLoading
              ? [...Array(5)].map((_, index) => (
                  <Card
                    className="bg-card/30 rounded-none border-2 border-dashed p-2"
                    key={index}
                  >
                    <CardHeader className="p-0">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-42" />
                    </CardHeader>

                    <CardContent className="flex items-center gap-4 p-0">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </CardContent>
                  </Card>
                ))
              : funnels?.map((item, index) => (
                  <Card
                    key={index}
                    className="bg-card/30 gap-4 rounded-none border-2 border-dashed p-4"
                  >
                    <CardHeader className="flex items-start justify-between p-0">
                      <div className="min-w-0 space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <span className="truncate">{item.name}</span>

                          <span
                            className={cn(
                              'flex items-center gap-1 text-xs font-medium',
                              item.trend === 'up'
                                ? 'text-green-500'
                                : item.trend === 'down'
                                  ? 'text-red-500'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {item.trend === 'up' ? (
                              <TrendingUpIcon className="size-3.5" />
                            ) : item.trend === 'down' ? (
                              <TrendingDownIcon className="size-3.5" />
                            ) : (
                              <MinusIcon className="size-3.5" />
                            )}

                            {item.trendValue}
                          </span>
                        </CardTitle>

                        <CardDescription className="line-clamp-2">
                          {item.description || 'No description provided'}
                        </CardDescription>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button size="icon" variant="ghost">
                              <EllipsisIcon />
                            </Button>
                          }
                        />

                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              deleteFunnel({
                                id: item.id,
                                project_id: projectId,
                                workspace_id: workspaceId,
                              })
                            }
                            variant="destructive"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>

                    <CardContent className="space-y-4 p-0">
                      {/* Conversion Rate */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-muted-foreground text-xs">
                            Conversion rate
                          </p>

                          <p className="text-2xl font-semibold tabular-nums">
                            {item.conversionRate.toFixed(1)}%
                          </p>
                        </div>

                        <Badge variant="secondary">
                          {item.steps.length} steps
                        </Badge>
                      </div>

                      {/* Funnel Steps */}
                      <div className="space-y-3">
                        {item.steps.map((step, stepIndex) => {
                          const firstStepVisitors = item.steps[0]?.visitors ?? 0

                          const progress =
                            firstStepVisitors > 0
                              ? (step.visitors / firstStepVisitors) * 100
                              : 0

                          return (
                            <div key={stepIndex} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-3 text-xs">
                                <div className="flex min-w-0 items-center gap-2">
                                  <span className="text-muted-foreground">
                                    {stepIndex + 1}.
                                  </span>

                                  <span className="truncate font-medium">
                                    {step.name}
                                  </span>
                                </div>

                                <span className="shrink-0 font-medium tabular-nums">
                                  {step.visitors.toLocaleString()}
                                  <span className="text-muted-foreground ml-1 font-normal">
                                    visitors
                                  </span>
                                </span>
                              </div>

                              <Progress
                                value={Math.min(100, Math.max(0, progress))}
                                className="h-1.5"
                              />
                            </div>
                          )
                        })}
                      </div>

                      {/* Footer */}
                      <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
                        <span>Created {formatDate(item.createdAt)}</span>

                        <span>{item.steps.length} funnel steps</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      </div>
    </div>
  )
}
