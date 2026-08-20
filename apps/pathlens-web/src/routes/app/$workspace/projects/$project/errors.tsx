import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { PlanGate } from '@/components/common/plan-gate'
import { SessionReplayPlayer } from '@/components/common/session-replay-player'
import {
  getErrorsOptions,
  type ErrorGroup,
  type ErrorsDevice,
  type ErrorsRange,
} from '@/queries/errors'
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
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ui/components/sheet'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  AlertTriangle,
  Bug,
  Clock3,
  Globe2,
  Laptop2,
  PlayCircle,
  RefreshCw,
  Search,
  ServerCrash,
  UserRound,
  Users,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/errors'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Errors',
  },
})

const rangeOptions: { label: string; value: ErrorsRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const deviceOptions: { label: string; value: ErrorsDevice }[] = [
  { label: 'All devices', value: 'all' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Tablet', value: 'tablet' },
  { label: 'Unknown', value: 'unknown' },
]

function formatErrorType(type: ErrorGroup['type']): string {
  return type === 'promise_rejection' ? 'Unhandled promise' : 'JavaScript error'
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

function getTopBreakdown(
  breakdown: { name: string; count: number }[],
  fallback: string
): string {
  return breakdown[0]?.name ?? fallback
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-muted-foreground shrink-0 text-xs">{label}</span>
      <span className="max-w-[68%] text-right text-xs font-medium break-words">
        {value}
      </span>
    </div>
  )
}

function BreakdownList({
  label,
  values,
}: {
  label: string
  values: { name: string; count: number }[]
}) {
  return (
    <div>
      <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
        {label}
      </p>
      {values.length > 0 ? (
        <div className="space-y-2">
          {values.map((value) => (
            <div
              key={value.name}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate">{value.name}</span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {formatNumber(value.count)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No data</p>
      )}
    </div>
  )
}

function ErrorDetailSheet({
  error,
  onOpenChange,
  onWatchReplay,
}: {
  error: ErrorGroup | null
  onOpenChange: (open: boolean) => void
  onWatchReplay: (error: ErrorGroup) => void
}) {
  const sample = error?.sample

  return (
    <Sheet open={Boolean(error)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-2xl!">
        {error && (
          <>
            <SheetHeader className="border-b px-5 py-5 pr-14">
              <div className="flex items-start gap-3">
                <div className="bg-destructive/10 text-destructive mt-0.5 rounded-lg p-2">
                  <ServerCrash className="size-5" />
                </div>
                <div className="min-w-0">
                  <SheetTitle className="break-words">
                    {error.message}
                  </SheetTitle>
                  <SheetDescription className="mt-1">
                    {formatErrorType(error.type)} · last seen{' '}
                    {formatRelativeTime(error.lastSeen)}
                  </SheetDescription>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="destructive">
                  {formatErrorType(error.type)}
                </Badge>
                <Badge variant="outline">
                  {formatNumber(error.errorCount)} occurrences
                </Badge>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-6">
              <section className="border-b py-4">
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                  Impact
                </h3>
                <DetailRow
                  label="Affected users"
                  value={formatNumber(error.affectedUsers)}
                />
                <DetailRow
                  label="Affected sessions"
                  value={formatNumber(error.affectedSessions)}
                />
                <DetailRow
                  label="First seen"
                  value={formatAbsoluteDate(error.firstSeen)}
                />
                <DetailRow
                  label="Last seen"
                  value={formatAbsoluteDate(error.lastSeen)}
                />
              </section>

              {sample && (
                <section className="border-b py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-[0.14em] uppercase">
                      Latest occurrence
                    </h3>
                    {sample.replayAvailable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onWatchReplay(error)}
                      >
                        <PlayCircle className="size-4" />
                        Watch replay
                      </Button>
                    )}
                  </div>
                  <DetailRow label="Path" value={sample.path} />
                  {sample.url && <DetailRow label="URL" value={sample.url} />}
                  {sample.file && (
                    <DetailRow label="File" value={sample.file} />
                  )}
                  {sample.line !== null && (
                    <DetailRow
                      label="Location"
                      value={`${sample.line}:${sample.column ?? 0}`}
                    />
                  )}
                  <DetailRow label="Browser" value={sample.browser} />
                  <DetailRow label="Device" value={sample.device} />
                  <DetailRow
                    label="Occurred"
                    value={formatAbsoluteDate(sample.occurredAt)}
                  />
                  <DetailRow
                    label="Visitor"
                    value={`Anonymous #${sample.visitorId.slice(0, 8)}`}
                  />
                  <DetailRow label="Session" value={sample.sessionId} />
                </section>
              )}

              <section className="border-b py-4">
                <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-[0.14em] uppercase">
                  Stack trace
                </h3>
                {error.stackTrace ? (
                  <pre className="bg-muted max-h-72 overflow-auto rounded-lg p-3 text-[11px] leading-5 break-words whitespace-pre-wrap">
                    {error.stackTrace}
                  </pre>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No stack trace was available for this error.
                  </p>
                )}
              </section>

              <section className="space-y-5 py-4">
                <BreakdownList label="Browsers" values={error.browsers} />
                <BreakdownList label="Devices" values={error.devices} />
                <BreakdownList label="URLs" values={error.urls} />
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function ErrorGroupCard({
  error,
  onSelect,
}: {
  error: ErrorGroup
  onSelect: (error: ErrorGroup) => void
}) {
  const sample = error.sample

  return (
    <button
      type="button"
      className="hover:bg-muted/50 flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors"
      onClick={() => onSelect(error)}
    >
      <div className="bg-destructive/10 text-destructive mt-0.5 shrink-0 rounded-lg p-2">
        <Bug className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium break-words">{error.message}</span>
          <Badge variant="secondary">{formatErrorType(error.type)}</Badge>
        </div>
        <p className="text-muted-foreground mt-1 truncate text-sm">
          {sample?.path ?? getTopBreakdown(error.urls, '/')}
          {error.stackTrace ? ` · ${error.stackTrace.split('\n')[0]}` : ''}
        </p>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <AlertTriangle className="size-3.5" />
            {formatNumber(error.errorCount)} occurrences
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5" />
            {formatNumber(error.affectedUsers)} users
          </span>
          <span className="inline-flex items-center gap-1">
            <Laptop2 className="size-3.5" />
            {getTopBreakdown(error.devices, 'Unknown')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Globe2 className="size-3.5" />
            {getTopBreakdown(error.browsers, 'Unknown')}
          </span>
        </div>
      </div>
      <time
        className="text-muted-foreground flex shrink-0 items-center gap-1 text-xs"
        title={formatAbsoluteDate(error.lastSeen)}
      >
        <Clock3 className="size-3.5" />
        {formatRelativeTime(error.lastSeen)}
      </time>
    </button>
  )
}

function RouteComponent() {
  const { workspace } = Route.useParams()

  return (
    <PlanGate workspaceId={workspace} feature="errorTracking">
      <PageContent />
    </PlanGate>
  )
}

function PageContent() {
  const { workspace, project } = Route.useParams()
  const [search, setSearch] = useState('')
  const [browser, setBrowser] = useState('')
  const [url, setUrl] = useState('')
  const [range, setRange] = useState<ErrorsRange>('7d')
  const [device, setDevice] = useState<ErrorsDevice>('all')
  const [page, setPage] = useState(1)
  const [selectedError, setSelectedError] = useState<ErrorGroup | null>(null)
  const [replaySessionId, setReplaySessionId] = useState<string | null>(null)
  const [replayEventId, setReplayEventId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)
  const deferredBrowser = useDeferredValue(browser)
  const deferredUrl = useDeferredValue(url)

  const { data, isError, isPending, isFetching, refetch } = useQuery(
    getErrorsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
      browser: deferredBrowser.trim() || undefined,
      url: deferredUrl.trim() || undefined,
      search: deferredSearch.trim() || undefined,
      page,
      page_size: 50,
    })
  )
  const errorData = data?.data
  const errors = errorData?.errors ?? []
  const replayDetailQuery = useQuery(
    getSessionReplayDetailOptions({
      workspace_id: workspace,
      project_id: project,
      session_id: replaySessionId ?? '',
    })
  )

  const resetPage = () => setPage(1)

  const openReplay = (error: ErrorGroup) => {
    if (!error.sample) return

    setSelectedError(null)
    setReplayEventId(error.sample.id)
    setReplaySessionId(error.sample.sessionId)
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Reliability · Diagnostics"
          title="Error Monitoring"
          description="Find recurring JavaScript failures, understand who they affect, and inspect the stack traces behind them."
          actions={
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? 'animate-spin' : undefined} />
              Refresh errors
            </Button>
          }
        />

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Error count"
            value={formatNumber(errorData?.summary.errorCount ?? 0)}
            icon={AlertTriangle}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Affected users"
            value={formatNumber(errorData?.summary.affectedUsers ?? 0)}
            icon={Users}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Affected sessions"
            value={formatNumber(errorData?.summary.affectedSessions ?? 0)}
            icon={UserRound}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Error rate"
            value={`${errorData?.summary.errorRate ?? 0}%`}
            icon={ServerCrash}
            detail="Sessions with at least one error"
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        <PageToolbar className="bg-muted/20 flex-wrap rounded-xl border p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search message or stack trace..."
              className="pl-9"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetPage()
              }}
            />
          </div>
          <Input
            className="w-full sm:w-44"
            placeholder="Browser"
            value={browser}
            onChange={(event) => {
              setBrowser(event.target.value)
              resetPage()
            }}
          />
          <Input
            className="w-full sm:w-52"
            placeholder="URL contains..."
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              resetPage()
            }}
          />
          <Select
            value={device}
            onValueChange={(value) => {
              setDevice(value as ErrorsDevice)
              resetPage()
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue>
                {deviceOptions.find((option) => option.value === device)?.label}
              </SelectValue>
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
              setRange(value as ErrorsRange)
              resetPage()
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue>
                {rangeOptions.find((option) => option.value === range)?.label}
              </SelectValue>
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
            Unable to load errors for this project.
          </p>
        )}

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Error groups</CardTitle>
                <CardDescription>
                  Repeated failures grouped by message and stack trace.
                </CardDescription>
              </div>
              <Badge variant="outline">
                {formatNumber(errorData?.pagination.total ?? 0)} groups
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-5">
            <div className="space-y-2">
              {isPending ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 rounded-xl border p-4"
                  >
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-72" />
                      <Skeleton className="h-3 w-52" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))
              ) : errors.length > 0 ? (
                errors.map((error) => (
                  <ErrorGroupCard
                    key={error.fingerprint}
                    error={error}
                    onSelect={setSelectedError}
                  />
                ))
              ) : (
                <div className="text-muted-foreground rounded-xl border border-dashed px-5 py-14 text-center text-sm">
                  No errors matched these filters.
                </div>
              )}
            </div>
          </CardContent>
          {errorData && errorData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-5 py-3">
              <span className="text-muted-foreground text-xs">
                Page {errorData.pagination.page} of{' '}
                {errorData.pagination.totalPages}
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
                  disabled={!errorData.pagination.hasNextPage || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ErrorDetailSheet
        error={selectedError}
        onOpenChange={(open) => {
          if (!open) setSelectedError(null)
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
