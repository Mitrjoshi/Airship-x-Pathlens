import { useRelativeTime } from '@/hooks/use-relative-time'
import {
  getPerformanceOptions,
  type PerformanceDevice,
  type PerformanceRange,
} from '@/queries/performance'
import { getProjectsOptions } from '@/queries/projects'
import { formatDate, formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Calendar } from '@workspace/ui/components/calendar'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  CalendarIcon,
  LinkIcon,
  RefreshCcwIcon,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/performance'
)({
  component: RouteComponent,
})

const summaryItems = [
  {
    key: 'avgTtfb',
    label: 'Avg. TTFB',
  },
  {
    key: 'avgDomLoaded',
    label: 'Avg. DOM Loaded',
  },
  {
    key: 'avgLoad',
    label: 'Avg. Load',
  },
  {
    key: 'avgDns',
    label: 'Avg. DNS',
  },
  {
    key: 'avgTcp',
    label: 'Avg. TCP',
  },
  {
    key: 'p75Ttfb',
    label: 'P75 TTFB',
  },
  {
    key: 'p75DomLoaded',
    label: 'P75 DOM Loaded',
  },
  {
    key: 'p75Load',
    label: 'P75 Load',
  },
  {
    key: 'totalSamples',
    label: 'Total Samples',
  },
] as const

const deviceLabels = {
  all: 'All devices',
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  unknown: 'Unknown',
} as const

