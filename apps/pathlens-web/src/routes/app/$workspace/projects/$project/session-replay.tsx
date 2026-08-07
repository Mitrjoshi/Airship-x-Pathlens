import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
} from '@/components/common/project-page'
import { SessionReplayPlayer } from '@/components/common/session-replay-player'
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
import {
  getSessionReplayDetailOptions,
  getSessionReplayOptions,
  type SessionReplayDevice,
  type SessionReplayRange,
  type SessionReplaySession,
} from '@/queries/session-replay'
import { formatNumber, formatRelativeTime } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  CalendarIcon,
  Clock3Icon,
  GlobeIcon,
  MonitorIcon,
  PlayCircleIcon,
  SearchIcon,
  SmartphoneIcon,
} from 'lucide-react'
import { useDeferredValue, useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/session-replay'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [search, setSearch] = useState('')
  const [range, setRange] = useState<SessionReplayRange>('7d')
  const [device, setDevice] = useState<SessionReplayDevice>('all')
  const [selectedSession, setSelectedSession] =
    useState<SessionReplaySession | null>(null)
  const deferredSearch = useDeferredValue(search)

  const { data, isError, isPending } = useQuery(
    getSessionReplayOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
      search: deferredSearch || undefined,
      page: 1,
      page_size: 50,
    })
  )

  const sessionReplay = data?.data
  const replayDetailQuery = useQuery(
    getSessionReplayDetailOptions({
      workspace_id: workspace,
      project_id: project,
      session_id: selectedSession?.id ?? '',
    })
  )
  const stats = [
    {
      title: 'Recorded Sessions',
      value: formatNumber(sessionReplay?.stats.recordedSessions ?? 0),
    },
    {
      title: 'Replay Available',
      value: formatNumber(sessionReplay?.stats.replayAvailable ?? 0),
    },
    {
      title: 'Avg Session',
      value: sessionReplay?.stats.avgSession ?? '0s',
    },
    {
      title: 'Storage Used',
      value: sessionReplay?.stats.storageUsed ?? '0 B',
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Behavior"
          title="Session Replay"
          description="Watch recordings of visitor sessions to understand user behaviour."
        />

        {isError && (
          <p className="text-destructive -mt-4 text-sm">
            Unable to load session replays for the selected filters.
          </p>
        )}

        <ProjectMetricStrip className="lg:grid-cols-4">
          {stats.map((stat) => (
            <ProjectMetric
              key={stat.title}
              label={stat.title}
              value={stat.value}
              isLoading={isPending}
            />
          ))}
        </ProjectMetricStrip>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />

              <Input
                className="pl-9"
                placeholder="Search visitor, path, or source..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Select
              value={device}
              onValueChange={(value) => {
                if (value) setDevice(value as SessionReplayDevice)
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <SelectValue placeholder="Device" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as SessionReplayRange)
              }}
            >
              <SelectTrigger className="w-full lg:w-44">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Date range" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recorded Sessions</CardTitle>

            <CardDescription>Select a session to replay.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <Table className="min-w-[900px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Visitor</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isPending ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        {Array.from({ length: 8 }).map((__, cellIndex) => (
                          <TableCell key={cellIndex}>
                            <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : sessionReplay?.sessions.length ? (
                    sessionReplay.sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-medium">
                          Anonymous #{session.visitorId.slice(0, 8)}
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GlobeIcon className="text-muted-foreground h-4 w-4" />
                            <span>{session.country}</span>
                            <span className="text-muted-foreground text-xs">
                              {session.countryCode}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            {session.device === 'Desktop' ? (
                              <MonitorIcon className="h-4 w-4" />
                            ) : (
                              <SmartphoneIcon className="h-4 w-4" />
                            )}

                            {session.device}
                          </div>
                        </TableCell>

                        <TableCell>{session.pages}</TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock3Icon className="text-muted-foreground h-4 w-4" />
                            {session.duration}
                          </div>
                        </TableCell>

                        <TableCell>{session.source}</TableCell>

                        <TableCell>
                          <Badge variant="secondary">
                            {formatRelativeTime(session.recordedAt)}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button onClick={() => setSelectedSession(session)}>
                            <PlayCircleIcon className="mr-2 h-4 w-4" />
                            Replay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-muted-foreground py-12 text-center"
                      >
                        No recorded sessions found for these filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <SessionReplayPlayer
        key={selectedSession?.id ?? 'closed'}
        open={Boolean(selectedSession)}
        session={selectedSession}
        detail={replayDetailQuery.data?.data}
        isLoading={replayDetailQuery.isPending || replayDetailQuery.isFetching}
        isError={replayDetailQuery.isError}
        onOpenChange={(open) => {
          if (!open) setSelectedSession(null)
        }}
      />
    </ProjectPageLayout>
  )
}
