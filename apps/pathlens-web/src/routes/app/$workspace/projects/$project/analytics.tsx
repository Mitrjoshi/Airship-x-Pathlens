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
  Smartphone,
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
    },
    {
      title: 'Sessions',
      value: formatNumber(analytics?.summary.sessions ?? 0),
      icon: navigationIcons.sessions,
    },
    {
      title: 'Bounce Rate',
      value: `${analytics?.summary.bounceRate ?? 0}%`,
      icon: Globe,
    },
    {
      title: 'Avg. Duration',
      value: analytics?.summary.avgDuration ?? '0s',
      icon: Clock3,
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Audience"
          title="Analytics"
          description="Deep dive into traffic, devices, and audience behaviour."
        />

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
            Unable to load analytics for the selected filters.
          </p>
        )}

        {/* Summary Cards */}
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
              />
            )
          })}
        </ProjectMetricStrip>

        {/* Charts */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Visitors vs Sessions</CardTitle>
              <CardDescription>Traffic over the selected range</CardDescription>
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
              <CardTitle>Devices</CardTitle>
              <CardDescription>Sessions by device type</CardDescription>
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

        {/* Top Lists */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
              <CardDescription>Where visitors come from</CardDescription>
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
              <CardTitle>Top Countries</CardTitle>
              <CardDescription>Visitor geography</CardDescription>
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
              <CardTitle>Top Browsers</CardTitle>
              <CardDescription>Browser breakdown</CardDescription>
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
      </div>
    </ProjectPageLayout>
  )
}
