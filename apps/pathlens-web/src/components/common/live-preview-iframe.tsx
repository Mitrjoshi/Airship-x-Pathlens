import type {
  CreatePreviewSessionResponse,
  HeatmapDevice,
  PreviewAnchorResolution,
  PreviewMeasurementState,
  PreviewRegionResolution,
} from '@workspace/contracts'
import {
  isPreviewAnchorId,
  isPreviewRegionId,
  isPreviewMeasureStateMessage,
  isPreviewBaseMeasureStateMessage,
  MAX_PREVIEW_ANCHOR_IDS,
  MAX_PREVIEW_REGION_IDS,
  PREVIEW_MEASURE_REQUEST_MESSAGE,
  PREVIEW_PROTOCOL_VERSION,
  PREVIEW_SCROLL_MESSAGE,
} from '@workspace/contracts'
import type { ReactNode, SyntheticEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getTouchScrollDelta, normalizeWheelDelta } from './live-preview-input'
import {
  createPreviewSession,
  revokePreviewSession,
} from '@/queries/preview-sessions'
import { Button } from '@workspace/ui/components/button'

export interface LivePreviewContext {
  workspaceId: string
  projectId: string
  heatmapId: string
  device: HeatmapDevice
}

type PreviewData = CreatePreviewSessionResponse['data']

export interface LivePreviewState {
  status: 'idle' | 'loading' | 'ready' | 'expired' | 'error'
  session: PreviewData | null
  error: string | null
  retry: () => void
}

function isAuthorizedPreviewUrl(value: string): boolean {
  const configuredOrigin = import.meta.env.VITE_HEATMAP_PROXY_ORIGIN?.trim()
  if (!configuredOrigin) return false

  try {
    const configured = new URL(configuredOrigin)
    const candidate = new URL(value)

    const isTrustedOrigin =
      (configured.protocol === 'https:' ||
        (configured.protocol === 'http:' &&
          configured.hostname === 'localhost')) &&
      candidate.origin === configured.origin &&
      !candidate.username &&
      !candidate.password

    const isValidSessionPath =
      candidate.pathname.startsWith('/v1/session/') ||
      candidate.pathname.startsWith('/dev/v1/session/')

    return (
      isTrustedOrigin &&
      isValidSessionPath &&
      !candidate.search &&
      !candidate.hash
    )
  } catch {
    return false
  }
}

function usesIsolatedScriptRuntime(): boolean {
  return (
    import.meta.env.VITE_HEATMAP_PROXY_JAVASCRIPT_POLICY ===
    'isolated-script-runtime'
  )
}

const MAX_MEASUREMENT_DIMENSION = 10_000_000
const MAX_SCROLL_DELTA = 2_000
const MEASUREMENT_RETRY_DELAYS = [0, 100, 300, 700] as const

function normalizeAnchorIds(
  values: readonly string[] | undefined
): string[] | null {
  if (values === undefined) return []
  if (values.length > MAX_PREVIEW_ANCHOR_IDS) return null

  const unique = new Set<string>()
  for (const value of values) {
    if (!isPreviewAnchorId(value) || unique.has(value)) return null
    unique.add(value)
  }

  return Array.from(unique)
}

function normalizeRegionIds(
  values: readonly string[] | undefined
): string[] | null {
  if (values === undefined) return []
  if (values.length > MAX_PREVIEW_REGION_IDS) return null

  const unique = new Set<string>()
  for (const value of values) {
    if (!isPreviewRegionId(value) || unique.has(value)) return null
    unique.add(value)
  }

  return Array.from(unique)
}

function debugMeasurement(stage: string, details?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.debug(`[Pathlens measurement] ${stage}`, details ?? {})
  }
}

function createPreviewNonce(): string {
  const bytes = new Uint8Array(24)
  window.crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join(
    ''
  )
}

function createRequestId(): string {
  return window.crypto.randomUUID()
}

