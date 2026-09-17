import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
  PageToolbar,
} from '@/components/common/project-page'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  getDashboardOptions,
  type DashboardRange,
  type DashboardDevice,
} from '@/queries/dashboard'
import { getEventsOptions } from '@/queries/events'
import { getPerformanceOptions } from '@/queries/performance'
import { formatNumber, formatRelativeTime } from '@/utils/utils'
import { navigationIcons } from '@/config/navigation-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { cn } from '@workspace/ui/lib/utils'
import { Button } from '@workspace/ui/components/button'
import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Eye,
  Gauge,
  Globe,
  Laptop,
  MonitorSmartphone,
  Radio,
  RefreshCw,
  Smartphone,
  Timer,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/dashboard'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Dashboard',
  },
})

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--chart-1)',
  },
  sessions: {
    label: 'Sessions',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const rangeLabels: Record<DashboardRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const deviceLabels: Record<DashboardDevice, string> = {
  all: 'All Devices',
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
}

function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

function formatSignedValue(value: number, suffix: string) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}${suffix}`
}

function DeviceIcon({ name }: { name: string }) {
  if (name === 'Mobile')
    return <Smartphone className="text-muted-foreground h-4 w-4" />
  if (name === 'Tablet')
    return <MonitorSmartphone className="text-muted-foreground h-4 w-4" />
  return <Laptop className="text-muted-foreground h-4 w-4" />
}

function InsightIcon({ text }: { text: string }) {
  const lower = text.toLowerCase()
  if (
    lower.includes('top') ||
    lower.includes('most') ||
    lower.includes('highest')
  )
    return <TrendingUp className="size-4 shrink-0 text-emerald-600" />
  if (
    lower.includes('bounce') ||
    lower.includes('drop') ||
    lower.includes('low')
  )
    return <TrendingDown className="text-destructive size-4 shrink-0" />
  return <Globe className="text-muted-foreground size-4 shrink-0" />
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<DashboardRange>('7d')
  const [device, setDevice] = useState<DashboardDevice>('all')

  const {
    data: dashboardData,
    isPending,
    isFetching,
    refetch,
  } = useQuery(
    getDashboardOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )

  const { data: perfData } = useQuery(
    getPerformanceOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )

  const { data: eventsData } = useQuery(
    getEventsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      category: 'all',
      device: 'all',
      page: 1,
      page_size: 6,
    })
  )

  const dashboard = dashboardData?.data
  const insights = dashboard?.insights ?? []
  const topEvents = dashboard?.topEvents ?? []
  const topEventCount = topEvents[0]?.count ?? 1
  const recentEvents = eventsData?.data.events ?? []
  const perf = perfData?.data

  const summary = [
    {
      label: 'Visitors',
      value: formatNumber(dashboard?.visitors ?? 0),
      icon: navigationIcons.visitors,
      change: dashboard?.weeklyChange.visitors,
    },
    {
      label: 'Sessions',
      value: formatNumber(dashboard?.sessions ?? 0),
      icon: navigationIcons.sessions,
      change: dashboard?.weeklyChange.sessions,
    },
    {
      label: 'Page views',
      value: formatNumber(dashboard?.pageViews ?? 0),
      icon: Eye,
      change: dashboard?.weeklyChange.pageViews,
    },
    {
      label: 'Conversion rate',
      value: `${dashboard?.conversionRate ?? 0}%`,
      icon: CheckCircle2,
      change: dashboard?.conversionRateChange,
      suffix: ' pp',
    },
    {
      label: 'Avg. session duration',
      value: dashboard?.avgSessionDuration ?? '0s',
      icon: Clock3,
      change: dashboard?.avgSessionDurationChange,
    },
    {
      label: 'Bounce rate',
      value: `${dashboard?.bounceRate ?? 0}%`,
      icon: Globe,
      change: dashboard?.bounceRateChange,
      inverted: true,
    },
  ]

  const perfRows = [
    { label: 'TTFB', value: formatMs(perf?.summary.avgTtfb ?? 0), icon: Zap },
    {
      label: 'DOM loaded',
      value: formatMs(perf?.summary.avgDomLoaded ?? 0),
      icon: Timer,
    },
    {
      label: 'Page load',
      value: formatMs(perf?.summary.avgLoad ?? 0),
      icon: Gauge,
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="A fast read on growth, content, and conversion signals."
          actions={
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')}
              />
              Refresh
            </Button>
          }
        />

        <PageToolbar>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="bg-foreground size-1.5 rounded-full" />
            Executive overview ·{' '}
            {range === '24h'
              ? 'last 24 hours'
              : `last ${range.replace('d', ' days')}`}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as DashboardRange)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Date range">
                  {rangeLabels[range]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={device}
              onValueChange={(value) => {
                if (value) setDevice(value as DashboardDevice)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Device">
                  {deviceLabels[device]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        <ProjectMetricStrip className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {summary.map((stat) => {
            const { label, value, icon: Icon, change } = stat

            return (
              <ProjectMetric
                key={label}
                label={label}
                value={value}
                icon={Icon}
                isLoading={isPending}
                detail={
                  change ? (
                    <span
                      className={
                        (stat.inverted ? !change.positive : change.positive)
                          ? 'text-emerald-600'
                          : 'text-destructive'
                      }
                    >
                      {change.value >= 0 ? '↑' : '↓'}{' '}
                      {formatSignedValue(
                        change.value,
                        'suffix' in stat && stat.suffix ? stat.suffix : '%'
                      )}{' '}
                      vs previous period
                    </span>
                  ) : undefined
                }
              />
            )
          })}
        </ProjectMetricStrip>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Traffic trend</CardTitle>
              <CardDescription>
                Visitors and sessions across the selected period
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isPending ? (
                <div className="bg-muted h-[320px] animate-pulse rounded-lg" />
              ) : dashboard?.visitorsChart.length ? (
                <ChartContainer
                  config={chartConfig}
                  className="h-[320px] w-full"
                >
                  <AreaChart data={dashboard.visitorsChart}>
                    <defs>
                      <linearGradient
                        id="fillVisitors"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-visitors)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-visitors)"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      fill="url(#fillVisitors)"
                      stroke="var(--color-visitors)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      fill="var(--color-sessions)"
                      fillOpacity={0.15}
                      stroke="var(--color-sessions)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="text-muted-foreground flex h-[320px] items-center justify-center text-sm">
                  No traffic data for this period.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time</CardTitle>
              <CardDescription>Who is active right now</CardDescription>
            </CardHeader>

            <CardContent className="flex h-full flex-col justify-between gap-6">
              {isPending ? (
                <div className="bg-muted h-24 animate-pulse rounded-lg" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Radio className="text-muted-foreground size-4" />
                      Active visitors
                    </span>
                    <span className="text-lg font-semibold tracking-tight tabular-nums">
                      {formatNumber(dashboard?.liveVisitors ?? 0)}
                    </span>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-xs">
                      Recent activity
                    </p>
                    <div className="mt-3 space-y-3">
                      {recentEvents.length > 0 ? (
                        recentEvents.map((event) => (
                          <div
                            key={event.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {event.description}
                              </p>
                              <p className="text-muted-foreground truncate text-xs">
                                {event.path}
                              </p>
                            </div>
                            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                              {formatRelativeTime(event.occurredAt)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No recent activity yet.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Top pages</CardTitle>
            <CardDescription>Most visited pages</CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">Page</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead className="pr-5">Avg. time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.pages.length ? (
                    dashboard.pages.map((page) => (
                      <TableRow key={page.page}>
                        <TableCell className="max-w-[300px] truncate pl-5 font-medium">
                          {page.page ?? '/'}
                        </TableCell>
                        <TableCell>{formatNumber(page.views)}</TableCell>
                        <TableCell className="pr-5 tabular-nums">
                          {page.duration}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-muted-foreground py-10 text-center"
                      >
                        No pages tracked yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </ProjectPanel>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Traffic sources</CardTitle>
              <CardDescription>Where your visitors come from</CardDescription>
            </CardHeader>

            <CardContent>
              {isPending ? (
                <div className="bg-muted h-32 animate-pulse rounded-lg" />
              ) : dashboard?.trafficSources.length ? (
                <div className="space-y-4">
                  {dashboard.trafficSources.map((source) => (
                    <div key={source.name}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="truncate font-medium">
                          {source.name}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatNumber(source.visitors)}
                        </span>
                      </div>
                      <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-foreground h-full rounded-full"
                          style={{
                            width: `${Math.max(source.value, 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                  No traffic sources yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audience snapshot</CardTitle>
              <CardDescription>Device mix of your audience</CardDescription>
            </CardHeader>

            <CardContent>
              {isPending ? (
                <div className="bg-muted h-32 animate-pulse rounded-lg" />
              ) : dashboard?.devices.length ? (
                <div className="space-y-2">
                  {dashboard.devices.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <DeviceIcon name={d.name} />
                        {d.name}
                      </div>
                      <span className="text-muted-foreground">{d.value}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                  No device data yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance snapshot</CardTitle>
              <CardDescription>Technical health at a glance</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                {perfRows.map((row) => {
                  const Icon = row.icon

                  return (
                    <div
                      key={row.label}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="text-muted-foreground h-4 w-4" />
                        {row.label}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {row.value}
                      </span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Conversion snapshot</CardTitle>
              <CardDescription>
                Outcome signal from tracked sessions
              </CardDescription>
            </CardHeader>

            <CardContent className="flex h-full flex-col justify-between gap-8">
              {isPending ? (
                <div className="bg-muted h-24 animate-pulse rounded-lg" />
              ) : (
                <>
                  <div>
                    <div className="flex items-end justify-between gap-4">
                      <span className="text-5xl font-semibold tracking-[-0.06em]">
                        {dashboard?.conversionRate ?? 0}%
                      </span>
                      <span
                        className={
                          dashboard?.conversionRateChange.positive
                            ? 'text-emerald-600'
                            : 'text-destructive'
                        }
                      >
                        <ArrowUpRight className="mr-1 inline size-4" />
                        {formatSignedValue(
                          dashboard?.conversionRateChange.value ?? 0,
                          ' pp'
                        )}
                      </span>
                    </div>
                    <div className="bg-muted mt-5 h-2 overflow-hidden rounded-full">
                      <div
                        className="bg-foreground h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(dashboard?.conversionRate ?? 0, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="text-muted-foreground mt-3 text-xs leading-5">
                      Sessions with a form submission or custom conversion
                      event.
                    </p>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-xs">Top action</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                      <span className="bg-foreground size-1.5 rounded-full" />
                      {topEvents[0]?.name ?? 'No high-signal action yet'}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>High-signal actions</CardTitle>
              <CardDescription>
                Most-triggered actions worth investigating
              </CardDescription>
            </CardHeader>

            <CardContent>
              {topEvents.length > 0 ? (
                <div className="space-y-4">
                  {topEvents.map((event, index) => (
                    <div key={event.name}>
                      <div className="flex items-center justify-between gap-4 text-sm">
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="text-muted-foreground w-4 text-right text-xs tabular-nums">
                            {index + 1}
                          </span>
                          <span className="truncate font-medium">
                            {event.name}
                          </span>
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                          {formatNumber(event.count)}
                        </span>
                      </div>
                      <div className="bg-muted mt-2 ml-7 h-1.5 overflow-hidden rounded-full">
                        <div
                          className="bg-foreground h-full rounded-full"
                          style={{
                            width: `${Math.max((event.count / topEventCount) * 100, 4)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                  No high-signal actions recorded yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI insights</CardTitle>
              <CardDescription>
                Signals to take into your next review
              </CardDescription>
            </CardHeader>

            <CardContent>
              {insights.length > 0 ? (
                <div className="space-y-3">
                  {insights.map((insight) => (
                    <div
                      key={insight}
                      className="flex items-start gap-3 rounded-lg border p-3"
                    >
                      <InsightIcon text={insight} />
                      <p className="text-muted-foreground text-sm leading-6">
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                  More decision cues will appear as traffic accumulates.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectPageLayout>
  )
}
