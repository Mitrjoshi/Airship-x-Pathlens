import { useRelativeTime } from '@/hooks/use-relative-time'
import { getProjectDomainsOptions } from '@/queries/domains'
import {
  getPerformanceOptions,
  type PerformanceDevice,
  type PerformanceRange,
} from '@/queries/performance'
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
import { CalendarIcon, RefreshCcwIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis } from 'recharts'
import { DomainSwitcher } from './-components/common/domain-switcher'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/performance'
)({
  component: RouteComponent,
})

const summaryItems = [
  {
    key: 'avgTtfb',
    label: 'Average TTFB',
    description: 'Time until the first byte arrives from your server.',
    target: 800,
    advice:
      'Improve server response time with caching, database tuning, or a CDN.',
  },
  {
    key: 'avgDomLoaded',
    label: 'Average DOM Ready',
    description: 'Time until the initial document is parsed and ready.',
    target: 1000,
    advice:
      'Defer non-critical JavaScript and reduce render-blocking resources.',
  },
  {
    key: 'avgLoad',
    label: 'Average Page Load',
    description:
      'Time until the page and its dependent resources finish loading.',
    target: 2500,
    advice:
      'Compress images, remove unused JavaScript, and lazy-load below-the-fold content.',
  },
  {
    key: 'avgDns',
    label: 'Average DNS',
    description: 'Time spent resolving your domain name.',
    target: 100,
    advice:
      'Use a fast DNS provider and reduce unnecessary third-party lookups.',
  },
  {
    key: 'avgTcp',
    label: 'Average TCP Connect',
    description: 'Time required to establish a connection with your server.',
    target: 100,
    advice:
      'Serve users from a nearby region and enable connection reuse with HTTP/2 or HTTP/3.',
  },
  {
    key: 'p75Ttfb',
    label: 'P75 TTFB',
    description: 'TTFB experienced by 75% of your visitors.',
    target: 800,
    advice:
      'Prioritize slow regions and backend routes with caching and edge delivery.',
  },
  {
    key: 'p75DomLoaded',
    label: 'P75 DOM Ready',
    description: 'DOM ready time experienced by 75% of your visitors.',
    target: 1000,
    advice:
      'Reduce main-thread work and defer scripts that are not needed for the first view.',
  },
  {
    key: 'p75Load',
    label: 'P75 Page Load',
    description: 'Page load time experienced by 75% of your visitors.',
    target: 2500,
    advice:
      'Optimize the largest resources and prioritize content visible in the first viewport.',
  },
  {
    key: 'totalSamples',
    label: 'Total Samples',
    description: 'Number of real page loads included in these measurements.',
    target: null,
    advice:
      'Install the tracker on every page and allow more visits to build a representative sample.',
  },
] as const

const getMetricStatus = (
  value: number,
  target: number | null,
  totalSamples: number
) => {
  if (totalSamples === 0) {
    return { label: 'No data', className: 'text-muted-foreground' }
  }

  if (target === null) {
    return { label: 'Collecting data', className: 'text-primary' }
  }

  if (value <= target) {
    return { label: 'Good', className: 'text-primary' }
  }

  return { label: 'Needs attention', className: 'text-destructive' }
}

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
  dns: {
    label: 'DNS',
    color: 'var(--chart-4)',
  },
  tcp: {
    label: 'TCP',
    color: 'var(--chart-5)',
  },
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

  const [range, setRange] = useState<PerformanceRange>('7d')
  const [device, setDevice] = useState<PerformanceDevice>('all')
  const [domain, setDomain] = useState('')

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
      domain,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const lastUpdated = useRelativeTime(dataUpdatedAt, 60_000)

  const performance = performanceData?.data
  const domains = domainsData?.data

  useEffect(() => {
    if (domains) {
      setDomain(domains[0].domain)
    }
  }, [domains])

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <DomainSwitcher
            loading={domainsLoading}
            domain={domain}
            setDomain={setDomain}
            domains={domains!}
            refetch={refetch}
          />

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
              items={rangeLabels}
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as PerformanceRange)
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

          <Select
            items={deviceLabels}
            value={device}
            onValueChange={(value) => {
              if (value) {
                setDevice(value as PerformanceDevice)
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
                      type="monotone"
                      dataKey="dns"
                      stroke="var(--color-dns)"
                    />
                    <Line
                      dot={false}
                      type="monotone"
                      dataKey="tcp"
                      stroke="var(--color-tcp)"
                    />
                    <Line
                      dot={false}
                      type="monotone"
                      dataKey="ttfb"
                      stroke="var(--color-ttfb)"
                    />
                    <Line
                      type="monotone"
                      dot={false}
                      dataKey="domLoaded"
                      stroke="var(--color-domLoaded)"
                    />
                    <Line
                      type="monotone"
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaryItems.map((item) => {
            const value = performance?.summary?.[item.key] ?? 0
            const totalSamples = performance?.summary?.totalSamples ?? 0
            const status = getMetricStatus(value, item.target, totalSamples)

            return (
              <Card
                className="bg-card/30 gap-4 rounded-none border-2 border-dashed p-4"
                key={item.key}
              >
                <CardHeader className="gap-2 p-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardDescription>{item.label}</CardDescription>
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${status.className}`}
                    >
                      {status.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl">
                    {formatNumber(value)}
                    {item.key !== 'totalSamples' && (
                      <span className="text-muted-foreground ml-1 text-sm font-normal">
                        ms
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 p-0">
                  {performanceLoading ? (
                    <Skeleton className="h-12 w-full" />
                  ) : (
                    <>
                      <p className="text-muted-foreground text-sm">
                        {item.description}
                      </p>
                      <p
                        className={`text-sm ${status.label === 'Good' ? 'text-primary' : 'text-muted-foreground'}`}
                      >
                        {status.label === 'Good'
                          ? 'Good. This metric is within the recommended range.'
                          : item.advice}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
