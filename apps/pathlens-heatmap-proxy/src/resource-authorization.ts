import type { PreviewSessionClaims } from '@workspace/contracts'
import { previewTrackingBlockReason } from './tracking-policy.js'

export interface ResourceAuthorizationOptions {
  allowedExternalOrigins?: readonly string[]
  lockedOrigin?: string
}

export function canonicalHostname(hostname: string): string {
  return hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '')
}

export function isSessionAuthorizedHostname(
  session: PreviewSessionClaims,
  hostname: string
): boolean {
  const normalized = canonicalHostname(hostname)
  return session.allowedHostnames.some(
    (allowedHostname) => canonicalHostname(allowedHostname) === normalized
  )
}

export function authorizeResourceRequest(
  session: PreviewSessionClaims,
  rawUrl: string,
  method: string,
  options: ResourceAuthorizationOptions = {}
): { allowed: boolean; reason: string | null } {
  if (method !== 'GET' && method !== 'HEAD') {
    return { allowed: false, reason: 'Only GET and HEAD are allowed.' }
  }

  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { allowed: false, reason: 'The resource URL is invalid.' }
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { allowed: false, reason: 'Only HTTP and HTTPS are allowed.' }
  }

  if (url.username || url.password) {
    return { allowed: false, reason: 'Resource credentials are not allowed.' }
  }

  if (url.port) {
    return {
      allowed: false,
      reason: 'Explicit resource ports are not allowed.',
    }
  }

  const trackingBlockReason = previewTrackingBlockReason(url.href)
  if (trackingBlockReason) {
    return { allowed: false, reason: trackingBlockReason }
  }

  if (options.lockedOrigin && url.origin !== options.lockedOrigin) {
    return {
      allowed: false,
      reason: 'The resource redirect changed its authorized origin.',
    }
  }

  const hostname = canonicalHostname(url.hostname)
  const allowed = isSessionAuthorizedHostname(session, hostname)
  const allowedExternalOrigin = (options.allowedExternalOrigins ?? []).some(
    (origin) => {
      try {
        const allowedUrl = new URL(origin)
        return (
          allowedUrl.protocol === url.protocol &&
          allowedUrl.hostname === url.hostname &&
          (allowedUrl.port || '') === (url.port || '')
        )
      } catch {
        return false
      }
    }
  )
  const isAllowed = allowed || allowedExternalOrigin

  return {
    allowed: isAllowed,
    reason: isAllowed
      ? null
      : 'The resource host is outside the selected domain.',
  }
}
