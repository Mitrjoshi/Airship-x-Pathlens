import {
  getAnalyticsOptions,
  type AnalyticsDevice,
  type AnalyticsRange,
} from '@/queries/analytics'
import { getDashboardOptions } from '@/queries/dashboard'
import { getFunnelsOptions, type FunnelRange } from '@/queries/funnels'
import { getGoalsOptions, type GoalRange } from '@/queries/goals'
import { getHeatmapsOptions } from '@/queries/heatmaps'
import { getRetentionOptions, type DashboardScope } from '@/queries/dashboards'
import type {
  DashboardMetric,
  DashboardRange,
  DashboardWidget,
  DashboardWidgetConfig,
} from '@workspace/contracts'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatNumber } from '@/utils/utils'
import type { DashboardWidgetInteractionProps } from './dashboard-grid'

const metricLabels: Record<DashboardMetric, string> = {
  visitors: 'Visitors',
  sessions: 'Sessions',
  pageViews: 'Page views',
  events: 'Events',
  avgSessionDuration: 'Avg. session duration',
  conversionRate: 'Conversion rate',
  liveVisitors: 'Live visitors',
}

const widgetLabels: Record<DashboardWidgetConfig['type'], string> = {
  metric: 'Metric',
  line: 'Line chart',
  bar: 'Bar chart',
  funnel: 'Funnel',
  table: 'Table',
  heatmap: 'Heatmap',
  conversion: 'Conversion',
  retention: 'Retention',
}

const lineChartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--chart-1)',
  },
  sessions: {
    label: 'Sessions',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

const barChartConfig = {
  value: {
    label: 'Visitors',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig

interface WidgetContentProps {
  config: DashboardWidgetConfig
  scope: DashboardScope
  range: DashboardRange
  device: AnalyticsDevice
}

interface DashboardWidgetCardProps {
  widget: DashboardWidget
  scope: DashboardScope
  range: DashboardRange
  device: AnalyticsDevice
  canManage: boolean
  interaction: DashboardWidgetInteractionProps
  onEdit: () => void
  onDelete: () => void
}

function rangeForAnalytics(range: DashboardRange): AnalyticsRange {
  return range
}

function rangeForFunnel(range: DashboardRange): FunnelRange {
  return range
}

function rangeForGoal(range: DashboardRange): GoalRange {
  return range
}

function EmptyWidget({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground flex min-h-36 items-center justify-center text-center text-sm">
      {children}
    </div>
  )
}

function LoadingWidget() {
  return <div className="bg-muted h-36 animate-pulse rounded-lg" />
}

function MetricWidget({
  config,
  scope,
  range,
  device,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'metric' }>
}) {
  const { data, isPending } = useQuery(
    getDashboardOptions({
      ...scope,
      range,
      device,
    })
  )
  const dashboard = data?.data

  if (isPending) return <LoadingWidget />
  if (!dashboard) return <EmptyWidget>No data for this period.</EmptyWidget>

  const value = dashboard[config.metric]
  const displayValue =
    config.metric === 'conversionRate'
      ? `${value}%`
      : config.metric === 'avgSessionDuration'
        ? value
        : typeof value === 'number'
          ? formatNumber(value)
          : value

  return (
    <div className="flex min-h-36 flex-col justify-between gap-5">
      <div>
        <p className="text-muted-foreground text-xs tracking-[0.18em] uppercase">
          {metricLabels[config.metric]}
        </p>
        <p className="mt-3 text-4xl font-semibold tracking-[-0.06em]">
          {displayValue}
        </p>
      </div>
      <p className="text-muted-foreground text-xs">
        {range === '24h'
          ? 'Last 24 hours'
          : `Last ${range.replace('d', ' days')}`}
      </p>
    </div>
  )
}

function LineChartWidget({
  config,
  scope,
  range,
  device,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'line' }>
}) {
  const { data, isPending } = useQuery(
    getAnalyticsOptions({
      ...scope,
      range: rangeForAnalytics(range),
      device,
    })
  )

  if (isPending) return <LoadingWidget />
  if (!data?.data.traffic.length) {
    return <EmptyWidget>No traffic data for this period.</EmptyWidget>
  }

  return (
    <ChartContainer config={lineChartConfig} className="h-44 w-full">
      <LineChart data={data.data.traffic}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis tickLine={false} axisLine={false} width={34} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey={config.metric}
          stroke={`var(--color-${config.metric})`}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  )
}

function BarChartWidget({
  config,
  scope,
  range,
  device,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'bar' }>
}) {
  const { data, isPending } = useQuery(
    getAnalyticsOptions({
      ...scope,
      range: rangeForAnalytics(range),
      device,
    })
  )

  if (isPending) return <LoadingWidget />

  const analytics = data?.data
  const rows =
    config.dimension === 'devices'
      ? (analytics?.devices ?? []).map((item) => ({
          name: item.name,
          value: item.value,
        }))
      : config.dimension === 'referrers'
        ? (analytics?.referrers ?? []).map((item) => ({
            name: item.name,
            value: item.visitors,
          }))
        : config.dimension === 'countries'
          ? (analytics?.countries ?? []).map((item) => ({
              name: item.code,
              value: item.visitors,
            }))
          : (analytics?.browsers ?? []).map((item) => ({
              name: item.name,
              value: item.visitors,
            }))

  if (!rows.length) return <EmptyWidget>No breakdown data yet.</EmptyWidget>

  return (
    <ChartContainer config={barChartConfig} className="h-44 w-full">
      <BarChart data={rows} layout="vertical" margin={{ left: 4, right: 8 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          width={78}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  )
}

function FunnelWidget({
  config,
  scope,
  range,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'funnel' }>
}) {
  const { data, isPending } = useQuery(
    getFunnelsOptions({
      ...scope,
      range: rangeForFunnel(range),
    })
  )
  const funnel = data?.data.find((item) => item.id === config.funnelId)

  if (isPending) return <LoadingWidget />
  if (!funnel)
    return <EmptyWidget>Choose a funnel to see its steps.</EmptyWidget>

  const maximum = funnel.steps[0]?.visitors || 1

  return (
    <div className="space-y-3">
      {funnel.steps.map((step) => (
        <div key={`${step.name}-${step.target}`} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate font-medium">{step.name}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">
              {formatNumber(step.visitors)}
            </span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{
                width: `${Math.max((step.visitors / maximum) * 100, 3)}%`,
              }}
            />
          </div>
        </div>
      ))}
      <p className="text-muted-foreground pt-1 text-xs">
        {funnel.conversionRate}% overall conversion
      </p>
    </div>
  )
}

