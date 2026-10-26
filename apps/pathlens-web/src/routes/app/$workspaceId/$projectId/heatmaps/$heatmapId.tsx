import {
  getPreviewViewportForDevice,
  getRepresentativeClickOverlayViewport,
  getScrollGroupOverlayViewport,
  getSnapshotScrollOverlayDimensions,
  getSharedOverlayDimensions,
  selectClickAnchorIds,
  HeatmapOverlayLayer,
  type HeatmapOverlayType,
  type PreviewDevice,
  type ScrollOverlayDimensions,
} from '@/components/common/heatmap-overlay-layer'
import type {
  PreviewAnchorResolution,
  PreviewMeasurementState,
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
import { useEffect, useState } from 'react'
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
import { capitalizeFirstLetter } from '@/utils/utils'

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
    isFetching: heatmapFetching,
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
  const heatmapDataReady = Boolean(
    heatmap && !heatmapLoading && !heatmapFetching
  )

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
  const clickAnchorSelection =
    heatmapType === 'click' && heatmap?.clickSamples
      ? selectClickAnchorIds(
          heatmap.clickSamples,
          heatmap.anchorDefinitions ?? [],
          getRepresentativeClickOverlayViewport(
            heatmap.clickSamples,
            previewDevice
          )
        )
      : null

  return (
    <div className="max-w-full min-w-0">
      <div className="bg-background sticky top-14.25 z-10 flex max-w-full min-w-0 flex-wrap items-center justify-between gap-2 border-b p-4 py-2">
        <div className="flex items-center gap-2">
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

      {heatmapLoading ? (
        <div className="relative flex h-[calc(100dvh-106px)] w-full items-center justify-center p-6">
          <p className="text-muted-foreground shimmer">Loading Preview...</p>
        </div>
      ) : (
        <div
          className="relative h-[calc(100dvh-106px)] w-full p-6"
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
            range={range}
            overlayViewport={
              heatmapType === 'scroll' && heatmap?.scrollGroups
                ? (getScrollGroupOverlayViewport(
                    heatmap.scrollGroups,
                    previewDevice
                  ) ??
                  getPreviewViewportForDevice(
                    heatmap?.clickGroups ?? [],
                    previewDevice
                  ))
                : heatmapType === 'scroll' && scrollSource
                  ? scrollSource.viewport
                  : heatmapType === 'movement'
                    ? getPreviewViewportForDevice(
                        heatmap?.movementGroups ?? [],
                        previewDevice
                      )
                    : getRepresentativeClickOverlayViewport(
                        heatmap?.clickSamples ?? heatmap?.clickGroups ?? [],
                        previewDevice
                      )
            }
            anchorSelection={clickAnchorSelection}
            heatmapType={heatmapType}
            scrollSource={
              visualizationReady && !heatmap?.scrollGroups ? scrollSource : null
            }
            scrollGroups={
              visualizationReady ? heatmap?.scrollGroups : undefined
            }
            heatmapDataReady={visualizationReady}
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

function HeatmapLiveViewer({
  heatmap,
  preview,
  status,
  error,
  onRetry,
  device,
  range,
  heatmapType,
  scrollSource,
  scrollGroups,
  heatmapDataReady,
  overlayViewport,
  anchorSelection,
}: {
  heatmap: HeatmapPageDetail | null | undefined
  preview: Parameters<typeof LivePreviewIframe>[0]['preview']
  status: Parameters<typeof LivePreviewIframe>[0]['status']
  error: Parameters<typeof LivePreviewIframe>[0]['error']
  onRetry: Parameters<typeof LivePreviewIframe>[0]['onRetry']
  device: 'desktop' | 'mobile' | 'tablet'
  range: HeatmapsRange
  heatmapType: HeatmapOverlayType
  scrollSource: ScrollOverlayDimensions | null
  scrollGroups: HeatmapPageDetail['scrollGroups']
  heatmapDataReady: boolean
  overlayViewport: { width: number; height: number } | null
  anchorSelection: ReturnType<typeof selectClickAnchorIds> | null
}) {
  const [measurement, setMeasurement] =
    useState<PreviewMeasurementState | null>(null)
  const [anchorResolutions, setAnchorResolutions] = useState<
    PreviewAnchorResolution[] | null
  >(null)
  const [measurementSessionKey, setMeasurementSessionKey] = useState('')
  const sessionKey = `${preview?.session_id ?? 'no-session'}:${heatmap?.id ?? 'empty'}:${device}:${range}:${overlayViewport?.width ?? 'native'}x${overlayViewport?.height ?? 'native'}`
  const widthClass =
    device === 'mobile'
      ? 'mx-auto max-w-[390px]'
      : device === 'tablet'
        ? 'mx-auto max-w-[768px]'
        : 'w-full'

  useEffect(() => {
    setMeasurement(null)
    setMeasurementSessionKey('')
  }, [sessionKey])

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
            />
          </>
        }
      />
    </>
  )
}
