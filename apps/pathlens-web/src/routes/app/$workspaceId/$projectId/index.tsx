import { getDashboardOptions, type DashboardRange } from '@/queries/dashboard'
import { getProjectsOptions } from '@/queries/projects'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Calendar } from '@workspace/ui/components/calendar'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  ArrowUpRightIcon,
  CalendarIcon,
  GaugeIcon,
  Laptop,
  LayoutIcon,
  LinkIcon,
  MonitorSmartphone,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
  Smartphone,
  TimerIcon,
  ZapIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import { Line, LineChart, ResponsiveContainer } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { formatMs, formatNumber, formatRelativeTime } from '@/utils/utils'
import { Badge } from '@workspace/ui/components/badge'
import { getPerformanceOptions } from '@/queries/performance'

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--chart-2)',
  },
  sessions: {
    label: 'Sessions',
    color: 'var(--chart-2)',
  },
  events: {
    label: 'Events',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig

export const Route = createFileRoute('/app/$workspaceId/$projectId/')({
  component: RouteComponent,
})

const rangeLabels: Record<DashboardRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()
  const navigate = useNavigate()

  const [range, setRange] = useState<DashboardRange>('30d')
  const [liveMode, setLiveMode] = useState(false)

  const {
    data: dashboardData,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery(
    getDashboardOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      device: 'all',
    })
  )

  const { data: projectData, isLoading: projectLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    })
  )

  const { data: perfData } = useQuery(
    getPerformanceOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      device: 'all',
    })
  )

  const dashboard = dashboardData?.data
  const projectDetails = projectData?.data[0]
  const perf = perfData?.data

  return (
    <div>
      <div className="flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <Button
            render={<a href={projectDetails?.domain!} target="_blank" />}
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
            <span
              className={`h-2 w-2 border ${dashboard?.liveVisitors ? 'bg-green-400' : 'bg-transparent'}`}
            />

            <p className="text-sm">
              {projectLoading ? (
                <Skeleton className="h-6 w-25" />
              ) : (
                `${formatNumber(dashboard?.liveVisitors ?? 0)} Online`
              )}{' '}
            </p>
          </div>

          <Separator orientation="vertical" />

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Last updated{' '}
              {dataUpdatedAt &&
                formatRelativeTime(new Date(dataUpdatedAt).toString())}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-live={liveMode}
            onClick={() => setLiveMode(!liveMode)}
            className="data-[live=true]:bg-primary-foreground/50! data-[live=true]:border-primary! data-[live=true]:text-primary! duration-200 data-[live=true]:border-dashed!"
            variant="outline"
          >
            {liveMode ? <PauseIcon /> : <PlayIcon />}
            Live Refresh
          </Button>
          <Button
            disabled={isFetching}
            onClick={() => {
              refetch()
            }}
            variant="outline"
          >
            <RefreshCcwIcon className={`${isFetching ? 'animate-spin' : ''}`} />
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
                if (value) setRange(value as DashboardRange)
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

          <Separator orientation="vertical" />

          <Button variant={'outline'}>
            <LayoutIcon />
            Edit Layout
          </Button>
        </div>
      </div>

      <div className="mx-auto space-y-6 p-6">
        <div>
          <p className="text-xl font-medium">Dashboard</p>
          <p className="text-muted-foreground text-sm">
            Get a quick overview of your project activity and performance.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="Visitors"
            value={formatNumber(dashboard?.visitors)}
            change={dashboard?.weeklyChange.visitors.value ?? 0}
            positive={dashboard?.weeklyChange.visitors.positive ?? false}
            chartData={dashboard?.visitorsChart}
            dataKey="visitors"
            chartConfig={chartConfig}
            loading={isFetching}
            onViewDetails={() => {
              navigate({
                to: '/app/$workspaceId/$projectId/visitors',
                params: {
                  projectId,
                  workspaceId,
                },
              })
            }}
          />

          <MetricCard
            label="Sessions"
            value={formatNumber(dashboard?.sessions)}
            change={dashboard?.weeklyChange.sessions.value ?? 0}
            positive={dashboard?.weeklyChange.sessions.positive ?? false}
            chartData={dashboard?.sessionChart}
            dataKey="sessions"
            chartConfig={chartConfig}
            loading={isFetching}
            onViewDetails={() => {
              navigate({
                to: '/app/$workspaceId/$projectId/session-replay',
                params: {
                  projectId,
                  workspaceId,
                },
              })
            }}
          />

          <MetricCard
            label="Events"
            value={formatNumber(dashboard?.events)}
            change={dashboard?.weeklyChange.events.value ?? 0}
            positive={dashboard?.weeklyChange.events.positive ?? false}
            chartData={dashboard?.eventsChart}
            dataKey="events"
            chartConfig={chartConfig}
            loading={isFetching}
            onViewDetails={() => {
              navigate({
                to: '/app/$workspaceId/$projectId/events',
                params: {
                  projectId,
                  workspaceId,
                },
              })
            }}
          />
        </div>

        <div></div>
      </div>
    </div>
  )
}

type MetricCardProps<T extends Record<string, unknown>> = {
  label: string
  value: string | number
  change: number
  positive: boolean
  chartData?: T[]
  dataKey: keyof T & string
  chartConfig: Record<string, { label?: ReactNode; color?: string }>
  onViewDetails?: () => void
  loading: boolean
  viewDetails?: () => void
}

export function MetricCard<T extends Record<string, unknown>>({
  label,
  value,
  change,
  positive,
  chartData = [],
  dataKey,
  chartConfig,
  onViewDetails,
  loading,
}: MetricCardProps<T>) {
  const changeColor = positive ? 'text-primary' : 'text-destructive'

  return (
    <Card className="bg-card/30 rounded-none border-2 border-dashed p-0">
      <CardHeader className="flex items-start justify-between p-2 px-4">
        <div>
          <CardDescription>{label}</CardDescription>

          <CardTitle className="flex items-end gap-2 text-3xl">
            {loading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <>
                {value}

                <div className="flex items-center gap-1">
                  <ArrowUpRightIcon className={changeColor} size={14} />

                  <p className={`mb-1 text-sm ${changeColor}`}>{change}%</p>
                </div>
              </>
            )}
          </CardTitle>
        </div>

        {onViewDetails && (
          <Button
            disabled={loading}
            variant="link"
            size="sm"
            onClick={onViewDetails}
            className="text-muted-foreground px-0 underline-offset-2"
          >
            View Details
            <ArrowUpRightIcon />
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <svg
            viewBox="0 0 300 48"
            preserveAspectRatio="none"
            className="text-muted-foreground/20 h-12 w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="chart-shimmer" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
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
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
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
        ) : !chartData.length ? (
          <div className="relative">
            <svg
              viewBox="0 0 300 48"
              preserveAspectRatio="none"
              className="text-muted-foreground/20 relative h-12 w-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="chart-shimmer" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
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
              className="absolute -top-2 left-1/2 z-4 -translate-x-1/2 scale-110 rounded-lg backdrop-blur-3xl"
            >
              No Data
            </Badge>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-12 w-full flex-1 p-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <ChartTooltip content={<ChartTooltipContent />} />

                <Line
                  dot={false}
                  dataKey={dataKey}
                  fill="transparent"
                  stroke={`var(--color-${dataKey})`}
                  strokeWidth={0.8}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
