import { useRelativeTime } from '@/hooks/use-relative-time'
import { getProjectDomainsOptions } from '@/queries/domains'
import {
  getHeatmapsOptions,
  type HeatmapDevice,
  type HeatmapsRange,
} from '@/queries/heatmaps'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { DomainSwitcher } from '../-components/common/domain-switcher'
import { Separator } from '@workspace/ui/components/separator'
import { formatNumber, getPaginationItems } from '@/utils/utils'
import { Button } from '@workspace/ui/components/button'
import {
  ArrowUpRightIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  RefreshCcwIcon,
} from 'lucide-react'
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
import { CenterEllipsis } from '../-components/common/center-ellipsis'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { NoPermissionView } from '../-components/common/no-permission-view'

export const Route = createFileRoute('/app/$workspaceId/$projectId/heatmaps/')({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const deviceLabels = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const PAGE_SIZE = 10

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()
  const navigate = useNavigate()

  const rangeLocal = localStorage.getItem('range')
  const deviceLocal = localStorage.getItem('device')

  const [range, setRange] = useState<HeatmapsRange>(
    (rangeLocal || '7d') as HeatmapsRange
  )
  const [device, setDevice] = useState<HeatmapDevice>(
    (deviceLocal || 'desktop') as HeatmapDevice
  )
  const [liveMode, setLiveMode] = useState(false)
  const [page, setPage] = useState(1)
  const [domain, setDomain] = useState('')

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )
  const domains = domainsData?.data
  const activeDomain = domain || domains?.[0]?.domain || ''

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    getWorkspacePermissionsOptions(workspaceId)
  )

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('analytics.heatmaps.view')

  const {
    data: heatmapsData,
    isLoading: heatmapsLoading,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery({
    ...getHeatmapsOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      range,
      device,
      // page_path,
      domain: activeDomain,
      page,
      page_size: PAGE_SIZE,
      refetchInterval: liveMode ? 5000 : undefined,
    }),
    enabled: !!hasViewPermission,
  })

  const heatmaps = heatmapsData?.data
  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const totalEvents = heatmaps?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalEvents / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalEvents === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalEvents)

  return (
    <div>
      {permissionsLoading ? (
        <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
          <Skeleton className={'h-8 w-60'} />

          <div className="flex items-center gap-2">
            <Skeleton className={'h-8 w-30'} />
            <Skeleton className={'h-8 w-30'} />
            <Skeleton className={'h-8 w-30'} />
          </div>
        </div>
      ) : hasViewPermission ? (
        <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
          <div className="flex items-center gap-4">
            <DomainSwitcher
              loading={domainsLoading}
              domain={activeDomain}
              setDomain={(value) => {
                setDomain(value)
              }}
              domains={domains!}
              refetch={refetch}
            />

            <Separator orientation="vertical" />

            <div className="flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-sm">
                Last updated {lastUpdated ? lastUpdated : '-'}
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

            <Select
              items={rangeLabels}
              value={range}
              onValueChange={(value) => {
                if (!value) return
                setRange(value as HeatmapsRange)
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
                  setDevice(value as HeatmapDevice)
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
          </div>
        </div>
      ) : (
        <></>
      )}

      <div className="mx-auto space-y-4 p-6">
        <div>
          <p className="text-xl font-medium">Heatmaps</p>

          <p className="text-muted-foreground text-sm">
            Visualize user interactions and identify the most engaged areas of
            your project.
          </p>
        </div>

        {!hasViewPermission && !permissionsLoading ? (
          <NoPermissionView />
        ) : (
          <>
            <div className="overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-32 text-center">Path</TableHead>
                    <TableHead className="w-32 text-center">Visitor</TableHead>
                    <TableHead className="w-32 text-center">Views</TableHead>
                    <TableHead className="w-32 text-center">Clicks</TableHead>
                    <TableHead className="w-32 text-center">
                      Max Scroll
                    </TableHead>
                    <TableHead className="w-32 text-center">Heatmap</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {heatmapsLoading
                    ? [...Array(PAGE_SIZE)].map((_, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Skeleton className="h-5 w-32" />
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
                    : heatmaps?.pages?.map((item) => (
                        <TableRow
                          onClick={() => {
                            if (!item.id) return
                            void navigate({
                              to: '/app/$workspaceId/$projectId/heatmaps/$heatmapId',
                              params: {
                                workspaceId,
                                projectId,
                                heatmapId: item.id,
                              },
                            })
                          }}
                          key={item.path}
                          className="hover:bg-card/40 cursor-pointer"
                        >
                          <TableCell>
                            {item?.url ? (
                              <CenterEllipsis text={item?.url} maxLength={70} />
                            ) : (
                              <MinusIcon />
                            )}
                          </TableCell>

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
                            <Button size="icon" variant="outline">
                              <ArrowUpRightIcon />
                            </Button>
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
          </>
        )}
      </div>
    </div>
  )
}
