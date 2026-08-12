import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { SessionReplayPlayer } from '@/components/common/session-replay-player'
import {
  getEventsOptions,
  type EventsCategory,
  type EventsDevice,
  type EventsRange,
  type ProjectEvent,
} from '@/queries/events'
import { getSessionReplayDetailOptions } from '@/queries/session-replay'
import { formatDate, formatNumber, formatRelativeTime } from '@/utils/utils'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  ArrowUpRight,
  CheckCircle2,
  CircleGauge,
  FileInput,
  Globe2,
  Laptop2,
  MousePointerClick,
  PlayCircle,
  Search,
  ServerCrash,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/events'
)({
  component: RouteComponent,
})

const rangeOptions: { label: string; value: EventsRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const categoryOptions: { label: string; value: EventsCategory }[] = [
  { label: 'High signal', value: 'high_signal' },
  { label: 'All events', value: 'all' },
  { label: 'Actions', value: 'actions' },
  { label: 'Forms', value: 'forms' },
]

const deviceOptions: { label: string; value: EventsDevice }[] = [
  { label: 'All devices', value: 'all' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Tablet', value: 'tablet' },
  { label: 'Unknown', value: 'unknown' },
]

function formatEventType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatAbsoluteDate(date: string): string {
  return formatDate(date, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getEventIcon(event: ProjectEvent): LucideIcon {
  if (event.type === 'click') return MousePointerClick
  if (event.type.startsWith('form_')) return FileInput
  if (event.category === 'error') return ServerCrash
  if (event.category === 'performance') return CircleGauge
  if (event.category === 'navigation') return ArrowUpRight
  if (event.category === 'custom') return CheckCircle2

  return Activity
}

function getCategoryLabel(category: ProjectEvent['category']): string {
  if (category === 'action') return 'Action'
  if (category === 'form') return 'Form'
  if (category === 'navigation') return 'Navigation'
  if (category === 'error') return 'Error'
  if (category === 'performance') return 'Performance'
  if (category === 'custom') return 'Custom'

  return 'System'
}

function formatDetailValue(value: unknown): string {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  return String(value)
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="max-w-[65%] text-right text-xs font-medium break-words">
        {value}
      </span>
    </div>
  )
}

function EventDetailSheet({
  event,
  onOpenChange,
  onWatchReplay,
}: {
  event: ProjectEvent | null
  onOpenChange: (open: boolean) => void
  onWatchReplay: (event: ProjectEvent) => void
}) {
  return (
    <Sheet open={Boolean(event)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-xl!">
        {event && (
          <>
            <SheetHeader className="border-b px-5 py-5 pr-14">
              <div className="flex items-start gap-3">
                <div className="bg-primary/10 text-primary mt-0.5 rounded-lg p-2">
                  {(() => {
                    const Icon = getEventIcon(event)

                    return <Icon className="size-5" />
                  })()}
                </div>
                <div className="min-w-0">
                  <SheetTitle>{event.description}</SheetTitle>
                  <SheetDescription className="mt-1">
                    {formatEventType(event.type)} on {event.path}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {getCategoryLabel(event.category)}
                </Badge>
                <Badge
                  variant="outline"
                  title={formatAbsoluteDate(event.occurredAt)}
                >
                  {formatRelativeTime(event.occurredAt)}
                </Badge>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
              {event.replayAvailable && (
                <div className="border-b py-4">
                  <Button
                    className="w-full"
                    onClick={() => onWatchReplay(event)}
                  >
                    <PlayCircle className="mr-2 size-4" />
                    Watch session at this event
                  </Button>
                </div>
              )}

              <section className="border-b py-4">
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                  What happened
                </h3>
                <DetailRow label="Description" value={event.description} />
                <DetailRow
                  label="Event type"
                  value={formatEventType(event.type)}
                />
                <DetailRow
                  label="Occurred"
                  value={formatAbsoluteDate(event.occurredAt)}
                />
              </section>

              <section className="border-b py-4">
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                  Page context
                </h3>
                <DetailRow label="Path" value={event.path} />
                {event.title && <DetailRow label="Title" value={event.title} />}
                {event.url && <DetailRow label="URL" value={event.url} />}
                {event.referrerDomain && (
                  <DetailRow label="Referrer" value={event.referrerDomain} />
                )}
              </section>

              <section className="border-b py-4">
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                  Visitor and device
                </h3>
                <DetailRow
                  label="Visitor"
                  value={`Anonymous #${event.visitorId.slice(0, 8)}`}
                />
                <DetailRow label="Session" value={event.sessionId} />
                <DetailRow
                  label="Location"
                  value={`${event.country} (${event.countryCode})`}
                />
                <DetailRow label="Device" value={event.device} />
                {event.browser && (
                  <DetailRow
                    label="Browser"
                    value={`${event.browser}${event.browserVersion ? ` ${event.browserVersion}` : ''}`}
                  />
                )}
                {event.os && (
                  <DetailRow
                    label="Operating system"
                    value={`${event.os}${event.osVersion ? ` ${event.osVersion}` : ''}`}
                  />
                )}
              </section>

              {Object.keys(event.details).length > 0 && (
                <section className="py-4">
                  <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                    Event details
                  </h3>
                  {Object.entries(event.details).map(([key, value]) => (
                    <DetailRow
                      key={key}
                      label={key}
                      value={formatDetailValue(value)}
                    />
                  ))}
                </section>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [search, setSearch] = useState('')
  const [path, setPath] = useState('')
  const [range, setRange] = useState<EventsRange>('24h')
  const [category, setCategory] = useState<EventsCategory>('high_signal')
  const [device, setDevice] = useState<EventsDevice>('all')
  const [page, setPage] = useState(1)
  const [selectedEvent, setSelectedEvent] = useState<ProjectEvent | null>(null)
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null)
  const [replayEventId, setReplayEventId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)
  const deferredPath = useDeferredValue(path)

  const { data, isError, isPending, isFetching } = useQuery(
    getEventsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      category,
      device,
      path: deferredPath.trim() || undefined,
      search: deferredSearch.trim() || undefined,
      page,
      page_size: 50,
    })
  )
  const eventData = data?.data
  const events = eventData?.events ?? []
  const replayDetailQuery = useQuery(
    getSessionReplayDetailOptions({
      workspace_id: workspace,
      project_id: project,
      session_id: replaySessionId ?? '',
    })
  )

  const openReplay = (event: ProjectEvent) => {
    setSelectedEvent(null)
    setReplayEventId(event.id)
    setReplaySessionId(event.sessionId)
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Activity"
          title="Events"
          description="Understand what visitors did, where it happened, and which sessions need attention."
        />

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Captured events"
            value={formatNumber(eventData?.summary.totalEvents ?? 0)}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Sessions"
            value={formatNumber(eventData?.summary.totalSessions ?? 0)}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Visitors"
            value={formatNumber(eventData?.summary.totalVisitors ?? 0)}
            isLoading={isPending}
          />
          <ProjectMetric
            label="High-signal actions"
            value={formatNumber(eventData?.summary.highSignalActions ?? 0)}
            icon={MousePointerClick}
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        <PageToolbar className="bg-muted/20 flex-wrap rounded-xl border p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search action, path, visitor..."
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <Input
            className="w-full sm:w-44"
            placeholder="Page path"
            value={path}
            onChange={(event) => {
              setPath(event.target.value)
              setPage(1)
            }}
          />
          <Select
            value={category}
            onValueChange={(value) => {
              setCategory(value as EventsCategory)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={device}
            onValueChange={(value) => {
              setDevice(value as EventsDevice)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deviceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={range}
            onValueChange={(value) => {
              setRange(value as EventsRange)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageToolbar>

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load events for this project.
          </p>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Activity feed</CardTitle>
                <CardDescription>
                  {isFetching
                    ? 'Updating activity...'
                    : 'Most recent matching events'}
                </CardDescription>
              </div>
              <Badge variant="outline">
                {formatNumber(eventData?.pagination.total ?? 0)} results
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <div className="space-y-2">
              {isPending ? (
                Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border p-4"
                  >
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-52" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))
              ) : events.length > 0 ? (
                events.map((event) => {
                  const Icon = getEventIcon(event)

                  return (
                    <button
                      key={event.id}
                      type="button"
                      className="hover:bg-muted/50 flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <div className="bg-primary/10 text-primary mt-0.5 shrink-0 rounded-lg p-2">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">
                            {event.description}
                          </span>
                          <Badge variant="secondary">
                            {getCategoryLabel(event.category)}
                          </Badge>
                          {event.replayAvailable && (
                            <PlayCircle className="size-3.5 text-emerald-500" />
                          )}
                        </div>
                        <p className="text-muted-foreground mt-1 truncate text-sm">
                          {event.path}
                          {event.title ? ` · ${event.title}` : ''}
                        </p>
                        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3.5" />
                            Anonymous #{event.visitorId.slice(0, 8)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Laptop2 className="size-3.5" />
                            {event.device}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Globe2 className="size-3.5" />
                            {event.country}
                          </span>
                        </div>
                      </div>
                      <time
                        className="text-muted-foreground shrink-0 text-xs"
                        title={formatAbsoluteDate(event.occurredAt)}
                      >
                        {formatRelativeTime(event.occurredAt)}
                      </time>
                    </button>
                  )
                })
              ) : (
                <div className="text-muted-foreground rounded-xl border border-dashed px-5 py-14 text-center text-sm">
                  No matching events in this range.
                </div>
              )}
            </div>
          </CardContent>
          {eventData && eventData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-5 py-3">
              <span className="text-muted-foreground text-xs">
                Page {eventData.pagination.page} of{' '}
                {eventData.pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!eventData.pagination.hasNextPage || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <EventDetailSheet
        event={selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null)
        }}
        onWatchReplay={openReplay}
      />

      <SessionReplayPlayer
        key={replaySessionId ?? 'closed'}
        open={Boolean(replaySessionId)}
        workspaceId={workspace}
        projectId={project}
        session={null}
        detail={replayDetailQuery.data?.data}
        initialEventId={replayEventId ?? undefined}
        isLoading={replayDetailQuery.isPending || replayDetailQuery.isFetching}
        isError={replayDetailQuery.isError}
        onOpenChange={(open) => {
          if (!open) {
            setReplaySessionId(null)
            setReplayEventId(null)
          }
        }}
      />
    </ProjectPageLayout>
  )
}
