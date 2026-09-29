import { useCallback, useEffect, useRef } from 'react'

import { geoGraticule, geoOrthographic, geoPath } from 'd3-geo'

import { feature } from 'topojson-client'

import type { Feature, FeatureCollection, Geometry } from 'geojson'

import type { GeometryCollection, Topology } from 'topojson-specification'

import worldTopology from 'world-atlas/countries-110m.json'

type VisitorCountry = {
  name: string
  code?: string
  visitors: number
}

type VisitorsGlobeProps = {
  countries: VisitorCountry[]
}

type CountryFeature = Feature<
  Geometry,
  {
    name?: string
  }
>

type VisitedCountry = {
  feature: CountryFeature
  intensity: number
}

/* ---------------------------------
 * Globe configuration
 * --------------------------------- */

const GLOBE_SIZE = 500

const GLOBE_CENTER: [number, number] = [GLOBE_SIZE / 2, GLOBE_SIZE / 2]

const GLOBE_RADIUS = 195

const GLOBE_TILT = 0

const TARGET_FPS = 30

const FRAME_INTERVAL = 1000 / TARGET_FPS

const ROTATION_SPEED = 0.02
const EMPTY_ROTATION_SPEED = 0.09
/* ---------------------------------
 * World data
 * --------------------------------- */

const worldCountries = feature(
  worldTopology as unknown as Topology,
  worldTopology.objects.countries as unknown as GeometryCollection
) as FeatureCollection<
  Geometry,
  {
    name?: string
  }
>

const graticule = geoGraticule().step([15, 15]).precision(3)()

/* ---------------------------------
 * Country matching
 * --------------------------------- */

const normalizeCountryName = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')

/*
 * Add aliases here when your API naming
 * differs from world-atlas.
 */
const countryAliases: Record<string, string> = {
  usa: 'unitedstatesofamerica',
  us: 'unitedstatesofamerica',
  unitedstates: 'unitedstatesofamerica',

  uk: 'unitedkingdom',
  greatbritain: 'unitedkingdom',

  uae: 'unitedarabemirates',

  republicofkorea: 'southkorea',
  korea: 'southkorea',

  czechrepublic: 'czechia',

  turkiye: 'turkey',

  russianfederation: 'russia',

  vietnam: 'vietnam',

  ivorycoast: 'cotedivoire',

  drcongo: 'democraticrepublicofthecongo',
  democraticrepubliccongo: 'democraticrepublicofthecongo',

  congo: 'republicofthecongo',
}

const countryFeatureMap = new Map<string, CountryFeature>()

worldCountries.features.forEach((country) => {
  const name = country.properties?.name ?? ''

  countryFeatureMap.set(normalizeCountryName(name), country as CountryFeature)
})

const getCountryFeature = (countryName: string) => {
  const normalized = normalizeCountryName(countryName)

  const mapped = countryAliases[normalized] ?? normalized

  return countryFeatureMap.get(mapped)
}

/* ---------------------------------
 * Component
 * --------------------------------- */

