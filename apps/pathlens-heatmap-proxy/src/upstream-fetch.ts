import { lookup as dnsLookup } from 'node:dns'
import { request as httpRequest, type IncomingMessage } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { isIP } from 'node:net'
import { PassThrough, type Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib'
import type { PreviewSessionClaims } from '@workspace/contracts'
import type { ProxyConfig } from './config.js'
import {
  authorizeResourceRequest,
  isSessionAuthorizedHostname,
} from './resource-authorization.js'

const SAFE_RESPONSE_HEADERS = [
  'cache-control',
  'content-language',
  'content-type',
  'etag',
  'expires',
  'last-modified',
  'vary',
  'accept-ranges',
  'content-range',
] as const

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const PRIVATE_IPV4_RANGES = [
  [0, 8],
  [10 << 24, 8],
  [(100 << 24) | (64 << 16), 10],
  [127 << 24, 8],
  [(169 << 24) | (254 << 16), 16],
  [(172 << 24) | (16 << 16), 12],
  [(192 << 24) | (0 << 16), 24],
  [(192 << 24) | (0 << 16) | (2 << 8), 24],
  [(192 << 24) | (168 << 16), 16],
  [(198 << 24) | (18 << 16), 15],
  [(198 << 24) | (51 << 16) | (100 << 8), 24],
  [(203 << 24) | (0 << 16) | (113 << 8), 24],
] as const

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.amazonaws.internal',
])

export type ResourceCategory = 'page' | 'resource'

export interface UpstreamFetchOptions {
  session: PreviewSessionClaims
  url: string
  method: 'GET' | 'HEAD'
  category: ResourceCategory
}

export interface UpstreamResponse {
  finalUrl: string
  statusCode: number
  contentType: string
  headers: Record<string, string>
  body: Buffer
  redirects: number
}

export interface ResolvedAddress {
  address: string
  family: 4 | 6
}

export interface UpstreamTransport {
  lookup?: DnsLookup
  request?: RequestFactory
}

export type DnsLookup = (
  hostname: string,
  options: { all: true; verbatim: true },
  callback: (error: Error | null, addresses?: ResolvedAddress[]) => void
) => void

const defaultLookup: DnsLookup = (hostname, options, callback) => {
  dnsLookup(hostname, options, (error, records) => {
    callback(
      error,
      records?.map((record) => ({
        address: record.address,
        family: record.family === 6 ? 6 : 4,
      }))
    )
  })
}

export interface RequestOptions {
  hostname: string
  path: string
  port: number
  method: string
  headers: Record<string, string>
  timeout: number
  maxHeaderSize: number
  lookup: DnsLookup
  servername?: string
}

export interface RequestLike {
  on(event: string, listener: (...args: unknown[]) => void): RequestLike
  once(event: string, listener: (...args: unknown[]) => void): RequestLike
  setTimeout(timeout: number, callback: () => void): RequestLike
  end(): void
  destroy(error?: Error): void
}

export type RequestFactory = (
  options: RequestOptions,
  callback: (response: IncomingMessage) => void
) => RequestLike

export interface FetchRuntime {
  config: ProxyConfig
  transport?: UpstreamTransport
  requestId?: string
  logger?: (event: string, fields: Record<string, string | number>) => void
}

let activeRequests = 0

function ipv4ToNumber(address: string): number {
  return address
    .split('.')
    .reduce((result, part) => result * 256 + Number(part), 0)
}

function isInCidr(value: number, base: number, bits: number): boolean {
  if (bits === 0) return true
  const mask = (0xffffffff << (32 - bits)) >>> 0
  return (value & mask) === (base & mask)
}

