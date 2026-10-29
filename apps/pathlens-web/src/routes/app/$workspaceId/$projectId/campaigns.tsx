import { useRelativeTime } from '@/hooks/use-relative-time'
import {
  getCampaignsOptions,
  type CampaignDevice,
  type CampaignRange,
} from '@/queries/campaigns'
import { getProjectDomainsOptions } from '@/queries/domains'
import { getPaginationItems } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { Separator } from '@workspace/ui/components/separator'
import { Button } from '@workspace/ui/components/button'
import { PauseIcon, PlayIcon, RefreshCcwIcon, SearchIcon } from 'lucide-react'
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
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { NoPermissionView } from './-components/common/no-permission-view'

const deviceLabels = [
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'unknown', label: 'Unknown' },
]

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const PAGE_SIZE = 10

export const Route = createFileRoute('/app/$workspaceId/$projectId/campaigns')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const rangeLocal = localStorage.getItem('range')
  const deviceLocal = localStorage.getItem('device')

  const [range, setRange] = useState<CampaignRange>(
    (rangeLocal || '7d') as CampaignRange
  )
  const [device, setDevice] = useState<CampaignDevice>(
    (deviceLocal || 'desktop') as CampaignDevice
  )

  const [liveMode, setLiveMode] = useState(false)
  const [page, setPage] = useState(1)
  const [domain, setDomain] = useState('')

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    getWorkspacePermissionsOptions(workspaceId)
  )

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('analytics.campaigns.view')

  const {
    data: campaignsData,
    isLoading,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery({
    ...getCampaignsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      device,
      goal_id: undefined,
      page,
      page_size: PAGE_SIZE,
      domain,
    }),
    enabled: !!hasViewPermission,
  })

  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    ...getProjectDomainsOptions(projectId),
    enabled: !!hasViewPermission,
  })

  const campaigns = campaignsData?.data
  const domains = domainsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const totalCampaigns = campaigns?.pagination?.total ?? 0
  const totalPages = Math.ceil(totalCampaigns / PAGE_SIZE)
  const paginationItems = getPaginationItems(page, totalPages)

  const from = totalCampaigns === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalCampaigns)

  useEffect(() => {
    if (domains) {
      setDomain(domains[0].domain)
    }
  }, [domains])

  const summaryCards = [
    {
      title: 'Campaigns',
      value: campaigns?.summary?.campaignCount ?? 0,
    },
    {
      title: 'Visitors',
      value: campaigns?.summary?.visitors ?? 0,
    },
    {
      title: 'Sessions',
      value: campaigns?.summary?.sessions ?? 0,
    },
    {
      title: 'Engaged Visitors',
      value: campaigns?.summary?.engagedVisitors ?? 0,
    },
    {
      title: 'Engaged Sessions',
      value: campaigns?.summary?.engagedSessions ?? 0,
    },
    {
      title: 'Engagement Rate',
      value:
        campaigns?.summary?.engagementRate != null
          ? `${campaigns.summary.engagementRate}%`
          : '—',
    },
    {
      title: 'Converted Visitors',
      value: campaigns?.summary?.convertedVisitors ?? '—',
    },
    {
      title: 'Conversion Rate',
      value:
        campaigns?.summary?.conversionRate != null
          ? `${campaigns.summary.conversionRate}%`
          : '—',
    },
    {
      title: 'Revenue',
      value: campaigns?.summary?.revenue ?? '—',
    },
  ]

  return (
    <div>
      {/* Top toolbar */}
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

            <Separator orientation="vertical" className="hidden sm:block" />

            <Select
              items={rangeLabels}
              value={range}
              onValueChange={(value) => {
                if (!value) return
                setRange(value as CampaignRange)
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
                if (!value) return
                setDevice(value as CampaignDevice)
                localStorage.setItem('device', value)
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
        {/* Heading */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">Campaigns</p>

            <p className="text-muted-foreground text-sm">
              Monitor campaigns across your project.
            </p>
          </div>
        </div>

        {!hasViewPermission && !permissionsLoading ? (
          <NoPermissionView />
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3">
              {summaryCards.map((item) => (
                <Card
                  className="bg-card/30 rounded-none border-2 border-dashed"
                  key={item.title}
                >
                  <CardHeader>
                    {isLoading ? (
                      <div>
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="mt-2 h-7 w-16" />
                      </div>
                    ) : (
                      <>
                        <CardDescription>{item.title}</CardDescription>
                        <CardTitle className="text-xl">{item.value}</CardTitle>
                      </>
                    )}
                  </CardHeader>
                </Card>
              ))}
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
                        <TableHead>Campaign</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Medium</TableHead>
                        <TableHead>Term</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead className="text-center">Visitors</TableHead>
                        <TableHead className="text-center">Sessions</TableHead>
                        <TableHead className="text-center">
                          Engaged Visitors
                        </TableHead>
                        <TableHead className="text-center">
                          Engaged Sessions
                        </TableHead>
                        <TableHead className="text-center">
                          Engagement Rate
                        </TableHead>
                        <TableHead className="text-center">
                          Converted Visitors
                        </TableHead>
                        <TableHead className="text-center">
                          Conversion Rate
                        </TableHead>
                        <TableHead className="text-center">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading
                        ? [...Array(PAGE_SIZE)].map((_, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex w-full justify-center">
                                  <Skeleton className="h-5 w-16" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        : campaigns?.campaigns?.map((item, index) => (
                            <TableRow key={index} className="hover:bg-muted/40">
                              <TableCell>
                                <span className="font-medium">
                                  {getCampaignName(item)}
                                </span>
                              </TableCell>

                              <TableCell>{item.utmSource || 'N/A'}</TableCell>

                              <TableCell>{item.utmMedium || 'N/A'}</TableCell>

                              <TableCell>{item.utmTerm || 'N/A'}</TableCell>

                              <TableCell>{item.utmContent || 'N/A'}</TableCell>

                              <TableCell className="text-center">
                                {item.visitors || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.sessions || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.engagedVisitors || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.engagedSessions || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.engagementRate || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.convertedVisitors || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.conversionRate || 'N/A'}
                              </TableCell>

                              <TableCell className="text-center">
                                {item.revenue || 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))}

                      {!isLoading && !campaigns?.campaigns?.length && (
                        <TableRow>
                          <TableCell colSpan={13} className="h-32 text-center">
                            <p className="text-muted-foreground text-sm">
                              No campaigns found.
                            </p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  <div className="flex items-center justify-between border-t px-4 py-3">
                    <p className="text-muted-foreground text-sm">
                      {totalCampaigns > 0 ? (
                        <>
                          Showing {from}-{to} of {totalCampaigns} events
                        </>
                      ) : (
                        'No events'
                      )}
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || isLoading}
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
                              disabled={isLoading}
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
                        disabled={page >= totalPages || isLoading}
                        onClick={() => {
                          setPage((current) =>
                            Math.min(current + 1, totalPages)
                          )
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>{' '}
          </>
        )}
      </div>
    </div>
  )
}

const getCampaignName = (item: {
  utmCampaign: string | null
  isUnattributed: boolean
}) => {
  if (item.isUnattributed) return 'Unattributed'

  return item.utmCampaign || '—'
}
