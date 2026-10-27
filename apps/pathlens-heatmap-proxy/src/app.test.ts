import assert from 'node:assert/strict'
import test from 'node:test'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda'
import { createProxyApp } from './app.js'
import { normalizeGatewayEvent } from './gateway-event.js'
import { authorizeResourceRequest } from './resource-authorization.js'
import type { ProxyConfig } from './config.js'
import type { IncomingMessage } from 'node:http'
import type { RequestLike, RequestOptions } from './upstream-fetch.js'

const claims = {
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

function event(
  path: string,
  method = 'GET',
  rawQueryString = ''
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString,
    headers: {},
    requestContext: {
      apiId: 'test',
      accountId: 'test',
      domainName: 'test',
      domainPrefix: 'test',
      http: {
        method,
        path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'request-id',
      routeKey: '$default',
      stage: '$default',
      time: '22/Oct/2026:10:00:00 +0000',
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
  }
}

function restEvent(
  path: string,
  method = 'GET',
  queryStringParameters?: Record<string, string>,
  multiValueQueryStringParameters?: Record<string, string[]>
) {
  return {
    httpMethod: method,
    path: `/dev${path}`,
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: queryStringParameters ?? null,
    multiValueQueryStringParameters: multiValueQueryStringParameters ?? null,
    requestContext: {
      accountId: 'test',
      apiId: 'test',
      domainName: 'test.execute-api.test',
      domainPrefix: 'test',
      extendedRequestId: 'extended-request-id',
      httpMethod: method,
      path: `/dev${path}`,
      protocol: 'HTTP/1.1',
      requestId: 'request-id-v1',
      requestTime: '22/Oct/2026:10:00:00 +0000',
      requestTimeEpoch: Date.now(),
      resourceId: 'test',
      resourcePath: '/{proxy+}',
      stage: 'dev',
    },
    body: null,
    isBase64Encoded: false,
  }
}

const fetchConfig: ProxyConfig = {
  javascriptExecutionPolicy: 'static-only',
  port: 8082,
  publicOrigin: 'https://proxy.example.test',
  publicBasePath: '',
  authorizationUrl: 'https://api.example.test/validate',
  sharedSecret: 'test-secret',
  authorizationTimeoutMs: 100,
  dnsTimeoutMs: 100,
  connectionTimeoutMs: 100,
  tlsTimeoutMs: 100,
  requestTimeoutMs: 1000,
  maxHeaderBytes: 4096,
  maxResponseBytes: 1024 * 1024,
  maxRedirects: 5,
  maxConcurrentRequests: 2,
  maxHtmlBytes: 64 * 1024,
  maxCssBytes: 64 * 1024,
  maxRewrittenBytes: 128 * 1024,
  maxResourceUrlLength: 4096,
  maxCssImportDepth: 4,
  maxHtmlReferences: 100,
  maxTransformMs: 1000,
  allowedExternalOrigins: [],
  embeddingOrigin: null,
  dashboardOrigin: 'http://localhost:5173',
  apiOrigin: 'http://localhost:8080',
}

class TestRequest extends EventEmitter implements RequestLike {
  setTimeout(_timeout: number, _callback: () => void) {
    return this
  }

  end() {}

  destroy(error?: Error) {
    if (error) this.emit('error', error)
  }
}

function upstreamResponse(
  body: string | Buffer,
  contentType: string
): IncomingMessage {
  const response = new PassThrough() as unknown as IncomingMessage
  Object.assign(response, {
    headers: { 'content-type': contentType },
    statusCode: 200,
  })
  process.nextTick(() => (response as unknown as PassThrough).end(body))
  return response
}

function body(result: APIGatewayProxyStructuredResultV2) {
  return JSON.parse(result.body ?? '{}')
}

test('proxy health does not require external authorization', async () => {
  const app = createProxyApp({
    authorization: { validate: async () => claims },
  })

  const result = await app(event('/health/live'))
  assert.equal(result.statusCode, 200)
  assert.deepEqual(body(result), { status: 'ok' })
})

test('REST API v1 stage is removed before health and session routing', async () => {
  const app = createProxyApp({
    authorization: { validate: async () => claims },
  })

  const live = await app(restEvent('/health/live'))
  assert.equal(live.statusCode, 200)

  const ready = await app(restEvent('/health/ready'))
  assert.equal(ready.statusCode, 200)

  const preview = await app(restEvent('/v1/session/session/page/contact'))
  assert.equal(preview.statusCode, 501)
})

test('REST API v1 query parameters preserve repeated values', () => {
  const normalized = normalizeGatewayEvent(
    restEvent(
      '/v1/session/session/resource',
      'GET',
      { t: 'target' },
      { depth: ['0', '1'] }
    )
  )
  assert.equal(normalized.path, '/v1/session/session/resource')
  assert.equal(normalized.rawQueryString, 't=target&depth=0&depth=1')
})

test('malformed gateway events return a controlled client error', async () => {
  const app = createProxyApp({
    authorization: { validate: async () => claims },
  })

  const missingMethod = await app({
    version: '2.0',
    rawPath: '/health/live',
    rawQueryString: '',
    requestContext: { requestId: 'bad' },
  })
  assert.equal(missingMethod.statusCode, 400)
  assert.equal(body(missingMethod).error.code, 'INVALID_REQUEST')

  const malformedContext = await app({
    httpMethod: 'GET',
    path: '/dev/health/live',
  })
  assert.equal(malformedContext.statusCode, 400)
})

test('authorized placeholder is domain and path scoped', async () => {
  let calls = 0
  const app = createProxyApp({
    authorization: {
      validate: async (handle) => {
        calls += 1
        return handle === 'session' ? claims : null
      },
    },
  })

  const authorized = await app(event('/v1/session/session/page/contact'))
  assert.equal(authorized.statusCode, 501)
  assert.equal(body(authorized).error.code, 'PROXY_NOT_IMPLEMENTED')

  const wrongPath = await app(event('/v1/session/session/page/about'))
  assert.equal(wrongPath.statusCode, 403)

  const unauthorized = await app(event('/v1/session/other/page/contact'))
  assert.equal(unauthorized.statusCode, 401)
  assert.equal(calls, 3)
})

test('nested preview paths are fetched and rewritten as one authorized pathname', async () => {
  const nestedClaims = { ...claims, pathname: '/work/pathlens' }
  let requestedUrl = ''
  const app = createProxyApp({
    authorization: { validate: async () => nestedClaims },
    fetchRuntime: {
      config: fetchConfig,
      transport: {
        lookup: (_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }]),
        request: (options: RequestOptions, callback) => {
          requestedUrl = `https://${options.hostname}${options.path}`
          const request = new TestRequest()
          callback(
            upstreamResponse(
              '<!doctype html><link rel="stylesheet" href="./assets/site.css">',
              'text/html'
            )
          )
          return request
        },
      },
    },
  })

  const result = await app(event('/v1/session/session/page/work/pathlens'))
  assert.equal(result.statusCode, 200)
  assert.equal(requestedUrl, 'https://example.com/work/pathlens')

  const html = Buffer.from(result.body ?? '', 'base64').toString('utf8')
  assert.match(html, /v1\/session\/session\/resource/)
  assert.match(html, /resource\?t=/)

  const sibling = await app(event('/v1/session/session/page/work/other'))
  assert.equal(sibling.statusCode, 403)
  assert.equal(body(sibling).error.code, 'PATH_NOT_ALLOWED')
})

