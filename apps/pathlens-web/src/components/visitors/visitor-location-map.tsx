import { useId, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import worldTopology from 'world-atlas/countries-110m.json'
import { Badge } from '@workspace/ui/components/badge'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ISO_NUMERIC_TO_ALPHA2 } from '@/lib/country-codes'
import { getVisitorLocationsOptions } from '@/queries/visitors'
import type { VisitorLocationsParams } from '@/queries/visitors'
import { formatNumber } from '@/utils/utils'
import { MapPin } from 'lucide-react'

type CountryFeature = Feature<Geometry, { name?: string }>

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

interface HoverState {
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
  const gradientId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startRotation: [number, number]
  } | null>(null)
  const [hover, setHover] = useState<HoverState | null>(null)
  const [rotation, setRotation] = useState<[number, number]>([-10, -18])

  const { data, isPending, isError } = useQuery(
    getVisitorLocationsOptions(params)
  )

  const locations = useMemo(() => data?.data.locations ?? [], [data])
  const total = data?.data.total ?? 0
  const maxVisitors = locations.reduce(
    (maximum, location) => Math.max(maximum, location.visitors),
    0
  )

  const projection = useMemo(
    () =>
      geoOrthographic()
        .translate(GLOBE_CENTER)
        .scale(GLOBE_RADIUS)
        .rotate(rotation)
        .clipAngle(90),
    [rotation]
  )
  const path = useMemo(() => geoPath(projection), [projection])

  const markers = useMemo(() => {
    return locations
      .map((location) => {
        const centroid = centroidByCode.get(location.code)

        if (!centroid) return null

        const point = projection(centroid)

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
      .filter((marker): marker is NonNullable<typeof marker> => marker !== null)
  }, [locations, maxVisitors, projection])

  const topLocations = [...locations]
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 5)

  const updateHoverPosition = (
    event: React.MouseEvent<SVGGElement>,
    next: HoverState
  ) => {
    const rect = wrapperRef.current?.getBoundingClientRect()

    if (!rect) return

    const x = Math.min(Math.max(event.clientX - rect.left, 90), rect.width - 90)
    const y = Math.max(event.clientY - rect.top, 24)

    setHover({ ...next, x, y })
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotation,
    }
    setHover(null)
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const nextLongitude =
      drag.startRotation[0] + (event.clientX - drag.startX) * 0.45
    const nextLatitude = Math.max(
      -85,
      Math.min(85, drag.startRotation[1] - (event.clientY - drag.startY) * 0.45)
    )

    setRotation([nextLongitude, nextLatitude])
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragRef.current = null
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
          <svg
            viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
            className="h-auto w-full cursor-grab touch-none active:cursor-grabbing"
            role="img"
            aria-label="Draggable globe showing visitor concentration by country"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => {
              if (!dragRef.current) setHover(null)
            }}
          >
            <defs>
              <radialGradient id={gradientId}>
                <stop
                  offset="0%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity="0.45"
                />
                <stop
                  offset="55%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity="0.15"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-chart-1)"
                  stopOpacity="0"
                />
              </radialGradient>
            </defs>

            <circle
              cx={GLOBE_CENTER[0]}
              cy={GLOBE_CENTER[1]}
              r={GLOBE_RADIUS}
              fill="var(--color-muted)"
              fillOpacity={0.45}
              stroke="var(--color-border)"
              strokeWidth={1}
            />

            <path
              d={path({ type: 'Sphere' }) ?? undefined}
              fill="var(--color-background)"
              fillOpacity={0.5}
              stroke="none"
            />

            <g className="pointer-events-none">
              {(countries?.features ?? []).map((country: CountryFeature) => (
                <path
                  key={`${country.id}-${country.properties?.name ?? ''}`}
                  d={path(country) ?? undefined}
                  fill="transparent"
                  stroke="var(--color-muted-foreground)"
                  strokeOpacity={0.7}
                  strokeWidth={0.55}
                  strokeLinejoin="round"
                />
              ))}
            </g>

            <g>
              {markers.map((marker) => (
                <g
                  key={marker.code}
                  transform={`translate(${marker.x} ${marker.y})`}
                  className="cursor-pointer"
                  onPointerDown={(event) => event.stopPropagation()}
                  onMouseEnter={() =>
                    setHover({
                      code: marker.code,
                      name: getCountryName(marker.code),
                      visitors: marker.visitors,
                      share: total > 0 ? (marker.visitors / total) * 100 : 0,
                      x: marker.x,
                      y: marker.y,
                    })
                  }
                  onMouseMove={(event) => {
                    if (hover?.code === marker.code) {
                      updateHoverPosition(event, hover)
                    }
                  }}
                >
                  <title>
                    {`${getCountryName(marker.code)}: ${formatNumber(marker.visitors)} visitors`}
                  </title>
                  <circle
                    r={marker.radius}
                    fill={`url(#${gradientId})`}
                    stroke="none"
                  />
                  <circle
                    r={Math.max(2, marker.radius * 0.18)}
                    fill="var(--color-chart-1)"
                    opacity={0.9}
                  />
                </g>
              ))}
            </g>
          </svg>

          {hover && (
            <div
              className="bg-background/95 pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-lg border px-3 py-2 shadow-sm backdrop-blur"
              style={{ left: hover.x, top: hover.y }}
            >
              <p className="text-sm font-medium">{hover.name}</p>
              <p className="text-muted-foreground mt-0.5 text-xs">
                {formatNumber(hover.visitors)} visitors ·{' '}
                {hover.share.toFixed(1)}% of visitors
              </p>
            </div>
          )}
        </div>

        <div className="lg:border-border/70 lg:border-l lg:pl-6">
          <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
            Top locations
          </p>
          <ul className="space-y-3">
            {topLocations.map((location) => (
              <li
                key={location.code}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="outline" className="shrink-0">
                    {location.code}
                  </Badge>
                  <span className="truncate text-sm">
                    {getCountryName(location.code)}
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
