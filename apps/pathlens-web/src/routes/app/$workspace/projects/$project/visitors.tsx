import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
  PageToolbar,
} from '@/components/common/project-page'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { getVisitorsOptions } from '@/queries/visitors'
import type { VisitorStatus, VisitorsRange } from '@/queries/visitors'
import { formatNumber, formatRelativeTime } from '@/utils/utils'
import { navigationIcons } from '@/config/navigation-icons'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ActivityIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Clock3,
  Laptop,
  Loader2Icon,
  MapPin,
  MonitorSmartphone,
  Repeat,
  SearchIcon,
  Smartphone,
  UserPlus,
  XIcon,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/visitors'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Visitors',
  },
})

const PAGE_SIZE = 50

const rangeOptions: { label: string; value: VisitorsRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const rangeLabels: Record<VisitorsRange, string> = {
  '24h': 'the last 24 hours',
  '7d': 'the last 7 days',
  '30d': 'the last 30 days',
  '90d': 'the last 90 days',
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<VisitorsRange>('7d')
  const [status, setStatus] = useState<VisitorStatus>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const deferredSearch = useDeferredValue(search)

  const { data, isPending, isError, isFetching } = useQuery(
    getVisitorsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      status,
      search: deferredSearch.trim() || undefined,
      page,
      page_size: PAGE_SIZE,
    })
  )

  const summary = data?.data.summary
  const visitors = data?.data.visitors ?? []
  const pagination = data?.data.pagination
  const totalPages = pagination?.totalPages ?? 0
  const hasActiveFilters = status !== 'all' || search.trim().length > 0
  const summaryMetrics = [
    {
      label: 'Total visitors',
      value: formatNumber(summary?.totalVisitors ?? 0),
      icon: navigationIcons.visitors,
    },
    {
      label: 'New visitors',
      value: formatNumber(summary?.newVisitors ?? 0),
      icon: UserPlus,
    },
    {
      label: 'Returning',
      value: formatNumber(summary?.returningVisitors ?? 0),
      icon: Repeat,
    },
    {
      label: 'Avg. session',
      value: summary?.avgDuration ?? '0s',
      icon: Clock3,
    },
    {
      label: 'Live now',
      value: formatNumber(summary?.liveVisitors ?? 0),
      icon: ActivityIcon,
    },
  ]

  const clearFilters = () => {
    setStatus('all')
    setSearch('')
    setPage(1)
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Audience"
          title="Visitors"
          description="Understand who is visiting, where they come from, and how they move through your site."
        />

        <PageToolbar className="justify-end">
          <Select
            value={range}
            onValueChange={(value) => {
              setRange(value as VisitorsRange)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Date range">
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

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as VisitorStatus)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Visitor status">
                {status === 'all'
                  ? 'All visitors'
                  : status === 'online'
                    ? 'Online now'
                    : 'Offline'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All visitors</SelectItem>
              <SelectItem value="online">Online now</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </PageToolbar>

        <ProjectMetricStrip className="lg:grid-cols-5">
          {summaryMetrics.map(({ label, value, icon }) => (
            <ProjectMetric
              key={label}
              label={label}
              value={value}
              icon={icon}
              isLoading={isPending}
            />
          ))}
        </ProjectMetricStrip>

        <ProjectPanel>
          <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Visitor activity</CardTitle>
              <CardDescription className="mt-1">
                {pagination?.total ?? 0} visitor{' '}
                {pagination?.total === 1 ? 'record' : 'records'} in{' '}
                {rangeLabels[range]}.
              </CardDescription>
            </div>

            <div className="relative w-full sm:max-w-xs">
              {isFetching ? (
                <Loader2Icon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2 animate-spin" />
              ) : (
                <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              )}
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search visitors"
                aria-label="Search visitors"
                className="pr-9 pl-8"
              />
              {search && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Clear search"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => {
                    setSearch('')
                    setPage(1)
                  }}
                >
                  <XIcon />
                </Button>
              )}
            </div>
          </CardHeader>

          {isError ? (
            <CardContent
              role="alert"
              className="text-destructive px-5 py-16 text-center text-sm"
            >
              Unable to load visitor activity. Please try again.
            </CardContent>
          ) : isPending ? (
            <CardContent className="p-0">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
                >
                  <Skeleton className="size-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="hidden h-8 w-32 sm:block" />
                  <Skeleton className="hidden h-8 w-24 md:block" />
                  <Skeleton className="size-4" />
                </div>
              ))}
            </CardContent>
          ) : visitors.length === 0 ? (
            <CardContent className="px-5 py-16 text-center">
              <div className="bg-muted text-muted-foreground mx-auto flex size-10 items-center justify-center rounded-full">
                <navigationIcons.visitors className="size-5" />
              </div>
              <p className="mt-4 text-sm font-medium">
                {hasActiveFilters
                  ? 'No visitors match these filters.'
                  : 'No visitors recorded yet.'}
              </p>
              <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
                {hasActiveFilters
                  ? 'Try clearing a filter or searching for a different visitor.'
                  : 'Install the tracking script and visitor activity will appear here.'}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"

                  className="mt-5"
                  onClick={clearFilters}
                >
                  Clear filters
                </Button>
              )}
            </CardContent>
          ) : (
            <>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[760px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-5">Visitor</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Activity</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="pr-5">Last seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitors.map((visitor) => (
                        <TableRow key={visitor.id}>
                          <TableCell className="pl-5">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-8">
                                <AvatarFallback className="text-[10px]">
                                  {visitor.countryCode}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p
                                  className="max-w-36 truncate font-mono text-xs"
                                  title={visitor.id}
                                >
                                  {visitor.id}
                                </p>
                                <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                  <MapPin className="size-3 shrink-0" />
                                  <span className="max-w-36 truncate">
                                    {visitor.location}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {visitor.device === 'Mobile' ? (
                                <Smartphone className="text-muted-foreground size-4" />
                              ) : visitor.device === 'Tablet' ? (
                                <MonitorSmartphone className="text-muted-foreground size-4" />
                              ) : (
                                <Laptop className="text-muted-foreground size-4" />
                              )}
                              <div>
                                <p className="text-sm">{visitor.device}</p>
                                <p className="text-muted-foreground mt-1 text-xs">
                                  {visitor.browser}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{formatNumber(visitor.sessions)} sessions</p>
                              <p className="text-muted-foreground mt-1 text-xs">
                                {formatNumber(visitor.pageViews)} page views
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {visitor.duration}
                          </TableCell>
                          <TableCell className="pr-5">
                            <Badge
                              variant="outline"
                              className={
                                visitor.status === 'online'
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : 'text-muted-foreground'
                              }
                            >
                              <span
                                className={`mr-1.5 size-1.5 rounded-full ${visitor.status === 'online' ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`}
                              />
                              {visitor.status === 'online'
                                ? 'Active now'
                                : formatRelativeTime(visitor.lastSeen)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
              <div className="flex items-center justify-between border-t px-5 py-3">
                <p className="text-muted-foreground text-xs">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, pagination?.total ?? 0)} of{' '}
                  {formatNumber(pagination?.total ?? 0)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous page"
                    disabled={page <= 1 || isFetching}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <span className="text-muted-foreground min-w-16 text-center text-xs">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next page"
                    disabled={page >= totalPages || isFetching}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            </>
          )}
        </ProjectPanel>
      </div>
    </ProjectPageLayout>
  )
}