const rangeLabels: Record<PerformanceRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const chartConfig = {
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
  const { workspaceId, projectId } = Route.useParams()

  const [range, setRange] = useState<PerformanceRange>('90d')
  const [device, setDevice] = useState<PerformanceDevice>('all')

  const {
    data: performanceData,
    isLoading: performanceLoading,
    isRefetching,
    refetch,
    dataUpdatedAt,
  } = useQuery(
    getPerformanceOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      device,
    })
  )
  const { data: projectData, isLoading: projectLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    })
  )

  const lastUpdated = useRelativeTime(dataUpdatedAt, 60_000)

  const projectDetails = projectData?.data[0]
  const performance = performanceData?.data

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <Button
            disabled={projectLoading}
            render={
              <a href={projectDetails?.domain as string} target="_blank" />
            }
            variant={'link'}
            className={'text-foreground px-0'}
          >
            <LinkIcon className="mr-1" />
            {projectLoading ? (
              <Skeleton className="h-5 w-50" />
            ) : (
              projectDetails?.domain
            )}
          </Button>

          <Separator orientation="vertical" />

          <div className="flex items-center justify-between gap-3">
            {dataUpdatedAt && (
              <p className="text-muted-foreground text-sm">
                Last updated {lastUpdated}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <ButtonGroup>
            <Popover>
              <PopoverTrigger
                render={<Button variant={'outline'} size="icon" />}
              >
                <CalendarIcon />
              </PopoverTrigger>

              <PopoverContent
                align="center"
                sideOffset={20}
                alignOffset={-20}
                className={'w-fit p-0'}
              >
                <Calendar mode="range" numberOfMonths={2} />
              </PopoverContent>
            </Popover>

            <Select
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as PerformanceRange)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Date range">
                  {rangeLabels[range]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </ButtonGroup>

          <Select
            value={device}
            onValueChange={(value) => {
              if (value) {
                setDevice(value as PerformanceDevice)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Device">
                {deviceLabels[device]}
              </SelectValue>
            </SelectTrigger>

            <SelectContent alignItemWithTrigger={false}>
              {Object.entries(deviceLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mx-auto space-y-6 p-6">
        {/* Heading */}
        <div>
          <p className="text-xl font-medium">Performance</p>

          <p className="text-muted-foreground text-sm">
            View and analyze performance metrics across your project.
          </p>
        </div>

        <div>
          <Card className="bg-card/30 overflow-hidden rounded-none border-2 border-dashed p-0">
            <CardContent className="h-90 p-0">
              {performanceLoading ? (
                <svg
                  viewBox="0 0 300 48"
                  preserveAspectRatio="none"
                  className="text-muted-foreground/20 h-full w-full"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient
                      id="chart-shimmer"
                      x1="0"
                      y1="0"
                      x2="1"
                      y2="0"
                    >
                      <stop
                        offset="0%"
                        stopColor="currentColor"
                        stopOpacity="0"
                      />
                      <stop
                        offset="40%"
                        stopColor="currentColor"
                        stopOpacity="0.15"
                      />
                      <stop
                        offset="50%"
                        stopColor="currentColor"
                        stopOpacity="0.45"
                      />
                      <stop
                        offset="60%"
                        stopColor="currentColor"
                        stopOpacity="0.15"
                      />
                      <stop
                        offset="100%"
                        stopColor="currentColor"
                        stopOpacity="0"
                      />
                      <animate
                        attributeName="x1"
                        values="-1;1"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="x2"
                        values="0;2"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </linearGradient>
                  </defs>

                  {/* Area beneath line */}
                  <path
                    d="
                    M0 31
                    C8 8 15 42 24 20
                    C32 3 40 38 50 29
                    C60 19 66 44 76 12
                    C86 2 94 34 104 25
                    C114 17 120 45 132 30
                    C142 11 150 6 160 27
                    C170 48 178 15 188 21
                    C198 28 204 4 214 18
                    C224 35 232 45 242 16
                    C252 0 260 31 270 36
                    C280 41 286 8 296 14
                    C298 15 299 12 300 10

                    L300 48
                    L0 48
                    Z
                  "
                    fill="url(#chart-shimmer)"
                  />

                  {/* Line */}
                  <path
                    d="
                  M0 31
                  C8 8 15 42 24 20
                  C32 3 40 38 50 29
                  C60 19 66 44 76 12
                  C86 2 94 34 104 25
                  C114 17 120 45 132 30
                  C142 11 150 6 160 27
                  C170 48 178 15 188 21
                  C198 28 204 4 214 18
                  C224 35 232 45 242 16
                  C252 0 260 31 270 36
                  C280 41 286 8 296 14
                  C298 15 299 12 300 10
                "
                    stroke="currentColor"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              ) : performance?.trend.every(
                  (v) => v.domLoaded === 0 && v.load === 0 && v.ttfb === 0
                ) ? (
                <div className="relative h-full">
                  <svg
                    viewBox="0 0 300 48"
                    preserveAspectRatio="none"
                    className="text-muted-foreground/20 relative h-full w-full"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <defs>
                      <linearGradient
                        id="chart-shimmer"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop
                          offset="0%"
                          stopColor="currentColor"
                          stopOpacity="0"
                        />
                        <stop
                          offset="40%"
                          stopColor="currentColor"
                          stopOpacity="0.15"
                        />
                        <stop
                          offset="50%"
                          stopColor="currentColor"
                          stopOpacity="0.45"
                        />
                        <stop
                          offset="60%"
                          stopColor="currentColor"
                          stopOpacity="0.15"
                        />
                        <stop
                          offset="100%"
                          stopColor="currentColor"
                          stopOpacity="0"
                        />
                        <animate
                          attributeName="x1"
                          values="-1;1"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                        <animate
                          attributeName="x2"
                          values="0;2"
                          dur="2s"
                          repeatCount="indefinite"
                        />
                      </linearGradient>
                    </defs>

                    {/* Line */}
                    <path
                      d="
                  M0 31
                  C8 8 15 42 24 20
                  C32 3 40 38 50 29
                  C60 19 66 44 76 12
                  C86 2 94 34 104 25
                  C114 17 120 45 132 30
                  C142 11 150 6 160 27
                  C170 48 178 15 188 21
                  C198 28 204 4 214 18
                  C224 35 232 45 242 16
                  C252 0 260 31 270 36
                  C280 41 286 8 296 14
                  C298 15 299 12 300 10
                "
                      stroke="currentColor"
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  <Badge
                    variant="outline"
                    className="absolute top-1/2 right-1/2 z-4 -translate-x-1/2 -translate-y-1/2 scale-110 rounded-lg backdrop-blur-3xl"
                  >
                    No Data
                  </Badge>
                </div>
              ) : (
                <ChartContainer
                  config={chartConfig}
                  className="h-full w-full p-2"
                >
                  <LineChart accessibilityLayer data={performance?.trend}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => formatDate(value)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent />}
                    />
                    <Line
                      dot={false}
                      dataKey="ttfb"
                      stroke="var(--color-ttfb)"
                    />
                    <Line
                      dot={false}
                      dataKey="domLoaded"
                      stroke="var(--color-domLoaded)"
                    />
                    <Line
                      dot={false}
                      dataKey="load"
                      stroke="var(--color-load)"
                    />

                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {summaryItems.map((item) => (
            <Card
              className="bg-card/30 gap-2 rounded-none border-2 border-dashed p-4"
              key={item.key}
            >
              <CardHeader className="p-0">
                <CardDescription>{item.label}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {performanceLoading ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <CardTitle>
                    {formatNumber(performance?.summary?.[item.key] ?? 0)}
                  </CardTitle>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
