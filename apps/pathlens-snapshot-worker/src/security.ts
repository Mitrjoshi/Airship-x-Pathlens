import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import type { Page, Route, WebSocketRoute } from 'playwright'

export class PublicUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PublicUrlError'
  }
}

const blockedHostnameSuffixes = ['.localhost', '.local', '.internal']
const blockedHostnames = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata',
  'metadata.google.com',
  'metadata.google.internal',
  'instance-data',
  'instance-data.ec2.internal',
])

const blockedIpv4Ranges: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0x00ffffff],
  [0x0a000000, 0x0affffff],
  [0x64400000, 0x647fffff],
  [0x7f000000, 0x7fffffff],
  [0xa9fe0000, 0xa9feffff],
  [0xac100000, 0xac1fffff],
  [0xc0000000, 0xc00000ff],
  [0xc0000200, 0xc00002ff],
  [0xc0a80000, 0xc0a8ffff],
  [0xc6120000, 0xc613ffff],
  [0xc6336400, 0xc63364ff],
  [0xcb007100, 0xcb0071ff],
  [0xe0000000, 0xffffffff],
]

const blockedIpv6Ranges: ReadonlyArray<readonly [string, number]> = [
  ['::', 96],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
  ['2001:2::', 48],
  ['2001:10::', 28],
  ['2001:20::', 28],
  ['2001:db8::', 32],
]

function normalizeHostname(hostname: string): string {
  let host = hostname.trim().toLowerCase()

  if (host.startsWith('[') && host.endsWith(']')) {
    host = host.slice(1, -1)
  }

  while (host.endsWith('.')) {
    host = host.slice(0, -1)
  }

  return host
}

function parseIpv4(address: string): number | null {
  const parts = address.split('.')

  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return null
  }

  const octets = parts.map((part) => Number(part))

  if (
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return null
  }

  return (
    octets[0]! * 0x1000000 +
    octets[1]! * 0x10000 +
    octets[2]! * 0x100 +
    octets[3]!
  )
}

function isForbiddenIpv4Number(address: number): boolean {
  return blockedIpv4Ranges.some(
    ([start, end]) => address >= start && address <= end
  )
}

function ipv6ToBigInt(address: string): bigint | null {
  let value = address.toLowerCase()
  const zoneIndex = value.indexOf('%')

  if (zoneIndex >= 0) {
    value = value.slice(0, zoneIndex)
  }

  if (value.includes('.')) {
    const lastColon = value.lastIndexOf(':')

    if (lastColon < 0) return null

    const ipv4 = parseIpv4(value.slice(lastColon + 1))

    if (ipv4 === null) return null

    const high = Math.floor(ipv4 / 0x10000).toString(16)
    const low = (ipv4 % 0x10000).toString(16)
    const prefix = value.slice(0, lastColon)
    value = `${prefix}${prefix.endsWith(':') ? '' : ':'}${high}:${low}`
  }

  const compressionIndex = value.indexOf('::')

  if (compressionIndex >= 0 && value.indexOf('::', compressionIndex + 2) >= 0) {
    return null
  }

  const parseGroups = (part: string): number[] | null => {
    if (!part) return []

    const groups = part.split(':').map((group) => {
      if (!/^[0-9a-f]{1,4}$/.test(group)) return null
      return Number.parseInt(group, 16)
    })

    return groups.some((group) => group === null) ? null : (groups as number[])
  }

  let groups: number[] | null

  if (compressionIndex >= 0) {
    const left = parseGroups(value.slice(0, compressionIndex))
    const right = parseGroups(value.slice(compressionIndex + 2))

    if (left === null || right === null || left.length + right.length >= 8) {
      return null
    }

    groups = [
      ...left,
      ...new Array<number>(8 - left.length - right.length).fill(0),
      ...right,
    ]
  } else {
    groups = parseGroups(value)

    if (groups === null || groups.length !== 8) return null
  }

  return groups.reduce((result, group) => (result << 16n) | BigInt(group), 0n)
}

function isForbiddenIpv6Address(address: string): boolean {
  const value = ipv6ToBigInt(address)

  if (value === null) return true

  if (value >> 32n === 0xffffn) {
    return isForbiddenIpv4Number(Number(value & 0xffffffffn))
  }

  return blockedIpv6Ranges.some(([network, prefixLength]) => {
    const networkValue = ipv6ToBigInt(network)

    if (networkValue === null) return true

    const shift = 128n - BigInt(prefixLength)

    return value >> shift === networkValue >> shift
  })
}

export function isPublicIpAddress(address: string): boolean {
  const normalizedAddress = normalizeHostname(address)
  const version = isIP(normalizedAddress)

  if (version === 4) {
    const value = parseIpv4(normalizedAddress)
    return value !== null && !isForbiddenIpv4Number(value)
  }

  if (version === 6) {
    return !isForbiddenIpv6Address(normalizedAddress)
  }

  return false
}

