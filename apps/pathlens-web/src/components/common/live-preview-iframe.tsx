import type {
  CreatePreviewSessionResponse,
  PreviewIntent,
  PreviewDevice,
} from '@workspace/contracts'
import {
  PREVIEW_PROTOCOL_VERSION,
  PREVIEW_SCROLL_MESSAGE,
} from '@workspace/contracts'
import type { SyntheticEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  createPreviewSession,
  revokePreviewSession,
} from '@/queries/preview-sessions'

export interface LivePreviewContext {
  workspaceId: string
  projectId: string
  domainId: string
  pagePath: string
  device: PreviewDevice
  previewIntent?: PreviewIntent
}

type PreviewData = CreatePreviewSessionResponse['data']

export interface LivePreviewState {
  status: 'idle' | 'loading' | 'ready' | 'expired' | 'error'
  session: PreviewData | null
  error: string | null
}

function isAuthorizedPreviewUrl(value: string): boolean {
  const configuredOrigin = import.meta.env.VITE_HEATMAP_PROXY_ORIGIN?.trim()
  if (!configuredOrigin) return false
  try {
    const configured = new URL(configuredOrigin)
    const candidate = new URL(value)
    return (
      candidate.origin === configured.origin &&
      candidate.pathname.startsWith('/v1/session/') &&
      !candidate.username &&
      !candidate.password
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

export function useLivePreviewSession(
  context: LivePreviewContext | null
): LivePreviewState {
  const [state, setState] = useState<LivePreviewState>({
    status: 'idle',
    session: null,
    error: null,
  })

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    let sessionId: string | null = null

    if (!context) {
      setState({ status: 'idle', session: null, error: null })
      return () => controller.abort()
    }

    setState({ status: 'loading', session: null, error: null })
    void createPreviewSession(
      {
        workspace_id: context.workspaceId,
        project_id: context.projectId,
        domain_id: context.domainId,
        page_path: context.pagePath,
        device: context.device,
        preview_intent: context.previewIntent ?? 'compatibility',
      },
      controller.signal
    )
      .then((response) => {
        sessionId = response.data.session_id
        if (!active) {
          void revokePreviewSession(sessionId)
          return
        }
        if (!isAuthorizedPreviewUrl(response.data.iframe_url)) {
          void revokePreviewSession(sessionId)
          setState({
            status: 'error',
            session: null,
            error: 'The preview origin is not trusted by this dashboard.',
          })
          return
        }
        setState({ status: 'ready', session: response.data, error: null })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) return
        setState({
          status: 'error',
          session: null,
          error:
            error instanceof Error ? error.message : 'Preview unavailable.',
        })
      })

    return () => {
      active = false
      controller.abort()
      if (sessionId) void revokePreviewSession(sessionId)
    }
  }, [
    context?.workspaceId,
    context?.projectId,
    context?.domainId,
    context?.pagePath,
    context?.device,
    context?.previewIntent,
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
      })
      void revokePreviewSession(session.session_id)
    }, remaining)
    return () => window.clearTimeout(timer)
  }, [state.status, state.session])

  return state
}

export interface LivePreviewIframeProps {
  preview: PreviewData | null
  status?: LivePreviewState['status']
  error?: string | null
  onExpired?: () => void
  className?: string
}

export function LivePreviewIframe({
  preview,
  status = preview ? 'ready' : 'idle',
  error = null,
  onExpired,
  className,
}: LivePreviewIframeProps) {
  const [loadError, setLoadError] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const touchStartY = useRef<number | null>(null)
  const [controlledScroll, setControlledScroll] = useState(0)
  const contextKey = preview
    ? `${preview.project_id}:${preview.domain_id}:${preview.pathname}:${preview.device}:${preview.preview_intent}:${preview.session_id}`
    : 'empty'
  const isExpired = status === 'expired'
  const isHeatmapPreview = preview?.preview_intent === 'heatmap'

  const sendScrollDelta = (delta: number) => {
    if (!Number.isFinite(delta) || delta === 0) return
    iframeRef.current?.contentWindow?.postMessage(
      {
        version: PREVIEW_PROTOCOL_VERSION,
        type: PREVIEW_SCROLL_MESSAGE,
        delta,
      },
      '*'
    )
    setControlledScroll((value) => Math.max(0, value + delta))
  }

  const preventWebsiteInteraction = (event: SyntheticEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }

  useEffect(() => {
    setLoadError(false)
  }, [contextKey])

  useEffect(() => {
    if (isExpired) onExpired?.()
  }, [isExpired, onExpired])

  if (!preview || status === 'idle' || status === 'loading') {
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
    !isAuthorizedPreviewUrl(preview.iframe_url)
  ) {
    return (
      <div
        className="text-muted-foreground flex min-h-96 items-center justify-center p-6 text-center text-sm"
        data-preview-status={status}
      >
        {error ?? 'Live preview is unavailable.'}
      </div>
    )
  }

  return (
    <div
      className={`relative h-full min-h-96 w-full overflow-hidden bg-white${className ? ` ${className}` : ''}`}
      data-preview-status="ready"
    >
      <iframe
        key={contextKey}
        ref={iframeRef}
        src={preview.iframe_url}
        title={`Live preview of ${preview.canonical_hostname}${preview.pathname}`}
        className="block h-full min-h-160 w-full border-0"
        // Runtime mode uses an opaque origin; static mode retains the proxy origin.
        sandbox={
          usesIsolatedScriptRuntime() ? 'allow-scripts' : 'allow-same-origin'
        }
        referrerPolicy="no-referrer"
        allow="none"
        tabIndex={isHeatmapPreview ? -1 : undefined}
        aria-hidden={isHeatmapPreview}
        loading="eager"
        onError={() => setLoadError(true)}
      />
      {isHeatmapPreview ? (
        <div
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
          onTouchStart={(event) => {
            preventWebsiteInteraction(event)
            touchStartY.current = event.touches[0]?.clientY ?? null
          }}
          onTouchMove={(event) => {
            preventWebsiteInteraction(event)
            const currentY = event.touches[0]?.clientY
            if (touchStartY.current === null || currentY === undefined) return
            const delta = touchStartY.current - currentY
            touchStartY.current = currentY
            sendScrollDelta(delta)
          }}
          onTouchEnd={(event) => {
            preventWebsiteInteraction(event)
            touchStartY.current = null
          }}
          onWheel={(event) => {
            preventWebsiteInteraction(event)
            sendScrollDelta(event.deltaY)
          }}
        >
          <span className="sr-only">
            Scroll position: {Math.round(controlledScroll)} pixels
          </span>
        </div>
      ) : null}
    </div>
  )
}
