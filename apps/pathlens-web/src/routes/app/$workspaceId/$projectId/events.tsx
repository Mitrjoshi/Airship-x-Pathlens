import { type AnalyticsRange } from '@/queries/analytics'
import { getEventsChartOptions, getEventsOptions } from '@/queries/events'
import { getProjectsOptions } from '@/queries/projects'
import { formatRelativeTime } from '@/utils/utils'

import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Calendar } from '@workspace/ui/components/calendar'
import { Card, CardContent } from '@workspace/ui/components/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@workspace/ui/components/chart'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

import {
  CalendarIcon,
  LinkIcon,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
  SearchIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

export const Route = createFileRoute('/app/$workspaceId/$projectId/events')({
  component: RouteComponent,
})

const getPaginationItems = (
  currentPage: number,
  totalPages: number
): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ]
}

const deviceLabels = {
  all: 'All devices',
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
  unknown: 'Unknown',
} as const

type DeviceFilter = keyof typeof deviceLabels

const rangeLabels: Record<AnalyticsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const chartConfig = {
  views: {
    label: 'Events',
  },
  desktop: {
    label: 'Desktop',
    color: 'var(--chart-2)',
  },
  mobile: {
    label: 'Mobile',
    color: 'var(--chart-4)',
  },
  tablet: {
    label: 'Tablet',
    color: 'var(--chart-3)',
  },
  unknown: {
    label: 'Unknown',
    color: 'var(--chart-5)',
  },
} satisfies ChartConfig

const BAR_COUNT = 24
const BASELINE = 79
const BAR_WIDTH = 5
const BAR_GAP = 7
const PAGE_SIZE = 10

/**
 * Deterministic placeholder bars.
 *
 * They still look naturally random, but don't change every time the
 * component mounts/renders like Math.random() would.
 */
const placeholderBars = Array.from({ length: BAR_COUNT }, (_, index) => {
  const mid = 30 + ((index * 13 + 7) % 25)

  // Intentionally minimal movement.
  const amplitude = 2 + ((index * 3) % 3)

  return {
    x: 8 + index * (BAR_WIDTH + BAR_GAP),

    mid,

    low: mid - amplitude,
    high: mid + amplitude,

    duration: `${2.8 + (index % 5) * 0.16}s`,

    // Negative delay means the animation doesn't visually start
    // from the exact same position for every bar.
    delay: `${-(index % 8) * 0.2}s`,
  }
})

type ChartDataItem = {
  date: string
  desktop: number
  mobile: number
  tablet: number
  unknown: number
}

function EventsChartPlaceholder({ animated = false }: { animated?: boolean }) {
  return (
    <svg
      viewBox="0 0 300 80"
      preserveAspectRatio="none"
      className="text-muted-foreground/20 h-90 w-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="events-bar-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />

          <stop offset="55%" stopColor="currentColor" stopOpacity="0.22" />

          <stop offset="100%" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Baseline */}
      <line
        x1="0"
        y1={BASELINE}
        x2="300"
        y2={BASELINE}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />

      {/* Bars */}
      {placeholderBars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={BASELINE - bar.mid}
          width={BAR_WIDTH}
          height={bar.mid}
          fill="url(#events-bar-gradient)"
        >
          {animated && (
            <>
              <animate
                attributeName="height"
                values={`${bar.mid};${bar.high};${bar.mid};${bar.low};${bar.mid}`}
                dur={bar.duration}
                begin={bar.delay}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.25;0.5;0.75;1"
                keySplines="
                  0.4 0 0.2 1;
                  0.4 0 0.2 1;
                  0.4 0 0.2 1;
                  0.4 0 0.2 1
                "
              />

              <animate
                attributeName="y"
                values={`
                  ${BASELINE - bar.mid};
                  ${BASELINE - bar.high};
                  ${BASELINE - bar.mid};
                  ${BASELINE - bar.low};
                  ${BASELINE - bar.mid}
                `}
                dur={bar.duration}
                begin={bar.delay}
                repeatCount="indefinite"
                calcMode="spline"
                keyTimes="0;0.25;0.5;0.75;1"
                keySplines="
                  0.4 0 0.2 1;
                  0.4 0 0.2 1;
                  0.4 0 0.2 1;
                  0.4 0 0.2 1
                "
              />
            </>
          )}
        </rect>
      ))}
    </svg>
  )
}

