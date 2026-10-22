import {
  previewSessionClaimsSchema,
  type PreviewSessionClaims,
} from '@workspace/contracts'
import { createHmac } from 'node:crypto'
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
  validate(handle: string): Promise<PreviewSessionClaims | null>
}

export class ApiSessionAuthorizationService implements SessionAuthorizationService {
  constructor(private readonly config: ProxyConfig) {}

  async validate(handle: string): Promise<PreviewSessionClaims | null> {
    const secret = this.config.sharedSecret

    if (!secret) {
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
          'x-pathlens-proxy-timestamp': timestamp,
          'x-pathlens-proxy-signature': signature,
        },
        body: JSON.stringify({ handle }),
        signal: abortController.signal,
      })

      if (!response.ok) return null

      const body: unknown = await response.json()
      if (!body || typeof body !== 'object') return null

      const data = (body as { data?: unknown }).data
      const parsed = previewSessionClaimsSchema.safeParse(data)
      return parsed.success ? parsed.data : null
    } finally {
      clearTimeout(timeout)
    }
  }
}
