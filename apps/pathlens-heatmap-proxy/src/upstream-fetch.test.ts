import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { gzipSync } from 'node:zlib'
import type { IncomingMessage } from 'node:http'
import { PassThrough } from 'node:stream'
import {
  fetchUpstream,
  isPublicAddress,
  resolvePublicAddresses,
  UpstreamSecurityError,
  type RequestLike,
  type RequestOptions,
} from './upstream-fetch.js'
import type { ProxyConfig } from './config.js'

const session = {
  sessionId: '00000000-0000-4000-8000-000000000001',
  workspaceId: '00000000-0000-4000-8000-000000000002',
  projectId: '00000000-0000-4000-8000-000000000003',
  projectDomainId: '00000000-0000-4000-8000-000000000004',
  userId: '00000000-0000-4000-8000-000000000005',
  canonicalHostname: 'example.com',
  allowedHostnames: ['example.com', 'www.example.com'],
  pathname: '/contact',
  device: 'desktop' as const,
  createdAt: '2026-10-22T10:00:00.000Z',
  expiresAt: '2026-10-22T10:10:00.000Z',
  revokedAt: null,
  previewIntent: 'compatibility' as const,
}

const config: ProxyConfig = {
  javascriptExecutionPolicy: 'static-only',
  port: 8082,
  publicOrigin: 'http://localhost:8082',
  publicBasePath: '',
  authorizationUrl: 'http://localhost:8080/validate',
  sharedSecret: 'test-secret',
  authorizationTimeoutMs: 100,
  dnsTimeoutMs: 20,
  connectionTimeoutMs: 20,
  tlsTimeoutMs: 20,
  requestTimeoutMs: 100,
  maxHeaderBytes: 1024,
  maxResponseBytes: 1024,
  maxRedirects: 5,
  maxConcurrentRequests: 2,
  maxHtmlBytes: 4096,
  maxCssBytes: 4096,
  maxRewrittenBytes: 8192,
  maxResourceUrlLength: 4096,
  maxCssImportDepth: 4,
  maxHtmlReferences: 100,
  maxTransformMs: 1000,
  allowedExternalOrigins: [],
  embeddingOrigin: null,
  dashboardOrigin: 'http://localhost:5173',
  apiOrigin: 'http://localhost:8080',
}

class FakeRequest extends EventEmitter {
  private timeoutHandler: () => void

  constructor(timeoutHandler: () => void) {
    super()
    this.timeoutHandler = timeoutHandler
  }

  setTimeout(_timeout: number, callback: () => void) {
    this.timeoutHandler = callback
    return this
  }

  end() {
    return undefined
  }

  destroy(error?: Error) {
    if (error) this.emit('error', error)
    return this
  }
}

function response(
  body: Buffer | string,
  headers: Record<string, string> = { 'content-type': 'text/html' },
  statusCode = 200
) {
  const stream = new PassThrough()
  const source = body instanceof Buffer ? body : Buffer.from(body)
  Object.assign(stream, {
    headers,
    statusCode,
  })
  process.nextTick(() => stream.end(source))
  return stream as unknown as IncomingMessage
}

function runtime(
  responses: Array<IncomingMessage>,
  options: {
    config?: Partial<ProxyConfig>
    lookup?: (
      hostname: string,
      options: unknown,
      callback: (
        error: Error | null,
        addresses?: Array<{ address: string; family: 4 | 6 }>
      ) => void
    ) => void
  } = {}
) {
  let index = 0
  const seen: Array<{ hostname: string; servername?: string }> = []
  return {
    seen,
    config: { ...config, ...options.config },
    requestId: 'test-request-id',
    transport: {
      lookup:
        options.lookup ??
        ((_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }])),
      request: (
        requestOptions: RequestOptions,
        callback: (value: IncomingMessage) => void
      ): RequestLike => {
        seen.push({
          hostname: requestOptions.hostname,
          servername: requestOptions.servername,
        })
        const request = new FakeRequest(() => undefined)
        process.nextTick(() =>
          callback(responses[index++] ?? response('missing'))
        )
        return request
      },
    },
  }
}

