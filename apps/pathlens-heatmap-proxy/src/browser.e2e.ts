/// <reference lib="dom" />

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { chromium } from 'playwright'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { createProxyApp } from './app.js'
import type { ProxyConfig } from './config.js'
import type { PreviewSessionClaims } from '@workspace/contracts'
import type { RequestLike, RequestOptions } from './upstream-fetch.js'

function claimsFor(sessionId: string, hostname: string): PreviewSessionClaims {
  return {
    sessionId: `00000000-0000-4000-8000-${sessionId.padStart(12, '0')}`,
    workspaceId: '00000000-0000-4000-8000-000000000002',
    projectId: '00000000-0000-4000-8000-000000000003',
    projectDomainId: `00000000-0000-4000-8000-${sessionId.padStart(12, '0')}`,
    userId: '00000000-0000-4000-8000-000000000005',
    canonicalHostname: hostname,
    allowedHostnames: [hostname],
    pathname: '/contact',
    device: 'desktop',
    createdAt: '2026-10-22T10:00:00.000Z',
    expiresAt: '2099-10-22T10:10:00.000Z',
    revokedAt: null,
    previewIntent: 'compatibility' as const,
  }
}

const exampleClaims = claimsFor('000000000001', 'example.com')
const otherClaims = claimsFor('000000000002', 'anotherbrand.com')

class FixtureRequest extends EventEmitter implements RequestLike {
  setTimeout(_timeout: number, _callback: () => void) {
    return this
  }

  end() {}

  destroy(error?: Error) {
    if (error) this.emit('error', error)
  }
}

function fixtureResponse(
  body: string | Buffer,
  contentType: string
): IncomingMessage {
  const response = new PassThrough() as unknown as IncomingMessage
  Object.assign(response, {
    statusCode: 200,
    headers: { 'content-type': contentType },
  })
  process.nextTick(() => (response as unknown as PassThrough).end(body))
  return response
}

function fixtureBody(
  hostname: string,
  path: string
): { body: string | Buffer; contentType: string } {
  if (path === '/contact') {
    return {
      contentType: 'text/html',
      body: `<html><head><link rel="stylesheet" href="/assets/site.css"><script src="/assets/app.js"></script></head><body style="min-height: 2200px"><h1>${hostname === 'example.com' ? 'Example Contact' : 'Other Contact'}</h1><div class="hero">Hero</div><img id="logo" src="/assets/logo.svg"><img id="responsive" srcset="/assets/logo.svg 1x, /assets/logo@2x.svg 2x"><img id="unauthorized-image" src="https://evil.example.test/image.svg"><form action="/submit"><button id="submit">Submit</button></form><button id="inline" onclick="document.body.dataset.inlineRan='true'">Inline</button><a id="external" href="https://evil.example.test/next">External</a><a id="download" download href="/assets/logo.svg">Download</a></body></html>`,
    }
  }
  if (path === '/assets/site.css') {
    return {
      contentType: 'text/css',
      body: '@import "/assets/theme.css"; .hero { background-image: url("/assets/hero.svg"); font-family: Fixture; } @font-face { font-family: Fixture; src: url("https://fonts.example.test/site.woff2"); }',
    }
  }
  if (path === '/assets/theme.css') {
    return { contentType: 'text/css', body: '.hero { color: rgb(1, 2, 3); }' }
  }
  if (path === '/assets/app.js') {
    return {
      contentType: 'application/javascript',
      body: 'document.body.dataset.scriptRan="true"',
    }
  }
  if (path.endsWith('.woff2')) {
    return { contentType: 'font/woff2', body: Buffer.from('fixture-font') }
  }
  if (path.endsWith('.svg')) {
    return {
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>',
    }
  }
  return {
    contentType: 'image/svg+xml',
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>',
  }
}

