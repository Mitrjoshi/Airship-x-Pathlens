import { useRelativeTime } from '@/hooks/use-relative-time'
import { getProjectDomainsOptions } from '@/queries/domains'
import {
  getHeatmapsOptions,
  type HeatmapDevice,
  type HeatmapsRange,
} from '@/queries/heatmaps'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { Separator } from '@workspace/ui/components/separator'
import { formatRelativeTime } from '@/utils/utils'
import { Button } from '@workspace/ui/components/button'
import { CalendarIcon, PauseIcon, PlayIcon, RefreshCcwIcon } from 'lucide-react'
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

export const Route = createFileRoute('/app/$workspaceId/$projectId/heatmaps')({
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

  const [range, setRange] = useState<HeatmapsRange>('7d')
  const [liveMode, setLiveMode] = useState(false)
  const [page, setPage] = useState(1)
  const [device, setDevice] = useState<HeatmapDevice>('all')
  const [domain, setDomain] = useState('')

  const {
    data: heatmapsData,
    isLoading: heatmapsLoading,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery(
    getHeatmapsOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      range,
      device,
      // page_path,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const heatmaps = heatmapsData?.data
  const domains = domainsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt, 60_000)

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
                if (value) setRange(value as HeatmapsRange)
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
                setDevice(value as HeatmapDevice)
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
    </div>
  )
}