function parseIpv6(address: string): number[] | null {
  const normalized = address.toLowerCase().split('%')[0] ?? ''
  const parts = normalized.split('::')
  if (parts.length > 2) return null

  const parsePart = (part: string): number[] | null => {
    if (!part) return []
    const values: number[] = []
    for (const value of part.split(':')) {
      if (value.includes('.')) {
        if (isIP(value) !== 4) return null
        const number = ipv4ToNumber(value)
        values.push(number >>> 16, number & 0xffff)
      } else if (/^[0-9a-f]{1,4}$/.test(value)) {
        values.push(Number.parseInt(value, 16))
      } else {
        return null
      }
    }
    return values
  }

  const left = parsePart(parts[0] ?? '')
  const right = parsePart(parts[1] ?? '')
  if (!left || !right) return null
  const missing = 8 - left.length - right.length
  if (parts.length === 1 && missing !== 0) return null
  if (parts.length === 2 && missing < 1) return null
  return [
    ...left,
    ...Array.from({ length: Math.max(missing, 0) }, () => 0),
    ...right,
  ]
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) {
    const value = ipv4ToNumber(address)
    if (
      PRIVATE_IPV4_RANGES.some(([base, bits]) => isInCidr(value, base, bits))
    ) {
      return false
    }
    return value < 0xe0000000
  }

  if (family !== 6) return false
  const parts = parseIpv6(address)
  if (!parts) return false
  const first = parts[0] ?? 0
  const second = parts[1] ?? 0
  const isUnspecified = parts.every((part) => part === 0)
  const isLoopback =
    isUnspecified ||
    (parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1)
  const isLinkLocal = (first & 0xffc0) === 0xfe80
  const isUniqueLocal = (first & 0xfe00) === 0xfc00
  const isMulticast = (first & 0xff00) === 0xff00
  const isDocumentation = first === 0x2001 && second === 0x0db8
  const isMappedIpv4 =
    parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff
  if (isMappedIpv4) return false
  return !(
    isLoopback ||
    isLinkLocal ||
    isUniqueLocal ||
    isMulticast ||
    isDocumentation
  )
}

function assertSafeHostname(hostname: string): void {
  const normalized = hostname.toLowerCase().replace(/\.$/, '')
  if (!normalized || isIP(normalized) || BLOCKED_HOSTNAMES.has(normalized)) {
    throw new UpstreamSecurityError(
      'HOST_NOT_ALLOWED',
      'The upstream hostname is not allowed.'
    )
  }
  if (normalized.endsWith('.localhost') || normalized.endsWith('.internal')) {
    throw new UpstreamSecurityError(
      'HOST_NOT_ALLOWED',
      'The upstream hostname is not allowed.'
    )
  }
}

function hasExplicitPort(rawUrl: string): boolean {
  const authority = rawUrl.match(/^[a-z][a-z\d+.-]*:\/\/([^/?#]*)/i)?.[1]
  if (!authority) return false
  const host = authority.slice(authority.lastIndexOf('@') + 1)
  if (host.startsWith('[')) return /^\[[^\]]+\]:\d+$/.test(host)
  return /:\d+$/.test(host)
}

export async function resolvePublicAddresses(
  hostname: string,
  timeoutMs: number,
  lookup: DnsLookup = defaultLookup
): Promise<ResolvedAddress[]> {
  assertSafeHostname(hostname)
  const addresses = await new Promise<ResolvedAddress[]>((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      settled = true
      reject(
        new UpstreamSecurityError(
          'DNS_TIMEOUT',
          'Upstream DNS lookup timed out.'
        )
      )
    }, timeoutMs)
    lookup(hostname, { all: true, verbatim: true }, (error, records) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (error || !records?.length) {
        reject(
          new UpstreamSecurityError('DNS_FAILED', 'Upstream DNS lookup failed.')
        )
        return
      }
      resolve(
        records.map((record) => ({
          address: record.address,
          family: record.family === 6 ? 6 : 4,
        }))
      )
    })
  })

  if (addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new UpstreamSecurityError(
      'PRIVATE_ADDRESS',
      'The upstream hostname resolved to a non-public address.'
    )
  }
  return addresses
}

export class UpstreamSecurityError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'UpstreamSecurityError'
  }
}

function contentType(response: IncomingMessage): string {
  return (
    (headerValue(response, 'content-type') ?? '')
      .split(';', 1)[0]
      ?.trim()
      .toLowerCase() ?? ''
  )
}

