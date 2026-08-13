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
  ArrowUpRight,
  CheckCircle2,
  Eye,
  Globe,
  Radio,
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
  const insights = dashboard?.insights ?? []
  const topEvents = dashboard?.topEvents ?? []
  const topEventCount = topEvents[0]?.count ?? 1

  const summary = [
    {
      label: 'Visitors',
      value: formatNumber(dashboard?.visitors ?? 0),
      icon: navigationIcons.visitors,
      change: dashboard?.weeklyChange.visitors,
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
      label: 'Live visitors',
      value: formatNumber(dashboard?.liveVisitors ?? 0),
      icon: Radio,
      detail: 'Active in the last 5 minutes',
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="A fast read on growth, content, and conversion signals."
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
          </div>
        </PageToolbar>

        <ProjectMetricStrip className="lg:grid-cols-4">
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
                  'detail' in stat ? (
                    stat.detail
                  ) : change ? (
                    <span
                      className={
                        change.positive
                          ? 'text-emerald-600'
                          : 'text-destructive'
                      }
                    >
                      {change.positive ? '↑' : '↓'}{' '}
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
              <CardTitle>Growth pulse</CardTitle>
              <CardDescription>
                Unique visitors across the selected period
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
              <CardTitle>Decision cues</CardTitle>
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
