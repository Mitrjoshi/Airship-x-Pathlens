import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { PlanFeatureNotice } from '@/components/common/plan-gate'
import { hasPlanFeature, useWorkspacePlan } from '@/lib/billing'
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
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/chart'
import { Progress } from '@workspace/ui/components/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  getAnalyticsOptions,
  type AnalyticsDevice,
  type AnalyticsRange,
  type T_Analytics,
} from '@/queries/analytics'
import { getWorkspacesOptions } from '@/queries/workspace'
import { formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  Clock3,
  Download,
  FileBarChart2,
  Globe,
  Laptop,
  MonitorSmartphone,
  MousePointerClick,
  Smartphone,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/reports'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Reports',
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

const rangeOptions: { label: string; value: AnalyticsRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const deviceOptions: { label: string; value: AnalyticsDevice }[] = [
  { label: 'All devices', value: 'all' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Tablet', value: 'tablet' },
]

const rangeLabels: Record<AnalyticsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const deviceLabels: Record<AnalyticsDevice, string> = {
  all: 'All devices',
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
}

type ReportTableItem = {
  name: string
  visitors: number
  code?: string
}

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`
}

function downloadReport(
  analytics: T_Analytics,
  range: AnalyticsRange,
  device: AnalyticsDevice
) {
  const rows: Array<Array<string | number>> = [
    ['Metric', 'Value'],
    ['Visitors', analytics.summary.visitors],
    ['Sessions', analytics.summary.sessions],
    ['Bounce rate', `${analytics.summary.bounceRate}%`],
    ['Average duration', analytics.summary.avgDuration],
    ['Report range', rangeLabels[range]],
    ['Device filter', deviceLabels[device]],
    [],
    ['Traffic by day', 'Visitors', 'Sessions'],
    ...analytics.traffic.map((point) => [
      point.day,
      point.visitors,
      point.sessions,
    ]),
    [],
    ['Device mix', 'Share'],
    ...analytics.devices.map((item) => [item.name, `${item.value}%`]),
    [],
    ['Top referrers', 'Visitors'],
    ...analytics.referrers.map((item) => [item.name, item.visitors]),
    [],
    ['Top countries', 'Visitors'],
    ...analytics.countries.map((item) => [
      `${item.name} (${item.code})`,
      item.visitors,
    ]),
    [],
    ['Top browsers', 'Visitors'],
    ...analytics.browsers.map((item) => [item.name, item.visitors]),
  ]

  const csv = rows
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')
  const url = URL.createObjectURL(
    new Blob([csv], { type: 'text/csv;charset=utf-8' })
  )
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `pathlens-report-${range}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function renderReportTable({
  title,
  description,
  items,
  isLoading,
}: {
  title: string
  description: string
  items: ReportTableItem[]
  isLoading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="ml-auto h-4 w-12" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length > 0 ? (
              items.map((item) => (
                <TableRow key={`${item.code ?? ''}-${item.name}`}>
                  <TableCell className="max-w-[180px] truncate font-medium">
                    <span className="flex items-center gap-2">
                      {item.code && (
                        <Badge variant="outline">{item.code}</Badge>
                      )}
                      <span className="truncate">{item.name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {formatNumber(item.visitors)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-muted-foreground py-8 text-center"
                >
                  No data for this range.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function renderDeviceIcon(name: string) {
  if (name === 'Mobile') return <Smartphone className="size-4" />
  if (name === 'Tablet') return <MonitorSmartphone className="size-4" />

  return <Laptop className="size-4" />
}

function RouteComponent() {
  return <PageContent />
}

function PageContent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [device, setDevice] = useState<AnalyticsDevice>('all')
  const currentPlanId = useWorkspacePlan(workspace)
  const { data: workspaceData } = useQuery(getWorkspacesOptions())

  const {
    data: analyticsData,
    isError,
    isFetching,
    isPending,
  } = useQuery(
    getAnalyticsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )

  const analytics = analyticsData?.data
  const summary = analytics?.summary
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canExport =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('analytics.reports.export')
  const canUseExport = hasPlanFeature(currentPlanId, 'dataExport')

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Reporting"
          title="Reports"
          description="Turn the events collected by this project into a clear, filterable traffic report."
          actions={
            <Button
              variant="outline"
              disabled={!analytics || !canExport || !canUseExport}
              onClick={() => {
                if (analytics) downloadReport(analytics, range, device)
              }}
            >
              <Download />
              Export CSV
            </Button>
          }
        />

        {!canUseExport && (
          <PlanFeatureNotice
            workspaceId={workspace}
            feature="dataExport"
            description="Upgrade to Pro to export advanced reports and share the underlying data."
          />
        )}

        <PageToolbar className="justify-end">
          <Select
            value={range}
            onValueChange={(value) => {
              if (value) setRange(value as AnalyticsRange)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={device}
            onValueChange={(value) => {
              if (value) setDevice(value as AnalyticsDevice)
            }}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Device" />
            </SelectTrigger>
            <SelectContent>
              {deviceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageToolbar>

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load report data for the selected filters.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-y py-4 text-xs">
          <span className="text-muted-foreground flex items-center gap-2">
            <Calendar className="size-3.5" />
            {rangeLabels[range]} · {deviceLabels[device]}
          </span>
          <span className="text-muted-foreground flex items-center gap-2">
            {isFetching && (
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            )}
            {isFetching
              ? 'Refreshing live data'
              : 'Calculated from collected events'}
          </span>
        </div>

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Visitors"
            value={formatNumber(summary?.visitors ?? 0)}
            icon={Users}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Sessions"
            value={formatNumber(summary?.sessions ?? 0)}
            icon={MousePointerClick}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Bounce rate"
            value={`${summary?.bounceRate ?? 0}%`}
            icon={Globe}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Avg. duration"
            value={summary?.avgDuration ?? '0s'}
            icon={Clock3}
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
          <Card>
            <CardHeader>
              <CardTitle>Traffic trend</CardTitle>
              <CardDescription>
                Visitors and sessions across the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <Skeleton className="h-[300px] w-full" />
              ) : analytics?.traffic.length ? (
                <ChartContainer
                  config={chartConfig}
                  className="h-[300px] w-full"
                >
                  <AreaChart data={analytics.traffic}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="visitors"
                      fill="var(--color-visitors)"
                      fillOpacity={0.2}
                      stroke="var(--color-visitors)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="sessions"
                      fill="var(--color-sessions)"
                      fillOpacity={0.12}
                      stroke="var(--color-sessions)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="text-muted-foreground flex h-[300px] items-center justify-center text-sm">
                  No traffic data for this range.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device mix</CardTitle>
              <CardDescription>Session share by device type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {isPending ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))
              ) : analytics?.devices.length ? (
                analytics.devices.map((item) => (
                  <div key={item.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="flex min-w-0 items-center gap-2">
                        {renderDeviceIcon(item.name)}
                        <span className="truncate">{item.name}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {item.value}%
                      </span>
                    </div>
                    <Progress value={item.value} />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground py-10 text-center text-sm">
                  No device data for this range.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {renderReportTable({
            title: 'Top referrers',
            description: 'Where visitors came from.',
            items: analytics?.referrers ?? [],
            isLoading: isPending,
          })}
          {renderReportTable({
            title: 'Top countries',
            description: 'Visitor geography.',
            items: analytics?.countries ?? [],
            isLoading: isPending,
          })}
          {renderReportTable({
            title: 'Top browsers',
            description: 'Browser breakdown by visitor.',
            items: analytics?.browsers ?? [],
            isLoading: isPending,
          })}
        </div>

        <Card className="bg-muted/30">
          <CardContent className="flex items-start gap-3 p-5">
            <FileBarChart2 className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm leading-6">
              This report is generated from the project&apos;s tracked events.
              Change the filters above to recalculate the report, or export the
              current view as CSV.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProjectPageLayout>
  )
}
