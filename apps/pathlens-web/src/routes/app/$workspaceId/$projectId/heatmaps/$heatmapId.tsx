import {
  getPreviewViewportForDevice,
  getHeatmapPreviewViewport,
  getSnapshotScrollOverlayDimensions,
  getSharedOverlayDimensions,
  selectClickAnchorIds,
  selectClickRegionIds,
  HeatmapOverlayLayer,
  type HeatmapOverlayType,
  type PreviewDevice,
  type ScrollOverlayDimensions,
} from '@/components/common/heatmap-overlay-layer'
import type {
  HeatmapClickSampleCoverage,
  HeatmapMovementCoverage,
  PreviewAnchorResolution,
  PreviewMeasurementState,
  PreviewRegionResolution,
} from '@workspace/contracts'
import {
  LivePreviewIframe,
  useLivePreviewSession,
} from '@/components/common/live-preview-iframe'
import { HeatmapCompletenessWarning } from '@/components/common/heatmap-completeness-warning'
import {
  getHeatmapDetailsOptions,
  type HeatmapDevice,
  type HeatmapPageDetail,
  type HeatmapsRange,
} from '@/queries/heatmaps'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Separator } from '@workspace/ui/components/separator'
import { ArrowLeftIcon, CheckIcon, RefreshCcwIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { useRelativeTime } from '@/hooks/use-relative-time'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { capitalizeFirstLetter, formatNumber } from '@/utils/utils'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Skeleton } from '@workspace/ui/components/skeleton'

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
]