test('unsafe methods are rejected before placeholder handling', async () => {
  const app = createProxyApp({
    authorization: { validate: async () => claims },
  })

  const result = await app(event('/v1/session/session/page/contact', 'POST'))
  assert.equal(result.statusCode, 405)
  assert.equal(body(result).error.code, 'METHOD_NOT_ALLOWED')
})

test('resource authorization keeps same-path domains isolated', () => {
  assert.equal(
    authorizeResourceRequest(claims, 'https://example.com/app.js', 'GET')
      .allowed,
    true
  )
  assert.equal(
    authorizeResourceRequest(claims, 'https://anotherbrand.com/app.js', 'GET')
      .allowed,
    false
  )
  assert.equal(
    authorizeResourceRequest(claims, 'https://www.example.com/app.js', 'HEAD')
      .allowed,
    true
  )
})

test('authorized local fixture preview is rewritten and remains non-executable', async () => {
  let requests = 0
  const app = createProxyApp({
    authorization: { validate: async () => claims },
    fetchRuntime: {
      config: fetchConfig,
      transport: {
        lookup: (_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }]),
        request: (_options: RequestOptions, callback) => {
          requests += 1
          const request = new TestRequest()
          callback(
            upstreamResponse(
              '<script>alert(1)</script><img src="/fixture.png">',
              'text/html'
            )
          )
          return request
        },
      },
    },
  })
  const result = await app(event('/v1/session/session/page/contact'))
  assert.equal(result.statusCode, 200)
  assert.equal(result.isBase64Encoded, true)
  const html = Buffer.from(result.body ?? '', 'base64').toString('utf8')
  assert.match(html, /application\/x-pathlens-disabled/)
  assert.match(html, /v1\/session\/session\/resource/)
  assert.equal(
    String(result.headers?.['content-security-policy']).includes(
      "script-src 'none'"
    ),
    true
  )
  assert.equal(requests, 1)
})

