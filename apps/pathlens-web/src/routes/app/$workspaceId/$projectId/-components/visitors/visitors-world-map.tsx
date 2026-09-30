import { useMemo, useRef, useState } from 'react'
import { geoContains, geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'

import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'

import worldTopology from 'world-atlas/countries-110m.json'
import type { VisitorLocation } from '@/queries/visitors'

type VisitorsWorldMapProps = {
  locations: VisitorLocation[]
}

type CountryFeature = Feature<
  Geometry,
  {
    name?: string
  }
>

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
) as FeatureCollection<
  Geometry,
  {
    name?: string
  }
>

const projection = geoNaturalEarth1().fitSize(
  [MAP_WIDTH, MAP_HEIGHT],
  worldCountries
)

const pathGenerator = geoPath(projection)

export const VisitorsWorldMap = ({ locations }: VisitorsWorldMapProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [hoveredCountry, setHoveredCountry] = useState<string | number | null>(
    null
  )

  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  /*
   * Aggregate all locations into
   * their corresponding country polygon.
   */
  const countryVisitors = useMemo(() => {
    const map = new Map<CountryFeature, number>()

    locations.forEach((location) => {
      const latitude = Number(location.latitude)
      const longitude = Number(location.longitude)
      const visitors = Number(location.visitors) || 0

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return
      }

      const countryFeature = worldCountries.features.find((country) =>
        geoContains(country, [longitude, latitude])
      ) as CountryFeature | undefined

      if (!countryFeature) {
        return
      }

      const currentVisitors = map.get(countryFeature) ?? 0

      map.set(countryFeature, currentVisitors + visitors)
    })

    return map
  }, [locations])

  /*
   * Highest country count used
   * for highlight intensity.
   */
  const maxVisitors = useMemo(() => {
    if (!countryVisitors.size) {
      return 1
    }

    return Math.max(...Array.from(countryVisitors.values()), 1)
  }, [countryVisitors])

  const updateTooltip = (
    event: React.MouseEvent<SVGPathElement>,
    name: string,
    visitors: number
  ) => {
    const wrapper = wrapperRef.current

    if (!wrapper) return

    const bounds = wrapper.getBoundingClientRect()

    const tooltipWidth = 150
    const tooltipHeight = 58
    const offset = 12

    let x = event.clientX - bounds.left + offset
    let y = event.clientY - bounds.top + offset

    /*
     * Prevent tooltip from overflowing
     * the map container.
     */
    if (x + tooltipWidth > bounds.width) {
      x = event.clientX - bounds.left - tooltipWidth - offset
    }

    if (y + tooltipHeight > bounds.height) {
      y = event.clientY - bounds.top - tooltipHeight - offset
    }

    setTooltip({
      name,
      visitors,
      x,
      y,
    })
  }

  const clearHover = () => {
    setHoveredCountry(null)
    setTooltip(null)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onMouseLeave={clearHover}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label="Visitor distribution by country"
      >
        {worldCountries.features.map((country, index) => {
          const countryFeature = country as CountryFeature

          const countryId = country.id ?? index

          const countryName = country.properties?.name ?? 'Unknown'

          const visitors = countryVisitors.get(countryFeature) ?? 0

          const intensity = visitors > 0 ? visitors / maxVisitors : 0

          const path = pathGenerator(country)

          if (!path) {
            return null
          }

          const isHovered = hoveredCountry === countryId
          const hasHoveredCountry = hoveredCountry !== null

          /*
           * Countries without visitors
           */
          /*
           * Countries without visitors
           */
          let fillOpacity = 0.1
          let strokeOpacity = 0.5
          let strokeWidth = 0.45

          /*
           * Normal state
           */
          if (!hasHoveredCountry) {
            if (visitors > 0) {
              // 0.3 → 0.7 depending on visitor count
              fillOpacity = 0.3 + intensity * 0.4
              strokeOpacity = 0.8
              strokeWidth = 0.7
            }
          }

          /*
           * Hover state
           */
          if (hasHoveredCountry) {
            if (isHovered) {
              fillOpacity = 0.8
              strokeOpacity = 1
              strokeWidth = 1
            } else {
              fillOpacity = visitors > 0 ? 0.18 : 0.06
              strokeOpacity = 0.3
              strokeWidth = 0.4
            }
          }

          return (
            <path
              key={countryId}
              d={path}
              onMouseEnter={(event) => {
                setHoveredCountry(countryId)

                updateTooltip(event, countryName, visitors)
              }}
              onMouseMove={(event) => {
                updateTooltip(event, countryName, visitors)
              }}
              onMouseLeave={clearHover}
              fill={
                isHovered || visitors > 0
                  ? 'var(--chart-1)'
                  : 'var(--muted-foreground)'
              }
              fillOpacity={fillOpacity}
              stroke={
                isHovered || visitors > 0 ? 'var(--chart-1)' : 'var(--border)'
              }
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer transition-[fill,fill-opacity,stroke,stroke-opacity,stroke-width] duration-300 ease-out"
            />
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="bg-card/30 text-popover-foreground pointer-events-none absolute z-50 min-w-32 border-2 border-dashed px-3 py-2 shadow-md backdrop-blur-3xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          <p className="text-sm font-medium">{tooltip.name}</p>

          <div className="mt-1 flex items-center justify-between gap-6">
            <p className="text-muted-foreground text-xs">Visitors</p>

            <p className="text-xs font-medium">
              {tooltip.visitors.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
