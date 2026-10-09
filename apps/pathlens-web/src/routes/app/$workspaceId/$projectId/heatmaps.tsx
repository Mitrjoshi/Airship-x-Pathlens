import { useRelativeTime } from '@/hooks/use-relative-time'
import { Replayer } from 'rrweb'
import type { eventWithTime } from 'rrweb'
import { getProjectDomainsOptions } from '@/queries/domains'
import {
  getHeatmapDetailsOptions,
  getHeatmapsOptions,
  type HeatmapDevice,
  type HeatmapsRange,
} from '@/queries/heatmaps'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { Separator } from '@workspace/ui/components/separator'
import {
  formatNumber,
  formatRelativeTime,
  getPaginationItems,
} from '@/utils/utils'
import { Button } from '@workspace/ui/components/button'
import {
  CalendarIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
} from 'lucide-react'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Calendar } from '@workspace/ui/components/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import type { HeatmapPageDetail } from '@workspace/contracts'
import 'rrweb/dist/style.css'

export const Route = createFileRoute('/app/$workspaceId/$projectId/heatmaps')({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const deviceLabels = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const PAGE_SIZE = 50

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [range, setRange] = useState<HeatmapsRange>('7d')
  const [liveMode, setLiveMode] = useState(false)
  const [page, setPage] = useState(1)
  const [device, setDevice] = useState<HeatmapDevice>('all')
  const [domain, setDomain] = useState('')
  const [path, setPath] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const {
    data: heatmapsData,
    isLoading: heatmapsLoading,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery(
    getHeatmapsOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      range,
      device,
      // page_path,
      domain,
      page,
      page_size: PAGE_SIZE,
    })
  )

  const { data: heatmapDetails, isLoading: heatmapDetailsLoading } = useQuery(
    getHeatmapDetailsOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      range,
      device,
      page_path: path,
      domain,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const heatmaps = heatmapsData?.data
  const heatmap = heatmapDetails?.data
  const domains = domainsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt, 60_000)

  const totalEvents = heatmaps?.pagination?.total ?? 0
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
    <Dialog open={open} onOpenChange={setOpen}>
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
              <p className="text-muted-foreground text-sm">
                Last updated{' '}
                {lastUpdated &&
                  formatRelativeTime(new Date(lastUpdated).toString())}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              data-live={liveMode}
              onClick={() => setLiveMode(!liveMode)}
              className="data-[live=true]:bg-primary/20! data-[live=true]:border-primary! data-[live=true]:text-primary! duration-200 data-[live=true]:border-dashed!"
              variant="outline"
            >
              {liveMode ? <PauseIcon /> : <PlayIcon />}
              Live Refresh
            </Button>
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
                  if (value) setRange(value as HeatmapsRange)
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
                  setDevice(value as HeatmapDevice)
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
          <div>
            <p className="text-xl font-medium">Heatmaps</p>

            <p className="text-muted-foreground text-sm">
              Visualize user interactions and identify the most engaged areas of
              your project.
            </p>
          </div>

          <div className="overflow-hidden border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-32 text-center">Path</TableHead>
                  <TableHead className="w-32 text-center">Visitor</TableHead>
                  <TableHead className="w-32 text-center">Views</TableHead>
                  <TableHead className="w-32 text-center">Clicks</TableHead>
                  <TableHead className="w-32 text-center">Max Scroll</TableHead>
                  <TableHead className="w-32 text-center">Heatmap</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {heatmapsLoading
                  ? [...Array(PAGE_SIZE)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-3 w-32" />
                        </TableCell>

                        <TableCell className="w-24">
                          <div className="flex justify-center">
                            <Skeleton className="h-5 w-16" />
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
                  : heatmaps?.pages?.map((item, index) => (
                      <TableRow
                        onClick={() => {
                          setOpen(true)
                          setPath(item.path)
                        }}
                        key={index}
                        className="hover:bg-card/40 cursor-pointer"
                      >
                        <TableCell>{item.url}</TableCell>

                        <TableCell className="w-24 text-center">
                          {item.path}
                        </TableCell>

                        <TableCell className="w-32 text-center whitespace-nowrap">
                          {formatNumber(item.visitors)}
                        </TableCell>

                        <TableCell className="w-32 text-center whitespace-nowrap">
                          {formatNumber(item.views)}
                        </TableCell>

                        <TableCell className="w-32 text-center whitespace-nowrap">
                          {formatNumber(item.clicks)}
                        </TableCell>

                        <TableCell className="w-32 text-center whitespace-nowrap">
                          {item.maxScroll}%
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

                {!heatmapsLoading && !heatmaps?.pages?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <p className="text-muted-foreground text-sm">
                        No heatmaps found.
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
                  disabled={page <= 1 || heatmapsLoading}
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
                        disabled={heatmapsLoading}
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
                  disabled={page >= totalPages || heatmapsLoading}
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

      <DialogContent className="w-[95vw] max-w-4xl!">
        <DialogHeader>
          <DialogTitle>View Heatmap</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] min-w-0 overflow-y-auto">
          <HeatmapPreview heatmap={heatmap} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export const HeatmapPreview = ({
  heatmap,
}: {
  heatmap: HeatmapPageDetail | null | undefined
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [scale, setScale] = useState(1)

  const metaEvent = heatmap?.replayEvents?.find((event) => event.type === 4)

  const viewportWidth = metaEvent?.data?.width ?? 1920
  const viewportHeight = metaEvent?.data?.height ?? 1080

  // Dynamically calculate available width
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const observer = new ResizeObserver(([entry]) => {
      const availableWidth = entry.contentRect.width

      setScale(Math.min(availableWidth / viewportWidth, 1))
    })

    observer.observe(wrapper)

    return () => observer.disconnect()
  }, [viewportWidth])

  // Initialize rrweb
  useEffect(() => {
    const container = containerRef.current
    const events = heatmap?.replayEvents as eventWithTime[] | undefined

    if (!container || !events?.length) return

    const replayer = new Replayer(events, {
      root: container,
      mouseTail: false,
      showWarning: false,
    })

    const first = events[1].timestamp
    const last = events[events.length - 1].timestamp

    replayer.pause(last - first)

    return () => {
      replayer.destroy()
    }
  }, [heatmap])

  if (!heatmap) return null

  return (
    <div className="w-full min-w-0">
      <div ref={wrapperRef} className="w-full">
        <div
          style={{
            width: viewportWidth * scale,
            height: viewportHeight * scale,
            position: 'relative',
          }}
        >
          <div
            ref={containerRef}
            style={{
              width: viewportWidth,
              height: viewportHeight,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
