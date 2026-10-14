import { useCreateFunnel } from '@/mutations/funnels'
import { getFunnelsOptions, type FunnelRange } from '@/queries/funnels'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { getProjectDomainsOptions } from '@/queries/domains'
import { Separator } from '@workspace/ui/components/separator'
import { useRelativeTime } from '@/hooks/use-relative-time'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { PauseIcon, PlayIcon, PlusIcon, RefreshCcwIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'

export const Route = createFileRoute('/app/$workspaceId/$projectId/funnels')({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const rangeLocal = localStorage.getItem('range')
  const [range, setRange] = useState<FunnelRange>(
    (rangeLocal || '7d') as FunnelRange
  )
  const [domain, setDomain] = useState('')
  const [liveMode, setLiveMode] = useState(false)

  const {
    data: funnelsData,
    refetch,
    dataUpdatedAt,
    isRefetching,
    isLoading,
  } = useQuery(
    getFunnelsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range: '7d',
      domain: undefined,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const funnels = funnelsData?.data
  const domains = domainsData?.data
  const activeDomain = domain || domains?.[0]?.domain || ''

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const { mutate } = useCreateFunnel()

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <DomainSwitcher
            loading={domainsLoading}
            domain={activeDomain}
            setDomain={setDomain}
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
              setRange(value as FunnelRange)
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
        </div>
      </div>

      <div className="mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">Funnels</p>

            <p className="text-muted-foreground text-sm">
              Track user journeys, analyze conversion rates, and identify where
              visitors drop off.
            </p>
          </div>

          <Button>
            <PlusIcon />
            Create Funnel
          </Button>
        </div>

        <div>
          <div className="grid grid-cols-4 gap-2">
            {isLoading
              ? [...Array(5)].map((_, index) => (
                  <Card
                    className="bg-card/30 rounded-none border-2 border-dashed p-2"
                    key={index}
                  >
                    <CardHeader className="p-0">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-4 w-42" />
                    </CardHeader>

                    <CardContent className="flex items-center gap-4 p-0">
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                      <Skeleton className="h-8 w-8" />
                    </CardContent>
                  </Card>
                ))
              : funnels?.map((item, index) => (
                  <Card
                    className="bg-card/30 rounded-none border-2 border-dashed p-2"
                    key={index}
                  >
                    <CardHeader className="p-0">
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                ))}
          </div>
        </div>
      </div>
    </div>
  )
}