test('authorized resource route returns bounded binary content and rejects an unapproved origin', async () => {
  const app = createProxyApp({
    authorization: { validate: async () => claims },
    fetchRuntime: {
      config: fetchConfig,
      transport: {
        lookup: (_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }]),
        request: (_options: RequestOptions, callback) => {
          const request = new TestRequest()
          callback(upstreamResponse(Buffer.from([1, 2, 3]), 'image/png'))
          return request
        },
      },
    },
  })
  const target = Buffer.from('https://example.com/fixture.png').toString(
    'base64url'
  )
  const result = await app(
    event('/v1/session/session/resource', 'GET', `t=${target}&depth=0`)
  )
  assert.equal(result.statusCode, 200)
  assert.equal(result.isBase64Encoded, true)
  assert.equal(result.headers?.['access-control-allow-origin'], '*')
  assert.deepEqual(
    Buffer.from(result.body ?? '', 'base64'),
    Buffer.from([1, 2, 3])
  )

  const external = Buffer.from(
    'https://cdn.not-approved.test/fixture.png'
  ).toString('base64url')
  const denied = await app(
    event('/v1/session/session/resource', 'GET', `t=${external}&depth=0`)
  )
  assert.equal(denied.statusCode, 403)
})

test('REST v1 and HTTP v2 authorized JavaScript resources preserve CORS and binary responses', async () => {
  const javascriptConfig = {
    ...fetchConfig,
    javascriptExecutionPolicy: 'isolated-script-runtime' as const,
  }
  const app = createProxyApp({
    authorization: { validate: async () => claims },
    fetchRuntime: {
      config: javascriptConfig,
      transport: {
        lookup: (_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }]),
        request: (_options: RequestOptions, callback) => {
          const request = new TestRequest()
          callback(
            upstreamResponse('export const loaded = true', 'text/javascript')
          )
          return request
        },
      },
    },
  })
  const target = Buffer.from('https://example.com/module.js').toString(
    'base64url'
  )
  const query = `t=${target}&depth=0`

  for (const request of [
    restEvent('/v1/session/session/resource', 'GET', {
      t: target,
      depth: '0',
    }),
    event('/v1/session/session/resource', 'GET', query),
  ]) {
    const result = await app(request)
    assert.equal(result.statusCode, 200)
    assert.equal(result.headers?.['content-type'], 'text/javascript')
    assert.equal(result.headers?.['access-control-allow-origin'], '*')
    assert.equal(result.isBase64Encoded, true)
    assert.match(
      Buffer.from(result.body ?? '', 'base64').toString('utf8'),
      /loaded/
    )
  }
})

