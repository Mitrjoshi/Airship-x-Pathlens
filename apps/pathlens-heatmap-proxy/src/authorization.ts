import {
  previewSessionClaimsSchema,
  type PreviewSessionClaims,
} from '@workspace/contracts'
import { createHmac } from 'node:crypto'
import { createHash } from 'node:crypto'
import type { ProxyConfig } from './config.js'

function createProxyAuthSignature(
  timestamp: string,
  handle: string,
  secret: string
): string {
  return createHmac('sha256', secret)
    .update(`${timestamp}\n${handle}`)
    .digest('hex')
}

export interface SessionAuthorizationService {
  validate(
    handle: string,
    requestId?: string
  ): Promise<PreviewSessionClaims | null>
}

type AuthorizationDiagnostic =
  | 'validated'
  | 'authorization_rejected'
  | 'authorization_timeout'
  | 'authorization_network_failure'
  | 'authorization_configuration_error'
  | 'invalid_upstream_response'

function handleFingerprint(handle: string): string {
  return createHash('sha256').update(handle).digest('hex').slice(0, 16)
}

function logAuthorizationDiagnostic(
  category: AuthorizationDiagnostic,
  fields: {
    requestId?: string
    handle: string
    sessionId?: string
    upstreamStatus?: number
    upstreamCode?: string
  }
): void {
  const event = {
    event: 'preview_authorization',
    category,
    request_id: fields.requestId ?? null,
    handle_fingerprint: handleFingerprint(fields.handle),
    ...(fields.sessionId ? { session_id: fields.sessionId } : {}),
    ...(fields.upstreamStatus
      ? { upstream_status: fields.upstreamStatus }
      : {}),
    ...(fields.upstreamCode ? { upstream_code: fields.upstreamCode } : {}),
  }
  if (category === 'validated') console.debug(event)
  else console.warn(event)
}

function safeUpstreamCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const code = (body as { error?: { code?: unknown } }).error?.code
  return typeof code === 'string' && /^[A-Z][A-Z0-9_]{1,63}$/.test(code)
    ? code
    : undefined
}

export class ApiSessionAuthorizationService implements SessionAuthorizationService {
  constructor(private readonly config: ProxyConfig) {}

  async validate(
    handle: string,
    requestId?: string
  ): Promise<PreviewSessionClaims | null> {
    const secret = this.config.sharedSecret

    if (!secret) {
      logAuthorizationDiagnostic('authorization_configuration_error', {
        requestId,
        handle,
      })
      throw new Error('HEATMAP_PROXY_SHARED_SECRET is required')
    }

    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = createProxyAuthSignature(timestamp, handle, secret)
    const abortController = new AbortController()
    const timeout = setTimeout(
      () => abortController.abort(),
      this.config.authorizationTimeoutMs
    )

    try {
      const response = await fetch(this.config.authorizationUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(requestId ? { 'x-pathlens-proxy-request-id': requestId } : {}),
          'x-pathlens-proxy-timestamp': timestamp,
          'x-pathlens-proxy-signature': signature,
        },
        body: JSON.stringify({ handle }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        let body: unknown
        try {
          body = await response.json()
        } catch {
          logAuthorizationDiagnostic('invalid_upstream_response', {
            requestId,
            handle,
            upstreamStatus: response.status,
          })
          return null
        }
        logAuthorizationDiagnostic('authorization_rejected', {
          requestId,
          handle,
          upstreamStatus: response.status,
          upstreamCode: safeUpstreamCode(body),
        })
        return null
      }

      let body: unknown
      try {
        body = await response.json()
      } catch {
        logAuthorizationDiagnostic('invalid_upstream_response', {
          requestId,
          handle,
        })
        return null
      }
      if (!body || typeof body !== 'object') {
        logAuthorizationDiagnostic('invalid_upstream_response', {
          requestId,
          handle,
        })
        return null
      }

      const data = (body as { data?: unknown }).data
      const parsed = previewSessionClaimsSchema.safeParse(data)
      if (!parsed.success) {
        logAuthorizationDiagnostic('invalid_upstream_response', {
          requestId,
          handle,
        })
        return null
      }
      logAuthorizationDiagnostic('validated', {
        requestId,
        handle,
        sessionId: parsed.data.sessionId,
      })
      return parsed.data
    } catch (error) {
      const category =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'authorization_timeout'
          : 'authorization_network_failure'
      logAuthorizationDiagnostic(category, { requestId, handle })
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }
}
