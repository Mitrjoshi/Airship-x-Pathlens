import { useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { AnimatePresence, motion } from 'motion/react'
import { geoContains, geoEquirectangular, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'

import worldTopology from 'world-atlas/countries-110m.json'
import type { VisitorLocation } from '@/queries/visitors'

type VisitorsWorldMapProps = {
  locations: VisitorLocation[]
}

type CountryFeature = Feature<Geometry, { name?: string }>

type TooltipData = {
  name: string
  visitors: number
  x: number
  y: number
}

const MAP_WIDTH = 960
const MAP_HEIGHT = 500

const worldCountries = feature(
  worldTopology as unknown as Topology,
  worldTopology.objects.countries as unknown as GeometryCollection
) as FeatureCollection<Geometry, { name?: string }>

const projection = geoEquirectangular()
  .scale(MAP_WIDTH / (2 * Math.PI))
  .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2])
  .precision(0.1)

const pathGenerator = geoPath(projection)

export const VisitorsWorldMap = ({ locations }: VisitorsWorldMapProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [hoveredCountry, setHoveredCountry] = useState<string | number | null>(
    null
  )

  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  // Aggregate visitors by country
  const countryVisitors = useMemo(() => {
    const counts = new Map<CountryFeature, number>()

    locations.forEach((location) => {
      if (location.latitude == null || location.longitude == null) {
        return
      }

      const latitude = Number(location.latitude)
      const longitude = Number(location.longitude)
      const visitors = Number(location.visitors) || 0

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180 ||
        visitors <= 0
      ) {
        return
      }

      const matchedCountry = worldCountries.features.find((country) =>
        geoContains(country, [longitude, latitude])
      ) as CountryFeature | undefined

      if (!matchedCountry) return

      counts.set(matchedCountry, (counts.get(matchedCountry) ?? 0) + visitors)
    })

    return counts
  }, [locations])

  const maxVisitors = useMemo(
    () => Math.max(1, ...countryVisitors.values()),
    [countryVisitors]
  )

  const clearHover = () => {
    setHoveredCountry(null)
    setTooltip(null)
  }

  const updateTooltip = (
    event: MouseEvent<SVGPathElement>,
    name: string,
    visitors: number
  ) => {
    const wrapper = wrapperRef.current

    if (!wrapper) return

    const bounds = wrapper.getBoundingClientRect()

    const tooltipWidth = 180
    const tooltipHeight = 76
    const offset = 14

    const pointerX = event.clientX - bounds.left
    const pointerY = event.clientY - bounds.top

    const x =
      pointerX + tooltipWidth + offset > bounds.width
        ? pointerX - tooltipWidth - offset
        : pointerX + offset

    const y =
      pointerY + tooltipHeight + offset > bounds.height
        ? pointerY - tooltipHeight - offset
        : pointerY + offset

    setTooltip({
      name,
      visitors,
      x: Math.max(0, Math.min(x, Math.max(0, bounds.width - tooltipWidth))),
      y: Math.max(0, Math.min(y, Math.max(0, bounds.height - tooltipHeight))),
    })
  }

  return (
    <div
      ref={wrapperRef}
      className="relative h-full w-full min-w-0 overflow-hidden"
      onMouseLeave={clearHover}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="block h-full w-full"
        role="img"
        aria-label="World map showing visitors by country"
      >
        {worldCountries.features.map((country, index) => {
          const countryFeature = country as CountryFeature

          const countryId = country.id ?? index

          const countryName = country.properties?.name ?? 'Unknown'

          const visitors = countryVisitors.get(countryFeature) ?? 0

          const path = pathGenerator(country)

          if (!path) return null

          const isHovered = hoveredCountry === countryId

          const hasHover = hoveredCountry !== null

          const hasVisitors = visitors > 0

          // Visit intensity: 0 to 1
          const normalized = hasVisitors ? visitors / maxVisitors : 0

          // Increase contrast between low and high visits
          const intensity = Math.pow(normalized, 0.65)

          // Base country intensity
          const baseOpacity = hasVisitors ? 0.18 + intensity * 0.78 : 0.12

          // Highlight hovered country, dim everything else
          const fillOpacity = isHovered
            ? 1
            : hasHover
              ? baseOpacity * 0.45
              : baseOpacity

          const strokeOpacity = isHovered
            ? 0
            : hasHover
              ? 0.2
              : hasVisitors
                ? 0.65
                : 0.3

          const strokeWidth = isHovered ? 1.8 : hasVisitors ? 0.7 : 0.4

          return (
            <path
              key={countryId}
              d={path}
              fill={
                isHovered || hasVisitors
                  ? 'var(--chart-1)'
                  : 'var(--muted-foreground)'
              }
              fillOpacity={fillOpacity}
              stroke={
                isHovered
                  ? 'var(--foreground)'
                  : hasVisitors
                    ? 'var(--chart-1)'
                    : 'var(--border)'
              }
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="cursor-default transition-[fill,fill-opacity,stroke,stroke-opacity,stroke-width] duration-200 ease-out"
              onMouseEnter={(event) => {
                setHoveredCountry(countryId)

                updateTooltip(event, countryName, visitors)
              }}
              onMouseMove={(event) => {
                updateTooltip(event, countryName, visitors)
              }}
              onMouseLeave={clearHover}
            />
          )
        })}
      </svg>

      {/* COUNTRY TOOLTIP */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            key={tooltip.name}
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 4,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.96,
              y: 4,
            }}
            transition={{
              duration: 0.12,
              ease: 'easeOut',
            }}
            className="bg-card/95 text-card-foreground pointer-events-none absolute z-50 min-w-36 rounded-md border px-3 py-2 shadow-lg backdrop-blur-xl"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            <p className="max-w-44 truncate text-sm font-semibold">
              {tooltip.name}
            </p>

            <div className="border-border mt-2 flex items-center justify-between gap-6 border-t pt-2">
              <span className="text-muted-foreground text-xs">Visitors</span>

              <span className="text-xs font-semibold tabular-nums">
                {tooltip.visitors.toLocaleString()}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
