export interface ProxyConfig {
  javascriptExecutionPolicy: 'static-only' | 'isolated-script-runtime'
  port: number
  publicOrigin: string
  publicBasePath: string
  authorizationUrl: string
  sharedSecret: string | null
  authorizationTimeoutMs: number
  dnsTimeoutMs: number
  connectionTimeoutMs: number
  tlsTimeoutMs: number
  requestTimeoutMs: number
  maxHeaderBytes: number
  maxResponseBytes: number
  maxRedirects: number
  maxConcurrentRequests: number
  maxHtmlBytes: number
  maxCssBytes: number
  maxRewrittenBytes: number
  maxResourceUrlLength: number
  maxCssImportDepth: number
  maxHtmlReferences: number
  maxTransformMs: number
  allowedExternalOrigins: string[]
  embeddingOrigin: string | null
  dashboardOrigin: string
  apiOrigin: string
}

function readInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback)
  return Number.isSafeInteger(value) && value > 0 ? value : fallback
}

function readOrigin(name: string, fallback: string): string {
  const value = (process.env[name]?.trim() || fallback).replace(/\/$/, '')
  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    throw new Error(`${name} must be an absolute HTTP(S) origin.`)
  }
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    value.includes('*')
  ) {
    throw new Error(`${name} must be an exact HTTP(S) origin.`)
  }
  return origin.origin
}

export function normalizePublicBasePath(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  const normalized = trimmed.replace(/\/$/, '')
  if (!normalized) return ''
  if (
    !normalized.startsWith('/') ||
    normalized.includes('?') ||
    normalized.includes('#')
  ) {
    throw new Error(
      'HEATMAP_PROXY_PUBLIC_BASE_PATH must be an absolute path without query or fragment.'
    )
  }
  const segments = normalized.split('/')
  if (
    segments.some(
      (segment, index) =>
        (index > 0 && !segment) || segment === '.' || segment === '..'
    )
  ) {
    throw new Error(
      'HEATMAP_PROXY_PUBLIC_BASE_PATH must contain only non-empty path segments.'
    )
  }
  return normalized
}

export function loadConfig(): ProxyConfig {
  const publicOrigin = readOrigin(
    'HEATMAP_PROXY_PUBLIC_ORIGIN',
    'http://localhost:8082'
  )
  const dashboardOrigin = readOrigin(
    'HEATMAP_PROXY_DASHBOARD_ORIGIN',
    'http://localhost:5173'
  )
  const apiOrigin = readOrigin(
    'HEATMAP_PROXY_API_ORIGIN',
    'http://localhost:8080'
  )
  const configuredEmbeddingOrigin =
    process.env.HEATMAP_PROXY_EMBEDDING_ORIGIN?.trim()
  const embeddingOrigin = configuredEmbeddingOrigin
    ? readOrigin('HEATMAP_PROXY_EMBEDDING_ORIGIN', configuredEmbeddingOrigin)
    : null
  if (publicOrigin === dashboardOrigin || publicOrigin === apiOrigin) {
    throw new Error(
      'The proxy origin must be separate from dashboard and API origins.'
    )
  }
  if (embeddingOrigin && embeddingOrigin !== dashboardOrigin) {
    throw new Error('The embedding origin must match the dashboard origin.')
  }
  const allowedExternalOrigins = (
    process.env.HEATMAP_PROXY_ALLOWED_EXTERNAL_ORIGINS ?? ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin, index) =>
      readOrigin(`HEATMAP_PROXY_ALLOWED_EXTERNAL_ORIGINS[${index}]`, origin)
    )
  const javascriptExecutionPolicy =
    process.env.HEATMAP_PROXY_JAVASCRIPT_POLICY?.trim() || 'static-only'
  if (
    !['static-only', 'isolated-script-runtime'].includes(
      javascriptExecutionPolicy
    )
  ) {
    throw new Error('HEATMAP_PROXY_JAVASCRIPT_POLICY is unsupported.')
  }
  return {
    javascriptExecutionPolicy:
      javascriptExecutionPolicy as ProxyConfig['javascriptExecutionPolicy'],
    port: readInteger('PORT', 8082),
    publicOrigin,
    publicBasePath: normalizePublicBasePath(
      process.env.HEATMAP_PROXY_PUBLIC_BASE_PATH
    ),
    authorizationUrl:
      process.env.HEATMAP_PROXY_AUTHORIZATION_URL ??
      'http://localhost:8080/api/internal/heatmap-proxy/validate',
    sharedSecret: process.env.HEATMAP_PROXY_SHARED_SECRET?.trim() || null,
    authorizationTimeoutMs: readInteger(
      'HEATMAP_PROXY_AUTHORIZATION_TIMEOUT_MS',
      3_000
    ),
    dnsTimeoutMs: readInteger('HEATMAP_PROXY_DNS_TIMEOUT_MS', 2_000),
    connectionTimeoutMs: readInteger(
      'HEATMAP_PROXY_CONNECTION_TIMEOUT_MS',
      3_000
    ),
    tlsTimeoutMs: readInteger('HEATMAP_PROXY_TLS_TIMEOUT_MS', 3_000),
    requestTimeoutMs: readInteger('HEATMAP_PROXY_REQUEST_TIMEOUT_MS', 15_000),
    maxHeaderBytes: readInteger('HEATMAP_PROXY_MAX_HEADER_BYTES', 32 * 1024),
    maxResponseBytes: readInteger(
      'HEATMAP_PROXY_MAX_RESPONSE_BYTES',
      10 * 1024 * 1024
    ),
    maxRedirects: readInteger('HEATMAP_PROXY_MAX_REDIRECTS', 5),
    maxConcurrentRequests: readInteger(
      'HEATMAP_PROXY_MAX_CONCURRENT_REQUESTS',
      32
    ),
    maxHtmlBytes: readInteger('HEATMAP_PROXY_MAX_HTML_BYTES', 5 * 1024 * 1024),
    maxCssBytes: readInteger('HEATMAP_PROXY_MAX_CSS_BYTES', 2 * 1024 * 1024),
    maxRewrittenBytes: readInteger(
      'HEATMAP_PROXY_MAX_REWRITTEN_BYTES',
      6 * 1024 * 1024
    ),
    maxResourceUrlLength: readInteger(
      'HEATMAP_PROXY_MAX_RESOURCE_URL_LENGTH',
      4096
    ),
    maxCssImportDepth: readInteger('HEATMAP_PROXY_MAX_CSS_IMPORT_DEPTH', 4),
    maxHtmlReferences: readInteger('HEATMAP_PROXY_MAX_HTML_REFERENCES', 1000),
    maxTransformMs: readInteger('HEATMAP_PROXY_MAX_TRANSFORM_MS', 2_000),
    allowedExternalOrigins,
    embeddingOrigin,
    dashboardOrigin,
    apiOrigin,
  }
}
