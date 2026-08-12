import type { ReplayEvent } from '@workspace/contracts'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type {
  SessionReplayDetail,
  SessionReplayEvent,
  SessionReplaySession,
} from '@/queries/session-replay'
import {
  streamSessionReplay,
  type SessionReplayChunkUpdate,
} from '@/queries/session-replay'
import { Replayer } from 'rrweb'
import { EventType, ReplayerEvents } from 'rrweb'
import type { eventWithTime } from 'rrweb'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  PauseIcon,
  PlayIcon,
  RadioIcon,
  WifiIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import 'rrweb/dist/style.css'

interface SessionReplayPlayerProps {
  open: boolean
  workspaceId: string
  projectId: string
  session: SessionReplaySession | null
  detail: SessionReplayDetail | undefined
  initialEventId?: string
  isLoading: boolean
  isError: boolean
  onOpenChange: (open: boolean) => void
}

type StreamStatus = 'idle' | 'connecting' | 'connected' | 'error'

const EMPTY_REPLAY_EVENTS: ReplayEvent[] = []
const EMPTY_SESSION_EVENTS: SessionReplayEvent[] = []

function formatEventType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatElapsed(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function formatPayloadValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return 'Unavailable'
  }
}

function getEventPath(event: SessionReplayEvent | undefined): string {
  return event?.path || event?.title || '/'
}

function getEventOffset(
  event: SessionReplayEvent | undefined,
  replayEvents: ReplayEvent[]
): number {
  if (!event) return 0

  const replayStartedAt = replayEvents[0]?.timestamp
  const occurredAt = new Date(event.occurredAt).getTime()

  if (typeof replayStartedAt === 'number' && Number.isFinite(occurredAt)) {
    return Math.max(0, occurredAt - replayStartedAt)
  }

  return Math.max(0, event.elapsedMs)
}

function toReplayerEvent(event: ReplayEvent): eventWithTime {
  return event as eventWithTime
}

function getReplayDuration(events: ReplayEvent[]): number {
  if (events.length < 2) return 0

  const firstTimestamp = events[0]?.timestamp ?? 0
  const lastTimestamp = events[events.length - 1]?.timestamp ?? firstTimestamp

  return Math.max(0, lastTimestamp - firstTimestamp)
}

function appendChunkToReplayer(
  replayer: Replayer | null,
  update: SessionReplayChunkUpdate
): void {
  if (!replayer) return

  for (const event of update.events) {
    replayer.addEvent(toReplayerEvent(event))
  }
}

function fitReplayerToRoot(
  replayer: Replayer,
  root: HTMLElement,
  fallback: { width: number; height: number }
): void {
  const width = Number(replayer.iframe.getAttribute('width')) || fallback.width
  const height =
    Number(replayer.iframe.getAttribute('height')) || fallback.height

  if (!width || !height || !root.clientWidth || !root.clientHeight) return

  const scale = Math.min(root.clientWidth / width, root.clientHeight / height)

  replayer.wrapper.style.width = `${width}px`
  replayer.wrapper.style.height = `${height}px`
  replayer.wrapper.style.flex = '0 0 auto'
  replayer.wrapper.style.transformOrigin = 'center center'
  replayer.wrapper.style.transform = `scale(${scale})`
  replayer.iframe.style.width = `${width}px`
  replayer.iframe.style.height = `${height}px`
}