async function rejectsCode(promise: Promise<unknown>, code: string) {
  await assert.rejects(
    promise,
    (error: unknown) =>
      error instanceof UpstreamSecurityError && error.code === code
  )
}

test('rejects non-public, mapped, reserved, and alternate network addresses', () => {
  for (const address of [
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '224.0.0.1',
    '::',
    '::1',
    '::ffff:127.0.0.1',
    'fe80::1',
    'fc00::1',
    'ff02::1',
    '2001:db8::1',
  ])
    assert.equal(isPublicAddress(address), false, address)
  assert.equal(isPublicAddress('93.184.216.34'), true)
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true)
})

test('rejects mixed public and private DNS answers', async () => {
  await rejectsCode(
    resolvePublicAddresses('example.com', 20, (_hostname, _options, callback) =>
      callback(null, [
        { address: '93.184.216.34', family: 4 },
        { address: '127.0.0.1', family: 4 },
      ])
    ),
    'PRIVATE_ADDRESS'
  )
})

test('fetches authorized HTML and pins validated DNS while preserving TLS SNI', async () => {
  const testRuntime = runtime([response('<html>ok</html>')])
  const result = await fetchUpstream(testRuntime, {
    session,
    url: 'https://www.example.com/contact',
    method: 'GET',
    category: 'page',
  })
  assert.equal(result.contentType, 'text/html')
  assert.equal(result.body.toString(), '<html>ok</html>')
  assert.deepEqual(testRuntime.seen, [
    { hostname: 'www.example.com', servername: 'www.example.com' },
  ])
})

test('supports HEAD and static resource content types without exposing unsafe headers', async () => {
  for (const type of [
    'text/css',
    'application/javascript',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/avif',
    'image/gif',
    'font/woff2',
  ]) {
    const result = await fetchUpstream(
      runtime([
        response('asset', {
          'content-type': type,
          'set-cookie': 'secret=1',
          location: 'https://internal.example',
          'content-security-policy': 'unsafe-inline',
        }),
      ]),
      {
        session,
        url: 'https://example.com/assets/file',
        method: 'GET',
        category: 'resource',
      }
    )
    assert.equal(result.contentType, type)
    assert.equal(result.body.toString(), 'asset')
    assert.equal('set-cookie' in result.headers, false)
    assert.equal('location' in result.headers, false)
    assert.equal('content-security-policy' in result.headers, false)
  }
  const result = await fetchUpstream(
    runtime([response('', { 'content-type': 'text/css' })]),
    {
      session,
      url: 'https://example.com/assets/file',
      method: 'HEAD',
      category: 'resource',
    }
  )
  assert.equal(result.body.length, 0)
})

test('handles compressed responses and enforces decompressed size limits', async () => {
  const compressed = gzipSync(Buffer.from('compressed html'))
  const result = await fetchUpstream(
    runtime([
      response(compressed, {
        'content-type': 'text/html',
        'content-encoding': 'gzip',
      }),
    ]),
    {
      session,
      url: 'https://example.com/contact',
      method: 'GET',
      category: 'page',
    }
  )
  assert.equal(result.body.toString(), 'compressed html')
  await rejectsCode(
    fetchUpstream(
      runtime(
        [
          response(gzipSync(Buffer.alloc(2048)), {
            'content-type': 'text/html',
            'content-encoding': 'gzip',
          }),
        ],
        { config: { maxResponseBytes: 64 } }
      ),
      {
        session,
        url: 'https://example.com/contact',
        method: 'GET',
        category: 'page',
      }
    ),
    'RESPONSE_TOO_LARGE'
  )
})

