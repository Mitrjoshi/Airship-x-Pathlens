import type { ReplayEvent } from '@workspace/contracts'
import type { HeatmapClickPoint } from '@/queries/heatmaps'
import { EventType, Replayer, ReplayerEvents } from 'rrweb'
import type { eventWithTime } from 'rrweb'
import { useEffect, useRef, useState } from 'react'
import 'rrweb/dist/style.css'

interface HeatmapReplayPreviewProps {
  events: ReplayEvent[]
  url?: string | null
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

function fitLivePage(
  stage: HTMLElement,
  livePage: HTMLElement,
  overlay: HTMLElement,
  viewport: { width: number; height: number }
): void {
  if (!stage.clientWidth || !stage.clientHeight) return

  const scale = Math.min(
    stage.clientWidth / viewport.width,
    stage.clientHeight / viewport.height
  )

  for (const element of [livePage, overlay]) {
    element.style.width = `${viewport.width}px`
    element.style.height = `${viewport.height}px`
    element.style.left = '50%'
    element.style.top = '50%'
    element.style.transformOrigin = 'center center'
    element.style.transform = `translate(-50%, -50%) scale(${scale})`
  }
}

function getSafePageUrl(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsedUrl = new URL(url)

    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
      ? parsedUrl.toString()
      : null
  } catch {
    return null
  }
}

export function HeatmapReplayPreview({
  events,
  url,
  viewport,
  points = [],
}: HeatmapReplayPreviewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const replayRootRef = useRef<HTMLDivElement>(null)
  const livePageRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [replayReadyKey, setReplayReadyKey] = useState<string | null>(null)
  const pageUrl = getSafePageUrl(url)
  const fallbackViewport = viewport ?? FALLBACK_VIEWPORT
  const replayKey = `${events.length}:${events[0]?.timestamp ?? ''}:${events[events.length - 1]?.timestamp ?? ''}`
  const hasReplay =
    events.length >= 2 &&
    events.some((event) => event.type === EventType.FullSnapshot)
  const hasReplaySurface = hasReplay && replayReadyKey === replayKey
  const hasLivePage = !hasReplaySurface && Boolean(pageUrl)

  useEffect(() => {
    if (!hasReplay) return

    const stage = stageRef.current
    const replayRoot = replayRootRef.current
    const overlay = overlayRef.current

    if (!stage || !replayRoot || !overlay) return

    replayRoot.replaceChildren()

    let replayer: Replayer

    try {
      replayer = new Replayer(events.map(toReplayerEvent), {
        root: replayRoot,
        showWarning: false,
        showDebug: false,
        mouseTail: false,
      })
    } catch (error) {
      console.error('[PathLens] Unable to render heatmap replay.', error)
      replayRoot.replaceChildren()
      return
    }

    let disposed = false
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
    replayer.on(ReplayerEvents.FullsnapshotRebuilded, () => {
      if (disposed) return

      setReplayReadyKey(replayKey)
      scheduleFit()
    })
    scheduleFit()
    replayer.pause(0)

    return () => {
      disposed = true
      resizeObserver.disconnect()
      attributeObserver.disconnect()
      if (frameRequest) window.cancelAnimationFrame(frameRequest)
      replayer.destroy()
      replayRoot.replaceChildren()
    }
  }, [events, fallbackViewport, hasReplay, replayKey])

  useEffect(() => {
    if (!hasLivePage) return

    const stage = stageRef.current
    const livePage = livePageRef.current
    const overlay = overlayRef.current

    if (!stage || !livePage || !overlay) return

    let frameRequest = 0

    const fit = () => {
      frameRequest = 0
      fitLivePage(stage, livePage, overlay, fallbackViewport)
    }
    const scheduleFit = () => {
      if (!frameRequest) frameRequest = window.requestAnimationFrame(fit)
    }
    const resizeObserver = new ResizeObserver(scheduleFit)

    resizeObserver.observe(stage)
    scheduleFit()

    return () => {
      resizeObserver.disconnect()
      if (frameRequest) window.cancelAnimationFrame(frameRequest)
    }
  }, [fallbackViewport, hasLivePage])

  const hasSurface = hasReplaySurface || hasLivePage

  return (
    <div
      ref={stageRef}
      className="bg-muted/20 relative aspect-[16/10] min-h-[320px] overflow-hidden rounded-xl border"
    >
      <div
        ref={replayRootRef}
        className={`absolute inset-0 flex items-center justify-center overflow-hidden ${hasReplaySurface ? '' : 'hidden'}`}
      />

      <div
        ref={livePageRef}
        className={`absolute overflow-hidden bg-white dark:bg-neutral-950 ${hasLivePage ? '' : 'hidden'}`}
        style={{
          width: `${fallbackViewport.width}px`,
          height: `${fallbackViewport.height}px`,
        }}
      >
        {pageUrl && (
          <iframe
            src={pageUrl}
            title="Captured website screen"
            className="pointer-events-none block border-0"
            style={{
              width: `${fallbackViewport.width}px`,
              height: `${fallbackViewport.height}px`,
            }}
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      <div
        ref={overlayRef}
        className={`pointer-events-none absolute z-10 overflow-hidden ${hasSurface ? '' : 'inset-0 bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950'}`}
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

      {!hasSurface && (
        <div className="text-muted-foreground pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm">
          No captured screen or page URL is available for this page yet.
        </div>
      )}
    </div>
  )
}
