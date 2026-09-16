/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoCentroid, geoDistance, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { FeatureCollection, Geometry } from 'geojson'
import worldTopology from 'world-atlas/countries-110m.json'
import { Badge } from '@workspace/ui/components/badge'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ISO_NUMERIC_TO_ALPHA2 } from '@/lib/country-codes'
import { getVisitorLocationsOptions } from '@/queries/visitors'
import type {
  VisitorLocation,
  VisitorLocationsParams,
} from '@/queries/visitors'
import { formatNumber } from '@/utils/utils'
import { MapPin } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'

const VIEWBOX_WIDTH = 640
const VIEWBOX_HEIGHT = 500
const GLOBE_CENTER: [number, number] = [VIEWBOX_WIDTH / 2, VIEWBOX_HEIGHT / 2]
const GLOBE_RADIUS = 210
const MIN_RADIUS = 5
const MAX_RADIUS = 48

const countries = feature(
  worldTopology as unknown as Topology,
  worldTopology.objects.countries as unknown as GeometryCollection
) as FeatureCollection<Geometry, { name?: string }> | null

const centroidByCode = new Map<string, [number, number]>()

for (const country of countries?.features ?? []) {
  const code = ISO_NUMERIC_TO_ALPHA2[String(country.id)]

  if (!code) continue

  const centroid = geoCentroid(country)

  if (Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])) {
    centroidByCode.set(code, [centroid[0], centroid[1]])
  }
}

let displayNames: Intl.DisplayNames | null = null

try {
  displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
} catch {
  displayNames = null
}

function getCountryName(code: string): string {
  return displayNames?.of(code) ?? code
}

function getLocationCoordinates(
  location: VisitorLocation
): [number, number] | null {
  if (location.longitude !== null && location.latitude !== null) {
    return [location.longitude, location.latitude]
  }

  return centroidByCode.get(location.code) ?? null
}

function getLocationKey(location: VisitorLocation): string {
  return `${location.code}-${location.city}`
}

interface HoverState {
  city: string
  code: string
  name: string
  visitors: number
  share: number
  x: number
  y: number
}

interface VisitorLocationMapProps {
  params: VisitorLocationsParams
}

