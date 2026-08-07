import {
  ProjectPageHeader,
  ProjectPageLayout,
} from '@/components/common/project-page'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@workspace/ui/components/tabs'
import { getEventsOptions } from '@/queries/events'
import { formatNumber, formatRelativeTime } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity,
  AlertTriangle,
  Eye,
  FormInput,
  Gauge,
  MoreHorizontal,
  Mouse,
  MousePointerClick,
  Search,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/events'
)({
  component: RouteComponent,
})

function formatEventType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function renderEventIcon(type: string) {
  const className = 'text-primary h-5 w-5'

  if (type === 'click') return <MousePointerClick className={className} />
  if (type === 'page_view') return <Eye className={className} />
  if (type === 'scroll') return <ScrollText className={className} />
  if (type === 'mousemove') return <Mouse className={className} />
  if (type === 'form_submit') return <FormInput className={className} />

  return <Activity className={className} />
}

type EventFilter =
  | 'all'
  | 'click'
  | 'mousemove'
  | 'scroll'
  | 'page_view'
  | 'forms'
  | 'errors'
  | 'performance'
  | 'other'

interface EventFilterConfig {
  value: EventFilter
  label: string
  icon: LucideIcon
  types?: readonly string[]
}

const eventFilters: EventFilterConfig[] = [
  { value: 'all', label: 'All', icon: Activity },
  {
    value: 'click',
    label: 'Clicks',
    icon: MousePointerClick,
    types: ['click'],
  },
  {
    value: 'mousemove',
    label: 'Mouse',
    icon: Mouse,
    types: ['mousemove'],
  },
  { value: 'scroll', label: 'Scroll', icon: ScrollText, types: ['scroll'] },
  {
    value: 'page_view',
    label: 'Pages',
    icon: Eye,
    types: ['page_view'],
  },
  {
    value: 'forms',
    label: 'Forms',
    icon: FormInput,
    types: ['form_submit', 'input_change'],
  },
  {
    value: 'errors',
    label: 'Errors',
    icon: AlertTriangle,
    types: ['javascript_error', 'promise_rejection'],
  },
  {
    value: 'performance',
    label: 'Performance',
    icon: Gauge,
    types: ['performance'],
  },
  {
    value: 'other',
    label: 'Other',
    icon: MoreHorizontal,
    types: ['session_start', 'session_end', 'resize', 'custom'],
  },
]

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [search, setSearch] = useState('')
  const [eventFilter, setEventFilter] = useState<EventFilter>('all')
  const deferredSearch = useDeferredValue(search)

  const { data, isError, isPending, isFetching } = useQuery(
    getEventsOptions({
      workspace_id: workspace,
      project_id: project,
      range: '24h',
      search: deferredSearch.trim() || undefined,
      page: 1,
      page_size: 50,
    })
  )

  const eventData = data?.data
  const events = eventData?.events ?? []
  const selectedFilter = eventFilters.find(
    (filter) => filter.value === eventFilter
  )
  const filterTypes = selectedFilter?.types
  const filteredEvents = filterTypes
    ? events.filter((event) => filterTypes.includes(event.type))
    : events

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Activity"
          title="Events"
          description="Monitor all tracked user events in real time."
          actions={
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search events"
                className="pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          }
        />

        {isError && (
          <p className="text-destructive -mt-4 text-sm">
            Unable to load recent events for this project.
          </p>
        )}

        <div className="flex items-center justify-between border-y py-4 text-xs">
          <span className="text-muted-foreground">Last 24 hours</span>
          <span className="text-muted-foreground flex items-center gap-2">
            {isFetching && (
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            )}
            {formatNumber(eventData?.summary.totalEvents ?? 0)} events ·{' '}
            {formatNumber(eventData?.summary.totalVisitors ?? 0)} visitors
          </span>
        </div>

        <Tabs
          value={eventFilter}
          onValueChange={(value) => setEventFilter(value as EventFilter)}
          className="gap-0"
        >
          <TabsList
            variant="line"
            className="w-full justify-start overflow-x-auto overflow-y-hidden rounded-none border-b p-0"
          >
            {eventFilters.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-none rounded-none px-3 py-3 text-xs sm:text-sm"
              >
                <Icon className="size-4" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">
              {isPending ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <Skeleton className="size-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-52" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-4 w-14" />
                  </div>
                ))
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <div
                    key={event.id}
                    className="hover:bg-muted/50 flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="bg-primary/10 shrink-0 rounded-lg p-2">
                        {renderEventIcon(event.type)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {formatEventType(event.type)}
                          </p>
                          <Badge variant="secondary">{event.device}</Badge>
                        </div>

                        <p className="text-muted-foreground truncate text-sm">
                          {event.path}
                        </p>

                        {event.type === 'click' && event.text?.trim() && (
                          <p className="text-muted-foreground truncate text-sm">
                            {event.tag?.toLowerCase() === 'button'
                              ? 'Button'
                              : 'Clicked'}{' '}
                            &quot;{event.text.trim()}&quot;
                          </p>
                        )}

                        <p className="text-muted-foreground mt-1 truncate text-xs">
                          Anonymous #{event.visitorId.slice(0, 8)} ·{' '}
                          {event.country}
                        </p>
                      </div>
                    </div>

                    <span className="text-muted-foreground shrink-0 text-sm">
                      {formatRelativeTime(event.occurredAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground rounded-lg border border-dashed px-5 py-12 text-center text-sm">
                  No events match this filter and search in the last 24 hours.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ProjectPageLayout>
  )
}
