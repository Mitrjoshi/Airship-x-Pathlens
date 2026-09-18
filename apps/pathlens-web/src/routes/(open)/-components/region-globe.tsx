import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  geoDistance,
  geoGraticule,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldTopology from 'world-atlas/countries-110m.json'

const VIEWBOX_WIDTH = 1300
const VIEWBOX_HEIGHT = 550

const GLOBE_CENTER: [number, number] = [
  VIEWBOX_WIDTH / 2,
  VIEWBOX_HEIGHT / 1.68,
]

const GLOBE_RADIUS = 290
const GLOBE_TILT = -15

const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS

const countries = feature(
  worldTopology as unknown as Topology,
  worldTopology.objects.countries as unknown as GeometryCollection
) as FeatureCollection<Geometry>

const graticule = geoGraticule().step([15, 15]).precision(4)()

type City = {
  id: string
  name: string
  country: string
  lat: number
  lng: number
  message: string
  offsetX: number
  offsetY: number
}

const cities: City[] = [
  {
    id: 'mumbai',
    name: 'Mumbai',
    country: 'India',
    lat: 19.076,
    lng: 72.8777,
    message: '2,842 live sessions',
    offsetX: -45,
    offsetY: -70,
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    message: '1,426 pageviews',
    offsetX: 55,
    offsetY: -68,
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    lat: 25.2048,
    lng: 55.2708,
    message: '684 events tracked',
    offsetX: -65,
    offsetY: -76,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    lat: 51.5072,
    lng: -0.1276,
    message: '1,892 live sessions',
    offsetX: -30,
    offsetY: -72,
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    lat: 40.7128,
    lng: -74.006,
    message: '3,241 pageviews',
    offsetX: 45,
    offsetY: -72,
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    message: '327 conversions',
    offsetX: 50,
    offsetY: -72,
  },
]

const routePairs = [
  ['mumbai', 'singapore'],
  ['mumbai', 'dubai'],
  ['mumbai', 'london'],
  ['london', 'new-york'],
  ['singapore', 'sydney'],
] as const

const createRoute = (start: City, end: City) => {
  const interpolate = geoInterpolate([start.lng, start.lat], [end.lng, end.lat])

  const coordinates: [number, number][] = []
  const segments = 30

  for (let index = 0; index <= segments; index++) {
    coordinates.push(interpolate(index / segments) as [number, number])
  }

  return {
    type: 'LineString' as const,
    coordinates,
  }
}

const routes = routePairs
  .map(([startId, endId]) => {
    const start = cities.find((city) => city.id === startId)

    const end = cities.find((city) => city.id === endId)

    if (!start || !end) return null

    return createRoute(start, end)
  })
  .filter((route): route is ReturnType<typeof createRoute> => route !== null)

const drawRoundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  context.beginPath()

  context.roundRect(x, y, width, height, radius)
}

type GlobeColors = {
  primary: string
  card: string
  cardForeground: string
  mutedForeground: string
  border: string
}