test('resource URLs stop working after the preview session expires', async () => {
  let activeSession: typeof claims | null = claims
  const app = createProxyApp({
    authorization: { validate: async () => activeSession },
    fetchRuntime: {
      config: fetchConfig,
      transport: {
        lookup: (_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }]),
        request: (_options: RequestOptions, callback) => {
          const request = new TestRequest()
          callback(upstreamResponse(Buffer.from([1, 2, 3]), 'image/gif'))
          return request
        },
      },
    },
  })
  const target = Buffer.from('https://example.com/image.gif').toString(
    'base64url'
  )
  const path = '/v1/session/session/resource'
  const active = await app(event(path, 'GET', `t=${target}&depth=0`))
  assert.equal(active.statusCode, 200)
  assert.equal(active.headers?.['access-control-allow-origin'], '*')
  activeSession = null
  const expired = await app(event(path, 'GET', `t=${target}&depth=0`))
  assert.equal(expired.statusCode, 401)
  assert.equal(expired.headers?.['access-control-allow-origin'], '*')
  activeSession = claims
  const invalid = await app(event(path, 'GET', 't=not-valid-base64&depth=0'))
  assert.equal(invalid.statusCode, 400)
  assert.equal(invalid.headers?.['access-control-allow-origin'], '*')
})

test('preview resource route blocks Pathlens tracker collection targets', async () => {
  let upstreamCalls = 0
  const app = createProxyApp({
    authorization: { validate: async () => claims },
    fetchRuntime: {
      config: fetchConfig,
      transport: {
        lookup: (_hostname, _options, callback) =>
          callback(null, [{ address: '93.184.216.34', family: 4 }]),
        request: (_options: RequestOptions, callback) => {
          upstreamCalls += 1
          const request = new TestRequest()
          callback(upstreamResponse('{}', 'application/json'))
          return request
        },
      },
    },
  })
  const target = Buffer.from(
    'https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com/dev/api/events'
  ).toString('base64url')
  const result = await app(
    event('/v1/session/session/resource', 'GET', `t=${target}&depth=0`)
  )
  assert.equal(result.statusCode, 403)
  assert.equal(body(result).error.code, 'TRACKING_DISABLED')
  assert.equal(upstreamCalls, 0)
})

test('heatmap runtime bridge is disabled in static-only mode', async () => {
  const app = createProxyApp({
    authorization: {
      validate: async () => ({ ...claims, previewIntent: 'heatmap' as const }),
    },
    fetchRuntime: { config: fetchConfig },
  })

  const result = await app(
    event('/v1/session/session/runtime/scroll-controller.js')
  )
  assert.equal(result.statusCode, 404)
})

test('heatmap runtime bridge contains the versioned measurement handshake', async () => {
  const app = createProxyApp({
    authorization: {
      validate: async () => ({ ...claims, previewIntent: 'heatmap' as const }),
    },
    fetchRuntime: {
      config: {
        ...fetchConfig,
        javascriptExecutionPolicy: 'isolated-script-runtime',
      },
    },
  })

  const result = await app(
    event('/v1/session/session/runtime/scroll-controller.js')
  )
  assert.equal(result.statusCode, 200)
  const script = Buffer.from(result.body ?? '', 'base64').toString('utf8')
  assert.match(script, /PATHLENS_MEASURE_REQUEST/)
  assert.match(script, /PATHLENS_MEASURE_STATE/)
  assert.match(script, /event\.source !== window\.parent/)
  assert.match(script, /MAX_SCROLL_DELTA/)
  assert.match(script, /SEMANTIC_TAGS/)
  assert.match(script, /structuralPath/)
  assert.match(script, /current\.children\.length >= 2/)
  assert.match(script, /SENSITIVE_SELECTOR/)
  assert.match(script, /MAX_REGION_IDS/)
  assert.match(script, /status: 'ambiguous'/)
  assert.match(script, /TEXT_ANCHOR_BUCKETS/)
  assert.match(script, /getTextAnchorCandidates/)
  assert.match(script, /getAnchorCandidates/)
  assert.match(script, /document\.createRange\(\)/)
})