function config(parentOrigin: string, proxyOrigin: string): ProxyConfig {
  return {
    javascriptExecutionPolicy: 'static-only',
    port: 0,
    publicOrigin: proxyOrigin,
    publicBasePath: '',
    dashboardOrigin: parentOrigin,
    apiOrigin: 'http://127.0.0.1:9',
    authorizationUrl: 'http://127.0.0.1:9/validate',
    sharedSecret: 'browser-test-secret',
    embeddingOrigin: parentOrigin,
    authorizationTimeoutMs: 1000,
    dnsTimeoutMs: 1000,
    connectionTimeoutMs: 1000,
    tlsTimeoutMs: 1000,
    requestTimeoutMs: 5000,
    maxHeaderBytes: 32 * 1024,
    maxResponseBytes: 2 * 1024 * 1024,
    maxRedirects: 5,
    maxConcurrentRequests: 32,
    maxHtmlBytes: 256 * 1024,
    maxCssBytes: 128 * 1024,
    maxRewrittenBytes: 512 * 1024,
    maxResourceUrlLength: 4096,
    maxCssImportDepth: 4,
    maxHtmlReferences: 100,
    maxTransformMs: 2000,
    allowedExternalOrigins: ['https://fonts.example.test'],
  }
}

function gatewayEvent(
  request: IncomingMessage,
  url: URL
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: {},
    requestContext: {
      apiId: 'browser-test',
      accountId: 'browser-test',
      domainName: url.host,
      domainPrefix: 'browser-test',
      http: {
        method: request.method ?? 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: request.socket.remoteAddress ?? '127.0.0.1',
        userAgent: request.headers['user-agent'] ?? 'browser-test',
      },
      requestId: randomUUID(),
      routeKey: '$default',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    isBase64Encoded: false,
  }
}

async function listen(
  server: ReturnType<typeof createServer>
): Promise<number> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as { port: number }).port
}

