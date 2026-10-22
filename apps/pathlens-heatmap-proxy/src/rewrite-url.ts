import type { PreviewSessionClaims } from '@workspace/contracts'
import type { ProxyConfig } from './config.js'
import { authorizeResourceRequest } from './resource-authorization.js'

export class RewriteError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'RewriteError'
  }
}

export interface RewriteContext {
  session: PreviewSessionClaims
  handle: string
  proxyOrigin: string
  config: ProxyConfig
  referenceCount: number
  depth: number
}

function unsupportedScheme(value: string): boolean {
  return /^(?:javascript|data|blob|file|vbscript):/i.test(value.trim())
}

export function resolveReference(
  rawValue: string,
  baseUrl: string
): URL | null {
  const value = rawValue.trim()
  if (!value || value.startsWith('#')) return null
  if (unsupportedScheme(value)) {
    throw new RewriteError(
      'REFERENCE_SCHEME_NOT_ALLOWED',
      'The resource scheme is not allowed.'
    )
  }
  let resolved: URL
  try {
    resolved = new URL(value, baseUrl)
  } catch {
    throw new RewriteError(
      'REFERENCE_INVALID',
      'The resource reference is invalid.'
    )
  }
  if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
    throw new RewriteError(
      'REFERENCE_SCHEME_NOT_ALLOWED',
      'The resource scheme is not allowed.'
    )
  }
  if (resolved.username || resolved.password || resolved.port) {
    throw new RewriteError(
      'REFERENCE_NOT_ALLOWED',
      'Resource credentials and ports are not allowed.'
    )
  }
  return resolved
}

export function createScopedResourceUrl(
  rawValue: string,
  baseUrl: string,
  context: RewriteContext,
  depth = context.depth
): string | null {
  const target = resolveReference(rawValue, baseUrl)
  if (!target) return null

  context.referenceCount += 1
  if (context.referenceCount > context.config.maxHtmlReferences) {
    throw new RewriteError(
      'REFERENCE_LIMIT',
      'The rewritten document contains too many resource references.'
    )
  }

  const authorization = authorizeResourceRequest(
    context.session,
    target.href,
    'GET',
    { allowedExternalOrigins: context.config.allowedExternalOrigins }
  )
  if (!authorization.allowed) {
    throw new RewriteError(
      'RESOURCE_ORIGIN_NOT_ALLOWED',
      authorization.reason ?? 'The resource origin is not allowed.'
    )
  }

  const proxy = new URL(context.proxyOrigin)
  proxy.pathname = `/v1/session/${encodeURIComponent(context.handle)}/resource`
  proxy.search = `?t=${Buffer.from(target.href).toString('base64url')}&depth=${depth}`
  const result = proxy.toString()
  if (result.length > context.config.maxResourceUrlLength) {
    throw new RewriteError(
      'RESOURCE_URL_TOO_LONG',
      'The rewritten resource URL is too long.'
    )
  }
  return result
}

export function assertTransformBudget(
  startedAt: number,
  config: ProxyConfig
): void {
  if (Date.now() - startedAt > config.maxTransformMs) {
    throw new RewriteError(
      'TRANSFORM_TIMEOUT',
      'The response transformation exceeded its time limit.'
    )
  }
}
