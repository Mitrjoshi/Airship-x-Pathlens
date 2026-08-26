import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import { HeatmapReplayPreview } from '@/components/common/heatmap-replay-preview'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import {
  getHeatmapsOptions,
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
  return `${Math.round(value)}%`
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
              Click concentration for {page.path}. The reconstructed page is
              scaled to fit the panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HeatmapReplayPreview
              events={page.replayEvents}
              points={page.clickPoints}
              viewport={page.viewport}
            />
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
                      {Math.round(point.x)}% x {Math.round(point.y)}%
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
    </div>
  )
}

function ScrollDepthMap({ page }: { page: HeatmapPageDetail }) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowDownToLineIcon className="text-muted-foreground size-4" />
          Scroll depth
        </CardTitle>
        <CardDescription>
          Activity intensity by the furthest percentage visitors reached.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <div className="text-muted-foreground flex h-[360px] flex-col justify-between text-[11px] tabular-nums">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
          <div className="relative h-[360px] min-w-0 flex-1 overflow-hidden rounded-xl border bg-gradient-to-b from-red-500/10 via-orange-400/10 to-emerald-500/10">
            <div className="absolute inset-x-0 top-0 h-1/4 border-b border-dashed border-red-500/25" />
            <div className="absolute inset-x-0 top-1/4 h-1/4 border-b border-dashed border-orange-500/25" />
            <div className="absolute inset-x-0 top-1/2 h-1/4 border-b border-dashed border-yellow-500/25" />
            <div className="absolute inset-x-0 top-3/4 h-1/4" />
            {page.scrollPoints.map((point) => (
              <div
                key={point.percentage}
                className="absolute inset-x-0 h-3 -translate-y-1/2 bg-gradient-to-r from-transparent via-red-500 to-transparent"
                style={{
                  top: `${point.percentage}%`,
                  opacity: 0.12 + point.intensity * 0.72,
                }}
                title={`${point.count} scroll events at ${Math.round(point.percentage)}%`}
              />
            ))}
            <div className="absolute inset-x-3 top-3 bottom-3 rounded-full border border-white/40 dark:border-white/10" />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
          <span className="text-muted-foreground">Average reached</span>
          <span className="font-semibold">
            {formatPercent(page.averageScroll)}
          </span>
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
            viewport={page.viewport}
          />
        </CardContent>
      </Card>
      <ScrollDepthMap page={page} />
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

function PageContent() {
  const { workspace, project } = Route.useParams()
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const heatmapPageLimit = currentPlan.limits.heatmapPages
  const [range, setRange] = useState<HeatmapsRange>('7d')
  const [selectedPath, setSelectedPath] = useState<string | undefined>()
  const { data, isError, isFetching, isPending } = useQuery(
    getHeatmapsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
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