export function VisitorLocationMap({ params }: VisitorLocationMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startRotation: [number, number]
  } | null>(null)
  const rotationFrameRef = useRef<number | null>(null)
  const focusAnimationFrameRef = useRef<number | null>(null)
  const pendingRotationRef = useRef<[number, number] | null>(null)
  const rotationRef = useRef<[number, number]>([-10, -18])
  const [hover, setHover] = useState<HoverState | null>(null)
  const [highlightedLocation, setHighlightedLocation] = useState<string | null>(
    null
  )

  useEffect(() => {
    return () => {
      if (rotationFrameRef.current !== null) {
        window.cancelAnimationFrame(rotationFrameRef.current)
      }
      if (focusAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(focusAnimationFrameRef.current)
      }
    }
  }, [])

  const { data, isPending, isError } = useQuery(
    getVisitorLocationsOptions(params)
  )

  const locations = useMemo(() => data?.data.locations ?? [], [data])
  const total = data?.data.total ?? 0
  const maxVisitors = locations.reduce(
    (maximum, location) => Math.max(maximum, location.visitors),
    0
  )

  const getProjectedMarkers = useMemo(
    () => (currentRotation: [number, number]) => {
      const projection = geoOrthographic()
        .translate(GLOBE_CENTER)
        .scale(GLOBE_RADIUS)
        .rotate(currentRotation)
        .clipAngle(90)
      //@ts-ignore
      const visibleCenter = projection.invert(GLOBE_CENTER)

      return {
        projection,
        markers: locations
          .map((location) => {
            const coordinates = getLocationCoordinates(location)

            if (!coordinates) return null

            if (
              !visibleCenter ||
              geoDistance(coordinates, visibleCenter) > Math.PI / 2
            ) {
              return null
            }

            const point = projection(coordinates)

            if (!point) return null

            return {
              ...location,
              x: point[0],
              y: point[1],
              radius:
                maxVisitors > 0
                  ? MIN_RADIUS +
                    (MAX_RADIUS - MIN_RADIUS) *
                      Math.sqrt(location.visitors / maxVisitors)
                  : MIN_RADIUS,
            }
          })
          .filter(
            (marker): marker is NonNullable<typeof marker> => marker !== null
          ),
      }
    },
    [locations, maxVisitors]
  )

  const drawGlobe = useMemo(
    () => (currentRotation: [number, number]) => {
      const canvas = canvasRef.current
      const context = canvas?.getContext('2d')

      if (!canvas || !context) return

      const scale = window.devicePixelRatio || 1
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const styles = getComputedStyle(canvas)
      const mutedColor = styles.getPropertyValue('--color-muted').trim()
      const backgroundColor = styles
        .getPropertyValue('--color-background')
        .trim()
      const borderColor = styles.getPropertyValue('--color-border').trim()
      const foregroundColor = styles
        .getPropertyValue('--color-muted-foreground')
        .trim()
      const chartColor = styles.getPropertyValue('--color-primary').trim()

      if (!width || !height) return

      const pixelWidth = Math.round(width * scale)
      const pixelHeight = Math.round(height * scale)

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      context.setTransform(
        scale * (width / VIEWBOX_WIDTH),
        0,
        0,
        scale * (height / VIEWBOX_HEIGHT),
        0,
        0
      )
      context.clearRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT)

      const { projection, markers } = getProjectedMarkers(currentRotation)
      const path = geoPath(projection, context)

      context.beginPath()
      context.arc(
        GLOBE_CENTER[0],
        GLOBE_CENTER[1],
        GLOBE_RADIUS,
        0,
        Math.PI * 2
      )
      context.fillStyle = mutedColor
      context.globalAlpha = 0.45
      context.fill()
      context.globalAlpha = 1
      context.strokeStyle = borderColor
      context.lineWidth = 1
      context.stroke()

      context.beginPath()
      path({ type: 'Sphere' })
      context.fillStyle = backgroundColor
      context.globalAlpha = 0.5
      context.fill()
      context.globalAlpha = 1

      context.beginPath()
      for (const country of countries?.features ?? []) path(country)
      context.strokeStyle = foregroundColor
      context.globalAlpha = 0.7
      context.lineWidth = 0.55
      context.stroke()
      context.globalAlpha = 1

      for (const marker of markers) {
        const gradient = context.createRadialGradient(
          marker.x,
          marker.y,
          0,
          marker.x,
          marker.y,
          24
        )
        gradient.addColorStop(0, chartColor)
        gradient.addColorStop(1, 'transparent')
        context.beginPath()
        context.arc(marker.x, marker.y, 24, 0, Math.PI * 2)
        context.fillStyle = gradient
        context.fill()
        context.beginPath()
        context.arc(
          marker.x,
          marker.y,
          Math.max(2, marker.radius * 0.05),
          0,
          Math.PI * 2
        )
        context.fillStyle = chartColor
        context.globalAlpha = 0.9
        context.fill()
        context.globalAlpha = 1
      }
    },
    [getProjectedMarkers]
  )

  useEffect(() => {
    drawGlobe(rotationRef.current)

    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver(() =>
      drawGlobe(rotationRef.current)
    )
    resizeObserver.observe(canvas)

    return () => resizeObserver.disconnect()
  }, [drawGlobe])

  const topLocations = [...locations]
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5)

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (focusAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(focusAnimationFrameRef.current)
      focusAnimationFrameRef.current = null
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotationRef.current,
    }
    setHover(null)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const nextLongitude =
      drag.startRotation[0] + (event.clientX - drag.startX) * 0.45
    const nextLatitude = Math.max(
      -85,
      Math.min(85, drag.startRotation[1] - (event.clientY - drag.startY) * 0.45)
    )

    pendingRotationRef.current = [nextLongitude, nextLatitude]

    if (rotationFrameRef.current !== null) return

    rotationFrameRef.current = window.requestAnimationFrame(() => {
      rotationFrameRef.current = null

      if (pendingRotationRef.current) {
        rotationRef.current = pendingRotationRef.current
        drawGlobe(rotationRef.current)
        pendingRotationRef.current = null
      }
    })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
  }

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>
  ) => {
    handlePointerMove(event)

    if (dragRef.current) return

    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()

    if (!canvas || !rect) return

    const pointX = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH
    const pointY = ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT
    const { markers } = getProjectedMarkers(rotationRef.current)
    const marker = markers.find((candidate) => {
      const distance = Math.hypot(candidate.x - pointX, candidate.y - pointY)

      return distance <= Math.max(candidate.radius, 10)
    })

    if (!marker) {
      setHover(null)
      return
    }

    setHover({
      city: marker.city,
      code: marker.code,
      name: marker.country || getCountryName(marker.code),
      visitors: marker.visitors,
      share: total > 0 ? (marker.visitors / total) * 100 : 0,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  const focusLocation = (location: VisitorLocation) => {
    const coordinates = getLocationCoordinates(location)

    if (!coordinates) return

    if (focusAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(focusAnimationFrameRef.current)
    }

    const locationKey = getLocationKey(location)
    setHighlightedLocation(locationKey)
    setHover(null)

    const startRotation = rotationRef.current
    const targetLongitude = -coordinates[0]
    const targetLatitude = Math.max(-85, Math.min(85, -coordinates[1]))
    let longitudeDelta = targetLongitude - startRotation[0]

    while (longitudeDelta > 180) longitudeDelta -= 360
    while (longitudeDelta < -180) longitudeDelta += 360

    let startedAt: number | null = null
    const duration = 700

    const animate = (now: number) => {
      startedAt ??= now
      const progress = Math.min(1, (now - startedAt) / duration)
      const easedProgress = 1 - Math.pow(1 - progress, 3)

      rotationRef.current = [
        startRotation[0] + longitudeDelta * easedProgress,
        startRotation[1] + (targetLatitude - startRotation[1]) * easedProgress,
      ]
      drawGlobe(rotationRef.current)

      if (progress < 1) {
        focusAnimationFrameRef.current = window.requestAnimationFrame(animate)
      } else {
        focusAnimationFrameRef.current = null
        const rect = wrapperRef.current?.getBoundingClientRect()
        const { markers } = getProjectedMarkers(rotationRef.current)
        const marker = markers.find(
          (candidate) => getLocationKey(candidate) === locationKey
        )

        if (rect && marker) {
          setHover({
            city: marker.city,
            code: marker.code,
            name: marker.country || getCountryName(marker.code),
            visitors: marker.visitors,
            share: total > 0 ? (marker.visitors / total) * 100 : 0,
            x: (marker.x / VIEWBOX_WIDTH) * rect.width,
            y: (marker.y / VIEWBOX_HEIGHT) * rect.height,
          })
        }
      }
    }

    focusAnimationFrameRef.current = window.requestAnimationFrame(animate)
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="text-destructive px-5 py-16 text-center text-sm"
      >
        Unable to load visitor locations. Please try again.
      </div>
    )
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[320px] w-full rounded-lg" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
    )
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center px-5 py-12 text-center">
        <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
          <MapPin className="size-5" />
        </div>
        <p className="mt-4 text-sm font-medium">
          No visitor location data yet.
        </p>
        <p className="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
          Geographic location is resolved from visitor IPs on the backend.
          Location data will appear here once visitors send events.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-3">
        <div
          ref={wrapperRef}
          className="relative lg:col-span-2"
          onMouseLeave={() => setHover(null)}
        >
          <canvas
            ref={canvasRef}
            className="aspect-[640/500] h-auto w-full cursor-grab touch-none active:cursor-grabbing"
            role="img"
            aria-label="Draggable globe showing visitor concentration by city and country"
            onPointerDown={handlePointerDown}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => setHover(null)}
          />

          {hover && (
            <div
              className="bg-background/95 pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border px-3 py-2 shadow-sm backdrop-blur"
              style={{ left: hover.x, top: hover.y }}
            >
              <p className="text-sm font-medium">
                {hover.city}, {hover.name}
              </p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatNumber(hover.visitors)} visitors ·{' '}
                {hover.share.toFixed(1)}% of visitors
              </p>
            </div>
          )}
        </div>

        <div className="lg:border-border/70 px-2 lg:border-l">
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase lg:pl-4">
            Top locations
          </p>
          <ul className="space-y-1">
            {topLocations.map((location) => (
              <li key={getLocationKey(location)}>
                <Button
                  type="button"
                  variant="ghost"
                  aria-pressed={
                    highlightedLocation === getLocationKey(location)
                  }
                  className={`w-full justify-between gap-3 rounded-lg py-6 text-left`}
                  onClick={() => focusLocation(location)}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Badge variant="outline" className="shrink-0">
                      {location.code}
                    </Badge>
                    <span className="truncate text-sm">
                      {location.city},{' '}
                      {location.country || getCountryName(location.code)}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium">
                      {formatNumber(location.visitors)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {total > 0
                        ? ((location.visitors / total) * 100).toFixed(1)
                        : '0'}
                      %
                    </p>
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="text-muted-foreground text-xs">
          Visitor concentration
        </span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Low</span>
          <div
            className="h-2 w-24 rounded-full"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--color-chart-1))',
            }}
          />
          <span className="text-muted-foreground text-xs">High</span>
        </div>
        <span className="text-muted-foreground ml-auto text-xs">
          {formatNumber(total)} located visitors
        </span>
      </div>
    </div>
  )
}
