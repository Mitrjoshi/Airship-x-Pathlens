import { getProjectsOptions } from '@/queries/projects'
import {
  getVisitorLocationsOptions,
  getVisitorsOptions,
  type VisitorsRange,
} from '@/queries/visitors'
import {
  formatNumber,
  formatRelativeTime,
  getPaginationItems,
} from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Calendar } from '@workspace/ui/components/calendar'
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
  CalendarIcon,
  LinkIcon,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
  SearchIcon,
} from 'lucide-react'
import { useState } from 'react'
import { VisitorsWorldMap } from './-components/visitors/visitors-world-map'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@workspace/ui/components/card'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Badge } from '@workspace/ui/components/badge'
import VisitorsLoading from './-components/common/visitors-loading'

export const Route = createFileRoute('/app/$workspaceId/$projectId/visitors')({
  component: RouteComponent,
})

const rangeLabels: Record<VisitorsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const PAGE_SIZE = 50

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [range, setRange] = useState<VisitorsRange>('30d')
  const [liveMode, setLiveMode] = useState(false)
  const [page, setPage] = useState(1)

  const {
    data: visitorsLocationData,
    isFetching: isVisitorsFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery(
    getVisitorLocationsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      status: 'all',
    })
  )

  const {
    data,
    isFetching,
    refetch: refetchVisitors,
  } = useQuery(
    getVisitorsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      status: 'all',
      search: undefined,
      page,
      page_size: PAGE_SIZE,
    })
  )

  const { data: projectData, isLoading: projectLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    })
  )

  const projectDetails = projectData?.data[0]
  const visitorsLocation = visitorsLocationData?.data
  const visitors = data?.data.visitors ?? []

  const totalEvents = data?.data.pagination.total ?? 0
  const totalPages = Math.ceil(totalEvents / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalEvents === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalEvents)

  if (projectLoading) {
    return <VisitorsLoading />
  }

  return (
    <div>
      <div className="flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <Button
            disabled={projectLoading}
            render={
              <a href={projectDetails?.domain as string} target="_blank" />
            }
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
            disabled={isVisitorsFetching}
            onClick={() => {
              refetch()
              refetchVisitors()
            }}
            variant="outline"
          >
            <RefreshCcwIcon
              className={`${isVisitorsFetching ? 'animate-spin' : ''}`}
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
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as VisitorsRange)
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
        </div>
      </div>

      <div className="mx-auto space-y-6 p-6">
        <Card className="bg-card/30 rounded-none border-2 border-dashed p-0">
          <CardHeader className="p-2">
            <CardDescription>Requests by country</CardDescription>
          </CardHeader>
          <CardContent className="divide-border grid h-100 min-h-0 grid-cols-[1fr_45%] items-stretch divide-x-2 overflow-hidden p-2">
            {/* Map */}
            <div className="flex h-full min-h-0 items-center">
              <VisitorsWorldMap locations={visitorsLocation?.locations ?? []} />
            </div>

            {/* Countries */}
            <div className="flex h-full min-h-0 flex-col">
              <p className="px-4 pb-3 text-lg font-medium">Countries</p>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pr-2">
                {isFetching
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_25%_5%] items-center gap-2"
                      >
                        <div className="flex min-w-0 items-start gap-2">
                          <Skeleton className="h-8 w-8 shrink-0 rounded-full" />

                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/8" />
                          </div>
                        </div>

                        <Skeleton className="h-2 w-full rounded-full" />

                        <Skeleton className="ml-auto h-4 w-4" />
                      </div>
                    ))
                  : visitorsLocation?.locations.map((item, index) => (
                      <div
                        key={`${item.code}-${item.city}-${index}`}
                        className="grid grid-cols-[1fr_25%_5%] items-center gap-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="shrink-0">
                            <AvatarFallback>{item.code}</AvatarFallback>
                          </Avatar>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {item.city}
                            </p>

                            <p className="text-muted-foreground truncate text-xs font-medium">
                              {item.country}
                            </p>
                          </div>
                        </div>

                        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                          <div
                            className="bg-chart-1 h-full"
                            style={{
                              width: `${Math.min(item.visitors, 100)}%`,
                            }}
                          />
                        </div>

                        <p className="text-right text-sm font-medium">
                          {formatNumber(item.visitors)}
                        </p>
                      </div>
                    ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <InputGroup className="max-w-120">
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
                  <TableRow className="w-full justify-between">
                    <TableHead>Visitor</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Page Visits</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="w-30">Last seen</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isFetching
                    ? [...Array(5)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="flex min-w-0 items-start gap-2">
                              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />

                              <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <Skeleton className="h-4 w-90" />
                                <Skeleton className="h-3 w-1/8" />
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-center">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-center">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-center">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-center">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-center">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="flex justify-center">
                              <Skeleton className="h-6 w-full" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : visitors?.map((visitor) => (
                        <TableRow key={visitor.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {visitor.countryCode}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="truncate">{visitor.id}</p>
                                <p className="text-muted-foreground truncate text-xs">
                                  {visitor.location}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{visitor.device}</TableCell>
                          <TableCell>{visitor.browser}</TableCell>

                          <TableCell>{visitor.sessions}</TableCell>
                          <TableCell>{visitor.pageViews}</TableCell>

                          <TableCell className="text-sm">
                            {visitor.duration}
                          </TableCell>
                          <TableCell className="pr-5">
                            <Badge
                              variant="outline"
                              className={
                                visitor.status === 'online'
                                  ? 'border-primary/40 bg-primary/10 dark:text-primary text-emerald-700'
                                  : 'text-muted-foreground'
                              }
                            >
                              <span
                                className={`mr-1.5 size-1.5 rounded-full ${visitor.status === 'online' ? 'bg-primary' : 'bg-muted-foreground/50'}`}
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
                    disabled={page <= 1 || isVisitorsFetching}
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
                          disabled={isVisitorsFetching}
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
                    disabled={page >= totalPages || isVisitorsFetching}
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
