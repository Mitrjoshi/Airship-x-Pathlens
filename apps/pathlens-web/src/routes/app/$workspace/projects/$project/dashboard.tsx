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
import { formatNumber } from '@/utils/utils'
import { navigationIcons } from '@/config/navigation-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Eye,
  Globe,
  Laptop,
  MonitorSmartphone,
  Smartphone,
  TrendingDown,
  TrendingUp,
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
} satisfies ChartConfig

const sourceColors = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
]

function formatSignedValue(value: number, suffix: string) {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value}${suffix}`
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

  const { data: dashboardData, isPending } = useQuery(
    getDashboardOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )

  const dashboard = dashboardData?.data
  const devices = dashboard?.devices ?? []
  const sources = dashboard?.trafficSources ?? []
  const insights = dashboard?.insights ?? []
  const topEvents = dashboard?.topEvents ?? []
  const visitorBreakdown = dashboard?.visitorBreakdown ?? {
    new: 0,
    returning: 0,
  }
  const totalVisitors = visitorBreakdown.new + visitorBreakdown.returning
  const newPercent =
    totalVisitors > 0
      ? Math.round((visitorBreakdown.new / totalVisitors) * 100)
      : 0

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
      label: 'Events',
      value: formatNumber(dashboard?.events ?? 0),
      icon: navigationIcons.events,
      change: dashboard?.weeklyChange.events,
    },
    {
      label: 'Page views',
      value: formatNumber(dashboard?.pageViews ?? 0),
      icon: Eye,
      change: dashboard?.weeklyChange.pageViews,
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="Traffic, engagement, and conversion overview."
        />

        <PageToolbar className="justify-end">
          <Select
            value={range}
            onValueChange={(value) => {
              if (value) setRange(value as DashboardRange)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Date range" />
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
              <SelectValue placeholder="Device" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
            </SelectContent>
          </Select>
        </PageToolbar>

        <ProjectMetricStrip className="lg:grid-cols-4">
          {summary.map(({ label, value, icon: Icon, change }) => (
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
                      change.positive ? 'text-emerald-600' : 'text-destructive'
                    }
                  >
                    {change.positive ? '↑' : '↓'}{' '}
                    {formatSignedValue(change.value, '%')} vs previous period
                  </span>
                ) : undefined
              }
            />
          ))}
        </ProjectMetricStrip>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Visitor trend</CardTitle>
              <CardDescription>Unique visitors over time</CardDescription>
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
              <CardTitle>Traffic sources</CardTitle>
              <CardDescription>Top referrers by visitor count</CardDescription>
            </CardHeader>

            <CardContent>
              {isPending ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                      <div className="bg-muted h-1.5 w-full animate-pulse rounded-full" />
                    </div>
                  ))}
                </div>
              ) : sources.length > 0 ? (
                <div className="space-y-4">
                  {sources.map((source, index) => (
                    <div key={source.name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate font-medium">
                          {source.name}
                        </span>
                        <span className="text-muted-foreground ml-3 text-xs">
                          {formatNumber(source.visitors)}
                        </span>
                      </div>
                      <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                        <div
                          className={`h-full rounded-full ${sourceColors[index % sourceColors.length]}`}
                          style={{ width: `${source.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-[120px] items-center justify-center text-sm">
                  No referrer data recorded yet.
                </div>
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
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Audience mix</CardTitle>
              <CardDescription>Device and visitor breakdown</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-4">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
                    Devices
                  </p>
                  {devices.length > 0 ? (
                    devices.map((device) => {
                      const Icon =
                        device.name === 'Mobile'
                          ? Smartphone
                          : device.name === 'Tablet'
                            ? MonitorSmartphone
                            : Laptop

                      return (
                        <div key={device.name}>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2">
                              <Icon className="text-muted-foreground size-4" />
                              {device.name}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {device.value}% · {formatNumber(device.sessions)}{' '}
                              sessions
                            </span>
                          </div>
                          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                            <div
                              className="bg-foreground h-full rounded-full"
                              style={{ width: `${device.value}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      No device data recorded yet.
                    </p>
                  )}
                </div>

                <div className="border-t pt-5 sm:border-t-0 sm:border-l sm:pl-8">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
                    New vs returning
                  </p>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-semibold tracking-tight">
                        {formatNumber(visitorBreakdown.new)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        New visitors
                      </p>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {newPercent}% new
                    </p>
                  </div>
                  <div className="bg-muted mt-5 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-foreground h-full rounded-full"
                      style={{ width: `${newPercent}%` }}
                    />
                  </div>
                  <p className="text-muted-foreground mt-3 text-xs">
                    {formatNumber(visitorBreakdown.returning)} returning
                    visitors
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top events</CardTitle>
              <CardDescription>Most triggered events</CardDescription>
            </CardHeader>

            <CardContent>
              {topEvents.length > 0 ? (
                <div className="space-y-3">
                  {topEvents.map((event) => (
                    <div
                      key={event.name}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <span className="text-sm font-medium">{event.name}</span>
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {formatNumber(event.count)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-[120px] items-center justify-center text-sm">
                  No events triggered yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Key metrics</CardTitle>
            <CardDescription>Session and conversion summary</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-3">
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-sm">Active visitors</span>
                <span className="font-semibold tabular-nums">
                  {formatNumber(dashboard?.liveVisitors ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <span className="text-sm">Avg. session</span>
                  <p
                    className={`mt-1 text-xs ${(dashboard?.avgSessionDurationChange.positive ?? true) ? 'text-emerald-600' : 'text-destructive'}`}
                  >
                    {formatSignedValue(
                      dashboard?.avgSessionDurationChange.value ?? 0,
                      's'
                    )}{' '}
                    vs previous period
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {dashboard?.avgSessionDuration ?? '0s'}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <span className="text-sm">Conversion rate</span>
                  <p
                    className={`mt-1 text-xs ${(dashboard?.conversionRateChange.positive ?? true) ? 'text-emerald-600' : 'text-destructive'}`}
                  >
                    {formatSignedValue(
                      dashboard?.conversionRateChange.value ?? 0,
                      '%'
                    )}{' '}
                    vs previous period
                  </p>
                </div>
                <span className="font-semibold tabular-nums">
                  {dashboard?.conversionRate ?? 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Insights</CardTitle>
              <CardDescription>Trends and anomalies</CardDescription>
            </CardHeader>

            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectPageLayout>
  )
}
