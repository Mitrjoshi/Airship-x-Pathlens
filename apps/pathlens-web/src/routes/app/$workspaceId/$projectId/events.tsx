import { type AnalyticsRange } from '@/queries/analytics'
import {
  getEventsChartOptions,
  getEventsOptions,
  type EventsCategory,
  type EventsDevice,
  type EventsRange,
  type ProjectEvent,
} from '@/queries/events'
import {
  capitalizeFirstLetter,
  formatRelativeTime,
  getPaginationItems,
} from '@/utils/utils'

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
  CheckIcon,
  CopyIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
  SearchIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { DotSeparator, DotSeparatorItem } from '../../-components/dot-separator'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { getProjectDomainsOptions } from '@/queries/domains'
import { SessionReplayPlayer } from '@/components/common/session-replay-player'
import { getSessionReplayDetailOptions } from '@/queries/session-replay'

export const Route = createFileRoute('/app/$workspaceId/$projectId/events')({
  component: RouteComponent,
})

const deviceLabels = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const chartConfig = {
  views: {
    label: 'Events',
  },
  desktop: {
    label: 'Desktop',
    color: 'var(--chart-1)',
  },
  mobile: {
    label: 'Mobile',
    color: 'var(--chart-2)',
  },
  tablet: {
    label: 'Tablet',
    color: 'var(--chart-3)',
  },
  unknown: {
    label: 'Unknown',
    color: 'var(--chart-4)',
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

const categoryOptions: { label: string; value: EventsCategory }[] = [
  { label: 'High signal', value: 'high_signal' },
  { label: 'All events', value: 'all' },
  { label: 'Actions', value: 'actions' },
  { label: 'Forms', value: 'forms' },
]

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

  const [range, setRange] = useState<AnalyticsRange>('7d')
  const [liveMode, setLiveMode] = useState(false)
  const [device, setDevice] = useState<EventsDevice>('all')
  const [page, setPage] = useState(1)
  const [event, setEvent] = useState<ProjectEvent | null>(null)
  const [category, setCategory] = useState<EventsCategory>('high_signal')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [domain, setDomain] = useState('')
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

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
      category,
      device,
      page,
      page_size: PAGE_SIZE,
      domain,
    })
  )

  const {
    data: chartResponse,
    isFetching: isChartFetching,
    refetch: refetchChart,
    dataUpdatedAt: chartUpdatedAt,
  } = useQuery(
    getEventsChartOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      domain,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const {
    data: sessionDetails,
    isLoading: sessionDetailsLoading,
    isError: sessionDetailsError,
  } = useQuery(
    getSessionReplayDetailOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      session_id: sessionId ?? '',
      domain,
    })
  )

  const events = eventsData?.data
  const domains = domainsData?.data

  const chartData = (chartResponse?.data.chartData ?? []) as ChartDataItem[]

  const hasChartData = chartData.some(
    (item) =>
      item.desktop > 0 || item.mobile > 0 || item.tablet > 0 || item.unknown > 0
  )

  const isInitialChartLoading = isChartFetching
  const isFetching = isEventsFetching || isChartFetching
  const dataUpdatedAt = Math.max(eventsUpdatedAt, chartUpdatedAt)
  const refetch = () => Promise.all([refetchEvents(), refetchChart()])

  const totalEvents = events?.total ?? 0
  const totalPages = Math.ceil(totalEvents / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalEvents === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalEvents)

  useEffect(() => {
    if (domains) {
      setDomain(domains[0].domain)
    }
  }, [domains])

  return (
    <div>
      {/* Top toolbar */}
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex min-w-0 items-center gap-4">
          <DomainSwitcher
            loading={domainsLoading}
            domain={domain}
            setDomain={setDomain}
            domains={domains!}
            refetch={refetch}
          />

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
              items={rangeLabels}
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as EventsRange)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {rangeLabels.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ButtonGroup>
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
              <EventsChartPlaceholder animated />
            ) : !hasChartData ? (
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

            <div className="flex items-center justify-between gap-2">
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value as EventsCategory)
                  setPage(1)
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue>
                    {
                      categoryOptions.find(
                        (option) => option.value === category
                      )?.label
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                items={deviceLabels}
                value={device}
                onValueChange={(value) => {
                  if (value) {
                    setDevice(value as EventsDevice)
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent alignItemWithTrigger={false}>
                  {deviceLabels.map((device) => (
                    <SelectItem key={device.value} value={device.value}>
                      {device.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="">
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
                          onClick={() => {
                            setEvent(item)
                            setSheetOpen(true)
                          }}
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
                              <Button
                                onClick={(e) => e.preventDefault()}
                                size="icon"
                                variant="outline"
                              >
                                <PlayIcon />
                              </Button>
                            ) : (
                              <div className="flex justify-center">
                                <MinusIcon className="text-muted-foreground" />
                              </div>
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

          <Sheet
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            onOpenChangeComplete={(open) => {
              if (!open) setEvent(null)
            }}
          >
            <SheetContent className="flex w-full max-w-lg! flex-col gap-0 p-0">
              <SheetHeader className="border-b px-6 py-5">
                <div className="space-y-2">
                  <div>
                    <SheetTitle className="text-lg">
                      {event?.description}
                    </SheetTitle>

                    <SheetDescription>
                      Event details and performance information
                    </SheetDescription>
                  </div>

                  <DotSeparator className="text-muted-foreground text-sm">
                    <DotSeparatorItem>
                      <Badge variant="secondary">
                        {capitalizeFirstLetter(event?.category)}
                      </Badge>
                    </DotSeparatorItem>

                    <DotSeparatorItem>{event?.device}</DotSeparatorItem>

                    <DotSeparatorItem>{event?.browser}</DotSeparatorItem>
                  </DotSeparator>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-6 p-6">
                  <section className="space-y-3">
                    <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Performance
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <MetricCard
                        label="TTFB"
                        value={`${event?.details?.ttfb ?? 0} ms`}
                      />

                      <MetricCard
                        label="DOM Loaded"
                        value={`${event?.details?.domLoaded ?? 0} ms`}
                      />

                      <MetricCard
                        label="Load"
                        value={`${event?.details?.load ?? 0} ms`}
                      />

                      <MetricCard
                        label="DNS"
                        value={`${event?.details?.dns ?? 0} ms`}
                      />

                      <MetricCard
                        label="TCP"
                        value={`${event?.details?.tcp ?? 0} ms`}
                      />
                    </div>
                  </section>

                  <Separator />

                  <EventSection title="Page">
                    <EventRow label="Title" value={event?.title} />

                    <EventRow
                      label="Path"
                      value={
                        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                          {event?.path}
                        </code>
                      }
                    />

                    <EventRow
                      label="URL"
                      value={
                        <a
                          href={event?.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground truncate underline underline-offset-4"
                        >
                          {event?.url}
                        </a>
                      }
                    />
                  </EventSection>

                  <Separator />

                  <EventSection title="Visitor">
                    <EventRow label="Device" value={event?.device} />

                    <EventRow
                      label="Operating system"
                      value={`${event?.os} ${event?.osVersion}`}
                    />

                    <EventRow
                      label="Browser"
                      value={`${event?.browser} ${event?.browserVersion}`}
                    />

                    <EventRow label="Country" value={event?.countryCode} />
                  </EventSection>

                  <Separator />

                  <EventSection title="Session">
                    <EventRow
                      label="Session ID"
                      value={<CopyableValue value={event?.sessionId} />}
                    />

                    <EventRow
                      label="Visitor ID"
                      value={<CopyableValue value={event?.visitorId} />}
                    />

                    <EventRow
                      label="Replay"
                      value={
                        event?.replayAvailable ? (
                          <Badge variant="outline">Available</Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            Unavailable
                          </span>
                        )
                      }
                    />

                    <Button
                      disabled={!event?.replayAvailable}
                      onClick={() => {
                        if (event?.sessionId) {
                          setSessionId(event?.sessionId)
                          setOpen(true)
                        }
                      }}
                      className="w-full"
                    >
                      {event?.replayAvailable
                        ? 'View session replay'
                        : 'Replay Unavailable'}
                    </Button>
                  </EventSection>

                  <Separator />

                  <EventSection title="Referrer">
                    <EventRow
                      label="Domain"
                      value={event?.referrerDomain || 'Direct'}
                    />

                    <EventRow label="URL" value={event?.referrer || 'Direct'} />
                  </EventSection>

                  <Separator />

                  <EventSection title="Event">
                    <EventRow label="Event ID" value={event?.id} />

                    <EventRow label="Type" value={event?.type} />

                    <EventRow label="Category" value={event?.category} />

                    <EventRow label="Occurred at" value={event?.occurredAt} />
                  </EventSection>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <SessionReplayPlayer
        open={open}
        onOpenChange={(o) => {
          if (!o) setSessionId(null)
          setOpen(o)
        }}
        detail={sessionDetails?.data}
        isError={sessionDetailsError}
        isLoading={sessionDetailsLoading}
        projectId={projectId}
        workspaceId={workspaceId}
      />
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 border-2 border-dashed p-3">
      <p className="text-muted-foreground text-xs">{label}</p>

      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function EventSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {title}
      </p>

      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EventRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>

      <div className="min-w-0 break-words">{value || '—'}</div>
    </div>
  )
}

function CopyableValue({ value }: { value?: string | null }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!value) return

    await navigator.clipboard.writeText(value)

    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  if (!value) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-mono text-xs">{value}</span>

      <Button
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={handleCopy}
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </Button>
    </div>
  )
}
