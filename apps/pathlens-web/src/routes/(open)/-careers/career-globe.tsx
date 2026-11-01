import { useCallback, useEffect, useRef } from 'react'
import {
  geoDistance,
  geoEquirectangular,
  geoGraticule,
  geoOrthographic,
  geoPath,
} from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import worldTopology from 'world-atlas/countries-110m.json'

const VIEWBOX_WIDTH = 1000
const VIEWBOX_HEIGHT = 500

const GLOBE_CENTER: [number, number] = [VIEWBOX_WIDTH / 2, VIEWBOX_HEIGHT / 1.5]

const GLOBE_RADIUS = 300
const GLOBE_TILT = -15
const DOT_STEP = 1.5
const BACK_DOT_OPACITY = 0.08

const TARGET_FPS = 60
const FRAME_INTERVAL = 1000 / TARGET_FPS

const BADGE_RADIUS = 20

/*
 * Callout box styling (viewBox units)
 */
const CALLOUT_FONT_SIZE = 12
const CALLOUT_LINE_HEIGHT = 16
const CALLOUT_PADDING_X = 12
const CALLOUT_PADDING_Y = 10
const CALLOUT_BRACKET = 9
const CALLOUT_FONT_FAMILY =
  '"Clarity City", ui-sans-serif, system-ui, -apple-system, sans-serif'

/*
 * Callout behaviour
 */
const MAX_VISIBLE_CALLOUTS = 2
const CALLOUT_LIFETIME_MS = 5500
const CALLOUT_FADE_MS = 500
const CALLOUT_MOVE_EASING = 0.18

/* Boxes may only live in the top half of the globe. */
const TOP_LIMIT = GLOBE_CENTER[1]

/*
 * The canvas is shifted up by 4% of its
 * height, so the first few viewBox units
 * are clipped. Keep boxes clear of that.
 */
const EDGE_TOP = 28
const EDGE_X = 12

/* Gap between a badge centre and the nearest box edge. */
const CALLOUT_GAP = BADGE_RADIUS + 16

/* Extra clearance around badges and between boxes. */
const BADGE_CLEARANCE = 8
const BOX_CLEARANCE = 8

/* Horizon / position rules for starting and keeping a callout. */
const START_HORIZON_MIN = 0.3
const KEEP_HORIZON_MIN = 0.12
const START_TOP_MARGIN = 40
const KEEP_TOP_MARGIN = 10

const countries = feature(
  worldTopology as unknown as Topology,
  worldTopology.objects.countries as unknown as GeometryCollection
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
 * the initial render path.
 * The component kicks this off
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
  lat: number
  lng: number
}

const cities: City[] = [
  { id: 'mumbai', lat: 19.076, lng: 72.8777 },
  { id: 'singapore', lat: 1.3521, lng: 103.8198 },
  { id: 'dubai', lat: 25.2048, lng: 55.2708 },
  { id: 'london', lat: 51.5072, lng: -0.1276 },
  { id: 'new-york', lat: 40.7128, lng: -74.006 },
  { id: 'sydney', lat: -33.8688, lng: 151.2093 },
  { id: 'sao-paulo', lat: -23.5505, lng: -46.6333 },
  { id: 'tokyo', lat: 35.6762, lng: 139.6503 },
  { id: 'berlin', lat: 52.52, lng: 13.405 },
  { id: 'toronto', lat: 43.6532, lng: -79.3832 },
  { id: 'cape-town', lat: -33.9249, lng: 18.4241 },
  { id: 'jakarta', lat: -6.2088, lng: 106.8456 },
]

/*
 * Careers callouts.
 *
 * Each one is anchored to a city. The
 * box position is chosen automatically
 * around the badge, so you only need an
 * id, a city, a width and the copy.
 *
 * Only northern cities are listed since
 * boxes are limited to the top half.
 *
 * The copy below is placeholder text,
 * swap it for your real hiring messages.
 */
type Callout = {
  id: string
  cityId: string
  text: string
  width: number
}