test('loads an isolated non-executable live preview with static resources', async (t) => {
  let activeSessions: Record<string, PreviewSessionClaims | null> = {
    'session-one': exampleClaims,
    'session-two': otherClaims,
  }
  const proxyCookies: string[] = []

  let proxyOrigin = ''
  const parent = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const handle = url.searchParams.get('handle') ?? 'session-one'
    response.setHeader('content-type', 'text/html; charset=utf-8')
    response.end(
      `<!doctype html><html><body><iframe id="preview" src="${proxyOrigin}/v1/session/${handle}/page/contact" sandbox="allow-same-origin" referrerpolicy="no-referrer" allow="none"></iframe></body></html>`
    )
  })
  const parentPort = await listen(parent)
  const parentOrigin = `http://127.0.0.1:${parentPort}`
  const runtimeConfig = config(parentOrigin, 'http://127.0.0.1:0')

  const proxy = createServer(async (request, response) => {
    if (request.headers.cookie) proxyCookies.push(request.headers.cookie)
    const url = new URL(request.url ?? '/', runtimeConfig.publicOrigin)
    const result = await createProxyApp({
      authorization: {
        validate: async (handle) => activeSessions[handle] ?? null,
      },
      fetchRuntime: {
        config: runtimeConfig,
        transport: {
          lookup: (_hostname, _options, callback) =>
            callback(null, [{ address: '93.184.216.34', family: 4 }]),
          request: (options: RequestOptions, callback) => {
            const requestHandle = new FixtureRequest()
            const fixture = fixtureBody(options.hostname, options.path)
            process.nextTick(() =>
              callback(fixtureResponse(fixture.body, fixture.contentType))
            )
            return requestHandle
          },
        },
      },
    })(gatewayEvent(request, url))
    response.statusCode = result.statusCode ?? 500
    for (const [name, value] of Object.entries(result.headers ?? {}))
      response.setHeader(name, String(value))
    if (result.body) {
      response.end(
        result.isBase64Encoded
          ? Buffer.from(result.body, 'base64')
          : result.body
      )
    } else response.end()
  })
  const proxyPort = await listen(proxy)
  runtimeConfig.publicOrigin = `http://127.0.0.1:${proxyPort}`
  proxyOrigin = runtimeConfig.publicOrigin

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const requests: string[] = []
  page.on('request', (request) => requests.push(request.url()))
  t.after(async () => {
    await browser.close()
    await new Promise<void>((resolve) => proxy.close(() => resolve()))
    await new Promise<void>((resolve) => parent.close(() => resolve()))
  })

  await page.goto(`${parentOrigin}/?handle=session-one`)
  assert.equal(
    await page.locator('#preview').getAttribute('sandbox'),
    'allow-same-origin'
  )
  assert.equal(
    await page.locator('#preview').getAttribute('referrerpolicy'),
    'no-referrer'
  )
  assert.equal(await page.locator('#preview').getAttribute('allow'), 'none')
  let frame = page
    .frames()
    .find((candidate) => candidate.url().startsWith(proxyOrigin))
  assert.ok(frame)
  await frame.waitForSelector('h1')
  assert.equal(await frame.locator('h1').textContent(), 'Example Contact')
  assert.equal(
    await frame
      .locator('#logo')
      .evaluate((element) => (element as HTMLImageElement).complete),
    true
  )
  assert.equal(
    await frame
      .locator('.hero')
      .evaluate((element) => getComputedStyle(element).color),
    'rgb(1, 2, 3)'
  )
  assert.equal(await frame.locator('form').count(), 0)
  assert.equal(
    await frame.locator('#unauthorized-image').getAttribute('src'),
    null
  )
  assert.equal(
    await frame.evaluate(() => document.body.dataset.scriptRan ?? ''),
    ''
  )
  assert.equal(
    await frame.evaluate(() => document.body.dataset.inlineRan ?? ''),
    ''
  )
  assert.equal(
    await frame.evaluate(() => {
      try {
        return document.cookie
      } catch {
        return 'blocked'
      }
    }),
    ''
  )
  assert.ok(
    await frame.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight
    )
  )
  await frame.evaluate(() => window.scrollTo(0, 1000))
  assert.ok(await frame.evaluate(() => window.scrollY > 0))
  assert.equal(await frame.locator('#external').getAttribute('href'), '#')
  assert.equal(await frame.locator('#download').getAttribute('download'), null)
  assert.equal(await frame.locator('#preview').count(), 0)
  await frame.locator('#inline').click()
  assert.equal(
    await frame.evaluate(() => document.body.dataset.inlineRan ?? ''),
    ''
  )
  const frameUrlBeforeNavigation = frame.url()
  const popupPromise = page.waitForEvent('popup', { timeout: 300 }).then(
    () => true,
    () => false
  )
  await frame.locator('#external').click()
  const popup = await popupPromise
  assert.equal(popup, false)
  assert.equal(
    frame.url().split('#')[0],
    frameUrlBeforeNavigation.split('#')[0]
  )
  assert.ok(requests.some((url) => url.includes('/resource')))
  assert.equal(
    requests.some((url) => url.includes('evil.example.test')),
    false
  )
  assert.equal(
    requests.some((url) => url.includes('/assets/app.js')),
    false
  )
  assert.equal(
    requests.some(
      (url) => !url.startsWith(parentOrigin) && !url.startsWith(proxyOrigin)
    ),
    false
  )
  assert.equal(new URL(frame.url()).origin, proxyOrigin)
  assert.deepEqual(proxyCookies, [])

  await page.goto(`${parentOrigin}/?handle=session-two`)
  frame = page
    .frames()
    .find((candidate) => candidate.url().startsWith(proxyOrigin))
  assert.ok(frame)
  await frame.waitForSelector('h1')
  assert.equal(await frame.locator('h1').textContent(), 'Other Contact')
  assert.equal(
    await frame.locator('#logo').evaluate((element) => {
      const image = element as HTMLImageElement
      return image.complete && image.naturalWidth > 0
    }),
    true
  )
  assert.equal(
    (await frame.locator('#logo').getAttribute('src'))?.includes('/resource'),
    true
  )
  assert.equal(await frame.locator('h1').textContent(), 'Other Contact')
  await page.setViewportSize({ width: 390, height: 844 })
  assert.ok(
    await frame.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight
    )
  )

  activeSessions['session-one'] = null
  await page.goto(`${parentOrigin}/?handle=session-one`)
  frame = page
    .frames()
    .find((candidate) => candidate.url().startsWith(proxyOrigin))
  assert.ok(frame)
  await frame.waitForLoadState()
  assert.match(
    (await frame.locator('body').textContent()) ?? '',
    /SESSION_EXPIRED/
  )
  assert.equal(await frame.locator('img').count(), 0)
})
