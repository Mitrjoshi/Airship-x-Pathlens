import type { ReplayEvent } from '@workspace/contracts'
import type { HeatmapClickPoint } from '@/queries/heatmaps'
import { Replayer } from 'rrweb'
import type { eventWithTime } from 'rrweb'
import { useEffect, useRef } from 'react'
import 'rrweb/dist/style.css'

interface HeatmapReplayPreviewProps {
  events: ReplayEvent[]
  viewport: {
    width: number
    height: number
  } | null
  points?: HeatmapClickPoint[]
}

const FALLBACK_VIEWPORT = { width: 1280, height: 720 }

function toReplayerEvent(event: ReplayEvent): eventWithTime {
  return event as eventWithTime
}

function fitReplay(
  replayer: Replayer,
  stage: HTMLElement,
  overlay: HTMLElement,
  fallback: { width: number; height: number }
): void {
  const width = Number(replayer.iframe.getAttribute('width')) || fallback.width
  const height =
    Number(replayer.iframe.getAttribute('height')) || fallback.height

  if (!stage.clientWidth || !stage.clientHeight) return

  const scale = Math.min(stage.clientWidth / width, stage.clientHeight / height)

  replayer.wrapper.style.width = `${width}px`
  replayer.wrapper.style.height = `${height}px`
  replayer.wrapper.style.flex = '0 0 auto'
  replayer.wrapper.style.transformOrigin = 'center center'
  replayer.wrapper.style.transform = `scale(${scale})`
  replayer.iframe.style.width = `${width}px`
  replayer.iframe.style.height = `${height}px`

  overlay.style.width = `${width}px`
  overlay.style.height = `${height}px`
  overlay.style.left = '50%'
  overlay.style.top = '50%'
  overlay.style.transformOrigin = 'center center'
  overlay.style.transform = `translate(-50%, -50%) scale(${scale})`
}

export function HeatmapReplayPreview({
  events,
  viewport,
  points = [],
}: HeatmapReplayPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const replayRootRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (events.length < 2) return

    const stage = stageRef.current
    const replayRoot = replayRootRef.current
    const overlay = overlayRef.current

    if (!stage || !replayRoot || !overlay) return

    replayRoot.replaceChildren()

    const replayer = new Replayer(events.map(toReplayerEvent), {
      root: replayRoot,
      showWarning: false,
      showDebug: false,
      mouseTail: false,
    })
    const fallbackViewport = viewport ?? FALLBACK_VIEWPORT
    let frameRequest = 0

    const fit = () => {
      frameRequest = 0
      fitReplay(replayer, stage, overlay, fallbackViewport)
    }
    const scheduleFit = () => {
      if (!frameRequest) frameRequest = window.requestAnimationFrame(fit)
    }
    const resizeObserver = new ResizeObserver(scheduleFit)
    const attributeObserver = new MutationObserver(scheduleFit)

    resizeObserver.observe(stage)
    attributeObserver.observe(replayer.iframe, {
      attributes: true,
      attributeFilter: ['width', 'height'],
    })
    scheduleFit()
    replayer.pause(0)

    return () => {
      resizeObserver.disconnect()
      attributeObserver.disconnect()
      if (frameRequest) window.cancelAnimationFrame(frameRequest)
      replayer.destroy()
      replayRoot.replaceChildren()
    }
  }, [events, viewport])

  const hasReplay = events.length >= 2

  return (
    <div
      ref={stageRef}
      className="bg-muted/20 relative aspect-[16/10] min-h-[320px] overflow-hidden rounded-xl border"
    >
      <div
        ref={replayRootRef}
        className="absolute inset-0 flex items-center justify-center overflow-hidden"
      />

      <div
        ref={overlayRef}
        className={`pointer-events-none absolute overflow-hidden ${hasReplay ? '' : 'inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'}`}
      >
        {points.map((point) => (
          <span
            key={`${point.x}-${point.y}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              width: `${24 + point.intensity * 46}px`,
              height: `${24 + point.intensity * 46}px`,
              background: `radial-gradient(circle, rgb(239 68 68 / ${0.2 + point.intensity * 0.55}) 0%, rgb(249 115 22 / ${0.12 + point.intensity * 0.25}) 35%, transparent 72%)`,
            }}
            title={`${point.count} clicks`}
          />
        ))}
      </div>

      {!hasReplay && (
        <div className="text-muted-foreground pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm">
          No captured screen is available for this page yet. Click activity is
          shown on the neutral surface.
        </div>
      )}
    </div>
  )
}