export function SessionReplayPlayer({
  open,
  workspaceId,
  projectId,
  session,
  detail,
  initialEventId,
  isLoading,
  isError,
  onOpenChange,
}: SessionReplayPlayerProps) {
  const replayRootRef = useRef<HTMLDivElement>(null)
  const replayerRef = useRef<Replayer | null>(null)
  const lastSequenceRef = useRef(-1)
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [appendedReplayEvents, setAppendedReplayEvents] = useState<
    ReplayEvent[]
  >([])
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [liveModeOverride, setLiveModeOverride] = useState<boolean | null>(null)
  const [wantsLive, setWantsLive] = useState(false)
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle')
  const [replayErrorKey, setReplayErrorKey] = useState<string | null>(null)
  const events = detail?.events ?? EMPTY_SESSION_EVENTS
  const currentEvent = events[currentEventIndex]
  const initialReplayEvents = detail?.replay.events ?? EMPTY_REPLAY_EVENTS
  const replayEvents = initialReplayEvents.concat(appendedReplayEvents)
  const replayAvailable = Boolean(detail?.replay.available)
  const replayIsLive = Boolean(detail?.replay.isLive)
  const replaySequence = detail?.replay.lastSequence ?? -1
  const replaySessionId = detail?.id
  const isLiveMode = liveModeOverride ?? replayIsLive
  const replayDuration = getReplayDuration(replayEvents)
  const replayKey = `${detail?.id ?? ''}:${initialReplayEvents.length}:${initialReplayEvents[0]?.timestamp ?? ''}:${initialReplayEvents[initialReplayEvents.length - 1]?.timestamp ?? ''}`
  const hasReplayCandidate =
    replayAvailable &&
    initialReplayEvents.length >= 2 &&
    initialReplayEvents.some((event) => event.type === EventType.FullSnapshot)
  const hasReplay = hasReplayCandidate && replayErrorKey !== replayKey

  useEffect(() => {
    if (!open || !hasReplayCandidate) {
      return
    }

    const root = replayRootRef.current

    if (!root) return

    root.replaceChildren()

    let replayer: Replayer
    let disposed = false

    try {
      replayer = new Replayer(initialReplayEvents.map(toReplayerEvent), {
        root,
        skipInactive: true,
        showWarning: false,
        showDebug: false,
        mouseTail: { duration: 400 },
      })
    } catch (error) {
      console.error('[PathLens] Unable to initialize session replay.', error)
      window.setTimeout(() => {
        if (!disposed) setReplayErrorKey(replayKey)
      }, 0)
      return
    }

    replayerRef.current = replayer
    replayer.on(ReplayerEvents.Start, () => setIsPlaying(true))
    replayer.on(ReplayerEvents.Pause, () => setIsPlaying(false))
    replayer.on(ReplayerEvents.Finish, () => {
      setIsPlaying(false)
      setCurrentTime(replayer.getMetaData().totalTime)
    })
    const fallbackDimensions = detail?.viewport ??
      detail?.screen ?? {
        width: 1280,
        height: 720,
      }
    let frameRequest = 0
    const fit = () => {
      frameRequest = 0
      fitReplayerToRoot(replayer, root, fallbackDimensions)
    }
    const scheduleFit = () => {
      if (!frameRequest) frameRequest = window.requestAnimationFrame(fit)
    }
    const resizeObserver = new ResizeObserver(scheduleFit)
    const attributeObserver = new MutationObserver(scheduleFit)

    resizeObserver.observe(root)
    attributeObserver.observe(replayer.iframe, {
      attributes: true,
      attributeFilter: ['width', 'height'],
    })
    scheduleFit()

    const selectedEventIndex = initialEventId
      ? events.findIndex((event) => event.id === initialEventId)
      : -1
    const selectedEvent =
      selectedEventIndex >= 0 ? events[selectedEventIndex] : undefined
    const initialOffset = getEventOffset(selectedEvent, initialReplayEvents)

    if (selectedEventIndex >= 0) {
      window.setTimeout(() => {
        if (disposed) return

        setCurrentEventIndex(selectedEventIndex)
        setCurrentTime(initialOffset)
        replayer.pause(initialOffset)
      }, 0)
    } else {
      replayer.pause(0)
    }

    const timer = window.setInterval(() => {
      setCurrentTime(replayer.getCurrentTime())
    }, 100)

    return () => {
      disposed = true
      window.clearInterval(timer)
      resizeObserver.disconnect()
      attributeObserver.disconnect()
      if (frameRequest) window.cancelAnimationFrame(frameRequest)
      replayer.destroy()
      replayerRef.current = null
      root.replaceChildren()
    }
  }, [
    detail?.id,
    detail?.screen,
    detail?.viewport,
    initialReplayEvents,
    initialEventId,
    open,
    replayAvailable,
    replayKey,
    events,
    hasReplayCandidate,
  ])

  useEffect(() => {
    if (!open || !replayAvailable || !replaySessionId) {
      return
    }

    if (!(replayIsLive || wantsLive)) {
      return
    }

    const controller = new AbortController()
    let cancelled = false

    lastSequenceRef.current = replaySequence

    void streamSessionReplay(
      {
        workspace_id: workspaceId,
        project_id: projectId,
        session_id: replaySessionId,
      },
      replaySequence,
      {
        onReady: ({ isLive }) => {
          if (cancelled) return

          setStreamStatus('connected')
          setLiveModeOverride(isLive || wantsLive)

          if (isLive || wantsLive) {
            replayerRef.current?.startLive()
          }
        },
        onChunk: (update) => {
          if (cancelled || update.sequence <= lastSequenceRef.current) {
            return
          }

          lastSequenceRef.current = update.sequence
          appendChunkToReplayer(replayerRef.current, update)
          setAppendedReplayEvents((current) => [...current, ...update.events])
          setLiveModeOverride(true)
        },
      },
      controller.signal
    ).catch((error: unknown) => {
      if (cancelled || (error as { name?: string }).name === 'AbortError') {
        return
      }

      setStreamStatus('error')
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [
    open,
    projectId,
    replayAvailable,
    replayIsLive,
    replaySequence,
    replaySessionId,
    wantsLive,
    workspaceId,
  ])

  const play = () => {
    replayerRef.current?.play(currentTime)
    setIsPlaying(true)
  }

  const pause = () => {
    replayerRef.current?.pause()
    setIsPlaying(false)
  }

  const seekToEvent = (event: SessionReplayEvent | undefined) => {
    const offset = getEventOffset(event, replayEvents)

    replayerRef.current?.pause(offset)
    setCurrentTime(offset)
  }

  const seekToTime = (value: number) => {
    const offset = Math.max(0, Math.min(value, replayDuration))

    replayerRef.current?.pause(offset)
    setCurrentTime(offset)
    setIsPlaying(false)
  }

  const goLive = () => {
    setWantsLive(true)
    setLiveModeOverride(true)
    replayerRef.current?.startLive()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(92vh,860px)] max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-7xl! min-w-0 flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Session replay</DialogTitle>
            {session && (
              <Badge variant="secondary">
                Anonymous #{session.visitorId.slice(0, 8)}
              </Badge>
            )}
            {isLiveMode && (
              <Badge className="gap-1.5" variant="destructive">
                <RadioIcon className="size-3" />
                Live
              </Badge>
            )}
          </div>
          <DialogDescription>
            {session
              ? `${session.country} · ${session.device} · ${session.duration}`
              : 'Review the reconstructed screen and interaction timeline.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid min-h-0 flex-1 gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="min-h-[360px] w-full" />
            <Skeleton className="min-h-[360px] w-full" />
          </div>
        ) : isError ? (
          <div className="text-destructive flex min-h-0 flex-1 items-center justify-center p-6 text-sm">
            Unable to load this session replay.
          </div>
        ) : !detail || !hasReplay ? (
          <div className="text-muted-foreground flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-sm">
            <p>
              {replayErrorKey === replayKey
                ? 'This session replay could not be initialized.'
                : 'This session does not contain a complete captured screen yet.'}
            </p>
            <p className="text-xs">
              The recording needs a valid DOM snapshot before it can be played.
            </p>
          </div>
        ) : (
          <div className="grid min-h-0 min-w-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="bg-muted/30 flex min-h-0 min-w-0 flex-col p-4">
              <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden rounded-xl border bg-black/5 p-2">
                <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-sm dark:bg-neutral-950">
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <CircleIcon className="text-destructive size-2.5 fill-current" />
                    <CircleIcon className="text-muted-foreground size-2.5 fill-current" />
                    <CircleIcon className="text-muted-foreground size-2.5 fill-current" />
                    <div className="text-muted-foreground bg-muted ml-3 min-w-0 flex-1 truncate rounded-md px-3 py-1.5 text-xs">
                      {currentEvent ? getEventPath(currentEvent) : '/'}
                    </div>
                    {streamStatus === 'connected' && (
                      <WifiIcon className="size-3.5 text-emerald-500" />
                    )}
                  </div>
                  <div
                    ref={replayRootRef}
                    className="relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-white dark:bg-neutral-950"
                  />
                </div>
              </div>

              <div className="bg-background mt-4 rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Previous event"
                    disabled={currentEventIndex === 0}
                    onClick={() => {
                      pause()
                      const nextIndex = Math.max(0, currentEventIndex - 1)

                      setCurrentEventIndex(nextIndex)
                      seekToEvent(events[nextIndex])
                    }}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                    onClick={() => {
                      if (isPlaying) pause()
                      else play()
                    }}
                  >
                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label="Next event"
                    disabled={currentEventIndex >= events.length - 1}
                    onClick={() => {
                      pause()
                      const nextIndex = Math.min(
                        events.length - 1,
                        currentEventIndex + 1
                      )

                      setCurrentEventIndex(nextIndex)
                      seekToEvent(events[nextIndex])
                    }}
                  >
                    <ChevronRightIcon />
                  </Button>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(replayDuration, 1)}
                    step={1}
                    value={Math.min(currentTime, replayDuration)}
                    aria-label="Replay progress"
                    className="accent-primary min-w-0 flex-1 cursor-grab touch-none active:cursor-grabbing"
                    onPointerDown={pause}
                    onChange={(event) =>
                      seekToTime(Number(event.currentTarget.value))
                    }
                  />
                  <span className="text-muted-foreground min-w-20 text-right text-xs tabular-nums">
                    {formatElapsed(currentTime)} /{' '}
                    {formatElapsed(replayDuration)}
                  </span>
                  <Button
                    variant={isLiveMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={goLive}
                  >
                    <RadioIcon className="mr-2 size-3.5" />
                    Go live
                  </Button>
                </div>
                <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                  <span>{detail.totalEvents} captured analytics events</span>
                  <span>
                    {streamStatus === 'error'
                      ? 'Live connection unavailable'
                      : isLiveMode
                        ? 'Following latest activity'
                        : `${replayEvents.length} screen events`}
                  </span>
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l">
              <div className="flex items-center justify-between border-b px-4 py-4">
                <div>
                  <p className="text-sm font-medium">Event timeline</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {events.length} analytics events
                  </p>
                </div>
                <Badge variant="outline">
                  {currentEvent
                    ? formatElapsed(getEventOffset(currentEvent, replayEvents))
                    : '0:00'}
                </Badge>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-2">
                <div className="space-y-1">
                  {events.map((event, index) => (
                    <Button
                      key={event.id}
                      type="button"
                      variant="ghost"
                      className={`w-full justify-start rounded-lg border p-3 text-left transition-colors ${index === currentEventIndex ? 'border-foreground bg-muted' : 'hover:bg-muted/60 border-transparent'}`}
                      onClick={() => {
                        pause()
                        setCurrentEventIndex(index)
                        seekToEvent(event)
                      }}
                    >
                      <span className="text-xs font-medium">
                        {formatEventType(event.type)}
                      </span>
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {getEventPath(event)}
                      </p>
                    </Button>
                  ))}
                </div>
              </div>

              {currentEvent && (
                <div className="border-t p-4">
                  <p className="text-muted-foreground mb-2 text-xs font-medium tracking-[0.14em] uppercase">
                    Event details
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Type</span>
                      <span className="font-medium">
                        {formatEventType(currentEvent.type)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">Path</span>
                      <span className="max-w-40 truncate font-medium">
                        {getEventPath(currentEvent)}
                      </span>
                    </div>
                    {Object.entries(currentEvent.payload).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between gap-3">
                          <span className="text-muted-foreground">{key}</span>
                          <span className="max-w-40 truncate text-right font-medium">
                            {formatPayloadValue(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
