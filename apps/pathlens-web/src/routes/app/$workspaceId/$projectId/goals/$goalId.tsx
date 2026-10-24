import {
  getGoalDashboardOptions,
  type GoalDashboardDevice,
  type GoalRange,
} from '@/queries/goals'
import { getProjectDomainsOptions } from '@/queries/domains'
import { formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowDownRightIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  RefreshCcwIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart } from 'recharts'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { DomainSwitcher } from '../-components/common/domain-switcher'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/goals/$goalId'
)({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const deviceLabels = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const chartConfig = {
  completions: {
    label: 'Completions',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

function RouteComponent() {
  const { workspaceId, projectId, goalId } = Route.useParams()
  const navigate = useNavigate()
  const [range, setRange] = useState<GoalRange>('7d')
  const [device, setDevice] = useState<GoalDashboardDevice>('desktop')
  const [domain, setDomain] = useState('')

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )
  const selectedDomain = domain || domainsData?.data?.[0]?.domain || undefined
  const { data, isLoading, isRefetching, refetch, isError } = useQuery(
    getGoalDashboardOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      goal_id: goalId,
      range,
      device,
      domain: selectedDomain,
    })
  )

  const dashboard = data?.data
  const progress = dashboard
    ? Math.min(
        (dashboard.summary.completions / dashboard.goal.target) * 100,
        100
      )
    : 0

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to goals"
            onClick={() =>
              navigate({
                to: '/app/$workspaceId/$projectId/goals',
                params: { workspaceId, projectId },
              })
            }
          >
            <ArrowLeftIcon />
          </Button>

          <Separator orientation="vertical" />

          {domainsData?.data && domainsData.data.length > 0 && (
            <DomainSwitcher
              loading={domainsLoading}
              domain={selectedDomain ?? ''}
              setDomain={setDomain}
              domains={domainsData.data}
              refetch={refetch}
            />
          )}

          <Separator orientation="vertical" />

          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <p className="truncate text-sm font-medium">
                {dashboard?.goal.name ?? 'Goal dashboard'}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            aria-label="Refresh goal dashboard"
            disabled={isRefetching}
            onClick={() => void refetch()}
          >
            <RefreshCcwIcon className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Separator orientation="vertical" />

          <Select
            items={deviceLabels}
            value={device}
            onValueChange={(value) => {
              if (value) setDevice(value as GoalDashboardDevice)
            }}
          >
            <SelectTrigger className="hidden w-32 sm:flex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {deviceLabels.map((device) => (
                <SelectItem key={device.value} value={device.value}>
                  {device.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={rangeLabels}
            value={range}
            onValueChange={(value) => {
              if (value) setRange(value as GoalRange)
            }}
          >
            <SelectTrigger className="w-32 sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {rangeLabels.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError ? (
        <div className="p-6">
          <Card className="border-destructive bg-destructive/5 rounded-none border-2 border-dashed">
            <CardContent className="p-4 text-sm">
              Unable to load this goal dashboard. Try refreshing the page.
            </CardContent>
          </Card>
        </div>
      ) : (
        <main className="mx-auto space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              {isLoading ? (
                <Skeleton className="h-7 w-48" />
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-medium">
                    {dashboard?.goal.name}
                  </h1>
                  <Badge variant="secondary">{dashboard?.goal.type}</Badge>
                  {dashboard && (
                    <Badge
                      variant={
                        dashboard.summary.status === 'Achieved'
                          ? 'default'
                          : dashboard.summary.status === 'At Risk'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {dashboard.summary.status}
                    </Badge>
                  )}
                </div>
              )}
              <p className="text-muted-foreground text-sm">
                Track performance and conversion for this goal.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Completions"
              value={dashboard?.summary.completions}
              change={dashboard?.summary.trendValue}
              positive={dashboard?.summary.trend !== 'down'}
              loading={isLoading}
            />
            <MetricCard
              label="Unique visitors"
              value={dashboard?.summary.uniqueVisitors}
              loading={isLoading}
            />
            <MetricCard
              label="Unique sessions"
              value={dashboard?.summary.uniqueSessions}
              loading={isLoading}
            />
            <MetricCard
              label="Visitor conversion"
              value={dashboard?.summary.visitorConversionRate}
              suffix="%"
              loading={isLoading}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <Card className="bg-card/30 rounded-none border-2 border-dashed p-0 lg:col-span-2">
              <CardHeader className="p-4 pb-0">
                <CardDescription>Goal completions over time</CardDescription>
                <CardTitle className="text-2xl">
                  {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    `${formatNumber(dashboard?.summary.completions ?? 0)} ${dashboard?.goal.unit}`
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 pt-4">
                {isLoading ? (
                  <Skeleton className="h-52 w-full rounded-none" />
                ) : dashboard?.trend.length ? (
                  <ChartContainer config={chartConfig} className="h-52 w-full">
                    <AreaChart data={dashboard.trend}>
                      <defs>
                        <linearGradient
                          id="goal-completions-gradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="var(--color-completions)"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="var(--color-completions)"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="completions"
                        dot={false}
                        fill="url(#goal-completions-gradient)"
                        stroke="var(--color-completions)"
                        strokeWidth={1.5}
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <EmptyState />
                )}
              </CardContent>
            </Card>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardHeader className="p-4 pb-2">
                <CardDescription>Progress toward target</CardDescription>
                <CardTitle className="text-2xl">
                  {isLoading ? (
                    <Skeleton className="h-8 w-32" />
                  ) : (
                    `${Math.round(progress)}%`
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-2">
                <div className="bg-muted h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-muted-foreground flex justify-between text-sm">
                  <span>
                    {formatNumber(dashboard?.summary.completions ?? 0)}{' '}
                    completed
                  </span>
                  <span>
                    {formatNumber(dashboard?.goal.target ?? 0)}{' '}
                    {dashboard?.goal.unit}
                  </span>
                </div>
                {dashboard?.goal.deadline && (
                  <p className="text-muted-foreground text-sm">
                    Deadline:{' '}
                    {new Date(dashboard.goal.deadline).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <BreakdownCard
              title="Devices"
              data={dashboard?.breakdowns.devices}
              loading={isLoading}
            />
            <BreakdownCard
              title="Browsers"
              data={dashboard?.breakdowns.browsers}
              loading={isLoading}
            />
            <BreakdownCard
              title="Operating systems"
              data={dashboard?.breakdowns.operatingSystems}
              loading={isLoading}
            />
            <BreakdownCard
              title="Countries"
              data={dashboard?.breakdowns.countries}
              loading={isLoading}
            />
            <BreakdownCard
              title="Sources"
              data={dashboard?.breakdowns.sources}
              loading={isLoading}
            />
            <BreakdownCard
              title="Top pages"
              data={dashboard?.breakdowns.pages}
              loading={isLoading}
            />
          </div>

          <Card className="bg-card/30 rounded-none border-2 border-dashed p-2">
            <CardHeader className="p-0 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>Recent completions</CardDescription>
                <span className="text-muted-foreground text-xs">
                  {dashboard?.range.value}
                </span>
              </div>
            </CardHeader>
            <CardContent className="divide-border divide-y p-0">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="my-3 h-5 w-full" />
                ))
              ) : dashboard?.recentCompletions.length ? (
                dashboard.recentCompletions
                  .slice(0, 8)
                  .map((completion, index) => (
                    <div
                      key={`${completion.occurredAt}-${index}`}
                      className="grid grid-cols-2 gap-3 py-3 text-sm md:grid-cols-5"
                    >
                      <span className="text-muted-foreground">
                        {new Date(completion.occurredAt).toLocaleString()}
                      </span>
                      <span className="truncate">{completion.path ?? '/'}</span>
                      <span className="truncate">{completion.source}</span>
                      <span className="text-muted-foreground">
                        {[completion.city, completion.country]
                          .filter(Boolean)
                          .join(', ') || 'Unknown location'}
                      </span>
                      <span className="text-right font-medium">
                        {completion.revenue > 0
                          ? completion.revenue
                          : (completion.device ?? 'Completed')}
                      </span>
                    </div>
                  ))
              ) : (
                <EmptyState />
              )}
            </CardContent>
          </Card>
        </main>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  suffix,
  change,
  positive,
  loading,
}: {
  label: string
  value?: number
  suffix?: string
  change?: string
  positive?: boolean
  loading: boolean
}) {
  return (
    <Card className="bg-card/30 rounded-none border-2 border-dashed p-0">
      <CardHeader className="flex items-start justify-between p-4 pb-2">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="flex items-end gap-2 text-3xl">
            {loading ? (
              <Skeleton className="h-9 w-28" />
            ) : (
              <>
                {formatNumber(value ?? 0)}
                {suffix && <span className="text-lg">{suffix}</span>}
              </>
            )}
          </CardTitle>
        </div>
        {!loading && change && (
          <div className={positive ? 'text-primary' : 'text-destructive'}>
            {positive ? (
              <ArrowUpRightIcon size={14} />
            ) : (
              <ArrowDownRightIcon size={14} />
            )}
            <p className="text-xs">{change}</p>
          </div>
        )}
      </CardHeader>
    </Card>
  )
}

function BreakdownCard({
  title,
  data = [],
  loading,
}: {
  title: string
  data?: { name: string; completions: number }[]
  loading: boolean
}) {
  const max = Math.max(...data.map((item) => item.completions), 1)

  return (
    <Card className="bg-card/30 gap-2 rounded-none border-2 border-dashed p-2">
      <CardHeader className="p-0">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent className="max-h-50 overflow-auto p-0">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-4 w-full" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-4">
            {data.slice(0, 5).map((item) => (
              <div
                key={item.name}
                className="grid grid-cols-[1fr_25%_5%] items-center gap-2"
              >
                <p className="truncate text-sm font-medium">{item.name}</p>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full"
                    style={{ width: `${(item.completions / max) * 100}%` }}
                  />
                </div>
                <p className="text-right text-sm font-medium">
                  {formatNumber(item.completions)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="flex h-24 items-center justify-center">
      <p className="text-muted-foreground text-sm">No Data Available</p>
    </div>
  )
}
