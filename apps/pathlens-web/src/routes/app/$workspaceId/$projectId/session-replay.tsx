import { getProjectDomainsOptions } from '@/queries/domains'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import {
  getSessionReplayDetailOptions,
  getSessionReplayOptions,
  type SessionReplayDevice,
  type SessionReplayRange,
} from '@/queries/session-replay'
import { Separator } from '@workspace/ui/components/separator'
import {
  formatDate,
  formatRelativeTime,
  getPaginationItems,
} from '@/utils/utils'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { Button } from '@workspace/ui/components/button'
import {
  CalendarIcon,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
  SearchIcon,
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
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Badge } from '@workspace/ui/components/badge'
import { SessionReplayPlayer } from '@/components/common/session-replay-player'

const PAGE_SIZE = 50

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/session-replay'
)({
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

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [range, setRange] = useState<SessionReplayRange>('7d')
  const [liveMode, setLiveMode] = useState(false)
  const [page, setPage] = useState(1)
  const [domain, setDomain] = useState('')
  const [device, setDevice] = useState<SessionReplayDevice>('all')
  const [open, setOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch,
    dataUpdatedAt,
    isRefetching,
  } = useQuery(
    getSessionReplayOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      device,
      page,
      page_size: PAGE_SIZE,
      range,
      domain,
      search: undefined,
    })
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

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const sessions = sessionsData?.data
  const domains = domainsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt, 60_000)

  const totalSessions = sessions?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalSessions / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalSessions === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalSessions)

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
                if (value) setRange(value as SessionReplayRange)
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
                setDevice(value as SessionReplayDevice)
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
          <p className="text-xl font-medium">Session Replay</p>

          <p className="text-muted-foreground text-sm">
            Replay real user sessions and see exactly how visitors interact with
            your project.
          </p>
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <InputGroup className="w-120">
              <InputGroupButton>
                <SearchIcon />
              </InputGroupButton>
              <InputGroupInput placeholder="Search..." />
            </InputGroup>
          </div>

          <div>
            <div className="overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead className="w-32 text-center">Country</TableHead>
                    <TableHead className="w-32 text-center">Device</TableHead>
                    <TableHead className="w-32 text-center">Duration</TableHead>
                    <TableHead className="w-32 text-center">Source</TableHead>
                    <TableHead className="w-20 text-center">
                      Total Events
                    </TableHead>
                    <TableHead className="w-32 text-center">
                      Recorded at
                    </TableHead>
                    <TableHead className="w-32 text-center">Replay</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {sessionsLoading
                    ? [...Array(PAGE_SIZE)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-5 w-64" />
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-16" />
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
                              <Skeleton className="h-5 w-10" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-24" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : sessions?.sessions?.map((item) => (
                        <TableRow
                          onClick={() => {
                            setOpen(true)
                            setSessionId(item.id)
                          }}
                          key={item.id}
                          className="hover:bg-card/40 cursor-pointer"
                        >
                          <TableCell>
                            {item.visitorId}
                            <Badge
                              className="ml-2"
                              variant={item.isLive ? 'default' : 'secondary'}
                            >
                              {item.isLive ? 'Live' : 'Offline'}
                            </Badge>
                          </TableCell>

                          <TableCell className="w-24 text-center">
                            {item.country}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.device}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.duration}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.source}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.eventCount}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {formatDate(item.recordedAt)}
                          </TableCell>

                          <TableCell className="w-20 text-center">
                            <Button
                              size="icon"
                              variant={'outline'}
                              disabled={!item.isReplayAvailable}
                            >
                              <PlayIcon />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                  {!sessionsLoading && !sessions?.sessions?.length && (
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
                  {totalSessions > 0 ? (
                    <>
                      Showing {from}-{to} of {totalSessions} events
                    </>
                  ) : (
                    'No events'
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || sessionsLoading}
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
                          disabled={sessionsLoading}
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
                    disabled={page >= totalPages || sessionsLoading}
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