const callouts: Callout[] = [
  {
    id: 'mumbai',
    cityId: 'mumbai',
    text: 'Our home base. Join the team building privacy-first analytics.',
    width: 190,
  },
  {
    id: 'london',
    cityId: 'london',
    text: 'Remote friendly engineering and design roles across Europe.',
    width: 185,
  },
  {
    id: 'dubai',
    cityId: 'dubai',
    text: 'Growing our team across the Middle East and Africa.',
    width: 180,
  },
  {
    id: 'new-york',
    cityId: 'new-york',
    text: 'Go to market and partnership roles across North America.',
    width: 185,
  },
  {
    id: 'berlin',
    cityId: 'berlin',
    text: 'Help us build session replay and heatmaps people love.',
    width: 180,
  },
  {
    id: 'tokyo',
    cityId: 'tokyo',
    text: 'Support customers across Asia Pacific in your own time zone.',
    width: 185,
  },
  {
    id: 'toronto',
    cityId: 'toronto',
    text: 'Backend and infrastructure engineers, working async.',
    width: 175,
  },
  {
    id: 'singapore',
    cityId: 'singapore',
    text: 'Build with us from Southeast Asia, fully remote.',
    width: 175,
  },
]

const calloutById = new Map(callouts.map((callout) => [callout.id, callout]))

type GlobeColors = {
  primary: string
  card: string
}

type Badge = {
  id: string
  x: number
  y: number
  opacity: number
  horizon: number
}

type Rect = {
  x: number
  y: number
  w: number
  h: number
}

type CalloutSize = {
  width: number
  height: number
  lines: string[]
}

type ActiveCallout = {
  id: string
  start: number
  end: number | null
}

type CalloutPlacement = {
  /* Index into DIRECTIONS, kept so the box does not flip around. */
  index: number
  /* Current drawn offset of the box top-left from the badge. */
  x: number
  y: number
}

/*
 * The 8 spots tried around a badge.
 * First entries are preferred.
 */
const DIRECTIONS: [number, number][] = [
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [0, 1],
]

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const rectHitsCircle = (rect: Rect, cx: number, cy: number, radius: number) => {
  const nearestX = clamp(cx, rect.x, rect.x + rect.w)

  const nearestY = clamp(cy, rect.y, rect.y + rect.h)

  const dx = nearestX - cx

  const dy = nearestY - cy

  return dx * dx + dy * dy < radius * radius
}

const rectsOverlap = (a: Rect, b: Rect, margin: number) =>
  a.x < b.x + b.w + margin &&
  a.x + a.w + margin > b.x &&
  a.y < b.y + b.h + margin &&
  a.y + a.h + margin > b.y

/*
 * Simple word wrap for canvas text.
 */
const wrapText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) => {
  const words = text.split(' ')

  const lines: string[] = []

  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word

    if (current && context.measureText(next).width > maxWidth) {
      lines.push(current)

      current = word
    } else {
      current = next
    }
  }

  if (current) lines.push(current)

  return lines
}

const getCalloutSize = (
  context: CanvasRenderingContext2D,
  callout: Callout
): CalloutSize => {
  const lines = wrapText(
    context,
    callout.text,
    callout.width - CALLOUT_PADDING_X * 2
  )

  return {
    width: callout.width,
    height: lines.length * CALLOUT_LINE_HEIGHT + CALLOUT_PADDING_Y * 2,
    lines,
  }
}

/*
 * Finds a spot for a box next to a badge
 * that:
 *
 * - stays inside the top half of the globe
 * - does not touch ANY profile badge
 * - does not touch another callout box
 *
 * The previously used spot is tried first
 * so boxes do not flip sides needlessly.
 */