test('validates every redirect, blocks loops and HTTPS downgrade', async () => {
  const redirected = runtime([
    response('', { location: '/contact?step=1' }, 302),
    response('<html>ok</html>'),
  ])
  const result = await fetchUpstream(redirected, {
    session,
    url: 'https://example.com/contact',
    method: 'GET',
    category: 'page',
  })
  assert.equal(result.redirects, 1)
  await rejectsCode(
    fetchUpstream(
      runtime([
        response('', { location: 'https://anotherbrand.com/contact' }, 302),
      ]),
      {
        session,
        url: 'https://example.com/contact',
        method: 'GET',
        category: 'page',
      }
    ),
    'RESOURCE_NOT_ALLOWED'
  )
  await rejectsCode(
    fetchUpstream(
      runtime([response('', { location: 'http://example.com/contact' }, 302)]),
      {
        session,
        url: 'https://example.com/contact',
        method: 'GET',
        category: 'page',
      }
    ),
    'PROTOCOL_DOWNGRADE'
  )
  await rejectsCode(
    fetchUpstream(
      runtime([
        response('', { location: '/contact' }, 302),
        response('', { location: '/contact' }, 302),
      ]),
      {
        session,
        url: 'https://example.com/contact',
        method: 'GET',
        category: 'page',
      }
    ),
    'REDIRECT_LOOP'
  )
  await rejectsCode(
    fetchUpstream(
      runtime(
        [
          response('', { location: '/contact?one' }, 302),
          response('', { location: '/contact?two' }, 302),
        ],
        { config: { maxRedirects: 1 } }
      ),
      {
        session,
        url: 'https://example.com/contact',
        method: 'GET',
        category: 'page',
      }
    ),
    'TOO_MANY_REDIRECTS'
  )
})

test('rejects credentials, ports, unsupported protocols, suffix bypasses, and unauthorized paths', async () => {
  for (const url of [
    'file:///etc/passwd',
    'https://user:pass@example.com/contact',
    'https://example.com:8443/contact',
    'https://example.com.evil.test/contact',
    'https://example.com/about',
  ]) {
    await rejectsCode(
      fetchUpstream(runtime([response('<html>no</html>')]), {
        session,
        url,
        method: 'GET',
        category: 'page',
      }),
      url.endsWith('/about')
        ? 'PATH_NOT_ALLOWED'
        : url.startsWith('file:')
          ? 'PROTOCOL_NOT_ALLOWED'
          : url.includes(':8443') || url.includes('@')
            ? 'URL_NOT_ALLOWED'
            : 'RESOURCE_NOT_ALLOWED'
    )
  }
})

test('enforces DNS timeout and request timeout', async () => {
  await rejectsCode(
    fetchUpstream(
      runtime([response('never')], {
        config: { dnsTimeoutMs: 1 },
        lookup: () => undefined,
      }),
      {
        session,
        url: 'https://example.com/contact',
        method: 'GET',
        category: 'page',
      }
    ),
    'DNS_TIMEOUT'
  )
  const testRuntime = runtime([], { config: { requestTimeoutMs: 1 } })
  testRuntime.transport.request = (
    _options: RequestOptions,
    _callback: (value: IncomingMessage) => void
  ): RequestLike => {
    return new FakeRequest(() => undefined)
  }
  await rejectsCode(
    fetchUpstream(testRuntime, {
      session,
      url: 'https://example.com/contact',
      method: 'GET',
      category: 'page',
    }),
    'REQUEST_TIMEOUT'
  )
})

test('cancels a stalled body and propagates TLS certificate failures', async () => {
  const hanging = new PassThrough() as unknown as IncomingMessage
  Object.assign(hanging, {
    headers: { 'content-type': 'text/html' },
    statusCode: 200,
  })
  const stalled = runtime([hanging], { config: { requestTimeoutMs: 5 } })
  await rejectsCode(
    fetchUpstream(stalled, {
      session,
      url: 'https://example.com/contact',
      method: 'GET',
      category: 'page',
    }),
    'REQUEST_TIMEOUT'
  )

  const tlsFailure = runtime([])
  tlsFailure.transport.request = (
    _options: RequestOptions,
    _callback: (value: IncomingMessage) => void
  ): RequestLike => {
    const request = new FakeRequest(() => undefined)
    process.nextTick(() =>
      request.emit(
        'error',
        Object.assign(new Error('certificate rejected'), {
          code: 'ERR_TLS_CERT_ALTNAME_INVALID',
        })
      )
    )
    return request
  }
  await assert.rejects(
    fetchUpstream(tlsFailure, {
      session,
      url: 'https://example.com/contact',
      method: 'GET',
      category: 'page',
    }),
    /certificate rejected/
  )
})