function isAllowedContentType(
  type: string,
  category: ResourceCategory
): boolean {
  if (category === 'page')
    return type === 'text/html' || type === 'application/xhtml+xml'
  return (
    type.startsWith('text/css') ||
    type === 'application/javascript' ||
    type === 'text/javascript' ||
    type === 'application/json' ||
    type === 'application/wasm' ||
    type === 'application/octet-stream' ||
    type.startsWith('image/') ||
    type.startsWith('font/') ||
    type === 'application/font-woff' ||
    type === 'application/font-woff2'
  )
}

function headerValue(
  response: IncomingMessage,
  name: string
): string | undefined {
  const value = response.headers[name]
  return Array.isArray(value) ? value.join(', ') : value
}

async function readResponseBody(
  response: IncomingMessage,
  encoding: string,
  maxBytes: number,
  timeoutMs: number
): Promise<Buffer> {
  let compressedBytes = 0
  response.on('data', (chunk: Buffer) => {
    compressedBytes += chunk.length
    if (compressedBytes > maxBytes) {
      response.destroy(
        new UpstreamSecurityError(
          'RESPONSE_TOO_LARGE',
          'The upstream response is too large.'
        )
      )
    }
  })
  const chunks: Buffer[] = []
  let decompressedBytes = 0
  const output = new PassThrough()
  output.on('data', (chunk: Buffer) => {
    decompressedBytes += chunk.length
    if (decompressedBytes > maxBytes) {
      output.destroy(
        new UpstreamSecurityError(
          'RESPONSE_TOO_LARGE',
          'The decompressed response is too large.'
        )
      )
    } else {
      chunks.push(chunk)
    }
  })
  const decoder =
    encoding === 'gzip'
      ? createGunzip()
      : encoding === 'deflate'
        ? createInflate()
        : encoding === 'br'
          ? createBrotliDecompress()
          : new PassThrough()
  const timeout = setTimeout(() => {
    response.destroy(
      new UpstreamSecurityError(
        'REQUEST_TIMEOUT',
        'The upstream response timed out.'
      )
    )
  }, timeoutMs)
  try {
    await pipeline(response as unknown as Readable, decoder, output)
  } finally {
    clearTimeout(timeout)
  }
  return Buffer.concat(chunks)
}

function requestOnce(
  url: URL,
  method: 'GET' | 'HEAD',
  runtime: FetchRuntime,
  addresses: ResolvedAddress[]
): Promise<{ response: IncomingMessage; elapsedMs: number }> {
  const lookup: DnsLookup = (_hostname, _options, callback) => {
    callback(null, addresses)
  }
  const options: RequestOptions = {
    hostname: url.hostname,
    path: `${url.pathname}${url.search}`,
    port: url.protocol === 'https:' ? 443 : 80,
    method,
    headers: { accept: '*/*', 'accept-encoding': 'gzip, br, deflate' },
    timeout: runtime.config.connectionTimeoutMs,
    maxHeaderSize: runtime.config.maxHeaderBytes,
    lookup,
    ...(url.protocol === 'https:' ? { servername: url.hostname } : {}),
  }
  const factory = runtime.transport?.request
  const started = Date.now()
  return new Promise((resolve, reject) => {
    let settled = false
    let request: RequestLike | undefined
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        request?.destroy(
          new UpstreamSecurityError(
            'REQUEST_TIMEOUT',
            'The upstream request timed out.'
          )
        )
        reject(
          new UpstreamSecurityError(
            'REQUEST_TIMEOUT',
            'The upstream request timed out.'
          )
        )
      }
    }, runtime.config.requestTimeoutMs)
    const onResponse = (response: IncomingMessage) => {
      if (settled) {
        response.resume()
        return
      }
      settled = true
      clearTimeout(timer)
      resolve({ response, elapsedMs: Date.now() - started })
    }
    request = factory
      ? factory(options, onResponse)
      : ((url.protocol === 'https:' ? httpsRequest : httpRequest)(
          options as never,
          onResponse
        ) as unknown as RequestLike)
    request.once('error', (error: unknown) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(error instanceof Error ? error : new Error(String(error)))
    })
    request.setTimeout(runtime.config.connectionTimeoutMs, () => {
      request.destroy(
        new UpstreamSecurityError(
          'CONNECTION_TIMEOUT',
          'The upstream connection timed out.'
        )
      )
    })
    request.once('socket', (socket: unknown) => {
      if (
        !socket ||
        typeof socket !== 'object' ||
        !('encrypted' in socket) ||
        !socket.encrypted
      )
        return
      const tlsSocket = socket as unknown as {
        once: (event: string, listener: () => void) => void
        removeListener: (event: string, listener: () => void) => void
      }
      const tlsTimeout = setTimeout(() => {
        request.destroy(
          new UpstreamSecurityError(
            'TLS_TIMEOUT',
            'The upstream TLS handshake timed out.'
          )
        )
      }, runtime.config.tlsTimeoutMs)
      const onSecureConnect = () => clearTimeout(tlsTimeout)
      tlsSocket.once('secureConnect', onSecureConnect)
      tlsSocket.once('error', onSecureConnect)
    })
    request.end()
  })
}

