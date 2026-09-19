import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  geoDistance,
  geoEquirectangular,
  geoGraticule,
  geoInterpolate,
  geoOrthographic,
  geoPath,
} from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldTopology from 'world-atlas/countries-110m.json'

const VIEWBOX_WIDTH = 900
const VIEWBOX_HEIGHT = 450

const GLOBE_CENTER: [number, number] = [VIEWBOX_WIDTH / 2, VIEWBOX_HEIGHT / 1.4]

const GLOBE_RADIUS = 290
const GLOBE_TILT = -15
const DOT_STEP = 1.5
const BACK_DOT_OPACITY = 0.08
const CARD_ANIMATION_DURATION = 380

const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

const countries = feature(
  worldTopology as unknown as Topology,
  worldTopology.objects.land as unknown as GeometryCollection
) as FeatureCollection<Geometry>

const graticule = geoGraticule().step([15, 15]).precision(4)()

/*
 * Rasterized land mask.
 *
 * Drawing the land geometry once
 * onto an offscreen canvas and
 * reading pixels back is far
 * cheaper than running geoContains
 * (point-in-polygon) tens of
 * thousands of times.
 */
type LandMask = {
  data: Uint8ClampedArray
  width: number
  height: number
  projection: ReturnType<typeof geoEquirectangular>
}

const buildLandMask = (): LandMask | null => {
  if (typeof document === 'undefined') return null

  const maskWidth = 720

  const maskHeight = 360

  const maskCanvas = document.createElement('canvas')

  maskCanvas.width = maskWidth

  maskCanvas.height = maskHeight

  const maskContext = maskCanvas.getContext('2d', {
    willReadFrequently: true,
  })

  if (!maskContext) return null

  const maskProjection = geoEquirectangular()
    .translate([maskWidth / 2, maskHeight / 2])
    .scale(maskWidth / (2 * Math.PI))

  const maskPath = geoPath(maskProjection, maskContext)

  maskContext.beginPath()

  maskPath(countries)

  maskContext.fillStyle = '#000'

  maskContext.fill()

  const { data } = maskContext.getImageData(0, 0, maskWidth, maskHeight)

  return {
    data,
    width: maskWidth,
    height: maskHeight,
    projection: maskProjection,
  }
}

const isLand = (mask: LandMask, lng: number, lat: number) => {
  const point = mask.projection([lng, lat])

  if (!point) return false

  const x = Math.round(point[0])

  const y = Math.round(point[1])

  if (x < 0 || x >= mask.width || y < 0 || y >= mask.height) return false

  return mask.data[(y * mask.width + x) * 4 + 3] > 0
}

/*
 * Lazy, cached grid of land dots.
 *
 * Only ever computed once per
 * page session, and never on
 * the initial render path —
 * the component kicks this off
 * inside a useEffect.
 */
let landDotsCache: [number, number][] | null = null

const getLandDots = (step: number) => {
  if (landDotsCache) return landDotsCache

  const mask = buildLandMask()

  const dots: [number, number][] = []

  if (mask) {
    for (let lat = -85; lat <= 85; lat += step) {
      for (let lng = -180; lng <= 180; lng += step) {
        if (isLand(mask, lng, lat)) {
          dots.push([lng, lat])
        }
      }
    }
  }

  landDotsCache = dots

  return dots
}

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
    message: '2,842 pages visited',
    offsetX: -45,
    offsetY: -70,
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    lat: 1.3521,
    lng: 103.8198,
    message: '1,426 pages visited',
    offsetX: 55,
    offsetY: -68,
  },
  {
    id: 'dubai',
    name: 'Dubai',
    country: 'UAE',
    lat: 25.2048,
    lng: 55.2708,
    message: '684 events captured',
    offsetX: -65,
    offsetY: -76,
  },
  {
    id: 'london',
    name: 'London',
    country: 'United Kingdom',
    lat: 51.5072,
    lng: -0.1276,
    message: '1,892 pages visited',
    offsetX: -30,
    offsetY: -72,
  },
  {
    id: 'new-york',
    name: 'New York',
    country: 'United States',
    lat: 40.7128,
    lng: -74.006,
    message: '3,241 pages visited',
    offsetX: 45,
    offsetY: -72,
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    lat: -33.8688,
    lng: 151.2093,
    message: '327 events captured',
    offsetX: 50,
    offsetY: -72,
  },
  {
    id: 'sao-paulo',
    name: 'São Paulo',
    country: 'Brazil',
    lat: -23.5505,
    lng: -46.6333,
    message: '1,104 pages visited',
    offsetX: -50,
    offsetY: -68,
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    lat: 35.6762,
    lng: 139.6503,
    message: '2,567 pages visited',
    offsetX: 55,
    offsetY: -70,
  },
  {
    id: 'berlin',
    name: 'Berlin',
    country: 'Germany',
    lat: 52.52,
    lng: 13.405,
    message: '918 events captured',
    offsetX: -35,
    offsetY: -74,
  },
  {
    id: 'toronto',
    name: 'Toronto',
    country: 'Canada',
    lat: 43.6532,
    lng: -79.3832,
    message: '1,357 pages visited',
    offsetX: -55,
    offsetY: -70,
  },
  {
    id: 'cape-town',
    name: 'Cape Town',
    country: 'South Africa',
    lat: -33.9249,
    lng: 18.4241,
    message: '412 events captured',
    offsetX: -40,
    offsetY: -70,
  },
  {
    id: 'jakarta',
    name: 'Jakarta',
    country: 'Indonesia',
    lat: -6.2088,
    lng: 106.8456,
    message: '1,680 pages visited',
    offsetX: 40,
    offsetY: -68,
  },
]

