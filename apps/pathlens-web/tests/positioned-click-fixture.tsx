import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type {
  HeatmapClickSampleGroup,
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
}

function samplesFromClicks(clicks: CapturedClick[]): HeatmapClickSampleGroup[] {
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
  if (!first) return []
  const viewport = first.viewport as { width: number; height: number }
  const document = first.document as { width: number; height: number }
  if (document.width <= 0 || document.height <= 0) return []

  return [
    {
      groupId: `fixture-${viewport.width}x${viewport.height}`,
      coordinateSchemaVersion: 1,
      coordinateMode: 'document',
      sourceViewport: viewport,
      sourceDocument: document,
      sampleCount: valid.length,
      alignment: 'document-compatible',
      safeForDocumentOverlay: true,
      samples: valid.map((click) => ({
        x: click.pageX / document.width,
        y: click.pageY / document.height,
        weight: 1,
        coordinateMode: 'document' as const,
      })),
    },
  ]
}

function Fixture() {
  const [measurement, setMeasurement] =
    useState<PreviewMeasurementState | null>(null)
  const [clickSamples, setClickSamples] = useState<HeatmapClickSampleGroup[]>(
    []
  )

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
      setClickSamples(samplesFromClicks(data.clicks as CapturedClick[]))
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
        overlay={
          <HeatmapOverlayLayer
            clickGroups={[]}
            clickSampleGroups={clickSamples}
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
