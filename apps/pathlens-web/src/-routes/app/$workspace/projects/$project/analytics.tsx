import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { createFileRoute } from '@tanstack/react-router'
import {
  Clock3,
  Globe,
  Laptop,
  MonitorSmartphone,
  Repeat,
  Smartphone,
  UserPlus,
} from 'lucide-react'

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
import { Badge } from '@workspace/ui/components/badge'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@workspace/ui/components/chart'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '@/utils/utils'
import { navigationIcons } from '@/config/navigation-icons'
import { useQuery } from '@tanstack/react-query'
import {
  getAnalyticsOptions,
  type AnalyticsDevice,
  type AnalyticsRange,
} from '@/queries/analytics'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/analytics'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Analytics',
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

const deviceConfig = {
  value: {
    label: 'Sessions',
  },
} satisfies ChartConfig

const rangeLabels: Record<AnalyticsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const deviceLabels: Record<AnalyticsDevice, string> = {
  all: 'All Devices',
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<AnalyticsRange>('7d')
  const [device, setDevice] = useState<AnalyticsDevice>('all')

  const {
    data: analyticsData,
    isPending,
    isError,
  } = useQuery(
    getAnalyticsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )

  const analytics = analyticsData?.data
  const summary = [
    {
      title: 'Visitors',
      value: formatNumber(analytics?.summary.visitors ?? 0),
      icon: navigationIcons.visitors,
      detail: 'Unique people in the range',
    },
    {
      title: 'Sessions',
      value: formatNumber(analytics?.summary.sessions ?? 0),
      icon: navigationIcons.sessions,
      detail: 'Visits in selected audience',
    },
    {
      title: 'Bounce rate',
      value: `${analytics?.summary.bounceRate ?? 0}%`,
      icon: Globe,
      detail: 'Single-page sessions',
    },
    {
      title: 'Avg. duration',
      value: analytics?.summary.avgDuration ?? '0s',
      icon: Clock3,
      detail: 'Time per session',
    },
  ]

  const breakdown = analytics?.visitorBreakdown
  const breakdownTotal = (breakdown?.new ?? 0) + (breakdown?.returning ?? 0)
  const breakdownRows = [
    { label: 'New visitors', value: breakdown?.new ?? 0, icon: UserPlus },
    { label: 'Returning', value: breakdown?.returning ?? 0, icon: Repeat },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Audience · Diagnostics"
          title="Analytics"
          description="Investigate audience quality, acquisition, and environment beyond the overview."
        />

        <PageToolbar>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="bg-muted-foreground size-1.5 rounded-full" />
            Diagnostic view · compare audience dimensions
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as AnalyticsRange)
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
                if (value) setDevice(value as AnalyticsDevice)
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

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load analytics for the selected filters.
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
                isLoading={isPending}
                detail={stat.detail}
              />
            )
          })}
        </ProjectMetricStrip>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Audience volume</CardTitle>
              <CardDescription>
                Compare unique people with visits across the selected range
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ChartContainer config={chartConfig} className="h-[320px] w-full">
                <AreaChart data={analytics?.traffic ?? []}>
                  <CartesianGrid vertical={false} />

                  <XAxis dataKey="day" tickLine={false} axisLine={false} />

                  <ChartTooltip content={<ChartTooltipContent />} />

                  <Area
                    type="monotone"
                    dataKey="visitors"
                    fill="var(--color-visitors)"
                    fillOpacity={0.25}
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Device composition</CardTitle>
              <CardDescription>
                How the audience is distributed by device
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ChartContainer
                config={deviceConfig}
                className="h-[220px] w-full"
              >
                <BarChart data={analytics?.devices ?? []} layout="vertical">
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" hide />
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={4} />
                </BarChart>
              </ChartContainer>

              <div className="mt-4 space-y-2">
                {(analytics?.devices ?? []).length > 0 ? (
                  analytics?.devices.map((d) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {d.name === 'Mobile' ? (
                          <Smartphone className="text-muted-foreground h-4 w-4" />
                        ) : d.name === 'Tablet' ? (
                          <MonitorSmartphone className="text-muted-foreground h-4 w-4" />
                        ) : (
                          <Laptop className="text-muted-foreground h-4 w-4" />
                        )}
                        {d.name}
                      </div>
                      <span className="text-muted-foreground">{d.value}%</span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center text-sm">
                    No device data yet.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Acquisition sources</CardTitle>
              <CardDescription>Where the audience originated</CardDescription>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Visitors</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(analytics?.referrers ?? []).length > 0 ? (
                    analytics?.referrers.map((r) => (
                      <TableRow key={r.name}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{formatNumber(r.visitors)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-muted-foreground text-center"
                      >
                        No referrer data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Geography</CardTitle>
              <CardDescription>Where the audience is located</CardDescription>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Country</TableHead>
                    <TableHead>Visitors</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(analytics?.countries ?? []).length > 0 ? (
                    analytics?.countries.map((c) => (
                      <TableRow key={`${c.code}-${c.name}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{c.code}</Badge>
                            {c.name}
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(c.visitors)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
                        className="text-muted-foreground text-center"
                      >
                        No country data yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browser environment</CardTitle>
              <CardDescription>Which browsers visitors use</CardDescription>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Browser</TableHead>
                    <TableHead>Visitors</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {(analytics?.browsers ?? []).length > 0 ? (
                    analytics?.browsers.map((b) => (
                      <TableRow key={b.name}>
                        <TableCell className="font-medium">{b.name}</TableCell>
                        <TableCell>{formatNumber(b.visitors)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={2}
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

        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Top pages</CardTitle>
              <CardDescription>
                Most visited pages in this audience
              </CardDescription>
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
                    {(analytics?.pages ?? []).length > 0 ? (
                      analytics?.pages.map((page) => (
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
                          No page data yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>New vs returning</CardTitle>
              <CardDescription>Audience composition by history</CardDescription>
            </CardHeader>

            <CardContent>
              {breakdownTotal > 0 ? (
                <div className="space-y-4">
                  {breakdownRows.map((row) => {
                    const Icon = row.icon

                    return (
                      <div key={row.label}>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="flex items-center gap-2">
                            <Icon className="text-muted-foreground h-4 w-4" />
                            {row.label}
                          </span>
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {formatNumber(row.value)}
                          </span>
                        </div>
                        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                          <div
                            className="bg-foreground h-full rounded-full"
                            style={{
                              width: `${Math.max((row.value / breakdownTotal) * 100, 4)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
                  No visitor data yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProjectPageLayout>
  )
}