function isBlockedHostname(hostname: string): boolean {
  return (
    blockedHostnames.has(hostname) ||
    blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix))
  )
}

export async function validatePublicHttpUrl(input: string | URL): Promise<URL> {
  let url: URL

  try {
    url = typeof input === 'string' ? new URL(input) : new URL(input.href)
  } catch {
    throw new PublicUrlError('The URL is invalid')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new PublicUrlError('Only HTTP and HTTPS URLs are allowed')
  }

  if (url.username || url.password) {
    throw new PublicUrlError('URLs with credentials are not allowed')
  }

  const hostname = normalizeHostname(url.hostname)

  if (!hostname || isBlockedHostname(hostname)) {
    throw new PublicUrlError('The URL host is not public')
  }

  if (isIP(hostname) !== 0) {
    if (!isPublicIpAddress(hostname)) {
      throw new PublicUrlError('The URL host is not public')
    }

    return url
  }

  let addresses: ReadonlyArray<{ address: string }>

  try {
    addresses = (await lookup(hostname, {
      all: true,
      verbatim: true,
    })) as ReadonlyArray<{ address: string }>
  } catch {
    throw new PublicUrlError('The URL host could not be resolved')
  }

  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => !isPublicIpAddress(address))
  ) {
    throw new PublicUrlError('The URL host is not public')
  }

  return url
}

export async function normalizeProjectDomain(domain: string): Promise<URL> {
  const trimmedDomain = domain.trim()

  if (!trimmedDomain) {
    throw new PublicUrlError('Project domain is empty')
  }

  const hasHttpScheme = /^https?:\/\//i.test(trimmedDomain)
  const hasOtherExplicitScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmedDomain)

  if (hasOtherExplicitScheme && !hasHttpScheme) {
    throw new PublicUrlError('Only HTTP and HTTPS URLs are allowed')
  }

  const candidate = hasHttpScheme ? trimmedDomain : `https://${trimmedDomain}`
  const url = await validatePublicHttpUrl(candidate)

  url.pathname = '/'
  url.search = ''
  url.hash = ''

  return url
}

export async function validatePlaywrightRequestUrl(
  rawUrl: string
): Promise<void> {
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new PublicUrlError('A Playwright request URL is invalid')
  }

  if (url.protocol === 'http:' || url.protocol === 'https:') {
    await validatePublicHttpUrl(url)
    return
  }

  if (url.protocol === 'ws:' || url.protocol === 'wss:') {
    url.protocol = url.protocol === 'ws:' ? 'http:' : 'https:'
    await validatePublicHttpUrl(url)
    return
  }

  if (url.protocol === 'blob:') {
    await validatePublicHttpUrl(rawUrl.slice('blob:'.length))
    return
  }

  if (url.protocol === 'data:') return

  if (url.protocol === 'about:' && url.href === 'about:blank') return

  throw new PublicUrlError(
    'A Playwright request used an unsupported URL scheme'
  )
}

export interface RequestGuard {
  drain(): Promise<void>
  dispose(): Promise<void>
  getViolation(): Error | null
}

function asGuardError(error: unknown): Error {
  if (error instanceof PublicUrlError) return error
  return new PublicUrlError('A Playwright request could not be validated')
}

export async function installRequestGuard(page: Page): Promise<RequestGuard> {
  let violation: Error | null = null
  const activeRequests = new Set<Promise<void>>()

  const handleRoute = async (route: Route): Promise<void> => {
    try {
      await validatePlaywrightRequestUrl(route.request().url())
      await route.continue()
    } catch (error) {
      violation ??= asGuardError(error)
      await route.abort('blockedbyclient').catch(() => undefined)
    }
  }

  const handleWebSocket = async (
    webSocketRoute: WebSocketRoute
  ): Promise<void> => {
    try {
      await validatePlaywrightRequestUrl(webSocketRoute.url())
      webSocketRoute.connectToServer()
    } catch (error) {
      violation ??= asGuardError(error)
      await webSocketRoute
        .close({ code: 1008, reason: 'Blocked by URL policy' })
        .catch(() => undefined)
    }
  }

  const handler = async (route: Route): Promise<void> => {
    const request = handleRoute(route)
    activeRequests.add(request)

    try {
      await request
    } finally {
      activeRequests.delete(request)
    }
  }

  await page.route('**/*', handler)
  await page.routeWebSocket('**/*', async (webSocketRoute) => {
    const request = handleWebSocket(webSocketRoute)
    activeRequests.add(request)

    try {
      await request
    } finally {
      activeRequests.delete(request)
    }
  })

  return {
    async drain(): Promise<void> {
      while (activeRequests.size > 0) {
        await Promise.all([...activeRequests])
      }

      if (violation) throw violation
    },
    async dispose(): Promise<void> {
      await page.unroute('**/*', handler)
    },
    getViolation(): Error | null {
      return violation
    },
  }
}