const findPlacement = (
  size: CalloutSize,
  anchor: Badge,
  badges: Badge[],
  placed: Rect[],
  preferred: number | undefined
): { index: number; rect: Rect } | null => {
  const order = DIRECTIONS.map((_, index) => index)

  if (preferred !== undefined) {
    order.splice(order.indexOf(preferred), 1)

    order.unshift(preferred)
  }

  for (const index of order) {
    const [ux, uy] = DIRECTIONS[index]

    const x =
      ux > 0
        ? anchor.x + CALLOUT_GAP
        : ux < 0
          ? anchor.x - CALLOUT_GAP - size.width
          : anchor.x - size.width / 2

    const y =
      uy > 0
        ? anchor.y + CALLOUT_GAP
        : uy < 0
          ? anchor.y - CALLOUT_GAP - size.height
          : anchor.y - size.height / 2

    const rect: Rect = { x, y, w: size.width, h: size.height }

    if (
      rect.x < EDGE_X ||
      rect.x + rect.w > VIEWBOX_WIDTH - EDGE_X ||
      rect.y < EDGE_TOP ||
      rect.y + rect.h > TOP_LIMIT
    ) {
      continue
    }

    if (
      badges.some((badge) =>
        rectHitsCircle(rect, badge.x, badge.y, BADGE_RADIUS + BADGE_CLEARANCE)
      )
    ) {
      continue
    }

    if (placed.some((other) => rectsOverlap(rect, other, BOX_CLEARANCE))) {
      continue
    }

    return { index, rect }
  }

  return null
}

