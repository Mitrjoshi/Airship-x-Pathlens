import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Progress } from '@workspace/ui/components/progress'
import { Skeleton } from '@workspace/ui/components/skeleton'
import type {
  SessionReplayDetail,
  SessionReplayEvent,
  SessionReplaySession,
} from '@/queries/session-replay'
import {
  ActivityIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleIcon,
  MonitorIcon,
  MousePointer2Icon,
  PauseIcon,
  PlayIcon,
  SmartphoneIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface SessionReplayPlayerProps {
  open: boolean
  session: SessionReplaySession | null
  detail: SessionReplayDetail | undefined
  isLoading: boolean
  isError: boolean
  onOpenChange: (open: boolean) => void
}

function getPayloadNumber(
  event: SessionReplayEvent | undefined,
  key: string
): number | null {
  const value = event?.payload[key]

  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const number = Number(value)

    return Number.isFinite(number) ? number : null
  }

  return null
}

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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

export function SessionReplayPlayer({
  open,
  session,
  detail,
  isLoading,
  isError,
  onOpenChange,
}: SessionReplayPlayerProps) {
  const [currentEventIndex, setCurrentEventIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const events = detail?.events ?? []
  const currentEvent = events[currentEventIndex]
  const progress =
    events.length > 1 ? (currentEventIndex / (events.length - 1)) * 100 : 0
  const viewport = detail?.viewport ??
    detail?.screen ?? {
      width: 1280,
      height: 720,
    }
  const cursorX = getPayloadNumber(currentEvent, 'x')
  const cursorY = getPayloadNumber(currentEvent, 'y')
  const hasCursor = cursorX !== null && cursorY !== null
  const cursorStyle = hasCursor
    ? {
        left: `${clamp((cursorX / viewport.width) * 100, 2, 98)}%`,
        top: `${clamp((cursorY / viewport.height) * 100, 4, 96)}%`,
      }
    : undefined

  useEffect(() => {
    if (!isPlaying || events.length === 0) return

    if (currentEventIndex >= events.length - 1) return

    const timeout = window.setTimeout(() => {
      setCurrentEventIndex((index) => {
        const nextIndex = Math.min(index + 1, events.length - 1)

        if (nextIndex >= events.length - 1) setIsPlaying(false)

        return nextIndex
      })
    }, 260)

    return () => window.clearTimeout(timeout)
  }, [currentEventIndex, events.length, isPlaying])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90vh,760px)] max-w-6xl! flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Session replay</DialogTitle>
            {session && (
              <Badge variant="secondary">
                Anonymous #{session.visitorId.slice(0, 8)}
              </Badge>
            )}
          </div>
          <DialogDescription>
            {session
              ? `${session.country} · ${session.device} · ${session.duration}`
              : 'Review the recorded events from this visitor session.'}
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
        ) : !detail || events.length === 0 ? (
          <div className="text-muted-foreground flex min-h-0 flex-1 items-center justify-center p-6 text-sm">
            This session does not contain replayable events.
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="bg-muted/30 flex min-h-0 flex-col p-4">
              <div className="flex min-h-0 flex-1 items-center justify-center">
                <div className="bg-background flex h-full min-h-[320px] w-full max-w-3xl flex-col overflow-hidden rounded-xl border shadow-sm">
                  <div className="flex items-center gap-2 border-b px-4 py-3">
                    <CircleIcon className="text-destructive size-2.5 fill-current" />
                    <CircleIcon className="text-muted-foreground size-2.5 fill-current" />
                    <CircleIcon className="text-muted-foreground size-2.5 fill-current" />
                    <div className="text-muted-foreground bg-muted ml-3 min-w-0 flex-1 truncate rounded-md px-3 py-1.5 text-xs">
                      {getEventPath(currentEvent)}
                    </div>
                  </div>

                  <div className="relative min-h-0 flex-1 overflow-hidden">
                    <div className="border-b px-6 py-5">
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        {session?.device === 'Desktop' ? (
                          <MonitorIcon className="size-3.5" />
                        ) : (
                          <SmartphoneIcon className="size-3.5" />
                        )}
                        {detail.viewport
                          ? `${detail.viewport.width} × ${detail.viewport.height}`
                          : 'Viewport unavailable'}
                      </div>
                      <div className="bg-foreground/85 mt-5 h-3 w-2/5 rounded-full" />
                      <div className="bg-muted-foreground/25 mt-3 h-2 w-4/5 rounded-full" />
                      <div className="bg-muted-foreground/25 mt-2 h-2 w-3/5 rounded-full" />
                    </div>

                    <div className="grid gap-3 p-6 sm:grid-cols-3">
                      <div className="bg-muted/50 h-24 rounded-lg border" />
                      <div className="bg-muted/50 h-24 rounded-lg border" />
                      <div className="bg-muted/50 h-24 rounded-lg border" />
                    </div>

                    {hasCursor && cursorStyle && (
                      <div
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2"
                        style={cursorStyle}
                      >
                        <div className="relative">
                          <MousePointer2Icon className="fill-foreground text-background size-6 drop-shadow" />
                          {currentEvent.type === 'click' && (
                            <span className="bg-foreground/20 absolute -inset-3 animate-ping rounded-full" />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="bg-background/90 absolute right-4 bottom-4 left-4 rounded-lg border p-3 text-xs shadow-sm backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 font-medium">
                          <ActivityIcon className="text-muted-foreground size-3.5" />
                          {formatEventType(currentEvent.type)}
                        </span>
                        <span className="text-muted-foreground">
                          {formatElapsed(currentEvent.elapsedMs)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 truncate">
                        {getEventPath(currentEvent)}
                      </p>
                    </div>
                  </div>
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
                      setIsPlaying(false)
                      setCurrentEventIndex((index) => Math.max(0, index - 1))
                    }}
                  >
                    <ChevronLeftIcon />
                  </Button>
                  <Button
                    size="icon-sm"
                    aria-label={isPlaying ? 'Pause replay' : 'Play replay'}
                    onClick={() => {
                      if (currentEventIndex >= events.length - 1) {
                        setCurrentEventIndex(0)
                      }
                      setIsPlaying((playing) => !playing)
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
                      setIsPlaying(false)
                      setCurrentEventIndex((index) =>
                        Math.min(events.length - 1, index + 1)
                      )
                    }}
                  >
                    <ChevronRightIcon />
                  </Button>
                  <Progress value={progress} className="min-w-0 flex-1" />
                  <span className="text-muted-foreground min-w-20 text-right text-xs tabular-nums">
                    {formatElapsed(currentEvent.elapsedMs)} /{' '}
                    {formatElapsed(events[events.length - 1]?.elapsedMs ?? 0)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-2 flex items-center justify-between text-xs">
                  <span>{detail.totalEvents} captured events</span>
                  {detail.hasMoreEvents && (
                    <span>Showing first 5,000 events</span>
                  )}
                </div>
              </div>
            </div>

            <aside className="flex min-h-0 flex-col border-t lg:border-t-0 lg:border-l">
              <div className="flex items-center justify-between border-b px-4 py-4">
                <div>
                  <p className="text-sm font-medium">Event timeline</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {events.length} replay events
                  </p>
                </div>
                <Badge variant="outline">
                  {formatElapsed(currentEvent.elapsedMs)}
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
                        setIsPlaying(false)
                        setCurrentEventIndex(index)
                      }}
                    >
                      <div className="flex w-full items-center justify-between gap-2">
                        <span className="text-xs font-medium">
                          {formatEventType(event.type)}
                        </span>
                        <span className="text-muted-foreground text-[11px] tabular-nums">
                          {formatElapsed(event.elapsedMs)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 truncate text-xs">
                        {getEventPath(event)}
                      </p>
                    </Button>
                  ))}
                </div>
              </div>

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
                  {Object.entries(currentEvent.payload).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="max-w-40 truncate text-right font-medium">
                        {formatPayloadValue(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