function normalizeMeasurement(
  value: PreviewMeasurementState
): PreviewMeasurementState | null {
  const numericValues = [
    value.viewportWidth,
    value.viewportHeight,
    value.documentWidth,
    value.documentHeight,
    value.scrollX,
    value.scrollY,
    value.maxScrollX,
    value.maxScrollY,
    value.layoutVersion,
  ]
  if (
    numericValues.some(
      (item) => typeof item !== 'number' || !Number.isFinite(item)
    ) ||
    !Number.isSafeInteger(value.layoutVersion) ||
    value.layoutVersion <= 0 ||
    value.viewportWidth <= 0 ||
    value.viewportHeight <= 0 ||
    value.viewportWidth > MAX_MEASUREMENT_DIMENSION ||
    value.viewportHeight > MAX_MEASUREMENT_DIMENSION ||
    value.documentWidth < value.viewportWidth ||
    value.documentHeight < value.viewportHeight ||
    value.documentWidth > MAX_MEASUREMENT_DIMENSION ||
    value.documentHeight > MAX_MEASUREMENT_DIMENSION ||
    value.maxScrollX < 0 ||
    value.maxScrollY < 0 ||
    value.maxScrollX > MAX_MEASUREMENT_DIMENSION ||
    value.maxScrollY > MAX_MEASUREMENT_DIMENSION
  ) {
    return null
  }

  return {
    ...value,
    scrollX: Math.min(value.maxScrollX, Math.max(0, value.scrollX)),
    scrollY: Math.min(value.maxScrollY, Math.max(0, value.scrollY)),
  }
}

function sameMeasurement(
  left: PreviewMeasurementState | null,
  right: PreviewMeasurementState
): boolean {
  if (!left) return false
  return Object.keys(right).every(
    (key) =>
      left[key as keyof PreviewMeasurementState] ===
      right[key as keyof PreviewMeasurementState]
  )
}

function cleanupPreviewSession(sessionId: string) {
  void revokePreviewSession(sessionId).catch(() => {
    if (import.meta.env.DEV) {
      console.warn('Unable to revoke preview session during cleanup.')
    }
  })
}

