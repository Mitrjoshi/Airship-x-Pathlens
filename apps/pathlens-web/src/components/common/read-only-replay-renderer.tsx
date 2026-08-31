import type { ReplayEvent } from '@workspace/contracts'
import { EventType, IncrementalSource, Replayer, ReplayerEvents } from 'rrweb'
import type { eventWithTime } from 'rrweb'
import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import 'rrweb/dist/style.css'

interface ReplayViewport {
  width: number
  height: number
}

interface ReadOnlyReplayRendererProps {
  events: ReplayEvent[]
  viewport: ReplayViewport | null
  children?: ReactNode
  fallback?: ReactNode
}

const FALLBACK_VIEWPORT: ReplayViewport = { width: 1280, height: 720 }
const INITIAL_MUTATION_GAP_MS = 250

function toReplayerEvent(event: ReplayEvent): eventWithTime {
  return event as eventWithTime
}

function hasRenderableReplay(events: ReplayEvent[]): boolean {
  return (
    events.length >= 2 &&
    events.some((event) => {
      if (event.type !== EventType.FullSnapshot) return false

      const data = event.data
      return (
        typeof data === 'object' &&
        data !== null &&
        'node' in data &&
        Boolean(data.node)
      )
    })
  )
}

function getStaticReplayOffset(events: ReplayEvent[]): number {
  const firstTimestamp = events[0]?.timestamp ?? 0
  const snapshotIndex = events.findIndex(
    (event) => event.type === EventType.FullSnapshot
  )
  const snapshot = events[snapshotIndex]

  if (!snapshot) return 0

  let targetTimestamp = snapshot.timestamp
  let lastMutationTimestamp = snapshot.timestamp
  let foundMutation = false

  for (const event of events.slice(snapshotIndex + 1)) {
    if (event.type !== EventType.IncrementalSnapshot) break

    const source = (event.data as { source?: unknown }).source

    if (
      source === IncrementalSource.MouseMove ||
      source === IncrementalSource.MouseInteraction ||
      source === IncrementalSource.Input ||
      source === IncrementalSource.Scroll ||
      source === IncrementalSource.TouchMove ||
      source === IncrementalSource.MediaInteraction ||
      source === IncrementalSource.Drag
    ) {
      break
    }

    if (source !== IncrementalSource.Mutation) continue

    if (
      foundMutation &&
      event.timestamp - lastMutationTimestamp > INITIAL_MUTATION_GAP_MS
    ) {
      break
    }

    foundMutation = true
    lastMutationTimestamp = event.timestamp
    targetTimestamp = event.timestamp
  }

  return Math.max(0, targetTimestamp - firstTimestamp + 1)
}

function fitSurface(
  stage: HTMLElement,
  surface: HTMLElement,
  replayer: Replayer,
  viewport: ReplayViewport
): void {
  if (!stage.clientWidth || !stage.clientHeight) return

  const scale = Math.min(
    stage.clientWidth / viewport.width,
    stage.clientHeight / viewport.height
  )

  replayer.wrapper.style.width = `${viewport.width}px`
  replayer.wrapper.style.height = `${viewport.height}px`
  replayer.wrapper.style.flex = '0 0 auto'
  replayer.wrapper.style.transform = 'none'
  replayer.iframe.style.width = `${viewport.width}px`
  replayer.iframe.style.height = `${viewport.height}px`
  surface.style.transform = `scale(${scale})`
}

export function ReadOnlyReplayRenderer({
  events,
  viewport,
  children,
  fallback,
}: ReadOnlyReplayRendererProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const replayRootRef = useRef<HTMLDivElement>(null)
  const replayWidth = viewport?.width ?? FALLBACK_VIEWPORT.width
  const replayHeight = viewport?.height ?? FALLBACK_VIEWPORT.height
  const hasReplay = hasRenderableReplay(events)
  const replayKey = `${events.length}:${events[0]?.timestamp ?? ''}:${events[events.length - 1]?.timestamp ?? ''}`

  useEffect(() => {
    if (!hasReplay) return

    const stage = stageRef.current
    const surface = surfaceRef.current
    const replayRoot = replayRootRef.current

    if (!stage || !surface || !replayRoot) return

    replayRoot.replaceChildren()

    let replayer: Replayer

    try {
      replayer = new Replayer(events.map(toReplayerEvent), {
        root: replayRoot,
        skipInactive: true,
        showWarning: false,
        showDebug: false,
        mouseTail: false,
      })
    } catch (error) {
      console.error('[PathLens] Unable to render read-only replay.', error)
      replayRoot.replaceChildren()
      return
    }

    const fit = () =>
      fitSurface(stage, surface, replayer, {
        width: replayWidth,
        height: replayHeight,
      })
    const resizeObserver = new ResizeObserver(fit)
    const attributeObserver = new MutationObserver(fit)
    const staticReplayOffset = getStaticReplayOffset(events)
    let disposed = false

    replayer.iframe.tabIndex = -1
    replayer.iframe.setAttribute('aria-hidden', 'true')
    replayer.iframe.style.pointerEvents = 'none'

    resizeObserver.observe(stage)
    attributeObserver.observe(replayer.iframe, {
      attributes: true,
      attributeFilter: ['width', 'height'],
    })
    let frameRequest = 0
    const scheduleFit = () => {
      if (!frameRequest) {
        frameRequest = window.requestAnimationFrame(() => {
          frameRequest = 0
          fit()
        })
      }
    }

    scheduleFit()
    replayer.on(ReplayerEvents.FullsnapshotRebuilded, () => {
      window.queueMicrotask(() => {
        if (!disposed) replayer.pause()
      })
    })
    replayer.play(staticReplayOffset)

    return () => {
      disposed = true
      resizeObserver.disconnect()
      attributeObserver.disconnect()
      if (frameRequest) window.cancelAnimationFrame(frameRequest)
      replayer.destroy()
      replayRoot.replaceChildren()
    }
  }, [events, hasReplay, replayKey, replayHeight, replayWidth])

  return (
    <div
      ref={stageRef}
      className="bg-muted/20 relative aspect-[16/10] min-h-[320px] overflow-hidden rounded-xl border"
    >
      {hasReplay ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div
            ref={surfaceRef}
            className="relative shrink-0"
            style={{
              width: replayWidth,
              height: replayHeight,
              transformOrigin: 'center center',
            }}
          >
            <div
              ref={replayRootRef}
              className="pointer-events-none relative size-full overflow-hidden bg-white dark:bg-neutral-950"
            />
            {children}
          </div>
        </div>
      ) : (
        (fallback ?? (
          <div className="text-muted-foreground flex size-full items-center justify-center p-6 text-center text-sm">
            Page preview unavailable.
          </div>
        ))
      )}
    </div>
  )
}
