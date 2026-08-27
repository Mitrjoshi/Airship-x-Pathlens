import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { HeatmapReplayPreview } from '@/components/common/heatmap-replay-preview'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import {
  getHeatmapsOptions,
  type HeatmapDevice,
  type HeatmapHotArea,
  type HeatmapPage,
  type HeatmapPageDetail,
  type HeatmapsRange,
} from '@/queries/heatmaps'
import { formatNumber } from '@/utils/utils'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs'
import { Progress } from '@workspace/ui/components/progress'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownToLineIcon,
  EyeIcon,
  LayoutTemplateIcon,
  MousePointer2Icon,
  RouteIcon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/heatmaps'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Heatmaps',
  },
})

function formatPercent(value: number): string {
  const safeValue = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0

  return `${Math.round(safeValue)}%`
}

function PageList({
  pages,
  selectedPath,
  onSelect,
}: {
  pages: HeatmapPage[]
  selectedPath: string | undefined
  onSelect: (path: string) => void
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-1 border-b sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutTemplateIcon className="text-muted-foreground size-4" />
            Pages
          </CardTitle>
          <CardDescription>Choose a page to inspect.</CardDescription>
        </div>
        <span className="text-muted-foreground text-xs">
          {pages.length} captured {pages.length === 1 ? 'page' : 'pages'}
        </span>
      </CardHeader>
      <CardContent className="grid max-h-72 gap-2 overflow-y-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
        {pages.map((page) => (
          <button
            key={page.path}
            type="button"
            className={`w-full rounded-lg border p-3 text-left transition-colors ${page.path === selectedPath ? 'border-foreground bg-muted' : 'hover:bg-muted/60 border-border/60'}`}
            onClick={() => onSelect(page.path)}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-medium">
                {page.path}
              </span>
              <Badge variant="secondary">{formatNumber(page.views)}</Badge>
            </div>
            <div className="text-muted-foreground mt-2 flex items-center gap-3 text-xs">
              <span>{formatNumber(page.clicks)} clicks</span>
              <span>{formatPercent(page.maxScroll)} scrolled</span>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

function ClickLegend() {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-xs">
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-full bg-orange-300" />
        Lower activity
      </span>
      <span className="flex items-center gap-2">
        <span className="size-3 rounded-full bg-red-500" />
        Higher activity
      </span>
      <span>Each point represents a grouped click region.</span>
    </div>
  )
}

function ClickHeatmap({ page }: { page: HeatmapPageDetail }) {
  const topPoints = page.clickPoints.slice(0, 6)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Click heatmap</CardTitle>
            <CardDescription>
              Click concentration for {page.path} over the captured page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapReplayPreview
              events={page.replayEvents}
              points={page.clickPoints}
              viewport={page.replayViewport ?? page.viewport}
            />
            {page.clickPoints.length === 0 && (
              <p className="text-muted-foreground mt-3 text-center text-sm">
                No click data is available for this page in the selected range.
              </p>
            )}
            {page.coordinateMode !== 'document' && (
              <p className="text-muted-foreground mt-3 text-xs">
                Click positions are shown relative to the captured viewport.
              </p>
            )}
            <div className="mt-4">
              <ClickLegend />
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Top click regions</CardTitle>
            <CardDescription>Most active viewport areas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topPoints.length > 0 ? (
              topPoints.map((point, index) => (
                <div key={`${point.x}-${point.y}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-medium">
                      <span className="text-muted-foreground w-4 tabular-nums">
                        {index + 1}
                      </span>
                      {`${Math.round(point.x * 100)}% x ${Math.round(point.y * 100)}%`}
                    </span>
                    <span className="text-muted-foreground">
                      {formatNumber(point.count)}
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-300 to-red-500"
                      style={{ width: `${point.intensity * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                No click data for this page yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <HotAreas areas={page.hotAreas} />
    </div>
  )
}

function HotAreas({ areas }: { areas: HeatmapHotArea[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Hot Areas</CardTitle>
        <CardDescription>
          Ranked regions by click activity for the selected page and filters.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {areas.length > 0 ? (
          <div className="space-y-4">
            {areas.map((area, index) => (
              <div key={area.key} className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground w-5 tabular-nums">
                    {index + 1}.
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {area.label}
                  </span>
                  <span className="text-muted-foreground shrink-0 tabular-nums">
                    {formatNumber(area.count)} clicks
                  </span>
                  <span className="text-muted-foreground w-12 text-right text-xs tabular-nums">
                    {Math.round(area.percentage)}%
                  </span>
                </div>
                <Progress
                  value={area.intensity * 100}
                  aria-label={`${area.label}: ${formatNumber(area.count)} clicks`}
                  className="ml-8"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground py-6 text-center text-sm">
            No click activity for this period.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ScrollSummary({ page }: { page: HeatmapPageDetail }) {
  const reachMetrics = [
    { label: 'Reached 25%', value: page.reach25 },
    { label: 'Reached 50%', value: page.reach50 },
    { label: 'Reached 75%', value: page.reach75 },
    { label: 'Reached 100%', value: page.reach100 },
  ]

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowDownToLineIcon className="text-muted-foreground size-4" />
          Scroll summary
        </CardTitle>
        <CardDescription>
          Session-weighted reach for {page.path}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Average depth</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatPercent(page.averageScroll)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">Maximum depth</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatPercent(page.maxScroll)}
            </p>
          </div>
        </div>
        <div className="space-y-4">
          {reachMetrics.map((metric) => {
            const value = Number.isFinite(metric.value)
              ? Math.min(100, Math.max(0, metric.value))
              : 0

            return (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-medium tabular-nums">
                    {formatPercent(value)}
                  </span>
                </div>
                <Progress value={value} aria-label={metric.label} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function ScrollHeatmap({ page }: { page: HeatmapPageDetail }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Scroll heatmap</CardTitle>
          <CardDescription>
            See the captured page alongside the depth distribution for{' '}
            {page.path}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HeatmapReplayPreview
            events={page.replayEvents}
            scrollPoints={page.scrollPoints}
            viewport={page.replayViewport ?? page.viewport}
          />
          {page.scrollPoints.length === 0 && (
            <p className="text-muted-foreground mt-3 text-center text-sm">
              No scroll activity for this period.
            </p>
          )}
        </CardContent>
      </Card>
      <ScrollSummary page={page} />
    </div>
  )
}

function RouteComponent() {
  return <PageContent />
}

const rangeLabels: Record<HeatmapsRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const deviceLabels: Record<HeatmapDevice, string> = {
  all: 'All devices',
  desktop: 'Desktop',
  mobile: 'Mobile',
  tablet: 'Tablet',
}

function PageContent() {
  const { workspace, project } = Route.useParams()
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const heatmapPageLimit = currentPlan.limits.heatmapPages
  const [range, setRange] = useState<HeatmapsRange>('7d')
  const [device, setDevice] = useState<HeatmapDevice>('all')
  const [selectedPath, setSelectedPath] = useState<string | undefined>()
  const { data, isError, isFetching, isPending } = useQuery(
    getHeatmapsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
      page_path: selectedPath,
    })
  )
  const heatmaps = data?.data
  const visiblePages =
    heatmaps?.pages.slice(0, heatmapPageLimit ?? undefined) ?? []
  const heatmapLimitReached =
    heatmapPageLimit !== null &&
    (heatmaps?.pages.length ?? 0) > heatmapPageLimit
  const page = heatmaps?.selectedPage
  const activePath = page?.path ?? selectedPath
  const summary = [
    {
      label: 'Page views',
      value: formatNumber(page?.views ?? 0),
      icon: EyeIcon,
    },
    {
      label: 'Clicks',
      value: formatNumber(page?.clicks ?? 0),
      icon: MousePointer2Icon,
    },
    {
      label: 'Scroll events',
      value: formatNumber(page?.scrollEvents ?? 0),
      icon: ArrowDownToLineIcon,
    },
    {
      label: 'Max scroll',
      value: formatPercent(page?.maxScroll ?? 0),
      icon: RouteIcon,
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Behaviour"
          title="Heatmaps"
          description="Understand where visitors click and how far they scroll on each page."
        />

        {heatmapLimitReached && heatmapPageLimit !== null && (
          <PlanLimitNotice
            workspaceId={workspace}
            resource="heatmap page"
            limit={heatmapPageLimit}
          />
        )}

        <PageToolbar className="justify-between">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {isFetching ? 'Updating heatmap data...' : 'Updated automatically'}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={range}
              onValueChange={(value) => {
                if (value) setRange(value as HeatmapsRange)
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Date range">
                  {rangeLabels[range]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={device}
              onValueChange={(value) => {
                if (value) setDevice(value as HeatmapDevice)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Device">
                  {deviceLabels[device]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load heatmaps for this project.
          </p>
        )}

        <ProjectMetricStrip className="lg:grid-cols-4">
          {summary.map(({ label, value, icon: Icon }) => (
            <ProjectMetric
              key={label}
              label={label}
              value={value}
              icon={Icon}
              isLoading={isPending}
            />
          ))}
        </ProjectMetricStrip>

        {isPending ? (
          <div className="bg-muted h-96 animate-pulse rounded-xl" />
        ) : visiblePages.length && page ? (
          <div className="space-y-6">
            <PageList
              pages={visiblePages}
              selectedPath={activePath}
              onSelect={setSelectedPath}
            />

            <Tabs defaultValue="clicks" className="min-w-0">
              <TabsList
                variant="line"
                className="w-full justify-start border-b"
              >
                <TabsTrigger value="clicks" className="gap-2 px-4 py-3">
                  <MousePointer2Icon className="size-4" />
                  Clicks
                </TabsTrigger>
                <TabsTrigger value="scroll" className="gap-2 px-4 py-3">
                  <ArrowDownToLineIcon className="size-4" />
                  Scroll
                </TabsTrigger>
              </TabsList>
              <TabsContent value="clicks" className="pt-5">
                <ClickHeatmap page={page} />
              </TabsContent>
              <TabsContent value="scroll" className="pt-5">
                <ScrollHeatmap page={page} />
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Card>
            <CardContent className="text-muted-foreground flex min-h-72 flex-col items-center justify-center gap-2 text-center text-sm">
              <LayoutTemplateIcon className="size-8 opacity-40" />
              <p>No page activity has been captured for this range.</p>
              <p className="text-xs">
                Heatmaps will appear after visitors interact with the site.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectPageLayout>
  )
}