const maxCount = 100

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/heatmaps/$heatmapId'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId, heatmapId } = Route.useParams()
  const navigate = useNavigate()

  const rangeLocal = localStorage.getItem('range')
  const deviceLocal = localStorage.getItem('device')

  const [range, setRange] = useState<HeatmapsRange>(
    (rangeLocal || '7d') as HeatmapsRange
  )
  const [device, setDevice] = useState<HeatmapDevice>(
    (deviceLocal || 'desktop') as HeatmapDevice
  )
  const [heatmapType, setHeatmapType] = useState<HeatmapOverlayType>('click')

  const {
    data: heatmapDetails,
    isLoading: heatmapLoading,
    dataUpdatedAt,
    refetch,
    isRefetching,
  } = useQuery(
    getHeatmapDetailsOptions({
      project_id: projectId,
      workspace_id: workspaceId,
      range,
      device,
      heatmap_id: heatmapId,
    })
  )

  const heatmap = heatmapDetails?.data
  const heatmapDataReady = Boolean(heatmap && !heatmapLoading)

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const previewContext = {
    workspaceId,
    projectId,
    heatmapId,
    device,
  }
  const previewState = useLivePreviewSession(previewContext)
  const previewDevice = previewState.session?.device ?? toPreviewDevice(device)
  const scrollSource = getScrollSourceDimensions(heatmap, previewDevice)
  const previewReadyForDevice =
    previewState.session?.device === toPreviewDevice(device)
  const visualizationReady = heatmapDataReady && previewReadyForDevice
  const heatmapViewport = getHeatmapPreviewViewport(previewDevice)
  const clickAnchorSelection =
    heatmapType === 'click' && heatmap?.clickSamples
      ? selectClickAnchorIds(
          heatmap.clickSamples,
          heatmap.anchorDefinitions ?? [],
          heatmapViewport
        )
      : null
  const clickRegionSelection =
    heatmapType === 'click' && heatmap?.clickSamples
      ? selectClickRegionIds(
          heatmap.clickSamples,
          heatmap.regionDefinitions ?? []
        )
      : null

  const analytics = [
    {
      title: 'Visitors',
      label: formatNumber(heatmap?.visitors) ?? 0,
    },
    {
      title: 'Page Views',
      label: formatNumber(heatmap?.views) ?? 0,
    },
    {
      title: 'Clicks',
      label: formatNumber(heatmap?.clicks) ?? 0,
    },
    {
      title: 'Avg. Scroll',
      label: `${heatmap?.averageScroll.toFixed(0) ?? 0}%`,
    },
  ]

  const hotAreas = [...(heatmap?.hotAreas ?? [])].sort(
    (a, b) => b.count - a.count
  )

  return (
    <div className="max-w-full min-w-0">
      <div className="bg-background sticky top-14.25 z-10 flex max-w-full min-w-0 flex-wrap items-center justify-between gap-2 border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to goals"
            onClick={() =>
              navigate({
                to: '/app/$workspaceId/$projectId/heatmaps',
                params: { workspaceId, projectId },
              })
            }
          >
            <ArrowLeftIcon />
          </Button>

          {/* <Separator orientation="vertical" />

          <DomainSwitcher
            loading={domainsLoading}
            domain={activeDomain}
            setDomain={(value) => {
              setDomain(value)
            }}
            domains={domains!}
            refetch={refetch}
          /> */}

          <Separator orientation="vertical" />

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Last updated {lastUpdated}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

          <Separator orientation="vertical" />

          <ButtonGroup>
            {(['click', 'movement', 'scroll'] as const).map((type) => (
              <Button
                key={type}
                aria-pressed={heatmapType === type}
                variant={'outline'}
                onClick={() => setHeatmapType(type)}
                className="duration-200"
              >
                {capitalizeFirstLetter(type)}

                <CheckIcon
                  className={`${heatmapType === type ? 'size-4' : 'size-0'} duration-200`}
                />
              </Button>
            ))}
          </ButtonGroup>
          <HeatmapCompletenessWarning
            coverage={
              heatmapType === 'click'
                ? heatmap?.clickSampleCoverage
                : heatmap?.movementCoverage
            }
            heatmapType={heatmapType === 'click' ? 'click' : 'movement'}
          />
        </div>
      </div>

      <div className="grid h-[calc(100dvh-106px)] grid-cols-[1fr_350px] gap-6 p-6">
        {heatmapLoading ? (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden! p-6">
            <p className="text-muted-foreground shimmer">Loading Preview...</p>
          </div>
        ) : (
          <div
            className="relative h-[calc(100dvh-206px)] w-full overflow-hidden"
            data-heatmap-viewer="live"
          >
            <HeatmapLiveViewer
              heatmap={heatmap}
              preview={previewState.session}
              status={previewState.status}
              onRetry={previewState.retry}
              error={
                previewState.error ??
                (heatmapLoading ? 'Loading heatmap...' : null)
              }
              device={previewDevice}
              overlayViewport={heatmapViewport}
              anchorSelection={clickAnchorSelection}
              regionSelection={clickRegionSelection}
              heatmapType={heatmapType}
              scrollSource={
                visualizationReady && !heatmap?.scrollGroups
                  ? scrollSource
                  : null
              }
              scrollGroups={
                visualizationReady
                  ? heatmap?.scrollGroups?.filter(
                      (group) => group.device === previewDevice
                    )
                  : undefined
              }
              heatmapDataReady={visualizationReady}
              clickCoverage={
                visualizationReady ? heatmap?.clickSampleCoverage : undefined
              }
              movementCoverage={
                visualizationReady ? heatmap?.movementCoverage : undefined
              }
              emptyStateMessage={
                visualizationReady
                  ? getHeatmapEmptyStateMessage(
                      heatmap,
                      heatmapType,
                      previewDevice
                    )
                  : null
              }
              // heatmapEmpty={
              //   !heatmapLoading &&
              //   !heatmapFetching &&
              //   !isError &&
              //   heatmapDetails?.success === true &&
              //   !heatmap
              // }
            />
          </div>
        )}

        <div className="h-full space-y-4 overflow-auto border-l px-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Analytics</p>

            <div className="grid grid-cols-2 gap-2">
              {analytics.map((item) => {
                return (
                  <Card
                    key={item.title}
                    className="bg-card/30 gap-0 rounded-none border-2 border-dashed p-3 shadow-none"
                  >
                    <CardHeader className="p-0">
                      <CardDescription className="text-xs">
                        {item.title}
                      </CardDescription>

                      <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums">
                        {heatmapLoading ? (
                          <Skeleton className="h-8 w-12" />
                        ) : (
                          item.label
                        )}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Hot Areas</h3>
              {!heatmapLoading && (
                <span className="text-muted-foreground text-xs">
                  {hotAreas.length} areas
                </span>
              )}
            </div>

            {heatmapLoading ? (
              <div className="divide-border divide-y">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="space-y-2 py-3">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-5 w-5 shrink-0" />

                      <div className="flex flex-1 items-center gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-28" />
                      </div>

                      <Skeleton className="h-5 w-8 shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : hotAreas.length > 0 ? (
              <div className="divide-border divide-y">
                {hotAreas.map((item, index) => {
                  const [type, ...parts] = item.key.split(':')
                  const label = parts.join(':') || type
                  const percentage = (item.count / maxCount) * 100

                  return (
                    <div key={item.key} className="space-y-2 py-3">
                      <div className="flex items-start gap-3">
                        <span className="text-muted-foreground w-5 shrink-0 pt-1 text-xs tabular-nums">
                          {String(index + 1).padStart(2, '0')}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="wrap-break text-sm leading-6">
                            <Badge
                              variant="secondary"
                              className="mr-1 inline-flex align-middle text-xs"
                            >
                              {capitalizeFirstLetter(type)}
                            </Badge>{' '}
                            <span>{label}</span>
                          </div>
                        </div>

                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {item.count.toLocaleString()}
                        </span>
                      </div>

                      <div className="bg-muted ml-8 h-1 overflow-hidden rounded-full">
                        <div
                          className="bg-primary/70 h-full rounded-full transition-[width] duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="border-2 border-dashed p-6 text-center">
                <p className="text-sm font-medium">No hot areas yet</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Areas will appear once activity is recorded.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function toPreviewDevice(
  device: 'all' | 'desktop' | 'mobile' | 'tablet' | 'unknown'
) {
  return device === 'mobile'
    ? 'mobile'
    : device === 'tablet'
      ? 'tablet'
      : 'desktop'
}

function getScrollSourceDimensions(
  heatmap: HeatmapPageDetail | null | undefined,
  device: PreviewDevice
): ScrollOverlayDimensions | null {
  const groups = [
    ...(heatmap?.movementGroups ?? []),
    ...(heatmap?.clickGroups ?? []),
  ]
  const selectedViewport = getPreviewViewportForDevice(groups, device)
  const matchingGroups = groups.filter(
    (group) =>
      group.sourceViewport?.width === selectedViewport.width &&
      group.sourceViewport?.height === selectedViewport.height
  )
  const trackerSource = getSharedOverlayDimensions(matchingGroups)
  if (trackerSource) return trackerSource

  return getSnapshotScrollOverlayDimensions(heatmap?.snapshot ?? null, device)
}

function hasUsablePoint(point: { x: number; y: number }, weight: number) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.x <= 1 &&
    point.y >= 0 &&
    point.y <= 1 &&
    Number.isFinite(weight) &&
    weight > 0
  )
}

function getHeatmapEmptyStateMessage(
  heatmap: HeatmapPageDetail | null | undefined,
  type: HeatmapOverlayType,
  device: PreviewDevice
) {
  if (!heatmap) return null

  if (type === 'click') {
    const hasSamples = (heatmap.clickSamples ?? []).some((group) =>
      group.samples.some((sample) => hasUsablePoint(sample, sample.weight))
    )
    const hasGroups = (heatmap.clickGroups ?? []).some((group) =>
      group.points.some((point) => hasUsablePoint(point, point.count))
    )
    const hasLegacyPoints = heatmap.clickPoints.some((point) =>
      hasUsablePoint(point, point.count)
    )
    return hasSamples || hasGroups || hasLegacyPoints
      ? null
      : 'No click data available for the selected filters.'
  }

  if (type === 'movement') {
    const hasGroups = (heatmap.movementGroups ?? []).some((group) =>
      group.points.some((point) => hasUsablePoint(point, point.count))
    )
    const hasLegacyPoints = (heatmap.movementPoints ?? []).some((point) =>
      hasUsablePoint(point, point.count)
    )
    return hasGroups || hasLegacyPoints
      ? null
      : 'No movement data available for the selected filters.'
  }

  const hasScrollObservations = (heatmap.scrollGroups ?? []).some(
    (group) =>
      group.device === device &&
      group.sessionCount > 0 &&
      group.reachPoints.some(
        (point) =>
          Number.isFinite(point.percentage) &&
          point.percentage >= 0 &&
          point.percentage <= 100 &&
          point.count > 0
      )
  )
  return hasScrollObservations
    ? null
    : 'No scroll data available for the selected filters.'
}

function HeatmapLiveViewer({
  heatmap,
  preview,
  status,
  error,
  onRetry,
  device,
  heatmapType,
  scrollSource,
  scrollGroups,
  heatmapDataReady,
  overlayViewport,
  anchorSelection,
  regionSelection,
  emptyStateMessage,
  clickCoverage,
  movementCoverage,
}: {
  heatmap: HeatmapPageDetail | null | undefined
  preview: Parameters<typeof LivePreviewIframe>[0]['preview']
  status: Parameters<typeof LivePreviewIframe>[0]['status']
  error: Parameters<typeof LivePreviewIframe>[0]['error']
  onRetry: Parameters<typeof LivePreviewIframe>[0]['onRetry']
  device: 'desktop' | 'mobile' | 'tablet'
  heatmapType: HeatmapOverlayType
  scrollSource: ScrollOverlayDimensions | null
  scrollGroups: HeatmapPageDetail['scrollGroups']
  heatmapDataReady: boolean
  overlayViewport: { width: number; height: number } | null
  anchorSelection: ReturnType<typeof selectClickAnchorIds> | null
  regionSelection: ReturnType<typeof selectClickRegionIds> | null
  emptyStateMessage: string | null
  clickCoverage: HeatmapClickSampleCoverage | undefined
  movementCoverage: HeatmapMovementCoverage | undefined
}) {
  const [measurement, setMeasurement] =
    useState<PreviewMeasurementState | null>(null)
  const [anchorResolutions, setAnchorResolutions] = useState<
    PreviewAnchorResolution[] | null
  >(null)
  const [regionResolutions, setRegionResolutions] = useState<
    PreviewRegionResolution[] | null
  >(null)
  const [measurementSessionKey, setMeasurementSessionKey] = useState('')
  const sessionKey = `${preview?.session_id ?? 'no-session'}:${device}`
  const widthClass =
    device === 'mobile'
      ? 'mx-auto max-w-[390px]'
      : device === 'tablet'
        ? 'mx-auto max-w-[768px]'
        : 'w-full'

  const handleMeasurementChange = (next: PreviewMeasurementState | null) => {
    setMeasurement(next)
    setMeasurementSessionKey(next ? sessionKey : '')
  }

  const handleAnchorResolutionChange = (
    next: PreviewAnchorResolution[] | null
  ) => {
    setAnchorResolutions(next)
  }

  return (
    <>
      <LivePreviewIframe
        preview={preview}
        status={status}
        error={error}
        onRetry={onRetry}
        className={widthClass}
        virtualViewport={overlayViewport}
        onMeasurementChange={handleMeasurementChange}
        anchorIds={anchorSelection?.requestedAnchorIds ?? []}
        onAnchorResolutionChange={handleAnchorResolutionChange}
        regionIds={regionSelection?.requestedRegionIds ?? []}
        onRegionResolutionChange={setRegionResolutions}
        overlay={
          <>
            <HeatmapOverlayLayer
              sessionKey={sessionKey}
              clickGroups={heatmapDataReady ? (heatmap?.clickGroups ?? []) : []}
              clickSampleGroups={
                heatmapDataReady ? heatmap?.clickSamples : undefined
              }
              anchorDefinitions={
                heatmapDataReady ? heatmap?.anchorDefinitions : undefined
              }
              anchorResolutions={anchorResolutions}
              anchorSelection={anchorSelection}
              regionResolutions={regionResolutions}
              movementGroups={
                heatmapDataReady ? (heatmap?.movementGroups ?? []) : []
              }
              heatmapType={heatmapType}
              scrollPoints={
                heatmapDataReady ? (heatmap?.scrollPoints ?? []) : []
              }
              scrollGroups={heatmapDataReady ? scrollGroups : undefined}
              scrollSource={heatmapDataReady ? scrollSource : null}
              measurement={
                measurementSessionKey === sessionKey ? measurement : null
              }
              emptyStateMessage={emptyStateMessage}
              clickCoverage={clickCoverage}
              movementCoverage={movementCoverage}
            />
          </>
        }
      />
    </>
  )
}