export const RegionGlobe = () => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const animationFrameRef = useRef<number | null>(null)

  const previousFrameRef = useRef(0)

  const rotationRef = useRef<[number, number]>([-80, -20])

  const isVisibleRef = useRef(true)

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startLongitude: number
  } | null>(null)

  /*
   * Light theme fallback values.
   *
   * Actual values are read from
   * your CSS variables at runtime.
   */
  const colorsRef = useRef<GlobeColors>({
    primary: '#44d59d',
    card: '#ffffff',
    cardForeground: '#101719',
    mutedForeground: '#6b6b6b',
    border: '#e2e2e2',
  })

  const routeCollection = useMemo(
    () => ({
      type: 'GeometryCollection' as const,
      geometries: routes,
    }),
    []
  )

  const drawGlobe = useCallback(
    (rotation: [number, number], time = 0) => {
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

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)

      const pixelWidth = Math.round(width * pixelRatio)

      const pixelHeight = Math.round(height * pixelRatio)

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth

        canvas.height = pixelHeight
      }

      context.setTransform(
        pixelRatio * (width / VIEWBOX_WIDTH),
        0,
        0,
        pixelRatio * (height / VIEWBOX_HEIGHT),
        0,
        0
      )

      context.clearRect(0, 0, VIEWBOX_WIDTH, VIEWBOX_HEIGHT)

      const { primary, card, cardForeground, mutedForeground, border } =
        colorsRef.current

      const projection = geoOrthographic()
        .translate(GLOBE_CENTER)
        .scale(GLOBE_RADIUS)
        .rotate([rotation[0], rotation[1], GLOBE_TILT])
        .clipAngle(90)
        .precision(1)

      const path = geoPath(projection, context)

      const visibleCenter = projection.invert?.(GLOBE_CENTER)

      if (!visibleCenter) {
        return
      }

      /*
       * Globe outer edge
       */
      context.beginPath()

      path({
        type: 'Sphere',
      })

      context.strokeStyle = primary

      context.globalAlpha = 0.32

      context.lineWidth = 0.8

      context.stroke()

      /*
       * Latitude / longitude grid
       */
      context.beginPath()

      path(graticule)

      context.strokeStyle = primary

      context.globalAlpha = 0.12

      context.lineWidth = 0.5

      context.stroke()

      /*
       * Countries
       */
      context.beginPath()

      for (const country of countries.features) {
        path(country)
      }

      /*
       * Very light primary tint.
       */
      context.fillStyle = primary

      context.globalAlpha = 0.025

      context.fill()

      /*
       * Country outlines.
       *
       * Main Pathlens primary color.
       */
      context.strokeStyle = primary

      context.globalAlpha = 0.55

      context.lineWidth = 0.65

      context.stroke()

      /*
       * Routes
       */
      context.beginPath()

      path(routeCollection)

      context.strokeStyle = primary

      context.globalAlpha = 0.38

      context.lineWidth = 1

      context.stroke()

      /*
       * Cities
       */
      cities.forEach((city, index) => {
        const coordinates: [number, number] = [city.lng, city.lat]

        const distance = geoDistance(coordinates, visibleCenter)

        /*
         * Don't render a city
         * if it is behind globe.
         */
        if (distance >= Math.PI / 2) {
          return
        }

        const point = projection(coordinates)

        if (!point) return

        const [pointX, pointY] = point

        /*
         * Fade when approaching
         * globe horizon.
         */
        const horizonDistance = Math.PI / 2 - distance

        const opacity = Math.min(1, horizonDistance / 0.2)

        if (opacity <= 0) {
          return
        }

        /*
         * Animated pulse
         */
        const pulse = 5 + ((Math.sin(time / 550 + index) + 1) / 2) * 4

        context.beginPath()

        context.arc(pointX, pointY, pulse, 0, Math.PI * 2)

        context.strokeStyle = primary

        context.globalAlpha = opacity * 0.18

        context.lineWidth = 1

        context.stroke()

        /*
         * City point
         */
        context.beginPath()

        context.arc(pointX, pointY, 3.5, 0, Math.PI * 2)

        context.fillStyle = primary

        context.globalAlpha = opacity

        context.fill()

        /*
         * City card dimensions
         */
        const cardWidth = 152

        const cardHeight = 46

        const cardX = pointX + city.offsetX - cardWidth / 2

        const cardY = pointY + city.offsetY

        /*
         * Connector line
         */
        context.beginPath()

        context.moveTo(pointX, pointY - 6)

        context.lineTo(pointX, cardY + cardHeight)

        context.strokeStyle = primary

        context.globalAlpha = opacity * 0.35

        context.lineWidth = 0.75

        context.stroke()

        /*
         * Card background
         *
         * Equivalent:
         * bg-card
         */
        drawRoundedRect(context, cardX, cardY, cardWidth, cardHeight, 8)

        context.fillStyle = card

        context.globalAlpha = opacity * 0.96

        context.fill()

        /*
         * Card border
         *
         * Equivalent:
         * border-border
         */
        context.strokeStyle = border

        context.globalAlpha = opacity

        context.lineWidth = 0.7

        context.stroke()

        /*
         * Status indicator
         *
         * Equivalent:
         * bg-primary
         */
        context.beginPath()

        context.arc(cardX + 13, cardY + 14, 3, 0, Math.PI * 2)

        context.fillStyle = primary

        context.globalAlpha = opacity

        context.fill()

        /*
         * City title
         *
         * Equivalent:
         * text-card-foreground
         */
        context.fillStyle = cardForeground

        context.globalAlpha = opacity

        context.font = '500 11px "Geist Variable", Geist, system-ui, sans-serif'

        context.textBaseline = 'middle'

        context.fillText(city.name, cardX + 22, cardY + 14)

        /*
         * Metric
         *
         * Equivalent:
         * text-muted-foreground
         */
        context.fillStyle = mutedForeground

        context.globalAlpha = opacity

        context.font = '400 9px "Geist Variable", Geist, system-ui, sans-serif'

        context.fillText(city.message, cardX + 13, cardY + 31)

        context.globalAlpha = 1
      })

      context.globalAlpha = 1
    },
    [routeCollection]
  )

  /*
   * Read your Tailwind / shadcn
   * CSS variables.
   *
   * Automatically changes when:
   *
   * <html>
   *
   * becomes:
   *
   * <html class="dark">
   */
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const updateThemeColors = () => {
      const styles = getComputedStyle(canvas)

      colorsRef.current = {
        primary: styles.getPropertyValue('--primary').trim() || '#44d59d',

        card: styles.getPropertyValue('--card').trim() || '#ffffff',

        cardForeground:
          styles.getPropertyValue('--card-foreground').trim() || '#101719',

        mutedForeground:
          styles.getPropertyValue('--muted-foreground').trim() || '#6b6b6b',

        border: styles.getPropertyValue('--border').trim() || '#e2e2e2',
      }

      drawGlobe(rotationRef.current, performance.now())
    }

    updateThemeColors()

    const observer = new MutationObserver(updateThemeColors)

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    return () => {
      observer.disconnect()
    }
  }, [drawGlobe])

  /*
   * Pause animation when globe
   * is outside viewport.
   */
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

  /*
   * Automatic horizontal rotation.
   */
  useEffect(() => {
    const animate = (time: number) => {
      animationFrameRef.current = requestAnimationFrame(animate)

      if (!isVisibleRef.current) {
        previousFrameRef.current = time

        return
      }

      const elapsed = time - previousFrameRef.current

      if (elapsed < FRAME_INTERVAL) {
        return
      }

      previousFrameRef.current = time - (elapsed % FRAME_INTERVAL)

      /*
       * Stop auto rotation
       * while dragging.
       */
      if (!dragRef.current) {
        rotationRef.current = [
          rotationRef.current[0] - elapsed * 0.005,

          rotationRef.current[1],
        ]
      }

      drawGlobe(rotationRef.current, time)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [drawGlobe])

  /*
   * Redraw when container
   * changes size.
   */
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const observer = new ResizeObserver(() => {
      drawGlobe(rotationRef.current, performance.now())
    })

    observer.observe(canvas)

    return () => {
      observer.disconnect()
    }
  }, [drawGlobe])

  /*
   * X-axis drag only.
   */
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

    const longitude = drag.startLongitude + deltaX * 0.25

    /*
     * Latitude remains unchanged.
     */
    rotationRef.current = [longitude, rotationRef.current[1]]

    drawGlobe(rotationRef.current, performance.now())
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
      className="relative aspect-[16/5] w-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 h-[125%] w-full -translate-y-[4%] touch-pan-y"
        role="img"
        aria-label="Interactive globe showing worldwide Pathlens activity"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}