const routePairs = [
  ['mumbai', 'singapore'],
  ['mumbai', 'dubai'],
  ['mumbai', 'london'],
  ['london', 'new-york'],
  ['singapore', 'sydney'],
  ['singapore', 'jakarta'],
  ['dubai', 'cape-town'],
  ['dubai', 'berlin'],
  ['london', 'berlin'],
  ['london', 'toronto'],
  ['new-york', 'toronto'],
  ['new-york', 'sao-paulo'],
  ['tokyo', 'singapore'],
  ['tokyo', 'sydney'],
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

  const landDotsRef = useRef<[number, number][]>([])

  const cardEnterRef = useRef<Map<string, number>>(new Map())

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

      const { primary, card, mutedForeground } = colorsRef.current

      const projection = geoOrthographic()
        .translate(GLOBE_CENTER)
        .scale(GLOBE_RADIUS)
        .rotate([rotation[0], rotation[1], GLOBE_TILT])
        .clipAngle(90)
        .precision(1)

      /*
       * Front-face projection only
       * clips at the horizon. For
       * the back face we need an
       * unclipped projection so
       * points behind the globe
       * still resolve to a pixel.
       */
      const backProjection = geoOrthographic()
        .translate(GLOBE_CENTER)
        .scale(GLOBE_RADIUS)
        .rotate([rotation[0], rotation[1], GLOBE_TILT])
        .clipAngle(null)
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
       * Countries (back-of-globe dots)
       *
       * Rendered first, at a low
       * fixed opacity, using the
       * unclipped projection so
       * they still land at the
       * correct on-screen position
       * even though they're behind
       * the sphere.
       */
      context.fillStyle = primary

      for (const [lng, lat] of landDotsRef.current) {
        const distance = geoDistance([lng, lat], visibleCenter)

        if (distance < Math.PI / 2) {
          continue
        }

        const point = backProjection([lng, lat])

        if (!point) continue

        const [x, y] = point

        context.globalAlpha = BACK_DOT_OPACITY

        context.beginPath()

        context.arc(x, y, 1.5, 0, Math.PI * 2)

        context.fill()
      }

      context.globalAlpha = 1

      /*
       * Countries (front-of-globe dots)
       */
      context.fillStyle = primary

      for (const [lng, lat] of landDotsRef.current) {
        const distance = geoDistance([lng, lat], visibleCenter)

        if (distance >= Math.PI / 2) {
          continue
        }

        const point = projection([lng, lat])

        if (!point) continue

        const [x, y] = point

        /*
         * Fade dots near the horizon,
         * same as cities/routes.
         */
        const horizonDistance = Math.PI / 2 - distance

        const opacity = Math.min(1, horizonDistance / 0.15)

        if (opacity <= 0) continue

        context.globalAlpha = opacity * 0.5

        context.beginPath()

        context.arc(x, y, 1.5, 0, Math.PI * 2)

        context.fill()
      }

      context.globalAlpha = 1

      /*
       * Routes (elevated arcs)
       *
       * Each route is drawn as its own
       * path, lifted away from the globe
       * center — peaking at the midpoint,
       * touching down at both cities.
       */
      context.strokeStyle = primary

      context.globalAlpha = 0.38

      context.lineWidth = 1

      routes.forEach((route) => {
        const points = route.coordinates

        const segments = points.length - 1

        const routeDistance = geoDistance(points[0], points[segments])

        /*
         * Longer routes arc higher.
         */
        const maxLift = 14 + routeDistance * 36

        let isDrawing = false

        context.beginPath()

        points.forEach((coordinate, index) => {
          const distance = geoDistance(coordinate, visibleCenter)

          /*
           * Hide the segment while
           * it's behind the globe.
           */
          if (distance >= Math.PI / 2) {
            isDrawing = false

            return
          }

          const projected = projection(coordinate)

          if (!projected) {
            isDrawing = false

            return
          }

          const [x, y] = projected

          const dx = x - GLOBE_CENTER[0]

          const dy = y - GLOBE_CENTER[1]

          const length = Math.hypot(dx, dy) || 1

          const t = index / segments

          const lift = maxLift * Math.sin(t * Math.PI)

          const liftedX = x + (dx / length) * lift

          const liftedY = y + (dy / length) * lift

          if (!isDrawing) {
            context.moveTo(liftedX, liftedY)

            isDrawing = true
          } else {
            context.lineTo(liftedX, liftedY)
          }
        })

        context.stroke()
      })

      context.globalAlpha = 1

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
          cardEnterRef.current.delete(city.id)

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
          cardEnterRef.current.delete(city.id)

          return
        }

        /*
         * Card enter animation.
         *
         * First frame a city is
         * visible, record the time;
         * ease its card in over
         * CARD_ANIMATION_DURATION.
         */
        if (!cardEnterRef.current.has(city.id)) {
          cardEnterRef.current.set(city.id, time)
        }

        const enterTime = cardEnterRef.current.get(city.id) ?? time

        const animT = Math.min(1, (time - enterTime) / CARD_ANIMATION_DURATION)

        const cardEase = easeOutCubic(animT)

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
         * Card grows in from the
         * city dot and fades in
         * alongside the horizon fade.
         */
        context.save()

        context.translate(pointX, pointY)

        context.scale(0.85 + cardEase * 0.15, 0.85 + cardEase * 0.15)

        context.translate(-pointX, -pointY)

        const cardOpacity = opacity * cardEase

        /*
         * Card background
         *
         * Equivalent:
         * bg-card
         */
        context.beginPath()

        context.rect(cardX, cardY, cardWidth, cardHeight)

        context.fillStyle = card

        context.globalAlpha = cardOpacity * 0.96

        context.fill()

        /*
         * Card border (dashed, primary)
         *
         * Equivalent:
         * border-primary border-dashed
         */
        context.setLineDash([4, 3])

        context.strokeStyle = primary

        context.globalAlpha = cardOpacity

        context.lineWidth = 0.7

        context.stroke()

        context.setLineDash([])

        /*
         * Solid corner accents (all four)
         *
         * Equivalent:
         * before:border-primary before:border-solid
         */
        const cornerSize = 10

        context.strokeStyle = primary

        context.globalAlpha = cardOpacity

        context.lineWidth = 1.5

        // Top-left
        context.beginPath()
        context.moveTo(cardX, cardY + cornerSize)
        context.lineTo(cardX, cardY)
        context.lineTo(cardX + cornerSize, cardY)
        context.stroke()

        // Top-right
        context.beginPath()
        context.moveTo(cardX + cardWidth - cornerSize, cardY)
        context.lineTo(cardX + cardWidth, cardY)
        context.lineTo(cardX + cardWidth, cardY + cornerSize)
        context.stroke()

        // Bottom-right
        context.beginPath()
        context.moveTo(cardX + cardWidth, cardY + cardHeight - cornerSize)
        context.lineTo(cardX + cardWidth, cardY + cardHeight)
        context.lineTo(cardX + cardWidth - cornerSize, cardY + cardHeight)
        context.stroke()

        // Bottom-left
        context.beginPath()
        context.moveTo(cardX + cornerSize, cardY + cardHeight)
        context.lineTo(cardX, cardY + cardHeight)
        context.lineTo(cardX, cardY + cardHeight - cornerSize)
        context.stroke()

        /*
         * Status indicator
         *
         * Equivalent:
         * bg-primary
         */
        // context.beginPath()

        // context.arc(cardX + 13, cardY + 14, 3, 0, Math.PI * 2)

        // context.fillStyle = primary

        // context.globalAlpha = cardOpacity

        // context.fill()

        /*
         * City title
         *
         * Equivalent:
         * text-card-foreground
         */
        context.fillStyle = primary

        context.globalAlpha = cardOpacity

        context.font = '500 11px "Geist Variable", Geist, system-ui, sans-serif'

        context.textBaseline = 'middle'

        context.fillText(city.name, cardX + 14, cardY + 14)

        /*
         * Metric
         *
         * Equivalent:
         * text-muted-foreground
         */
        context.fillStyle = mutedForeground

        context.globalAlpha = cardOpacity

        context.font = '400 9px "Geist Variable", Geist, system-ui, sans-serif'

        context.fillText(city.message, cardX + 13, cardY + 31)

        context.restore()

        context.globalAlpha = 1
      })

      context.globalAlpha = 1
    },
    [routeCollection]
  )

  /*
   * Compute the land dot grid
   * off the initial render path.
   *
   * Rasterized + cached, so this
   * only runs once per session
   * even across remounts, and
   * never blocks first paint.
   */
  useEffect(() => {
    landDotsRef.current = getLandDots(DOT_STEP)

    drawGlobe(rotationRef.current, performance.now())
  }, [drawGlobe])

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

        card:
          styles.getPropertyValue('--primary-foreground').trim() || '#ffffff',

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
     *
     * Don't redraw here directly —
     * the animate loop (already
     * running via requestAnimationFrame)
     * picks up the new rotation on its
     * next throttled frame. Calling
     * drawGlobe on every raw pointermove
     * event double-renders and causes
     * jank at high dot densities.
     */
    rotationRef.current = [longitude, rotationRef.current[1]]
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
      className="relative z-5 aspect-[16/7.6] w-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full -translate-y-[4%] touch-pan-y"
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