export function useLivePreviewSession(
  context: LivePreviewContext | null
): LivePreviewState {
  const contextKey = context
    ? `${context.workspaceId}:${context.projectId}:${context.heatmapId}:${context.device}`
    : 'idle'
  const [retryAttempt, setRetryAttempt] = useState(0)
  const retry = useCallback(() => setRetryAttempt((attempt) => attempt + 1), [])
  const [state, setState] = useState<LivePreviewState>({
    status: 'idle',
    session: null,
    error: null,
    retry,
  })
  const [activeContextKey, setActiveContextKey] = useState('idle')

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let sessionId: string | null = null

    if (!context) {
      setActiveContextKey('idle')
      setState({ status: 'idle', session: null, error: null, retry })
      return () => controller.abort()
    }

    setActiveContextKey(contextKey)
    setState({ status: 'loading', session: null, error: null, retry })
    void createPreviewSession(
      {
        workspace_id: context.workspaceId,
        project_id: context.projectId,
        heatmap_id: context.heatmapId,
        device: context.device,
      },
      controller.signal
    )
      .then((response) => {
        sessionId = response.data.session_id
        if (!active) {
          cleanupPreviewSession(sessionId)
          return
        }
        if (!isAuthorizedPreviewUrl(response.data.iframe_url)) {
          cleanupPreviewSession(sessionId)
          setState({
            status: 'error',
            session: null,
            error: 'The preview origin is not trusted by this dashboard.',
            retry,
          })
          return
        }
        setState({
          status: 'ready',
          session: response.data,
          error: null,
          retry,
        })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        setState({
          status: 'error',
          session: null,
          error:
            error instanceof Error ? error.message : 'Preview unavailable.',
          retry,
        })
      })

    return () => {
      active = false
      controller.abort()
      if (sessionId) cleanupPreviewSession(sessionId)
    }
  }, [
    context?.workspaceId,
    context?.projectId,
    context?.heatmapId,
    context?.device,
    contextKey,
    retryAttempt,
    retry,
  ])

  useEffect(() => {
    if (state.status !== 'ready' || !state.session) return
    const session = state.session
    const remaining = Math.max(0, Date.parse(session.expires_at) - Date.now())
    const timer = window.setTimeout(() => {
      setState({
        status: 'expired',
        session: null,
        error: 'Preview session expired.',
        retry,
      })
      cleanupPreviewSession(session.session_id)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [retry, state.status, state.session])

  if (activeContextKey !== contextKey) {
    return {
      status: context ? 'loading' : 'idle',
      session: null,
      error: null,
      retry,
    }
  }

  return state
}

export interface LivePreviewIframeProps {
  preview: PreviewData | null
  status?: LivePreviewState['status']
  error?: string | null
  onRetry?: () => void
  onExpired?: () => void
  onMeasurementChange?: (measurement: PreviewMeasurementState | null) => void
  anchorIds?: readonly string[]
  onAnchorResolutionChange?: (
    resolutions: PreviewAnchorResolution[] | null
  ) => void
  regionIds?: readonly string[]
  onRegionResolutionChange?: (
    resolutions: PreviewRegionResolution[] | null
  ) => void
  overlay?: ReactNode
  virtualViewport?: { width: number; height: number } | null
  className?: string
}

export function LivePreviewIframe({
  preview,
  status = preview ? 'ready' : 'idle',
  error = null,
  onRetry,
  onExpired,
  onMeasurementChange,
  anchorIds,
  onAnchorResolutionChange,
  regionIds,
  onRegionResolutionChange,
  overlay,
  virtualViewport = null,
  className,
}: LivePreviewIframeProps) {
  const [loadError, setLoadError] = useState(false)
  const [measurementTimedOut, setMeasurementTimedOut] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [measurement, setMeasurement] =
    useState<PreviewMeasurementState | null>(null)
  const generationRef = useRef(0)
  const nonceRef = useRef<string | null>(null)
  const requestIdRef = useRef<string | null>(null)
  const sequenceRef = useRef(0)
  const loadedRef = useRef(false)
  const acceptedRef = useRef(false)
  const retryTimersRef = useRef<number[]>([])
  const retryGenerationRef = useRef<number | null>(null)
  const measurementRef = useRef<PreviewMeasurementState | null>(null)
  const requestedAnchorIdsRef = useRef<string[]>([])
  const requestedRegionIdsRef = useRef<string[]>([])
  const anchorIdsKey = anchorIds?.join(',') ?? ''
  const regionIdsKey = regionIds?.join(',') ?? ''
  const contextKey = preview
    ? `${preview.project_id}:${preview.domain_id}:${preview.pathname}:${preview.device}:${preview.preview_intent}:${preview.session_id}`
    : 'empty'
  const previewSessionId = preview?.session_id
  const previewIframeUrl = preview?.iframe_url
  const previewIntent = preview?.preview_intent
  const isExpired = status === 'expired'
  const isHeatmapPreview = preview?.preview_intent === 'heatmap'

  const clearMeasurementRetries = () => {
    retryTimersRef.current.forEach((timer) => window.clearTimeout(timer))
    retryTimersRef.current = []
    retryGenerationRef.current = null
  }

  const requestMeasurement = (
    attempt = 0,
    generation = generationRef.current
  ) => {
    if (generation !== generationRef.current) return
    if (!preview || !isHeatmapPreview || !usesIsolatedScriptRuntime()) return
    const nonce = nonceRef.current
    if (!nonce) return
    if (acceptedRef.current || !loadedRef.current) return
    if (attempt === 0) {
      if (retryGenerationRef.current === generation) return
      retryGenerationRef.current = generation
      setMeasurementTimedOut(false)
    }
    const requestId = requestIdRef.current ?? createRequestId()
    requestIdRef.current = requestId
    const requestedAnchorIds = normalizeAnchorIds(anchorIds)
    const requestedRegionIds = normalizeRegionIds(regionIds)
    requestedAnchorIdsRef.current = requestedAnchorIds ?? []
    requestedRegionIdsRef.current = requestedRegionIds ?? []
    iframeRef.current?.contentWindow?.postMessage(
      {
        version: PREVIEW_PROTOCOL_VERSION,
        type: PREVIEW_MEASURE_REQUEST_MESSAGE,
        sessionId: preview.session_id,
        nonce,
        requestId,
        ...(requestedAnchorIds && requestedAnchorIds.length > 0
          ? { anchorIds: requestedAnchorIds }
          : {}),
        ...(requestedRegionIds && requestedRegionIds.length > 0
          ? { regionIds: requestedRegionIds }
          : {}),
      },
      '*'
    )
    debugMeasurement('measurement-request-sent', { attempt })

    if (attempt < MEASUREMENT_RETRY_DELAYS.length - 1) {
      const timer = window.setTimeout(
        () => {
          requestMeasurement(attempt + 1, generation)
        },
        MEASUREMENT_RETRY_DELAYS[attempt + 1]
      )
      retryTimersRef.current.push(timer)
    } else {
      debugMeasurement('measurement-timeout', { generation })
      setMeasurementTimedOut(true)
    }
  }

  const sendScrollDelta = (delta: number) => {
    if (!preview || !Number.isFinite(delta) || delta === 0) return
    const nonce = nonceRef.current
    if (!nonce) return
    iframeRef.current?.contentWindow?.postMessage(
      {
        version: PREVIEW_PROTOCOL_VERSION,
        type: PREVIEW_SCROLL_MESSAGE,
        sessionId: preview.session_id,
        nonce,
        delta: Math.max(-MAX_SCROLL_DELTA, Math.min(MAX_SCROLL_DELTA, delta)),
      },
      '*'
    )
    debugMeasurement('scroll-request-sent', { delta })
  }

  const retryMeasurement = () => {
    if (!preview || !isHeatmapPreview || !usesIsolatedScriptRuntime()) return
    clearMeasurementRetries()
    acceptedRef.current = false
    requestIdRef.current = createRequestId()
    measurementRef.current = null
    setMeasurement(null)
    onMeasurementChange?.(null)
    onAnchorResolutionChange?.(null)
    setMeasurementTimedOut(false)
    requestMeasurement(0, generationRef.current)
  }

  const preventWebsiteInteraction = (event: SyntheticEvent) => {
    if (event.cancelable) event.preventDefault()
    event.stopPropagation()
  }

  const shieldRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const sendScrollDeltaRef = useRef(sendScrollDelta)
  sendScrollDeltaRef.current = sendScrollDelta
  const previewScale = virtualViewport
    ? Math.min(
        containerSize.width > 0
          ? containerSize.width / virtualViewport.width
          : 1,
        1
      )
    : 1
  const previewStageHeight = virtualViewport
    ? virtualViewport.height * previewScale
    : undefined
  const viewportKey = virtualViewport
    ? `${virtualViewport.width}x${virtualViewport.height}`
    : 'native'

  useEffect(() => {
    setLoadError(false)
    setMeasurementTimedOut(false)
    generationRef.current += 1
    debugMeasurement('preview-generation-started', {
      generation: generationRef.current,
      viewportKey,
    })
    nonceRef.current = usesIsolatedScriptRuntime() ? createPreviewNonce() : null
    requestIdRef.current = null
    requestedAnchorIdsRef.current = []
    requestedRegionIdsRef.current = []
    sequenceRef.current = 0
    loadedRef.current = false
    acceptedRef.current = false
    clearMeasurementRetries()
    measurementRef.current = null
    setMeasurement(null)
    onMeasurementChange?.(null)
    onAnchorResolutionChange?.(null)
    onRegionResolutionChange?.(null)
    return () => clearMeasurementRetries()
  }, [contextKey, preview?.iframe_url, viewportKey])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateSize = () =>
      setContainerSize({
        width: container.clientWidth,
        height: container.clientHeight,
      })
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(container)
    updateSize()
    return () => resizeObserver.disconnect()
  }, [contextKey, viewportKey])

  useEffect(() => {
    if (
      !previewSessionId ||
      !previewIframeUrl ||
      status !== 'ready' ||
      previewIntent !== 'heatmap' ||
      !usesIsolatedScriptRuntime()
    ) {
      setMeasurement(null)
      onMeasurementChange?.(null)
      return
    }

    const generation = generationRef.current
    const expectedOrigin = new URL(previewIframeUrl!).origin
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (generation !== generationRef.current) {
        debugMeasurement('measurement-response-rejected', {
          reason: 'stale-generation',
        })
        return
      }
      if (event.source !== iframeRef.current?.contentWindow) {
        debugMeasurement('measurement-response-rejected', {
          reason: 'source-mismatch',
        })
        return
      }
      if (event.origin !== expectedOrigin && event.origin !== 'null') {
        debugMeasurement('measurement-response-rejected', {
          reason: 'origin-mismatch',
        })
        return
      }
      const completeMessage = isPreviewMeasureStateMessage(event.data)
      if (!completeMessage && !isPreviewBaseMeasureStateMessage(event.data)) {
        debugMeasurement('measurement-response-rejected', {
          reason: 'invalid-base-measurement',
        })
        return
      }

      const message = event.data
      if (
        message.sessionId !== previewSessionId ||
        message.nonce !== nonceRef.current ||
        message.requestId !== requestIdRef.current ||
        message.layoutVersion <= sequenceRef.current
      ) {
        debugMeasurement('measurement-response-rejected', {
          reason:
            message.sessionId !== previewSessionId
              ? 'session-mismatch'
              : message.nonce !== nonceRef.current
                ? 'nonce-mismatch'
                : message.requestId !== requestIdRef.current
                  ? 'request-id-mismatch'
                  : 'sequence-not-increasing',
        })
        return
      }

      const nextMeasurement = normalizeMeasurement(message)
      if (!nextMeasurement) {
        debugMeasurement('measurement-response-rejected', {
          reason: 'invalid-measurement',
        })
        return
      }
      const requestedIds = requestedAnchorIdsRef.current
      const resolutions = completeMessage
        ? nextMeasurement.anchorResolutions
        : undefined
      if (!completeMessage && nextMeasurement.anchorResolutions !== undefined) {
        debugMeasurement('optional-anchor-resolutions-rejected')
      }
      const safeResolutions =
        resolutions ??
        requestedIds.map((anchorId) => ({
          anchorId,
          status: 'missing' as const,
        }))
      if (
        requestedIds.length > 0 &&
        (safeResolutions.length !== requestedIds.length ||
          safeResolutions.some(
            (resolution, index) => resolution.anchorId !== requestedIds[index]
          ))
      ) {
        debugMeasurement('measurement-response-rejected', {
          reason: 'invalid-anchor-resolutions',
        })
        return
      }
      const requestedRegionIds = requestedRegionIdsRef.current
      const regionResolutions = completeMessage
        ? nextMeasurement.regionResolutions
        : undefined
      if (!completeMessage && nextMeasurement.regionResolutions !== undefined) {
        debugMeasurement('optional-region-resolutions-rejected')
      }
      const safeRegionResolutions =
        regionResolutions ??
        requestedRegionIds.map((regionId) => ({
          regionId,
          status: 'missing' as const,
        }))
      if (
        requestedRegionIds.length > 0 &&
        (safeRegionResolutions.length !== requestedRegionIds.length ||
          safeRegionResolutions.some(
            (resolution, index) =>
              resolution.regionId !== requestedRegionIds[index]
          ))
      ) {
        debugMeasurement('measurement-response-rejected', {
          reason: 'invalid-region-resolutions',
        })
        return
      }
      sequenceRef.current = nextMeasurement.layoutVersion
      acceptedRef.current = true
      clearMeasurementRetries()
      debugMeasurement('measurement-response-accepted', {
        layoutVersion: nextMeasurement.layoutVersion,
        viewportWidth: nextMeasurement.viewportWidth,
        viewportHeight: nextMeasurement.viewportHeight,
        documentWidth: nextMeasurement.documentWidth,
        documentHeight: nextMeasurement.documentHeight,
      })
      if (sameMeasurement(measurementRef.current, nextMeasurement)) return
      measurementRef.current = nextMeasurement
      debugMeasurement('measurement-propagated')
      onMeasurementChange?.(nextMeasurement)
      if (requestedIds.length > 0) {
        onAnchorResolutionChange?.(safeResolutions)
      }
      if (requestedRegionIds.length > 0) {
        onRegionResolutionChange?.(safeRegionResolutions)
      }
      setMeasurement(nextMeasurement)
    }

    window.addEventListener('message', handleMessage)
    if (loadedRef.current) {
      if (anchorIdsKey || regionIdsKey) {
        acceptedRef.current = false
        requestIdRef.current = createRequestId()
        requestMeasurement(0, generation)
      } else if (!acceptedRef.current) {
        requestMeasurement(0, generation)
      }
    }

    return () => {
      window.removeEventListener('message', handleMessage)
      clearMeasurementRetries()
    }
  }, [
    anchorIdsKey,
    contextKey,
    previewIframeUrl,
    previewIntent,
    previewSessionId,
    onAnchorResolutionChange,
    onMeasurementChange,
    onRegionResolutionChange,
    regionIdsKey,
    status,
  ])

  useEffect(() => {
    const shield = shieldRef.current
    if (!shield || !isHeatmapPreview || status !== 'ready') return

    const handleWheel = (event: WheelEvent) => {
      if (event.cancelable) event.preventDefault()
      event.stopPropagation()

      const lineHeight = Number.parseFloat(
        window.getComputedStyle(shield).lineHeight
      )
      const pageHeight = shield.clientHeight || window.innerHeight
      sendScrollDeltaRef.current(
        normalizeWheelDelta(
          event.deltaY,
          event.deltaMode,
          lineHeight,
          pageHeight
        ) / previewScale
      )
    }

    let touchIdentifier: number | null = null
    let previousTouchY: number | null = null

    const resetTouch = () => {
      touchIdentifier = null
      previousTouchY = null
    }

    const handleTouchStart = (event: TouchEvent) => {
      event.stopPropagation()
      if (event.touches.length !== 1) {
        resetTouch()
        return
      }

      const touch = event.touches[0]
      touchIdentifier = touch.identifier
      previousTouchY = touch.clientY
    }

    const handleTouchMove = (event: TouchEvent) => {
      event.stopPropagation()
      if (event.cancelable) event.preventDefault()
      if (event.touches.length !== 1 || touchIdentifier === null) {
        resetTouch()
        return
      }

      const touch = Array.from(event.touches).find(
        (item) => item.identifier === touchIdentifier
      )
      if (!touch || previousTouchY === null) {
        resetTouch()
        return
      }

      const delta = getTouchScrollDelta(previousTouchY, touch.clientY)
      previousTouchY = touch.clientY
      sendScrollDeltaRef.current(delta / previewScale)
    }

    const handleTouchEnd = (event: TouchEvent) => {
      event.stopPropagation()
      resetTouch()
    }

    shield.addEventListener('wheel', handleWheel, { passive: false })
    shield.addEventListener('touchstart', handleTouchStart, { passive: true })
    shield.addEventListener('touchmove', handleTouchMove, { passive: false })
    shield.addEventListener('touchend', handleTouchEnd)
    shield.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      shield.removeEventListener('wheel', handleWheel)
      shield.removeEventListener('touchstart', handleTouchStart)
      shield.removeEventListener('touchmove', handleTouchMove)
      shield.removeEventListener('touchend', handleTouchEnd)
      shield.removeEventListener('touchcancel', handleTouchEnd)
      resetTouch()
    }
  }, [contextKey, isHeatmapPreview, previewScale, status])

  useEffect(() => {
    if (isExpired) onExpired?.()
  }, [isExpired, onExpired])

  if (
    (status !== 'error' && status !== 'expired' && !preview) ||
    status === 'idle' ||
    status === 'loading'
  ) {
    return (
      <div
        className="text-muted-foreground flex min-h-96 items-center justify-center text-sm"
        data-preview-status={status}
      >
        {status === 'loading'
          ? 'Loading live preview...'
          : 'Select a page to preview.'}
      </div>
    )
  }

  if (
    status === 'expired' ||
    status === 'error' ||
    loadError ||
    (preview && !isAuthorizedPreviewUrl(preview.iframe_url))
  ) {
    return (
      <div
        className="text-muted-foreground flex min-h-96 items-center justify-center p-6 text-center text-sm"
        data-preview-status={status}
      >
        <div className="flex max-w-md flex-col items-center gap-3">
          <span>{error ?? 'Live preview is unavailable.'}</span>
          {onRetry ? (
            <button
              type="button"
              className="rounded-md border px-3 py-1.5 text-sm"
              onClick={onRetry}
            >
              Try again
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  if (!preview) return null

  return (
    <div
      ref={containerRef}
      className={`relative h-full max-h-[calc(100dvh-156px)] min-h-96 w-full overflow-hidden bg-white${className ? ` ${className}` : ''}`}
      style={previewStageHeight ? { height: previewStageHeight } : undefined}
      data-preview-status="ready"
      data-preview-scale={previewScale}
      data-preview-viewport={
        virtualViewport
          ? `${virtualViewport.width}x${virtualViewport.height}`
          : undefined
      }
    >
      <div
        className="relative"
        style={
          virtualViewport
            ? {
                width: virtualViewport.width,
                height: virtualViewport.height,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }
            : { width: '100%', height: '100%' }
        }
      >
        <iframe
          key={`${contextKey}:${viewportKey}`}
          ref={iframeRef}
          src={preview.iframe_url}
          title={`Live preview of ${preview.canonical_hostname}${preview.pathname}`}
          className="block h-full min-h-160 w-full border-0"
          // Runtime mode uses an opaque origin; static mode retains the proxy origin.
          sandbox={
            usesIsolatedScriptRuntime() ? 'allow-scripts' : 'allow-same-origin'
          }
          referrerPolicy="no-referrer"
          tabIndex={isHeatmapPreview ? -1 : undefined}
          aria-hidden={isHeatmapPreview}
          loading="eager"
          onError={() => setLoadError(true)}
          onLoad={(event) => {
            if (event.currentTarget !== iframeRef.current) return
            loadedRef.current = true
            debugMeasurement('iframe-loaded')
            requestMeasurement(0, generationRef.current)
          }}
        />
        {isHeatmapPreview ? (
          <div
            ref={shieldRef}
            aria-label="Heatmap preview interaction shield"
            className="absolute inset-0 z-10 cursor-default bg-transparent"
            role="presentation"
            tabIndex={0}
            onClick={preventWebsiteInteraction}
            onDoubleClick={preventWebsiteInteraction}
            onDragStart={preventWebsiteInteraction}
            onKeyDown={preventWebsiteInteraction}
            onPointerDown={preventWebsiteInteraction}
            onPointerMove={preventWebsiteInteraction}
          >
            <span className="sr-only">
              Scroll position: {Math.round(measurement?.scrollY ?? 0)} pixels
            </span>
          </div>
        ) : null}
        {overlay}
        {measurementTimedOut ? (
          <div className="bg-background absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-sm">
            <span>Unable to measure this preview.</span>
            <Button variant="outline" onClick={retryMeasurement}>
              Retry
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
