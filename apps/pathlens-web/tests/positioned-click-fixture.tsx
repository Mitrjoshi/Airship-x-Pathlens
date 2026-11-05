import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type {
  HeatmapClickAnchorDefinition,
  HeatmapClickSampleGroup,
  PreviewAnchorResolution,
  PreviewMeasurementState,
} from '@workspace/contracts'
import { HeatmapOverlayLayer } from '../src/components/common/heatmap-overlay-layer'
import { LivePreviewIframe } from '../src/components/common/live-preview-iframe'
import '../src/index.css'

const preview = {
  session_id: '00000000-0000-4000-8000-000000000010',
  iframe_url: `${window.location.origin}/v1/session/positioned/page`,
  expires_at: '2099-01-01T00:00:00.000Z',
  project_id: '00000000-0000-4000-8000-000000000011',
  domain_id: '00000000-0000-4000-8000-000000000012',
  canonical_hostname: 'positioned.fixture.test',
  pathname: '/positioned',
  device: 'desktop' as const,
  preview_intent: 'heatmap' as const,
  protocol_version: 1 as const,
}

interface CapturedClick {
  pageX?: unknown
  pageY?: unknown
  viewport?: unknown
  document?: unknown
  elementAnchor?: {
    anchorId: string
    positionMode: 'static' | 'absolute' | 'fixed' | 'sticky'
    effectivePositionMode?: 'static' | 'absolute' | 'fixed' | 'sticky'
    positioningAncestorDepth?: number
    positioningAncestorAnchorId?: string
    relativeX: number
    relativeY: number
    transformedAncestor: boolean
    scrollAncestors: Array<{
      anchorId: string
      scrollLeft: number
      scrollTop: number
      maxScrollLeft: number
      maxScrollTop: number
    }>
  }
}

function samplesFromClicks(clicks: CapturedClick[]): {
  groups: HeatmapClickSampleGroup[]
  definitions: HeatmapClickAnchorDefinition[]
  anchorIds: string[]
} {
  const valid = clicks.filter(
    (click) =>
      typeof click.pageX === 'number' &&
      typeof click.pageY === 'number' &&
      click.viewport &&
      typeof click.viewport === 'object' &&
      click.document &&
      typeof click.document === 'object'
  ) as Array<
    Required<Pick<CapturedClick, 'pageX' | 'pageY' | 'viewport' | 'document'>>
  >
  const first = valid[0]
  if (!first) return { groups: [], definitions: [], anchorIds: [] }
  const document = first.document as { width: number; height: number }
  if (document.width <= 0 || document.height <= 0) {
    return { groups: [], definitions: [], anchorIds: [] }
  }

  const sourceViewports = [
    { width: 1280, height: 720 },
    { width: 1536, height: 695 },
    { width: 1920, height: 1080 },
  ]
  const definitions = new Map<string, HeatmapClickAnchorDefinition>()
  for (const click of valid) {
    const anchor = click.elementAnchor
    if (!anchor || definitions.has(anchor.anchorId)) continue
    definitions.set(anchor.anchorId, {
      anchorId: anchor.anchorId,
      positionMode: anchor.positionMode,
      ...(anchor.effectivePositionMode
        ? { effectivePositionMode: anchor.effectivePositionMode }
        : {}),
      ...(anchor.positioningAncestorDepth !== undefined
        ? { positioningAncestorDepth: anchor.positioningAncestorDepth }
        : {}),
      ...(anchor.positioningAncestorAnchorId
        ? { positioningAncestorAnchorId: anchor.positioningAncestorAnchorId }
        : {}),
      transformedAncestor: anchor.transformedAncestor,
      scrollAncestors: anchor.scrollAncestors,
    })
  }

  const groups = sourceViewports.map((sourceViewport, groupIndex) => {
    const groupClicks = valid.filter(
      (_, clickIndex) => clickIndex % sourceViewports.length === groupIndex
    )
    return {
      groupId: `fixture-${sourceViewport.width}x${sourceViewport.height}`,
      coordinateSchemaVersion: 1,
      coordinateMode: 'document' as const,
      sourceViewport,
      sourceDocument: document,
      sampleCount: groupClicks.length,
      alignment: 'document-compatible' as const,
      safeForDocumentOverlay: true,
      samples: groupClicks.map((click, clickIndex) => ({
        x: click.pageX / document.width,
        y: click.pageY / document.height,
        weight: 1,
        coordinateMode: 'document' as const,
        interactionId: `${sourceViewport.width}-${groupIndex}-${clickIndex}`,
        ...(click.elementAnchor
          ? {
              anchorId: click.elementAnchor.anchorId,
              relativeX: click.elementAnchor.relativeX,
              relativeY: click.elementAnchor.relativeY,
            }
          : {}),
      })),
    }
  })

  return {
    groups,
    definitions: Array.from(definitions.values()),
    anchorIds: Array.from(definitions.keys()),
  }
}

export function Fixture() {
  const [measurement, setMeasurement] =
    useState<PreviewMeasurementState | null>(null)
  const [clickSamples, setClickSamples] = useState<HeatmapClickSampleGroup[]>(
    []
  )
  const [anchorDefinitions, setAnchorDefinitions] = useState<
    HeatmapClickAnchorDefinition[]
  >([])
  const [anchorIds, setAnchorIds] = useState<string[]>([])
  const [anchorResolutions, setAnchorResolutions] = useState<
    PreviewAnchorResolution[] | null
  >(null)

  useEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (!event.data || typeof event.data !== 'object') return
      const data = event.data as { type?: unknown; clicks?: unknown }
      if (
        data.type !== 'POSITIONED_FIXTURE_CLICKS' ||
        !Array.isArray(data.clicks)
      )
        return
      ;(
        window as Window & { __positionedClicks?: CapturedClick[] }
      ).__positionedClicks = data.clicks as CapturedClick[]
      const result = samplesFromClicks(data.clicks as CapturedClick[])
      setClickSamples(result.groups)
      setAnchorDefinitions(result.definitions)
      setAnchorIds(result.anchorIds)
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div style={{ width: 960, height: 455 }}>
      <LivePreviewIframe
        preview={preview}
        status="ready"
        virtualViewport={{ width: 1920, height: 911 }}
        onMeasurementChange={setMeasurement}
        anchorIds={anchorIds}
        onAnchorResolutionChange={setAnchorResolutions}
        overlay={
          <HeatmapOverlayLayer
            clickGroups={[]}
            clickSampleGroups={clickSamples}
            anchorDefinitions={anchorDefinitions}
            anchorResolutions={anchorResolutions}
            anchorSelection={{
              requestedAnchorIds: anchorIds,
              referencedAnchorCount: anchorIds.length,
              eligibleAnchorCount: anchorIds.length,
              omittedAnchorCount: 0,
            }}
            heatmapType="click"
            measurement={measurement}
            sessionKey={preview.session_id}
          />
        }
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
