import { useEffect, useMemo, useRef, useState } from 'react'
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
  subtitle: string
  visitors: number
  x: number
  y: number
}

type CityPoint = {
  id: string
  city: string
  country: string
  visitors: number
  longitude: number
  latitude: number
  x: number
  y: number
  countryId: string | number | null
}

type SelectedCountry = {
  id: string | number
  name: string
  path: string
  centerX: number
  centerY: number
  scale: number
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

const zoomTransition = {
  type: 'spring' as const,
  stiffness: 170,
  damping: 27,
  mass: 0.85,
}

export const VisitorsWorldMap = ({ locations }: VisitorsWorldMapProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const [hoveredCountry, setHoveredCountry] = useState<string | number | null>(
    null
  )

  const [hoveredCity, setHoveredCity] = useState<string | null>(null)

  const [selectedCountry, setSelectedCountry] =
    useState<SelectedCountry | null>(null)

  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const { countryVisitors, cityPoints } = useMemo(() => {
    const counts = new Map<CountryFeature, number>()
    const points: CityPoint[] = []

    locations.forEach((location, index) => {
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

      const countryIndex = worldCountries.features.findIndex((country) =>
        geoContains(country, [longitude, latitude])
      )

      const matchedCountry =
        countryIndex >= 0 ? worldCountries.features[countryIndex] : null

      const countryId = matchedCountry
        ? (matchedCountry.id ?? countryIndex)
        : null

      if (matchedCountry) {
        counts.set(matchedCountry, (counts.get(matchedCountry) ?? 0) + visitors)
      }

      const projected = projection([longitude, latitude])
      if (!projected) return

      points.push({
        id: `${location.code}-${location.city}-${index}`,
        city: location.city || 'Unknown city',
        country: location.country || location.code,
        visitors,
        longitude,
        latitude,
        x: projected[0],
        y: projected[1],
        countryId,
      })
    })

    return {
      countryVisitors: counts,
      cityPoints: points,
    }
  }, [locations])

  const maxVisitors = useMemo(
    () => Math.max(1, ...countryVisitors.values()),
    [countryVisitors]
  )

  const selectedCities = useMemo(
    () =>
      selectedCountry
        ? cityPoints.filter((city) => city.countryId === selectedCountry.id)
        : [],
    [cityPoints, selectedCountry]
  )

  const maxCityVisitors = useMemo(
    () => Math.max(1, ...selectedCities.map((city) => city.visitors)),
    [selectedCities]
  )

  const clearHover = () => {
    setHoveredCountry(null)
    setHoveredCity(null)
    setTooltip(null)
  }

  const updateTooltip = (
    event: MouseEvent<SVGElement>,
    name: string,
    subtitle: string,
    visitors: number
  ) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return

    const bounds = wrapper.getBoundingClientRect()
    const tooltipWidth = 175
    const tooltipHeight = 78
    const offset = 12

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
      subtitle,
      visitors,
      x: Math.max(0, x),
      y: Math.max(0, y),
    })
  }

  const openCountry = (country: CountryFeature, id: string | number) => {
    if (selectedCountry?.id === id) {
      setSelectedCountry(null)
      clearHover()
      return
    }

    const path = pathGenerator(country)
    if (!path) return

    const [[x0, y0], [x1, y1]] = pathGenerator.bounds(country)

    const countryWidth = Math.max(1, x1 - x0)
    const countryHeight = Math.max(1, y1 - y0)

    const centerX = (x0 + x1) / 2
    const centerY = (y0 + y1) / 2

    // Zoom to a larger size while remaining inside the map.
    const scale = Math.min(
      7,
      (MAP_WIDTH * 0.58) / countryWidth,
      (MAP_HEIGHT * 0.68) / countryHeight
    )

    clearHover()

    setSelectedCountry({
      id,
      name: country.properties?.name ?? 'Unknown',
      path,
      centerX,
      centerY,
      scale,
    })
  }

  useEffect(() => {
    if (!selectedCountry) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedCountry(null)
        setTooltip(null)
        setHoveredCountry(null)
        setHoveredCity(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedCountry])

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
        aria-label="Interactive 2D visitor world map"
      >
        {/* WORLD COUNTRIES */}
        {worldCountries.features.map((country, index) => {
          const countryFeature = country as CountryFeature
          const countryId = country.id ?? index
          const countryName = country.properties?.name ?? 'Unknown'

          const visitors = countryVisitors.get(countryFeature) ?? 0

          const intensity = visitors / maxVisitors
          const path = pathGenerator(country)

          if (!path) return null

          const isHovered = hoveredCountry === countryId
          const isSelected = selectedCountry?.id === countryId
          const hasHover = hoveredCountry !== null

          let fillOpacity = visitors > 0 ? 0.3 + intensity * 0.4 : 0.1

          let strokeOpacity = visitors > 0 ? 0.8 : 0.5
          let strokeWidth = visitors > 0 ? 0.7 : 0.45

          if (hasHover && !selectedCountry) {
            if (isHovered) {
              fillOpacity = 0.8
              strokeOpacity = 1
              strokeWidth = 1
            } else {
              fillOpacity = visitors > 0 ? 0.18 : 0.06
              strokeOpacity = 0.3
            }
          }

          if (isSelected) {
            fillOpacity = 0.04
            strokeOpacity = 0.15
          }

          return (
            <path
              key={countryId}
              d={path}
              fill={
                visitors > 0 || isHovered
                  ? 'var(--chart-1)'
                  : 'var(--muted-foreground)'
              }
              fillOpacity={fillOpacity}
              stroke={
                visitors > 0 || isHovered ? 'var(--chart-1)' : 'var(--border)'
              }
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer transition-[fill,fill-opacity,stroke,stroke-opacity,stroke-width] duration-300"
              onMouseEnter={(event) => {
                if (selectedCountry) return

                setHoveredCountry(countryId)
                updateTooltip(event, countryName, 'Country', visitors)
              }}
              onMouseMove={(event) => {
                if (selectedCountry) return

                updateTooltip(event, countryName, 'Country', visitors)
              }}
              onMouseLeave={clearHover}
              onClick={() => openCountry(countryFeature, countryId)}
            />
          )
        })}

        {/* SELECTED COUNTRY WITH CITY DOTS */}
        <AnimatePresence mode="wait">
          {selectedCountry && (
            <motion.g
              key={selectedCountry.id}
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {/* Translate selected country to map center */}
              <motion.g
                initial={{
                  x: selectedCountry.centerX,
                  y: selectedCountry.centerY,
                }}
                animate={{
                  x: MAP_WIDTH / 2,
                  y: MAP_HEIGHT / 2,
                }}
                exit={{
                  x: selectedCountry.centerX,
                  y: selectedCountry.centerY,
                }}
                transition={zoomTransition}
                style={{ transformOrigin: '0px 0px' }}
              >
                {/* Scale country and city markers together */}
                <motion.g
                  initial={{ scale: 1 }}
                  animate={{ scale: selectedCountry.scale }}
                  exit={{ scale: 1 }}
                  transition={zoomTransition}
                  style={{ transformOrigin: '0px 0px' }}
                >
                  <g
                    transform={`translate(${-selectedCountry.centerX} ${-selectedCountry.centerY})`}
                  >
                    {/* Enlarged country */}
                    <path
                      d={selectedCountry.path}
                      fill="var(--chart-1)"
                      fillOpacity={0.35}
                      stroke="var(--chart-1)"
                      strokeWidth={1.3}
                      vectorEffect="non-scaling-stroke"
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedCountry(null)
                        clearHover()
                      }}
                    />

                    {/* CITY DOTS */}
                    {selectedCities.map((city, index) => {
                      const isHovered = hoveredCity === city.id

                      // Inverse scaling keeps dots readable at any zoom.
                      const markerScale = 1 / selectedCountry.scale

                      const radius = 4 + (city.visitors / maxCityVisitors) * 2

                      return (
                        <motion.g
                          key={city.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{
                            duration: 0.25,
                            delay: 0.35 + index * 0.08,
                          }}
                        >
                          <g
                            transform={`translate(${city.x} ${city.y}) scale(${markerScale})`}
                            className="cursor-pointer"
                            onMouseEnter={(event) => {
                              setHoveredCity(city.id)

                              updateTooltip(
                                event,
                                city.city,
                                city.country,
                                city.visitors
                              )
                            }}
                            onMouseMove={(event) => {
                              updateTooltip(
                                event,
                                city.city,
                                city.country,
                                city.visitors
                              )
                            }}
                            onMouseLeave={() => {
                              setHoveredCity(null)
                              setTooltip(null)
                            }}
                          >
                            {/* Pulsing ring */}
                            <motion.circle
                              r={radius + 2}
                              fill="none"
                              stroke="var(--chart-1)"
                              strokeWidth={1.5}
                              initial={{
                                scale: 1,
                                opacity: 0.7,
                              }}
                              animate={{
                                scale: [1, 2, 2.8],
                                opacity: [0.7, 0.25, 0],
                              }}
                              transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: 'easeOut',
                                delay: index * 0.3,
                              }}
                              className="pointer-events-none"
                            />

                            {/* Outer glow */}
                            <circle
                              r={radius * 2}
                              fill="var(--chart-1)"
                              fillOpacity={isHovered ? 0.2 : 0.09}
                              className="pointer-events-none"
                            />

                            {/* Main dot */}
                            <circle
                              r={isHovered ? radius + 2 : radius}
                              fill="var(--chart-1)"
                              stroke="var(--background)"
                              strokeWidth={1.5}
                              className="pointer-events-none transition-all duration-200"
                            />

                            {/* Inner center */}
                            <circle
                              r={1.5}
                              fill="var(--background)"
                              className="pointer-events-none"
                            />

                            {/* Larger hover target */}
                            <circle
                              r={Math.max(12, radius * 1.8)}
                              fill="transparent"
                            />
                          </g>
                        </motion.g>
                      )
                    })}
                  </g>
                </motion.g>
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* COUNTRY LABEL AND CLOSE CONTROL - NO MODAL BOX */}
      <AnimatePresence>
        {selectedCountry && (
          <motion.div
            key={selectedCountry.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3"
          >
            <span className="text-foreground text-sm font-semibold">
              {selectedCountry.name}
            </span>

            <button
              type="button"
              onClick={() => {
                setSelectedCountry(null)
                clearHover()
              }}
              className="bg-card/80 text-muted-foreground hover:text-foreground pointer-events-auto flex size-7 cursor-pointer items-center justify-center rounded-full border transition-colors"
              aria-label="Close country view"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HOVER TOOLTIP */}
      <AnimatePresence>
        {tooltip && (
          <motion.div
            key={`${tooltip.name}-${tooltip.subtitle}`}
            initial={{ opacity: 0, scale: 0.95, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 4 }}
            transition={{ duration: 0.12 }}
            className="bg-card/90 text-card-foreground pointer-events-none absolute z-50 min-w-36 border-2 border-dashed px-3 py-2 shadow-lg backdrop-blur-xl"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="max-w-44 truncate text-sm font-semibold">
              {tooltip.name}
            </p>

            <p className="text-muted-foreground mt-0.5 text-xs">
              {tooltip.subtitle}
            </p>

            <div className="border-border mt-2 flex items-center justify-between gap-6 border-t border-dashed pt-2">
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
