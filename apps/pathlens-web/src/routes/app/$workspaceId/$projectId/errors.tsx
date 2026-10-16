import { getProjectDomainsOptions } from '@/queries/domains'
import {
  getErrorsOptions,
  type ErrorGroup,
  type ErrorsDevice,
  type ErrorsRange,
} from '@/queries/errors'
import { formatDate, getPaginationItems } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { PauseIcon, PlayIcon, RefreshCcwIcon, SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { useRelativeTime } from '@/hooks/use-relative-time'
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
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { CopyableValue, EventRow, EventSection, MetricCard } from './events'
import { Badge } from '@workspace/ui/components/badge'
import { SessionReplayPlayer } from '@/components/common/session-replay-player'
import { getSessionReplayDetailOptions } from '@/queries/session-replay'
import { DotSeparator, DotSeparatorItem } from '../../-components/dot-separator'

export const Route = createFileRoute('/app/$workspaceId/$projectId/errors')({
  component: RouteComponent,
})

const deviceLabels = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const browserLabels = [
  { value: 'all', label: 'All browsers' },
  { value: 'chrome', label: 'Google Chrome' },
  { value: 'safari', label: 'Safari' },
  { value: 'edge', label: 'Microsoft Edge' },
  { value: 'firefox', label: 'Mozilla Firefox' },
  { value: 'samsung', label: 'Samsung Internet' },
  { value: 'opera', label: 'Opera' },
  { value: 'unknown', label: 'Unknown' },
]

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const PAGE_SIZE = 10

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const rangeLocal = localStorage.getItem('range')
  const deviceLocal = localStorage.getItem('device')

  const [range, setRange] = useState<ErrorsRange>(
    (rangeLocal || '7d') as ErrorsRange
  )
  const [device, setDevice] = useState<ErrorsDevice>(
    (deviceLocal || 'all') as ErrorsDevice
  )
  const [browser, setBrowser] = useState('all')
  const [page, setPage] = useState(1)
  const [domain, setDomain] = useState('')
  const [liveMode, setLiveMode] = useState(false)
  const [open, setOpen] = useState(false)
  const [errorGroup, setErrorGroup] = useState<ErrorGroup | null>(null)
  const [replayOpen, setReplayOpen] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const {
    data: errorData,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery(
    getErrorsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      device,
      browser: browser === 'all' ? undefined : browser,
      url: domain,
      search: undefined,
      page,
      page_size: PAGE_SIZE,
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

  const errors = errorData?.data
  const domains = domainsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const totalErrors = errors?.pagination.total ?? 0
  const totalPages = Math.ceil(totalErrors / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalErrors === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalErrors)

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
            Last updated {lastUpdated ? lastUpdated : '—'}
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
            disabled={isRefetching}
            onClick={() => {
              refetch()
            }}
            variant="outline"
          >
            <RefreshCcwIcon
              className={`size-4 ${isRefetching ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <Select
            items={rangeLabels}
            value={range}
            onValueChange={(value) => {
              if (!value) return
              setRange(value as ErrorsRange)
              localStorage.setItem('range', value)
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

          <Select
            items={deviceLabels}
            value={device}
            onValueChange={(value) => {
              if (value) {
                setDevice(value as ErrorsDevice)
                localStorage.setItem('device', value)
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

          <Select
            items={browserLabels}
            value={browser}
            onValueChange={(value) => {
              if (value) {
                setBrowser(value)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>

            <SelectContent alignItemWithTrigger={false}>
              {browserLabels.map((device) => (
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
          <p className="text-xl font-medium">Error Events</p>

          <p className="text-muted-foreground text-sm">
            View and monitor all error events captured across your project.
          </p>
        </div>

        <div className="space-y-5">
          <InputGroup className="w-120">
            <InputGroupButton>
              <SearchIcon />
            </InputGroupButton>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>

          <div className="">
            <div className="overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead className="w-24 text-center">Browsers</TableHead>
                    <TableHead className="w-20 text-center">Message</TableHead>
                    <TableHead className="w-32 text-center">
                      Affected Sessions
                    </TableHead>
                    <TableHead className="w-32 text-center">
                      Affected Users
                    </TableHead>
                    <TableHead className="w-32 text-center">Devices</TableHead>
                    <TableHead className="w-32 text-center">
                      First Seen
                    </TableHead>
                    <TableHead className="w-20 text-center">
                      Last Seen
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading
                    ? [...Array(PAGE_SIZE)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-4 w-32" />
                          </TableCell>

                          <TableCell className="w-24">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-20" />
                            </div>
                          </TableCell>

                          <TableCell className="w-20">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-16" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-12" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-12" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-5 w-20" />
                            </div>
                          </TableCell>

                          <TableCell className="w-32">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-24" />
                            </div>
                          </TableCell>

                          <TableCell className="w-20">
                            <div className="flex justify-center">
                              <Skeleton className="h-4 w-24" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : errors?.errors?.map((item, index) => (
                        <TableRow
                          onClick={() => {
                            setOpen(true)
                            setErrorGroup(item)
                          }}
                          key={index}
                          className="hover:bg-card/40 cursor-pointer"
                        >
                          <TableCell>{item.type}</TableCell>

                          <TableCell className="w-24 text-center">
                            {item.browsers[0].name}
                          </TableCell>

                          <TableCell className="w-20 text-center">
                            {item.message}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.affectedSessions}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {item.affectedUsers}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap capitalize">
                            {item.devices[0].name}
                          </TableCell>

                          <TableCell className="w-32 text-center whitespace-nowrap">
                            {formatDate(item.firstSeen)}
                          </TableCell>

                          <TableCell className="w-20 text-center">
                            {formatDate(item.lastSeen)}
                          </TableCell>
                        </TableRow>
                      ))}

                  {!isLoading && !errors?.errors?.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center">
                        <p className="text-muted-foreground text-sm">
                          No error events found.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  {totalErrors > 0 ? (
                    <>
                      Showing {from}-{to} of {totalErrors} events
                    </>
                  ) : (
                    'No events'
                  )}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isFetching}
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
                          disabled={isFetching}
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
                    disabled={page >= totalPages || isFetching}
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
            open={open}
            onOpenChange={setOpen}
            onOpenChangeComplete={(o) => {
              if (!o) setErrorGroup(null)
            }}
          >
            <SheetContent className="flex w-full max-w-lg! flex-col gap-0 p-0">
              <SheetHeader className="border-b px-6 py-5">
                <div className="space-y-2">
                  <div>
                    <SheetTitle className="text-lg wrap-break-word">
                      {errorGroup?.message}
                    </SheetTitle>

                    <SheetDescription>
                      Error details and occurrence information
                    </SheetDescription>
                  </div>

                  <DotSeparator className="text-muted-foreground text-sm">
                    <DotSeparatorItem>
                      <Badge variant="destructive">
                        {errorGroup?.type === 'javascript_error'
                          ? 'JavaScript Error'
                          : 'Promise Rejection'}
                      </Badge>
                    </DotSeparatorItem>

                    <DotSeparatorItem>
                      {errorGroup?.errorCount ?? 0} occurrences
                    </DotSeparatorItem>

                    <DotSeparatorItem>
                      {errorGroup?.affectedUsers ?? 0} users
                    </DotSeparatorItem>
                  </DotSeparator>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto">
                <div className="space-y-6 p-6">
                  {/* Performance */}
                  <section className="space-y-3">
                    <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Impact
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <MetricCard
                        label="Occurrences"
                        value={String(errorGroup?.errorCount ?? 0)}
                      />

                      <MetricCard
                        label="Users"
                        value={String(errorGroup?.affectedUsers ?? 0)}
                      />

                      <MetricCard
                        label="Sessions"
                        value={String(errorGroup?.affectedSessions ?? 0)}
                      />
                    </div>
                  </section>

                  <Separator />

                  {/* Error */}
                  <EventSection title="Error">
                    <EventRow
                      label="Type"
                      value={
                        errorGroup?.type === 'javascript_error'
                          ? 'JavaScript Error'
                          : 'Promise Rejection'
                      }
                    />

                    <EventRow label="Message" value={errorGroup?.message} />

                    <EventRow
                      label="Fingerprint"
                      value={<CopyableValue value={errorGroup?.fingerprint} />}
                    />

                    <EventRow
                      label="First seen"
                      value={errorGroup?.firstSeen}
                    />

                    <EventRow label="Last seen" value={errorGroup?.lastSeen} />
                  </EventSection>

                  <Separator />

                  {/* Stack Trace */}
                  <section className="space-y-3">
                    <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                      Stack Trace
                    </p>

                    {errorGroup?.stackTrace ||
                    errorGroup?.sample?.stackTrace ? (
                      <div className="bg-muted/50 overflow-hidden rounded-md border">
                        <div className="max-h-64 overflow-auto p-3">
                          <pre className="text-muted-foreground font-mono text-xs leading-relaxed break-all whitespace-pre-wrap">
                            {errorGroup?.stackTrace ||
                              errorGroup?.sample?.stackTrace}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No stack trace available
                      </p>
                    )}
                  </section>

                  <Separator />

                  {/* Browsers */}
                  <EventSection title="Browsers">
                    {errorGroup?.browsers.length ? (
                      errorGroup.browsers.map((browser) => (
                        <EventRow
                          fullWidth
                          key={browser.name}
                          label={browser.name}
                          value={
                            <Badge variant="secondary">{browser.count}</Badge>
                          }
                        />
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No browser information available
                      </p>
                    )}
                  </EventSection>

                  <Separator />

                  {/* Devices */}
                  <EventSection title="Devices">
                    {errorGroup?.devices.length ? (
                      errorGroup.devices.map((device) => (
                        <EventRow
                          fullWidth
                          key={device.name}
                          label={device.name}
                          value={
                            <Badge variant="secondary">{device.count}</Badge>
                          }
                        />
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No device information available
                      </p>
                    )}
                  </EventSection>

                  <Separator />

                  {/* Affected URLs */}
                  <EventSection title="Affected URLs">
                    {errorGroup?.urls.length ? (
                      errorGroup.urls.map((url) => (
                        <EventRow
                          fullWidth
                          key={url.name}
                          label={
                            <span
                              className="block w-full truncate"
                              title={url.name}
                            >
                              {url.name}
                            </span>
                          }
                          value={<Badge variant="secondary">{url.count}</Badge>}
                        />
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        No URL information available
                      </p>
                    )}
                  </EventSection>

                  {errorGroup?.sample && (
                    <>
                      <Separator />

                      {/* Sample Occurrence */}
                      <EventSection title="Sample Occurrence">
                        <EventRow
                          label="Occurrence ID"
                          value={<CopyableValue value={errorGroup.sample.id} />}
                        />

                        <EventRow
                          label="File"
                          value={errorGroup.sample.file || 'Unknown'}
                        />

                        <EventRow
                          label="Line"
                          value={errorGroup.sample.line ?? '—'}
                        />

                        <EventRow
                          label="Column"
                          value={errorGroup.sample.column ?? '—'}
                        />

                        <EventRow
                          label="Occurred at"
                          value={errorGroup.sample.occurredAt}
                        />
                      </EventSection>

                      <Separator />

                      {/* Page */}
                      <EventSection title="Page">
                        <EventRow
                          label="Path"
                          value={
                            <code className="bg-muted rounded px-1.5 py-0.5 text-xs break-all">
                              {errorGroup.sample.path}
                            </code>
                          }
                        />

                        <EventRow
                          label="URL"
                          value={
                            errorGroup.sample.url ? (
                              <a
                                href={errorGroup.sample.url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-foreground block max-w-56 truncate underline underline-offset-4"
                              >
                                {errorGroup.sample.url}
                              </a>
                            ) : (
                              'Unavailable'
                            )
                          }
                        />
                      </EventSection>

                      <Separator />

                      {/* Visitor */}
                      <EventSection title="Visitor">
                        <EventRow
                          label="Device"
                          value={errorGroup.sample.device}
                        />

                        <EventRow
                          label="Browser"
                          value={errorGroup.sample.browser}
                        />

                        <EventRow
                          label="Visitor ID"
                          value={
                            <CopyableValue
                              value={errorGroup.sample.visitorId}
                            />
                          }
                        />
                      </EventSection>

                      <Separator />

                      {/* Session */}
                      <EventSection title="Session">
                        <EventRow
                          label="Session ID"
                          value={
                            <CopyableValue
                              value={errorGroup.sample.sessionId}
                            />
                          }
                        />

                        <EventRow
                          label="Replay"
                          value={
                            errorGroup.sample.replayAvailable ? (
                              <Badge variant="outline">Available</Badge>
                            ) : (
                              <span className="text-muted-foreground">
                                Unavailable
                              </span>
                            )
                          }
                        />

                        <Button
                          disabled={!errorGroup.sample.replayAvailable}
                          onClick={() => {
                            if (errorGroup.sample?.sessionId) {
                              setSessionId(errorGroup.sample.sessionId)
                              setReplayOpen(true)
                            }
                          }}
                          className="w-full"
                        >
                          {errorGroup.sample.replayAvailable
                            ? 'View session replay'
                            : 'Replay Unavailable'}
                        </Button>
                      </EventSection>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <SessionReplayPlayer
        open={replayOpen}
        onOpenChange={(o) => {
          if (!o) setSessionId(null)
          setReplayOpen(o)
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