interface TableRowData {
  label: string
  value: string
  secondary?: string
}

function TableWidget({
  config,
  scope,
  range,
  device,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'table' }>
}) {
  const { data: dashboardData, isPending: dashboardPending } = useQuery(
    getDashboardOptions({ ...scope, range, device })
  )
  const { data: analyticsData, isPending: analyticsPending } = useQuery(
    getAnalyticsOptions({
      ...scope,
      range: rangeForAnalytics(range),
      device,
    })
  )

  const rows: TableRowData[] =
    config.source === 'pages'
      ? (dashboardData?.data.pages ?? []).map((item) => ({
          label: item.page ?? '/',
          value: formatNumber(item.views),
          secondary: item.duration,
        }))
      : config.source === 'referrers'
        ? (analyticsData?.data.referrers ?? []).map((item) => ({
            label: item.name,
            value: formatNumber(item.visitors),
          }))
        : config.source === 'countries'
          ? (analyticsData?.data.countries ?? []).map((item) => ({
              label: item.name,
              value: formatNumber(item.visitors),
            }))
          : (analyticsData?.data.browsers ?? []).map((item) => ({
              label: item.name,
              value: formatNumber(item.visitors),
            }))

  if (dashboardPending || analyticsPending) return <LoadingWidget />
  if (!rows.length) return <EmptyWidget>No rows to display yet.</EmptyWidget>

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{config.source === 'pages' ? 'Page' : 'Name'}</TableHead>
          <TableHead className="text-right">Visitors / views</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, config.limit).map((row) => (
          <TableRow key={row.label}>
            <TableCell className="max-w-40 truncate font-medium">
              {row.label}
              {row.secondary && (
                <span className="text-muted-foreground ml-2 text-xs font-normal">
                  {row.secondary}
                </span>
              )}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.value}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function HeatmapWidget({
  config,
  scope,
  range,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'heatmap' }>
}) {
  const { data, isPending } = useQuery(
    getHeatmapsOptions({
      ...scope,
      range,
      page_path: config.pagePath,
    })
  )
  const detail = data?.data.selectedPage
  const page = detail ?? data?.data.pages[0]

  if (isPending) return <LoadingWidget />
  if (!page)
    return <EmptyWidget>No page activity has been captured yet.</EmptyWidget>

  const points =
    config.mode === 'clicks'
      ? (detail?.clickPoints ?? []).slice(0, 5).map((point) => ({
          label: `${Math.round(point.x)}% × ${Math.round(point.y)}%`,
          value: point.count,
          intensity: point.intensity,
        }))
      : 'scrollPoints' in page
        ? (detail?.scrollPoints ?? []).slice(0, 5).map((point) => ({
            label: `${Math.round(point.percentage)}% depth`,
            value: point.count,
            intensity: point.intensity,
          }))
        : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">{page.path}</span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {formatNumber(page.views)} views
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-muted rounded-lg p-2">
          <p className="font-semibold">{formatNumber(page.clicks)}</p>
          <p className="text-muted-foreground mt-1">Clicks</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="font-semibold">{Math.round(page.maxScroll)}%</p>
          <p className="text-muted-foreground mt-1">Max scroll</p>
        </div>
        <div className="bg-muted rounded-lg p-2">
          <p className="font-semibold">{Math.round(page.averageScroll)}%</p>
          <p className="text-muted-foreground mt-1">Average</p>
        </div>
      </div>
      {points.length > 0 ? (
        <div className="space-y-2">
          {points.map((point) => (
            <div key={point.label} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{point.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatNumber(point.value)}
                </span>
              </div>
              <div className="bg-muted h-1.5 rounded-full">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-300 to-red-500"
                  style={{ width: `${Math.max(point.intensity * 100, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          No {config.mode} data yet.
        </p>
      )}
    </div>
  )
}

function GlobalConversionWidget({
  scope,
  range,
  device,
}: Omit<WidgetContentProps, 'config'>) {
  const { data, isPending } = useQuery(
    getDashboardOptions({ ...scope, range, device })
  )

  if (isPending) return <LoadingWidget />

  return (
    <div className="flex min-h-36 flex-col justify-between">
      <div>
        <p className="text-5xl font-semibold tracking-[-0.07em]">
          {data?.data.conversionRate ?? 0}%
        </p>
        <p className="text-muted-foreground mt-2 text-xs">
          Sessions with a form submission or custom conversion event.
        </p>
      </div>
      <div className="bg-muted mt-5 h-2 overflow-hidden rounded-full">
        <div
          className="bg-foreground h-full rounded-full"
          style={{ width: `${Math.min(data?.data.conversionRate ?? 0, 100)}%` }}
        />
      </div>
    </div>
  )
}

function FunnelConversionWidget({
  config,
  scope,
  range,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'conversion' }>
}) {
  const { data, isPending } = useQuery(
    getFunnelsOptions({ ...scope, range: rangeForFunnel(range) })
  )
  const funnel = data?.data.find((item) => item.id === config.funnelId)

  if (isPending) return <LoadingWidget />
  if (!funnel)
    return (
      <EmptyWidget>Choose a funnel for this conversion widget.</EmptyWidget>
    )

  return (
    <div className="flex min-h-36 flex-col justify-between">
      <div>
        <p className="text-5xl font-semibold tracking-[-0.07em]">
          {funnel.conversionRate}%
        </p>
        <p className="text-muted-foreground mt-2 truncate text-xs">
          {funnel.name}
        </p>
      </div>
      <p className="text-muted-foreground text-xs">
        {formatNumber(funnel.steps.at(-1)?.visitors ?? 0)} completed visitors
      </p>
    </div>
  )
}

function GoalConversionWidget({
  config,
  scope,
  range,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'conversion' }>
}) {
  const { data, isPending } = useQuery(
    getGoalsOptions({ ...scope, range: rangeForGoal(range) })
  )
  const goal = data?.data.find((item) => item.id === config.goalId)
  const progress = goal ? Math.min((goal.current / goal.target) * 100, 100) : 0

  if (isPending) return <LoadingWidget />
  if (!goal)
    return <EmptyWidget>Choose a goal for this conversion widget.</EmptyWidget>

  return (
    <div className="flex min-h-36 flex-col justify-between">
      <div>
        <p className="text-5xl font-semibold tracking-[-0.07em]">
          {Math.round(progress)}%
        </p>
        <p className="text-muted-foreground mt-2 truncate text-xs">
          {goal.name}
        </p>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div
          className="bg-foreground h-full rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function ConversionWidget({
  config,
  scope,
  range,
  device,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'conversion' }>
}) {
  if (config.mode === 'funnel') {
    return (
      <FunnelConversionWidget
        config={config}
        scope={scope}
        range={range}
        device={device}
      />
    )
  }

  if (config.mode === 'goal') {
    return (
      <GoalConversionWidget
        config={config}
        scope={scope}
        range={range}
        device={device}
      />
    )
  }

  return <GlobalConversionWidget scope={scope} range={range} device={device} />
}

function RetentionWidget({
  config,
  scope,
  range,
  device,
}: WidgetContentProps & {
  config: Extract<DashboardWidgetConfig, { type: 'retention' }>
}) {
  const retentionRange = range === '90d' ? '90d' : '30d'
  const { data, isPending } = useQuery(
    getRetentionOptions({
      ...scope,
      range: retentionRange,
      interval: config.interval,
      periods: config.periods,
      device,
    })
  )

  if (isPending) return <LoadingWidget />
  if (!data?.data.cohorts.length) {
    return (
      <EmptyWidget>
        Retention cohorts will appear as traffic accumulates.
      </EmptyWidget>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[420px] text-[11px]">
        <TableHeader>
          <TableRow>
            <TableHead>Cohort</TableHead>
            <TableHead>Size</TableHead>
            {Array.from({ length: config.periods }, (_, period) => (
              <TableHead key={period} className="text-center">
                {period === 0 ? 'Start' : `P${period}`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.cohorts.slice(0, 8).map((cohort) => (
            <TableRow key={cohort.cohortStart}>
              <TableCell className="font-medium whitespace-nowrap">
                {cohort.cohortStart}
              </TableCell>
              <TableCell className="tabular-nums">
                {cohort.cohortSize}
              </TableCell>
              {cohort.cells.map((cell) => (
                <TableCell key={cell.period} className="p-1 text-center">
                  <span
                    className="inline-flex min-w-8 justify-center rounded px-1.5 py-1 tabular-nums"
                    style={
                      cell.rate === null
                        ? undefined
                        : {
                            backgroundColor: `color-mix(in srgb, var(--primary) ${Math.max(cell.rate, 8)}%, transparent)`,
                          }
                    }
                  >
                    {cell.rate === null ? '—' : `${Math.round(cell.rate)}%`}
                  </span>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DashboardWidgetContent(props: WidgetContentProps) {
  switch (props.config.type) {
    case 'metric':
      return <MetricWidget {...props} config={props.config} />
    case 'line':
      return <LineChartWidget {...props} config={props.config} />
    case 'bar':
      return <BarChartWidget {...props} config={props.config} />
    case 'funnel':
      return <FunnelWidget {...props} config={props.config} />
    case 'table':
      return <TableWidget {...props} config={props.config} />
    case 'heatmap':
      return <HeatmapWidget {...props} config={props.config} />
    case 'conversion':
      return <ConversionWidget {...props} config={props.config} />
    case 'retention':
      return <RetentionWidget {...props} config={props.config} />
  }
}

export function DashboardWidgetCard({
  widget,
  scope,
  range,
  device,
  canManage,
  interaction,
  onEdit,
  onDelete,
}: DashboardWidgetCardProps) {
  const title = widget.title || widgetLabels[widget.config.type]

  return (
    <Card className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 space-y-0 border-b px-4 py-3">
        <CardTitle className="truncate text-sm">{title}</CardTitle>
        {canManage && (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Move ${title}`}
              {...interaction.dragHandleProps}
            >
              <GripVertical className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={`Edit ${title}`}
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive size-7"
              aria-label={`Delete ${title}`}
              onClick={onDelete}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-4">
        <DashboardWidgetContent
          config={widget.config}
          scope={scope}
          range={range}
          device={device}
        />
      </CardContent>
      {canManage && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 bottom-1 size-6 cursor-se-resize opacity-50 hover:opacity-100"
          aria-label={`Resize ${title}`}
          {...interaction.resizeHandleProps}
        >
          <span className="border-muted-foreground/60 size-2 border-r-2 border-b-2" />
        </Button>
      )}
    </Card>
  )
}