function responseHeaders(response: IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {}
  for (const name of SAFE_RESPONSE_HEADERS) {
    const value = headerValue(response, name)
    if (value) headers[name] = value
  }
  return headers
}

function assertPagePath(
  session: PreviewSessionClaims,
  url: URL,
  category: ResourceCategory
): void {
  if (category === 'page' && url.pathname !== session.pathname) {
    throw new UpstreamSecurityError(
      'PATH_NOT_ALLOWED',
      'The upstream page path is not authorized.'
    )
  }
}

export async function fetchUpstream(
  runtime: FetchRuntime,
  options: UpstreamFetchOptions
): Promise<UpstreamResponse> {
  if (activeRequests >= runtime.config.maxConcurrentRequests) {
    throw new UpstreamSecurityError(
      'CONCURRENCY_LIMIT',
      'The upstream request limit has been reached.'
    )
  }
  activeRequests += 1
  const started = Date.now()
  let currentHostname = 'unknown'
  let redirects = 0
  const visited = new Set<string>()
  try {
    let current: URL
    try {
      current = new URL(options.url)
    } catch {
      throw new UpstreamSecurityError(
        'URL_INVALID',
        'The upstream URL is invalid.'
      )
    }
    let explicitPort = hasExplicitPort(options.url)
    const resourceOriginLock =
      options.category === 'resource' &&
      !isSessionAuthorizedHostname(options.session, current.hostname)
        ? current.origin
        : undefined
    for (;;) {
      currentHostname = current.hostname
      if (
        current.username ||
        current.password ||
        current.port ||
        explicitPort
      ) {
        throw new UpstreamSecurityError(
          'URL_NOT_ALLOWED',
          'Upstream credentials and explicit ports are not allowed.'
        )
      }
      if (current.protocol !== 'http:' && current.protocol !== 'https:') {
        throw new UpstreamSecurityError(
          'PROTOCOL_NOT_ALLOWED',
          'Only HTTP and HTTPS upstreams are allowed.'
        )
      }
      const auth = authorizeResourceRequest(
        options.session,
        current.href,
        options.method,
        {
          allowedExternalOrigins:
            options.category === 'resource'
              ? runtime.config.allowedExternalOrigins
              : [],
          lockedOrigin: resourceOriginLock,
        }
      )
      if (
        options.category === 'resource' &&
        resourceOriginLock === undefined &&
        !isSessionAuthorizedHostname(options.session, current.hostname)
      ) {
        throw new UpstreamSecurityError(
          'RESOURCE_ORIGIN_NOT_ALLOWED',
          'A same-domain resource cannot redirect to another origin.'
        )
      }
      if (!auth.allowed)
        throw new UpstreamSecurityError(
          'RESOURCE_NOT_ALLOWED',
          auth.reason ?? 'Resource not allowed.'
        )
      assertPagePath(options.session, current, options.category)
      if (visited.has(current.href))
        throw new UpstreamSecurityError(
          'REDIRECT_LOOP',
          'The upstream redirect loop was rejected.'
        )
      visited.add(current.href)
      const addresses = await resolvePublicAddresses(
        current.hostname,
        runtime.config.dnsTimeoutMs,
        runtime.transport?.lookup
      )
      const requestResult = await requestOnce(
        current,
        options.method,
        runtime,
        addresses
      )
      const response = requestResult.response
      const type = contentType(response)
      const statusCode = response.statusCode ?? 0
      if (REDIRECT_STATUSES.has(statusCode)) {
        const location = headerValue(response, 'location')
        response.resume()
        if (!location)
          throw new UpstreamSecurityError(
            'REDIRECT_INVALID',
            'The upstream redirect had no location.'
          )
        redirects += 1
        if (redirects > runtime.config.maxRedirects)
          throw new UpstreamSecurityError(
            'TOO_MANY_REDIRECTS',
            'The upstream redirect limit was exceeded.'
          )
        if (hasExplicitPort(location)) {
          throw new UpstreamSecurityError(
            'URL_NOT_ALLOWED',
            'Explicit upstream ports are not allowed.'
          )
        }
        let next: URL
        try {
          next = new URL(location, current)
        } catch {
          throw new UpstreamSecurityError(
            'REDIRECT_INVALID',
            'The upstream redirect location is invalid.'
          )
        }
        if (current.protocol === 'https:' && next.protocol === 'http:') {
          throw new UpstreamSecurityError(
            'PROTOCOL_DOWNGRADE',
            'HTTPS redirects cannot downgrade to HTTP.'
          )
        }
        current = next
        explicitPort = hasExplicitPort(location)
        continue
      }
      if (!isAllowedContentType(type, options.category)) {
        response.resume()
        throw new UpstreamSecurityError(
          'CONTENT_TYPE_NOT_ALLOWED',
          'The upstream content type is not allowed.'
        )
      }
      const length = Number(headerValue(response, 'content-length') ?? '')
      if (Number.isFinite(length) && length > runtime.config.maxResponseBytes) {
        response.resume()
        throw new UpstreamSecurityError(
          'RESPONSE_TOO_LARGE',
          'The upstream response is too large.'
        )
      }
      const encoding = (
        headerValue(response, 'content-encoding') ?? ''
      ).toLowerCase()
      if (
        encoding &&
        !['gzip', 'br', 'deflate', 'identity'].includes(encoding)
      ) {
        response.resume()
        throw new UpstreamSecurityError(
          'ENCODING_NOT_ALLOWED',
          'The upstream content encoding is not allowed.'
        )
      }
      const body =
        options.method === 'HEAD'
          ? (response.resume(), Buffer.alloc(0))
          : await readResponseBody(
              response,
              encoding,
              runtime.config.maxResponseBytes,
              Math.max(
                1,
                runtime.config.requestTimeoutMs - requestResult.elapsedMs
              )
            )
      runtime.logger?.('upstream_fetch', {
        request_id: runtime.requestId ?? 'unknown',
        hostname: current.hostname,
        category: options.category,
        status: statusCode,
        duration_ms: Date.now() - started,
        response_bytes: body.length,
        redirects,
      })
      return {
        finalUrl: current.href,
        statusCode,
        contentType: type,
        headers: responseHeaders(response),
        body,
        redirects,
      }
    }
  } catch (error) {
    const reason =
      error instanceof UpstreamSecurityError ? error.code : 'UPSTREAM_ERROR'
    runtime.logger?.('upstream_rejected', {
      request_id: runtime.requestId ?? 'unknown',
      hostname: currentHostname,
      category: options.category,
      reason,
      duration_ms: Date.now() - started,
    })
    throw error
  } finally {
    activeRequests -= 1
  }
}