export const VisitorsGlobe = ({ countries }: VisitorsGlobeProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const rotationSpeedRef = useRef(ROTATION_SPEED)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const animationFrameRef = useRef<number | null>(null)

  const previousFrameRef = useRef(0)

  const rotationRef = useRef<[number, number]>([-80, -15])

  const isVisibleRef = useRef(true)

  const isReducedMotionRef = useRef(false)

  const visitedCountriesRef = useRef<VisitedCountry[]>([])

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startLongitude: number
  } | null>(null)

  const colorsRef = useRef({
    accent: '#3b82f6',
    muted: '#64748b',
    background: '#000000',
  })

  /* ---------------------------------
   * Draw
   * --------------------------------- */

  const drawGlobe = useCallback((rotation: [number, number]) => {
    const canvas = canvasRef.current

    const context = canvas?.getContext('2d')

    if (!canvas || !context) {
      return
    }

    const width = canvas.clientWidth

    const height = canvas.clientHeight

    if (!width || !height) {
      return
    }

    /*
     * Limiting DPR keeps the globe
     * noticeably lighter on Retina /
     * high DPI screens.
     */
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25)

    const pixelWidth = Math.round(width * pixelRatio)

    const pixelHeight = Math.round(height * pixelRatio)

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
    }

    context.setTransform(
      pixelRatio * (width / GLOBE_SIZE),
      0,
      0,
      pixelRatio * (height / GLOBE_SIZE),
      0,
      0
    )

    context.clearRect(0, 0, GLOBE_SIZE, GLOBE_SIZE)

    const projection = geoOrthographic()
      .translate(GLOBE_CENTER)
      .scale(GLOBE_RADIUS)
      .rotate([rotation[0], rotation[1], GLOBE_TILT])
      .clipAngle(90)

      /*
       * Lower precision =
       * less path computation.
       */
      .precision(0.7)

    const path = geoPath(projection, context)

    const { accent, muted, background } = colorsRef.current

    /* ---------------------------
     * Globe background
     * --------------------------- */

    context.beginPath()

    path({
      type: 'Sphere',
    })

    context.fillStyle = background
    context.globalAlpha = 0.04
    context.fill()

    /* ---------------------------
     * Outer circle
     * --------------------------- */

    /* ---------------------------
     * Subtle atmosphere glow
     * --------------------------- */
    context.save()

    context.beginPath()
    path({
      type: 'Sphere',
    })

    /*
     * Soft outer glow.
     * Big blur + very low opacity
     * so it feels atmospheric,
     * not neon.
     */
    context.shadowColor = accent
    context.shadowBlur = 18
    context.strokeStyle = accent
    context.globalAlpha = 0.08
    context.lineWidth = 6
    context.stroke()

    context.restore()

    /* ---------------------------
     * Soft atmosphere ring
     * --------------------------- */
    context.save()

    context.beginPath()
    path({
      type: 'Sphere',
    })

    context.strokeStyle = accent
    context.globalAlpha = 0.01
    context.lineWidth = 2
    context.stroke()

    context.restore()

    /* ---------------------------
     * Main outer globe ring
     * --------------------------- */
    context.beginPath()

    path({
      type: 'Sphere',
    })

    context.strokeStyle = accent
    context.globalAlpha = 0.25
    context.lineWidth = 0.8
    context.stroke()

    /* ---------------------------
     * Grid
     * --------------------------- */

    context.beginPath()

    path(graticule)

    context.strokeStyle = accent
    context.globalAlpha = 0.08
    context.lineWidth = 0.45
    context.stroke()

    /* ---------------------------
     * Base countries
     * --------------------------- */

    context.beginPath()

    path(worldCountries)

    context.fillStyle = muted
    context.globalAlpha = 0.08
    context.fill()

    context.strokeStyle = muted
    context.globalAlpha = 0.18
    context.lineWidth = 0.35
    context.stroke()

    /* ---------------------------
     * Visited countries
     * --------------------------- */

    visitedCountriesRef.current.forEach(({ feature, intensity }) => {
      context.beginPath()

      path(feature)

      /*
       * Stronger visitor count =
       * brighter country.
       */
      context.fillStyle = accent

      context.globalAlpha = 0.18 + intensity * 0.62

      context.fill()

      /*
       * Country outline
       */
      context.strokeStyle = accent

      context.globalAlpha = 0.35 + intensity * 0.55

      context.lineWidth = 0.5 + intensity * 0.7

      context.stroke()
    })

    context.globalAlpha = 1
  }, [])

  /* ---------------------------------
   * Convert visitor data into
   * highlighted world features
   * --------------------------------- */

  useEffect(() => {
    if (!countries.length) {
      visitedCountriesRef.current = []

      drawGlobe(rotationRef.current)

      return
    }

    const maxVisitors = Math.max(
      ...countries.map((country) => Number(country.visitors) || 0),
      1
    )

    const visited: VisitedCountry[] = []

    countries.forEach((country) => {
      const visitors = Number(country.visitors) || 0

      if (visitors <= 0) {
        return
      }

      const countryFeature = getCountryFeature(country.name)

      if (!countryFeature) {
        return
      }

      /*
       * Highest country = 1
       *
       * Lower countries receive a
       * proportional intensity.
       */
      const intensity = visitors / maxVisitors

      visited.push({
        feature: countryFeature,
        intensity,
      })
    })

    visitedCountriesRef.current = visited

    drawGlobe(rotationRef.current)
  }, [countries, drawGlobe])

  /* ---------------------------------
   * Shadcn / Tailwind colors
   * --------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const updateColors = () => {
      const styles = getComputedStyle(canvas)

      colorsRef.current = {
        accent:
          styles.getPropertyValue('--chart-1').trim() ||
          styles.getPropertyValue('--primary').trim() ||
          '#3b82f6',

        muted:
          styles.getPropertyValue('--muted-foreground').trim() || '#64748b',

        background: styles.getPropertyValue('--background').trim() || '#000000',
      }

      drawGlobe(rotationRef.current)
    }

    updateColors()

    const observer = new MutationObserver(updateColors)

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    return () => {
      observer.disconnect()
    }
  }, [drawGlobe])

  /* ---------------------------------
   * Reduced motion
   * --------------------------------- */

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    const update = () => {
      isReducedMotionRef.current = mediaQuery.matches

      drawGlobe(rotationRef.current)
    }

    update()

    mediaQuery.addEventListener('change', update)

    return () => {
      mediaQuery.removeEventListener('change', update)
    }
  }, [drawGlobe])

  /* ---------------------------------
   * Stop rendering when globe
   * isn't visible
   * --------------------------------- */

  useEffect(() => {
    const wrapper = wrapperRef.current

    if (!wrapper) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry?.isIntersecting ?? false
      },
      {
        threshold: 0.05,
      }
    )

    observer.observe(wrapper)

    return () => {
      observer.disconnect()
    }
  }, [])

  /* ---------------------------------
   * Rotation animation
   * --------------------------------- */

  useEffect(() => {
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate)

      if (!isVisibleRef.current) {
        previousFrameRef.current = time
        return
      }

      if (isReducedMotionRef.current) {
        previousFrameRef.current = time
        return
      }

      const elapsed = time - previousFrameRef.current

      if (elapsed < FRAME_INTERVAL) {
        return
      }

      previousFrameRef.current = time - (elapsed % FRAME_INTERVAL)

      if (!dragRef.current) {
        const targetSpeed =
          countries.length === 0 ? EMPTY_ROTATION_SPEED : ROTATION_SPEED

        /*
         * Smoothly interpolate toward
         * the desired speed.
         */
        rotationSpeedRef.current +=
          (targetSpeed - rotationSpeedRef.current) * 0.04

        rotationRef.current = [
          rotationRef.current[0] - elapsed * rotationSpeedRef.current,
          rotationRef.current[1],
        ]
      }

      drawGlobe(rotationRef.current)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [countries.length, drawGlobe])

  /* ---------------------------------
   * Responsive resize
   * --------------------------------- */

  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const observer = new ResizeObserver(() => {
      drawGlobe(rotationRef.current)
    })

    observer.observe(canvas)

    return () => {
      observer.disconnect()
    }
  }, [drawGlobe])

  /* ---------------------------------
   * Drag interaction
   * --------------------------------- */

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)

    dragRef.current = {
      pointerId: event.pointerId,

      startX: event.clientX,

      startLongitude: rotationRef.current[0],
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current

    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - drag.startX

    rotationRef.current = [
      drag.startLongitude + deltaX * 0.25,

      rotationRef.current[1],
    ]

    /*
     * Draw immediately when dragging.
     */
    drawGlobe(rotationRef.current)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    dragRef.current = null
  }

  return (
    <div
      ref={wrapperRef}
      className="relative aspect-square h-full w-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Visitor distribution by country"
        className="absolute inset-0 h-full w-full cursor-grab touch-pan-y active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}