function EventsChart({ data }: { data: ChartDataItem[] }) {
  return (
    <ChartContainer className="h-90 w-full p-2" config={chartConfig}>
      <BarChart
        accessibilityLayer
        data={data}
        margin={{
          top: 8,
          right: 8,
          left: 8,
          bottom: 0,
        }}
      >
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          className="stroke-muted"
        />

        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          }
        />

        <YAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          width={35}
          allowDecimals={false}
        />

        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) =>
                new Date(value as string).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
          }
        />

        <ChartLegend content={<ChartLegendContent />} />

        <Bar
          dataKey="desktop"
          stackId="devices"
          fill="var(--color-desktop)"
          radius={[0, 0, 0, 0]}
        />

        <Bar
          dataKey="mobile"
          stackId="devices"
          fill="var(--color-mobile)"
          radius={[0, 0, 0, 0]}
        />

        <Bar
          dataKey="tablet"
          stackId="devices"
          fill="var(--color-tablet)"
          radius={[0, 0, 0, 0]}
        />

        <Bar
          dataKey="unknown"
          stackId="devices"
          fill="var(--color-unknown)"
          radius={[0, 0, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [range, setRange] = useState<AnalyticsRange>('30d')
  const [liveMode, setLiveMode] = useState(false)
  const [device, setDevice] = useState<DeviceFilter>('all')
  const [page, setPage] = useState(1)

  const {
    data: eventsData,
    isFetching: isEventsFetching,
    refetch: refetchEvents,
    dataUpdatedAt: eventsUpdatedAt,
  } = useQuery(
    getEventsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      category: 'all',
      device,
      page,
      page_size: PAGE_SIZE,
    })
  )

  const {
    data: chartResponse,
    isFetching: isChartFetching,
    refetch: refetchChart,
    dataUpdatedAt: chartUpdatedAt,
  } = useQuery({
    ...getEventsChartOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
    }),
    refetchInterval: liveMode ? 5000 : false,
  })

  const { data: projectData, isLoading: projectLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    })
  )

  const events = eventsData?.data
  const projectDetails = projectData?.data[0]

  const chartData = (chartResponse?.data.chartData ?? []) as ChartDataItem[]

  const hasChartData = chartData.length > 0

  const isInitialChartLoading = isChartFetching
  const isFetching = isEventsFetching || isChartFetching
  const dataUpdatedAt = Math.max(eventsUpdatedAt, chartUpdatedAt)
  const refetch = () => Promise.all([refetchEvents(), refetchChart()])

  const totalEvents = events?.total ?? 0
  const totalPages = Math.ceil(totalEvents / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalEvents === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalEvents)

  return (
    <div>
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <div className="flex min-w-0 items-center gap-4">
          {projectLoading ? (
            <Skeleton className="h-5 w-50" />
          ) : projectDetails?.domain ? (
            <Button
              render={
                <a
                  href={projectDetails.domain}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              variant="link"
              className="text-foreground min-w-0 px-0"
            >
              <LinkIcon className="mr-1 size-4 shrink-0" />

              <span className="truncate">{projectDetails.domain}</span>
            </Button>
          ) : null}

          <Separator orientation="vertical" className="hidden sm:block" />

          <p className="text-muted-foreground text-sm whitespace-nowrap">
            Last updated{' '}
            {dataUpdatedAt
              ? formatRelativeTime(new Date(dataUpdatedAt).toString())
              : '—'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Live refresh */}
          <Button
            data-live={liveMode}
            onClick={() => {
              setLiveMode((current) => !current)
            }}
            className="data-[live=true]:border-primary! data-[live=true]:bg-primary-foreground/50! data-[live=true]:text-primary! duration-200 data-[live=true]:border-dashed!"
            variant="outline"
          >
            {liveMode ? (
              <PauseIcon className="size-4" />
            ) : (
              <PlayIcon className="size-4" />
            )}

            {liveMode ? 'Pause Live' : 'Live Refresh'}
          </Button>

          {/* Manual refresh */}
          <Button
            disabled={isFetching}
            onClick={() => {
              refetch()
            }}
            variant="outline"
          >
            <RefreshCcwIcon
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Separator orientation="vertical" className="hidden sm:block" />

          {/* Date controls */}
          <ButtonGroup>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Open date picker"
                  />
                }
              >
                <CalendarIcon className="size-4" />
              </PopoverTrigger>

              <PopoverContent
                align="center"
                sideOffset={20}
                alignOffset={-20}
                className="w-fit p-0"
              >
                <Calendar mode="range" numberOfMonths={2} />
              </PopoverContent>
            </Popover>

            <Select
              value={range}
              onValueChange={(value) => {
                if (value) {
                  setRange(value as AnalyticsRange)
                }
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
                setDevice(value as DeviceFilter)
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

      {/* Page content */}
      <div className="mx-auto space-y-6 p-6">
        {/* Heading */}
        <div>
          <p className="text-xl font-medium">Events</p>

          <p className="text-muted-foreground text-sm">
            View and monitor all events captured across your project.
          </p>
        </div>

        {/* Events chart */}
        <Card className="bg-card/30 overflow-hidden rounded-none border-2 border-dashed p-0">
          <CardContent className="p-0">
            {isInitialChartLoading ? (
              /**
               * Initial loading state.
               *
               * Gradient stays static.
               * Only bar height moves very slightly.
               */
              <EventsChartPlaceholder animated />
            ) : !hasChartData ? (
              /**
               * Empty state.
               *
               * Completely static — no animation.
               */
              <div className="relative h-90 w-full">
                <EventsChartPlaceholder />

                <Badge
                  variant="outline"
                  className="bg-background/60 absolute top-1/2 left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lg px-3 py-1 backdrop-blur-md"
                >
                  No Data
                </Badge>
              </div>
            ) : (
              /**
               * Real data.
               *
               * During manual/live background refresh,
               * this chart stays visible rather than
               * being replaced by the loader.
               */
              <EventsChart data={chartData} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <InputGroup className="w-120">
              <InputGroupButton>
                <SearchIcon />
              </InputGroupButton>
              <InputGroupInput placeholder="Search..." />
            </InputGroup>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead className="w-24 text-center">Category</TableHead>
                    <TableHead className="w-32 text-center">Country</TableHead>
                    <TableHead className="w-32 text-center">Visitor</TableHead>
                    <TableHead className="w-32 text-center">Device</TableHead>
                    <TableHead className="w-32 text-center">Occurred</TableHead>
                    <TableHead className="w-20 text-center">Replay</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isEventsFetching
                    ? [...Array(PAGE_SIZE)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="space-y-1.5">
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-3 w-32" />
                            </div>
                          </TableCell>

                          <TableCell className="w-24">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-16" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-14" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-24" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-16" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-20" />
                            </div>
                          </TableCell>

                          <TableCell className="w-20">
                            <div className="flex justify-center">
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : events?.events?.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-card/40 cursor-pointer"
                        >
                          <TableCell>
                            <div className="flex flex-col justify-center overflow-hidden">
                              <p className="truncate text-sm">
                                {item.description}
                              </p>

                              <p className="text-muted-foreground truncate text-xs">
                                {item.path}
                                {item.title ? ` · ${item.title}` : ''}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="w-24 text-center">
                            {item.category}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.country}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            Anonymous #{item.visitorId.slice(0, 8)}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap capitalize">
                            {item.device}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {formatRelativeTime(item.occurredAt)}
                          </TableCell>

                          <TableCell className="w-20 text-center">
                            {item.replayAvailable ? (
                              <Button size="icon" variant="outline">
                                <PlayIcon />
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                  {!isEventsFetching && !events?.events?.length && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center">
                        <p className="text-muted-foreground text-sm">
                          No events found.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  {totalEvents > 0 ? (
                    <>
                      Showing {from}-{to} of {totalEvents} events
                    </>
                  ) : (
                    'No events'
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isEventsFetching}
                    onClick={() => {
                      setPage((current) => Math.max(current - 1, 1))
                    }}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {paginationItems.map((item, index) => {
                      if (item === 'ellipsis') {
                        return (
                          <span
                            key={`ellipsis-${index}`}
                            className="text-muted-foreground flex size-8 items-center justify-center text-sm"
                          >
                            ...
                          </span>
                        )
                      }

                      return (
                        <Button
                          key={item}
                          variant={page === item ? 'outline' : 'ghost'}
                          size="icon"
                          className="size-8"
                          disabled={isEventsFetching}
                          onClick={() => {
                            setPage(item)
                          }}
                        >
                          {item}
                        </Button>
                      )
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isEventsFetching}
                    onClick={() => {
                      setPage((current) => Math.min(current + 1, totalPages))
                    }}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
