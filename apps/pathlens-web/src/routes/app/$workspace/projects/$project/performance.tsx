import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { PlanFeatureNotice } from '@/components/common/plan-gate'
import { hasPlanFeature, useWorkspacePlan } from '@/lib/billing'
import { createFileRoute } from '@tanstack/react-router'
import { Gauge, Timer, Zap, Activity } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/chart'
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import {
  getPerformanceOptions,
  type PerformanceDevice,
  type PerformanceRange,
} from '@/queries/performance'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/performance'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Performance',
  },
})

function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

const trendConfig = {
  ttfb: {
    label: 'TTFB',
    color: 'var(--chart-1)',
  },
  domLoaded: {
    label: 'DOM Loaded',
    color: 'var(--chart-2)',
  },
  load: {
    label: 'Page Load',
    color: 'var(--chart-3)',
  },
} satisfies ChartConfig

function RouteComponent() {
  return <PageContent />
}

function PageContent() {
  const { workspace, project } = Route.useParams()
  const currentPlanId = useWorkspacePlan(workspace)
  const hasAdvancedPerformance = hasPlanFeature(
    currentPlanId,
    'advancedAnalytics'
  )
  const [range, setRange] = useState<PerformanceRange>('7d')
  const [device, setDevice] = useState<PerformanceDevice>('all')

  const {
    data: perfData,
    isPending,
    isError,
  } = useQuery(
    getPerformanceOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )

  const perf = perfData?.data
  const summary = [
    {
      title: 'TTFB',
      value: formatMs(perf?.summary.avgTtfb ?? 0),
      icon: Zap,
      detail: hasAdvancedPerformance
        ? `p75: ${formatMs(perf?.summary.p75Ttfb ?? 0)}`
        : 'Average response time',
    },
    {
      title: 'DOM Loaded',
      value: formatMs(perf?.summary.avgDomLoaded ?? 0),
      icon: Timer,
      detail: hasAdvancedPerformance
        ? `p75: ${formatMs(perf?.summary.p75DomLoaded ?? 0)}`
        : 'Average response time',
    },
    {
      title: 'Page Load',
      value: formatMs(perf?.summary.avgLoad ?? 0),
      icon: Gauge,
      detail: hasAdvancedPerformance
        ? `p75: ${formatMs(perf?.summary.p75Load ?? 0)}`
        : 'Average response time',
    },
    {
      title: 'Samples',
      value: formatNumber(perf?.summary.totalSamples ?? 0),
      icon: Activity,
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Performance"
          title="Performance"
          description={
            hasAdvancedPerformance
              ? 'Monitor Core Web Vitals, page load times, and rendering performance.'
              : 'Review basic page timing and load performance for your project.'
          }
        />

        {!hasAdvancedPerformance && (
          <PlanFeatureNotice
            workspaceId={workspace}
            feature="advancedAnalytics"
            description="Upgrade to Pro for percentile breakdowns and advanced performance analytics."
          />
        )}

        <PageToolbar className="justify-end">
          <Select
            value={range}
            onValueChange={(value) => {
              if (value) setRange(value as PerformanceRange)
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
              if (value) setDevice(value as PerformanceDevice)
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

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load performance data for the selected filters.
          </p>
        )}

        <ProjectMetricStrip className="lg:grid-cols-4">
          {summary.map((stat) => {
            const Icon = stat.icon
            return (
              <ProjectMetric
                key={stat.title}
                label={stat.title}
                value={stat.value}
                icon={Icon}
                detail={stat.detail}
                isLoading={isPending}
              />
            )
          })}
        </ProjectMetricStrip>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
            <CardDescription>
              {hasAdvancedPerformance
                ? 'Average TTFB, DOM Loaded, and Page Load over the selected range'
                : 'Average page timing over the selected range'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ChartContainer config={trendConfig} className="h-[320px] w-full">
              <LineChart data={perf?.trend ?? []}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatMs(v)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatMs(Number(value))}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="ttfb"
                  stroke="var(--color-ttfb)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="domLoaded"
                  stroke="var(--color-domLoaded)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="load"
                  stroke="var(--color-load)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pages</CardTitle>
              <CardDescription>Average load times by page path</CardDescription>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead className="text-right">TTFB</TableHead>
                    <TableHead className="text-right">DOM</TableHead>
                    <TableHead className="text-right">Load</TableHead>
                    <TableHead className="text-right">Samples</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(perf?.pages ?? []).length > 0 ? (
                    perf?.pages.map((page) => (
                      <TableRow key={page.path}>
                        <TableCell className="font-mono text-sm">
                          {page.path}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(page.avgTtfb)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(page.avgDomLoaded)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(page.avgLoad)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {formatNumber(page.samples)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-muted-foreground text-center"
                      >
                        No performance data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browsers</CardTitle>
              <CardDescription>Average load times by browser</CardDescription>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Browser</TableHead>
                    <TableHead className="text-right">TTFB</TableHead>
                    <TableHead className="text-right">Load</TableHead>
                    <TableHead className="text-right">Samples</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(perf?.browsers ?? []).length > 0 ? (
                    perf?.browsers.map((browser) => (
                      <TableRow key={browser.name}>
                        <TableCell className="font-medium">
                          {browser.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(browser.avgTtfb)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMs(browser.avgLoad)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right tabular-nums">
                          {formatNumber(browser.samples)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-muted-foreground text-center"
                      >
                        No browser data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Devices</CardTitle>
            <CardDescription>Average load times by device type</CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead className="text-right">TTFB</TableHead>
                  <TableHead className="text-right">Load</TableHead>
                  <TableHead className="text-right">Samples</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {(perf?.devices ?? []).length > 0 ? (
                  perf?.devices.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium capitalize">
                        {d.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMs(d.avgTtfb)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMs(d.avgLoad)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right tabular-nums">
                        {formatNumber(d.samples)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-muted-foreground text-center"
                    >
                      No device data yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ProjectPageLayout>
  )
}