export const CareerGlobe = () => {
  const wrapperRef = useRef<HTMLDivElement>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

  const animationFrameRef = useRef<number | null>(null)

  const previousFrameRef = useRef(0)

  const rotationRef = useRef<[number, number]>([-80, -20])

  const isVisibleRef = useRef(true)

  const landDotsRef = useRef<[number, number][]>([])

  const dragRef = useRef<{
    pointerId: number
    startX: number
    startLongitude: number
  } | null>(null)

  /*
   * Callout scheduling state.
   */
  const activeCalloutsRef = useRef<ActiveCallout[]>([])

  const calloutCursorRef = useRef(0)

  const placementsRef = useRef<Map<string, CalloutPlacement>>(new Map())

  /*
   * Fallback values.
   *
   * Actual values are read from
   * your CSS variables at runtime.
   */
  const colorsRef = useRef<GlobeColors>({
    primary: '#44d59d',
    card: '#101719',
  })

  const drawGlobe = useCallback((rotation: [number, number], time: number) => {
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

    const { primary, card } = colorsRef.current

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
     * Project every visible profile badge
     * once. The callout layout below needs
     * all of them as obstacles.
     */
    const badges: Badge[] = []

    for (const city of cities) {
      const coordinates: [number, number] = [city.lng, city.lat]

      const distance = geoDistance(coordinates, visibleCenter)

      // Only the visible side of the globe.
      if (distance >= Math.PI / 2) continue

      const point = projection(coordinates)

      if (!point) continue

      const horizon = Math.PI / 2 - distance

      const opacity = Math.min(1, horizon / 0.2)

      if (opacity <= 0) continue

      badges.push({
        id: city.id,
        x: point[0],
        y: point[1],
        opacity,
        horizon,
      })
    }

    const badgeById = new Map(badges.map((badge) => [badge.id, badge]))

    /*
     * Callout scheduling and layout.
     *
     * - At most MAX_VISIBLE_CALLOUTS at once
     * - Only cities in the top half
     * - Boxes never touch a badge or each other
     */
    context.font = `${CALLOUT_FONT_SIZE}px ${CALLOUT_FONT_FAMILY}`

    context.textBaseline = 'top'

    context.textAlign = 'left'

    const placedRects: Rect[] = []

    const nextActive: ActiveCallout[] = []

    // Drop callouts that have fully faded out.
    for (const entry of activeCalloutsRef.current) {
      if (entry.end !== null && time - entry.end >= CALLOUT_FADE_MS) {
        placementsRef.current.delete(entry.id)

        continue
      }

      nextActive.push(entry)
    }

    // Update the ones still on screen.
    for (const entry of nextActive) {
      const callout = calloutById.get(entry.id)

      if (!callout) continue

      const badge = badgeById.get(callout.cityId)

      if (!badge) {
        if (entry.end === null) entry.end = time

        continue
      }

      const leaving =
        badge.horizon < KEEP_HORIZON_MIN ||
        badge.y > TOP_LIMIT - KEEP_TOP_MARGIN ||
        time - entry.start > CALLOUT_LIFETIME_MS

      if (entry.end === null && leaving) {
        entry.end = time
      }

      const size = getCalloutSize(context, callout)

      const stored = placementsRef.current.get(entry.id)

      const placement = findPlacement(
        size,
        badge,
        badgeById.size ? badges : [],
        placedRects,
        stored?.index
      )

      if (!placement) {
        if (entry.end === null) entry.end = time

        continue
      }

      placedRects.push(placement.rect)

      const targetX = placement.rect.x - badge.x

      const targetY = placement.rect.y - badge.y

      if (!stored) {
        placementsRef.current.set(entry.id, {
          index: placement.index,
          x: targetX,
          y: targetY,
        })
      } else {
        stored.index = placement.index

        stored.x += (targetX - stored.x) * CALLOUT_MOVE_EASING

        stored.y += (targetY - stored.y) * CALLOUT_MOVE_EASING
      }
    }

    // Fill free slots with the next eligible callouts.
    let attempts = 0

    while (
      nextActive.length < MAX_VISIBLE_CALLOUTS &&
      attempts < callouts.length
    ) {
      const callout = callouts[calloutCursorRef.current % callouts.length]

      calloutCursorRef.current =
        (calloutCursorRef.current + 1) % callouts.length

      attempts += 1

      if (nextActive.some((entry) => entry.id === callout.id)) continue

      const badge = badgeById.get(callout.cityId)

      if (
        !badge ||
        badge.horizon < START_HORIZON_MIN ||
        badge.y > TOP_LIMIT - START_TOP_MARGIN
      ) {
        continue
      }

      const size = getCalloutSize(context, callout)

      const placement = findPlacement(
        size,
        badge,
        badges,
        placedRects,
        undefined
      )

      if (!placement) continue

      placedRects.push(placement.rect)

      placementsRef.current.set(callout.id, {
        index: placement.index,
        x: placement.rect.x - badge.x,
        y: placement.rect.y - badge.y,
      })

      nextActive.push({ id: callout.id, start: time, end: null })
    }

    activeCalloutsRef.current = nextActive

    /*
     * Draw callouts.
     *
     * Drawn before the badges so badges
     * always sit on top of leader lines.
     */
    for (const entry of activeCalloutsRef.current) {
      const callout = calloutById.get(entry.id)

      if (!callout) continue

      const badge = badgeById.get(callout.cityId)

      const placement = placementsRef.current.get(entry.id)

      if (!badge || !placement) continue

      const fadeIn = clamp((time - entry.start) / CALLOUT_FADE_MS, 0, 1)

      const fadeOut =
        entry.end === null
          ? 1
          : 1 - clamp((time - entry.end) / CALLOUT_FADE_MS, 0, 1)

      const alpha = fadeIn * fadeOut * badge.opacity

      if (alpha <= 0) continue

      const size = getCalloutSize(context, callout)

      const boxWidth = size.width

      const boxHeight = size.height

      const boxX = badge.x + placement.x

      const boxY = badge.y + placement.y

      context.save()

      /* Leader line from badge to the nearest point on the box */
      const targetX = clamp(badge.x, boxX, boxX + boxWidth)

      const targetY = clamp(badge.y, boxY, boxY + boxHeight)

      context.beginPath()

      context.moveTo(badge.x, badge.y)

      context.lineTo(targetX, targetY)

      context.strokeStyle = primary

      context.globalAlpha = alpha * 0.5

      context.lineWidth = 0.8

      context.setLineDash([3, 3])

      context.stroke()

      /* Box background */
      context.fillStyle = card

      context.globalAlpha = alpha * 0.75

      context.fillRect(boxX, boxY, boxWidth, boxHeight)

      context.globalAlpha = alpha

      /* Dashed border */
      context.strokeStyle = primary

      context.lineWidth = 1

      context.setLineDash([4, 3])

      context.strokeRect(boxX, boxY, boxWidth, boxHeight)

      context.setLineDash([])

      /* Solid corner brackets */
      const b = CALLOUT_BRACKET

      context.lineWidth = 2

      context.lineCap = 'butt'

      context.lineJoin = 'miter'

      context.beginPath()

      // Top left
      context.moveTo(boxX, boxY + b)
      context.lineTo(boxX, boxY)
      context.lineTo(boxX + b, boxY)

      // Top right
      context.moveTo(boxX + boxWidth - b, boxY)
      context.lineTo(boxX + boxWidth, boxY)
      context.lineTo(boxX + boxWidth, boxY + b)

      // Bottom right
      context.moveTo(boxX + boxWidth, boxY + boxHeight - b)
      context.lineTo(boxX + boxWidth, boxY + boxHeight)
      context.lineTo(boxX + boxWidth - b, boxY + boxHeight)

      // Bottom left
      context.moveTo(boxX + b, boxY + boxHeight)
      context.lineTo(boxX, boxY + boxHeight)
      context.lineTo(boxX, boxY + boxHeight - b)

      context.stroke()

      /* Text */
      context.fillStyle = primary

      size.lines.forEach((line, index) => {
        context.fillText(
          line,
          boxX + CALLOUT_PADDING_X,
          boxY + CALLOUT_PADDING_Y + index * CALLOUT_LINE_HEIGHT
        )
      })

      context.restore()
    }

    context.globalAlpha = 1

    /*
     * Profile markers
     */
    for (const badge of badges) {
      const { x, y, opacity } = badge

      context.save()

      context.globalAlpha = opacity

      // Badge background and outer ring.
      context.beginPath()
      context.arc(x, y, BADGE_RADIUS, 0, Math.PI * 2)
      context.fillStyle = card
      context.fill()

      context.strokeStyle = primary
      context.lineWidth = 1.25
      context.stroke()

      // Head.
      context.beginPath()
      context.arc(x, y - 5.5, 4.5, 0, Math.PI * 2)
      context.strokeStyle = primary
      context.lineWidth = 1.35
      context.stroke()

      // Shoulders / torso.
      context.beginPath()
      context.moveTo(x - 9, y + 9)
      context.quadraticCurveTo(x - 9, y + 3.5, x - 3.5, y + 3.5)
      context.lineTo(x + 3.5, y + 3.5)
      context.quadraticCurveTo(x + 9, y + 3.5, x + 9, y + 9)
      context.quadraticCurveTo(x, y + 11, x - 9, y + 9)
      context.strokeStyle = primary
      context.lineWidth = 1.35
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.stroke()

      context.restore()
    }

    context.globalAlpha = 1
  }, [])

  /*
   * Compute the land dot grid
   * off the initial render path.
   */
  useEffect(() => {
    landDotsRef.current = getLandDots(DOT_STEP)

    drawGlobe(rotationRef.current, performance.now())
  }, [drawGlobe])

  /*
   * Read your Tailwind / shadcn
   * CSS variables. Updates when
   * <html> toggles the dark class.
   */
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) return

    const updateThemeColors = () => {
      const styles = getComputedStyle(canvas)

      colorsRef.current = {
        primary: styles.getPropertyValue('--primary').trim() || '#44d59d',
        card:
          styles.getPropertyValue('--primary-foreground-2').trim() || '#101719',
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
   * Redraw once the custom font
   * has loaded so callout text
   * wraps with the right metrics.
   */
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return

    let cancelled = false

    document.fonts.ready.then(() => {
      if (!cancelled) drawGlobe(rotationRef.current, performance.now())
    })

    return () => {
      cancelled = true
    }
  }, [drawGlobe])

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
     * The animate loop picks up the
     * new rotation on its next frame.
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
      className="relative z-5 aspect-16/6.5 w-full overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full translate-y-[-4%] touch-pan-y"
        role="img"
        aria-label="Interactive globe showing where Pathlens is hiring"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  )
}
