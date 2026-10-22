/// <reference lib="dom" />

import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage } from 'node:http'
import { join, normalize } from 'node:path'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { chromium } from 'playwright'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { PreviewSessionClaims } from '@workspace/contracts'
import { createProxyApp } from './app.js'
import type { ProxyConfig } from './config.js'
import type { RequestLike, RequestOptions } from './upstream-fetch.js'

const fixtureRoot = join(process.cwd(), '..', 'pathlens-heatmap-proxy-fixtures')

type FixtureName = 'react' | 'next' | 'animation'

const hosts: Record<FixtureName, string> = {
  react: 'react.fixture.test',
  next: 'next.fixture.test',
  animation: 'animation.fixture.test',
}

function claimsFor(
  name: FixtureName,
  previewIntent: 'compatibility' | 'heatmap' = 'compatibility'
): PreviewSessionClaims {
  return {
    sessionId: `00000000-0000-4000-8000-${name === 'react' ? '000000000021' : name === 'next' ? '000000000022' : '000000000023'}`,
    workspaceId: '00000000-0000-4000-8000-000000000024',
    projectId: '00000000-0000-4000-8000-000000000025',
    projectDomainId: `00000000-0000-4000-8000-${name === 'react' ? '000000000026' : name === 'next' ? '000000000027' : '000000000028'}`,
    userId: '00000000-0000-4000-8000-000000000029',
    canonicalHostname: hosts[name],
    allowedHostnames: [hosts[name]],
    pathname: '/contact',
    device: 'desktop',
    createdAt: '2026-10-22T10:00:00.000Z',
    expiresAt: '2099-10-22T10:10:00.000Z',
    revokedAt: null,
    previewIntent,
  }
}

class FixtureRequest extends EventEmitter implements RequestLike {
  setTimeout() {
    return this
  }

  end() {}

  destroy(error?: Error) {
    if (error) this.emit('error', error)
  }
}

function contentType(path: string): string {
  if (path.endsWith('.html')) return 'text/html'
  if (path.endsWith('.js')) return 'application/javascript'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.json')) return 'application/json'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.woff2')) return 'font/woff2'
  return 'application/octet-stream'
}

function response(body: string | Buffer, type: string): IncomingMessage {
  const result = new PassThrough() as unknown as IncomingMessage
  Object.assign(result, {
    statusCode: 200,
    headers: { 'content-type': type },
  })
  process.nextTick(() => (result as unknown as PassThrough).end(body))
  return result
}

function fixturePath(name: FixtureName, requestPath: string): string {
  const path = requestPath.split('?', 1)[0] ?? '/'
  if (name === 'react') {
    return join(
      fixtureRoot,
      'dist',
      'react',
      path === '/contact' ? 'index.html' : path.slice(1)
    )
  }
  if (name === 'next') {
    return join(
      fixtureRoot,
      'out',
      path === '/contact' ? 'contact/index.html' : path.slice(1)
    )
  }
  return join(
    fixtureRoot,
    'dist',
    'animation',
    path === '/contact' ? 'index.html' : path.slice(1)
  )
}

function makeConfig(parentOrigin: string, proxyOrigin: string): ProxyConfig {
  return {
    javascriptExecutionPolicy: 'isolated-script-runtime',
    port: 0,
    publicOrigin: proxyOrigin,
    dashboardOrigin: parentOrigin,
    apiOrigin: 'http://127.0.0.1:9',
    authorizationUrl: 'http://127.0.0.1:9/validate',
    sharedSecret: 'framework-test-secret',
    embeddingOrigin: parentOrigin,
    authorizationTimeoutMs: 1000,
    dnsTimeoutMs: 1000,
    connectionTimeoutMs: 1000,
    tlsTimeoutMs: 1000,
    requestTimeoutMs: 5000,
    maxHeaderBytes: 32 * 1024,
    maxResponseBytes: 4 * 1024 * 1024,
    maxRedirects: 5,
    maxConcurrentRequests: 32,
    maxHtmlBytes: 512 * 1024,
    maxCssBytes: 256 * 1024,
    maxRewrittenBytes: 2 * 1024 * 1024,
    maxResourceUrlLength: 4096,
    maxCssImportDepth: 4,
    maxHtmlReferences: 1000,
    maxTransformMs: 5000,
    allowedExternalOrigins: [],
  }
}

function event(request: IncomingMessage, url: URL): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers: {},
    requestContext: {
      apiId: 'framework-test',
      accountId: 'framework-test',
      domainName: url.host,
      domainPrefix: 'framework-test',
      http: {
        method: request.method ?? 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: request.socket.remoteAddress ?? '127.0.0.1',
        userAgent: request.headers['user-agent'] ?? 'framework-test',
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

function assertFixtureExists(name: FixtureName): void {
  const file = fixturePath(name, '/contact')
  assert.ok(normalize(file).startsWith(normalize(fixtureRoot)))
  assert.doesNotThrow(() => readFileSync(file))
}

async function openFixture(
  name: FixtureName,
  config: ProxyConfig,
  sessions: Record<string, PreviewSessionClaims>,
  previewIntent: 'compatibility' | 'heatmap' = 'compatibility'
) {
  const parent = createServer((_request, reply) => {
    reply.setHeader('content-type', 'text/html; charset=utf-8')
    reply.end(
      `<style>body{margin:0}.stage{position:relative;width:100vw;height:100vh}iframe{width:100%;height:100%;border:0}#shield{position:absolute;inset:0;z-index:1;background:transparent}</style><div class="stage"><iframe id="preview" src="${config.publicOrigin}/v1/session/${name}/page/contact" sandbox="allow-scripts" referrerpolicy="no-referrer" allow=""></iframe><div id="shield"${previewIntent === 'heatmap' ? '' : ' hidden'}></div></div><script>const shield=document.querySelector('#shield'),frame=document.querySelector('#preview');let touchY=null;function stop(event){event.preventDefault();event.stopPropagation()}function scrollByDelta(delta){if(!Number.isFinite(delta)||delta===0)return;frame.contentWindow.postMessage({version:1,type:'PATHLENS_SCROLL',delta},'*')}shield.addEventListener('click',stop);shield.addEventListener('pointerdown',stop);shield.addEventListener('wheel',(event)=>{stop(event);scrollByDelta(event.deltaY)},{passive:false});shield.addEventListener('touchstart',(event)=>{stop(event);touchY=event.touches[0]?.clientY??null},{passive:false});shield.addEventListener('touchmove',(event)=>{stop(event);const current=event.touches[0]?.clientY;if(touchY===null||current===undefined)return;scrollByDelta(touchY-current);touchY=current},{passive:false});</script>`
    )
  })
  const proxy = createServer(async (request, reply) => {
    const url = new URL(request.url ?? '/', config.publicOrigin)
    const result = await createProxyApp({
      authorization: { validate: async (handle) => sessions[handle] ?? null },
      fetchRuntime: {
        config,
        transport: {
          lookup: (_hostname, _options, callback) =>
            callback(null, [{ address: '93.184.216.34', family: 4 }]),
          request: (options: RequestOptions, callback) => {
            const hostName = Object.entries(hosts).find(
              ([, value]) => value === options.hostname
            )?.[0] as FixtureName | undefined
            const fixture = hostName ? fixturePath(hostName, options.path) : ''
            const requestHandle = new FixtureRequest()
            if (
              hostName === 'react' &&
              options.path.split('?', 1)[0] === '/api/fixture.json'
            ) {
              process.nextTick(() =>
                callback(
                  response(
                    JSON.stringify({ value: 'fixture-api' }),
                    'application/json'
                  )
                )
              )
              return requestHandle
            }
            if (
              !fixture ||
              !normalize(fixture).startsWith(normalize(fixtureRoot))
            ) {
              process.nextTick(() =>
                callback(response('not found', 'text/plain'))
              )
              return requestHandle
            }
            try {
              const body = readFileSync(fixture)
              process.nextTick(() =>
                callback(response(body, contentType(fixture)))
              )
            } catch {
              process.nextTick(() =>
                callback(response('not found', 'text/plain'))
              )
            }
            return requestHandle
          },
        },
      },
    })(event(request, url))
    reply.statusCode = result.statusCode ?? 500
    for (const [name, value] of Object.entries(result.headers ?? {}))
      reply.setHeader(name, String(value))
    if (result.body)
      reply.end(
        result.isBase64Encoded
          ? Buffer.from(result.body, 'base64')
          : result.body
      )
    else reply.end()
  })
  const proxyPort = await listen(proxy)
  config.publicOrigin = `http://127.0.0.1:${proxyPort}`
  const parentPort = await listen(parent)
  const parentOrigin = `http://127.0.0.1:${parentPort}`
  config.dashboardOrigin = parentOrigin
  config.embeddingOrigin = parentOrigin
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const resourceResponses = new Map<
    string,
    { status: number; headers: Record<string, string> }
  >()
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('response', (response) => {
    if (response.request().resourceType() === 'image') {
      resourceResponses.set(response.url(), {
        status: response.status(),
        headers: response.headers(),
      })
    }
  })
  await page.goto(`http://127.0.0.1:${parentPort}`)
  const frame = page
    .frames()
    .find((candidate) => candidate.url().startsWith(config.publicOrigin))
  assert.ok(frame)
  return {
    browser,
    page,
    frame,
    parent,
    proxy,
    consoleErrors,
    pageErrors,
    resourceResponses,
    parentOrigin,
  }
}

test('renders the production React/Vite fixture through the isolated proxy', async (t) => {
  assertFixtureExists('react')
  const sessions = { react: claimsFor('react') }
  const config = makeConfig('http://127.0.0.1:0', 'http://127.0.0.1:0')
  const result = await openFixture('react', config, sessions)
  t.after(async () => {
    await result.browser.close()
    await new Promise<void>((resolve) => result.proxy.close(() => resolve()))
    await new Promise<void>((resolve) => result.parent.close(() => resolve()))
  })
  let { frame } = result
  await frame.waitForSelector('h1')
  await frame.waitForSelector('[data-testid="lazy-loaded"]')
  await frame.waitForFunction(() =>
    document
      .querySelector('[data-testid="api"]')
      ?.textContent?.includes('fixture-api')
  )
  assert.equal(await frame.locator('h1').textContent(), 'React mounted')
  assert.equal(
    await frame.locator('[data-testid="storage"]').textContent(),
    'Storage: empty/empty'
  )
  assert.deepEqual(
    await frame.evaluate(() => {
      let cookieAccessible = true
      try {
        void document.cookie
      } catch {
        cookieAccessible = false
      }
      return {
        local: localStorage.getItem('pathlens-fixture-local'),
        session: sessionStorage.getItem('pathlens-fixture-session'),
        cookieAccessible,
      }
    }),
    {
      local: 'temporary-local',
      session: 'temporary-session',
      cookieAccessible: false,
    }
  )
  assert.deepEqual(
    await frame.evaluate(() => {
      const storage = localStorage
      storage.setItem('method-key', 'method-value')
      const result = {
        length: storage.length,
        key: storage.key(0),
        value: storage.getItem('method-key'),
      }
      storage.removeItem('method-key')
      const removed = storage.getItem('method-key')
      storage.setItem('clear-key', 'clear-value')
      storage.clear()
      return { ...result, removed, clearedLength: storage.length }
    }),
    {
      length: 2,
      key: 'pathlens-fixture-local',
      value: 'method-value',
      removed: null,
      clearedLength: 0,
    }
  )
  await frame.evaluate(() => localStorage.setItem('reload-marker', 'secret'))
  await result.page.reload({ waitUntil: 'networkidle' })
  const reloadedFrame = result.page
    .frames()
    .find((candidate) => candidate.url().startsWith(config.publicOrigin))
  assert.ok(reloadedFrame)
  frame = reloadedFrame
  await frame.waitForSelector('h1')
  assert.equal(
    await frame.evaluate(() => localStorage.getItem('reload-marker')),
    null
  )
  await frame.waitForSelector('img[alt="Fixture logo"]')
  await frame.waitForSelector('img[alt="Picture logo"]')
  await frame.waitForSelector('[data-testid="background-image"]')
  await frame.waitForSelector('[data-testid="runtime-image"]')
  await result.page.waitForTimeout(50)
  const imageState = await frame.locator('img').evaluateAll((images) =>
    images.map((image) => ({
      alt: image.alt,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      currentSrc: image.currentSrc,
      attr: image.getAttribute('src'),
    }))
  )
  assert.equal(
    imageState.every(
      (image) =>
        image.complete && image.naturalWidth > 0 && image.naturalHeight > 0
    ),
    true,
    JSON.stringify({
      images: imageState,
      responses: [...result.resourceResponses],
    })
  )
  assert.ok(
    imageState.every((image) => image.currentSrc.includes('/v1/session/'))
  )
  assert.match(
    await frame
      .locator('[data-testid="background-image"]')
      .evaluate((element) => getComputedStyle(element).backgroundImage),
    /v1\/session\//
  )
  await frame.locator('[data-testid="count"]').click()
  assert.equal(
    await frame.locator('[data-testid="count"]').textContent(),
    'Count: 1'
  )
  assert.equal(await frame.locator('[data-testid="lazy-loaded"]').count(), 1)
  await frame.locator('#observed').scrollIntoViewIfNeeded()
  await frame.waitForSelector('[data-testid="intersection"]')
  await result.page.setViewportSize({ width: 390, height: 844 })
  assert.ok(
    await frame
      .locator('main')
      .evaluate((element) => element.getBoundingClientRect().width <= 390)
  )
  assert.deepEqual(result.pageErrors, [])
})

test('preview storage is isolated across domains and from the dashboard', async (t) => {
  assertFixtureExists('react')
  assertFixtureExists('next')
  const sessions = {
    react: claimsFor('react'),
    next: claimsFor('next'),
  }
  const config = makeConfig('http://127.0.0.1:0', 'http://127.0.0.1:0')
  const result = await openFixture('react', config, sessions)
  t.after(async () => {
    await result.browser.close()
    await new Promise<void>((resolve) => result.proxy.close(() => resolve()))
    await new Promise<void>((resolve) => result.parent.close(() => resolve()))
  })

  await result.page.evaluate(() =>
    localStorage.setItem('dashboard-secret', 'hidden')
  )
  await result.frame.evaluate(() =>
    localStorage.setItem('session-marker', 'react-only')
  )
  assert.equal(
    await result.frame.evaluate(() => localStorage.getItem('dashboard-secret')),
    null
  )

  await result.frame.goto(
    `${config.publicOrigin}/v1/session/next/page/contact`,
    { waitUntil: 'networkidle' }
  )
  assert.equal(
    await result.frame.evaluate(() => localStorage.getItem('session-marker')),
    null
  )
  assert.deepEqual(
    await result.frame.evaluate(() => {
      let cookieAccessible = true
      try {
        void document.cookie
      } catch {
        cookieAccessible = false
      }
      return { storageLength: localStorage.length, cookieAccessible }
    }),
    { storageLength: 0, cookieAccessible: false }
  )
})

test('compatibility mode keeps React controls interactive', async (t) => {
  assertFixtureExists('react')
  const sessions = { react: claimsFor('react', 'compatibility') }
  const config = makeConfig('http://127.0.0.1:0', 'http://127.0.0.1:0')
  const result = await openFixture('react', config, sessions, 'compatibility')
  t.after(async () => {
    await result.browser.close()
    await new Promise<void>((resolve) => result.proxy.close(() => resolve()))
    await new Promise<void>((resolve) => result.parent.close(() => resolve()))
  })

  await result.frame.locator('[data-testid="route-contact"]').click()
  assert.equal(
    await result.frame.locator('[data-testid="route"]').textContent(),
    'Route: /contact?tab=details#section'
  )
  assert.equal(
    await result.frame
      .locator('[data-testid="route"]')
      .getAttribute('data-active'),
    'contact'
  )
  await result.frame.locator('[data-testid="route-unauthorized"]').click()
  await result.frame.locator('[data-testid="route-cross-domain"]').click()
  assert.equal(
    await result.frame.locator('[data-testid="route"]').textContent(),
    'Route: /contact?tab=details#section'
  )
  await result.frame.evaluate(() => history.back())
  await result.frame.waitForFunction(
    () =>
      window.location.pathname === '/contact' && window.location.search === ''
  )
  assert.equal(
    await result.frame.locator('[data-testid="route"]').textContent(),
    'Route: /contact'
  )
  await result.frame.locator('[data-testid="count"]').click()
  assert.equal(
    await result.frame.locator('[data-testid="count"]').textContent(),
    'Count: 1'
  )
})

test('heatmap mode blocks React controls but preserves controlled scrolling', async (t) => {
  assertFixtureExists('react')
  const sessions = { react: claimsFor('react', 'heatmap') }
  const config = makeConfig('http://127.0.0.1:0', 'http://127.0.0.1:0')
  const result = await openFixture('react', config, sessions, 'heatmap')
  t.after(async () => {
    await result.browser.close()
    await new Promise<void>((resolve) => result.proxy.close(() => resolve()))
    await new Promise<void>((resolve) => result.parent.close(() => resolve()))
  })

  await result.frame.waitForSelector('button')
  const frameBox = await result.page.locator('#preview').boundingBox()
  assert.ok(frameBox)
  const button = await result.frame
    .locator('[data-testid="count"]')
    .evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    })
  await result.page.mouse.click(
    frameBox.x + button.x + button.width / 2,
    frameBox.y + button.y + button.height / 2
  )
  assert.equal(
    await result.frame.locator('[data-testid="count"]').textContent(),
    'Count: 0'
  )

  await result.frame.evaluate(() => window.scrollTo(0, 0))
  await result.page.evaluate(() => {
    const iframe = document.querySelector('#preview')
    iframe?.contentWindow?.postMessage(
      { version: 999, type: 'PATHLENS_SCROLL', delta: 500 },
      '*'
    )
  })
  await result.page.waitForTimeout(50)
  assert.equal(await result.frame.evaluate(() => window.scrollY), 0)

  await result.page.mouse.move(100, 300)
  await result.page.mouse.wheel(0, 500)
  await result.frame.waitForFunction(() => window.scrollY > 0)
  assert.ok(await result.frame.evaluate(() => window.scrollY > 0))
})

test('renders Next SSR output and reports the opaque-origin hydration boundary', async (t) => {
  assertFixtureExists('next')
  const sessions = { next: claimsFor('next') }
  const config = makeConfig('http://127.0.0.1:0', 'http://127.0.0.1:0')
  const result = await openFixture('next', config, sessions)
  t.after(async () => {
    await result.browser.close()
    await new Promise<void>((resolve) => result.proxy.close(() => resolve()))
    await new Promise<void>((resolve) => result.parent.close(() => resolve()))
  })
  const { frame } = result
  await frame.waitForSelector('[data-testid="ssr"]')
  assert.equal(
    await frame.locator('[data-testid="ssr"]').textContent(),
    'Server-rendered content is present.'
  )
  // Next's inline bootstrap/RSC scripts are intentionally removed by the proxy.
  assert.equal(
    await frame.locator('[data-testid="hydrated"]').textContent(),
    'Hydrating'
  )
  await frame.locator('button').click()
  assert.equal(await frame.locator('button').textContent(), 'Next count: 0')
  assert.deepEqual(result.pageErrors, [])
})

test('runs GSAP, Motion, IntersectionObserver, and native scroll behavior', async (t) => {
  assertFixtureExists('animation')
  const sessions = { animation: claimsFor('animation') }
  const config = makeConfig('http://127.0.0.1:0', 'http://127.0.0.1:0')
  const result = await openFixture('animation', config, sessions)
  t.after(async () => {
    await result.browser.close()
    await new Promise<void>((resolve) => result.proxy.close(() => resolve()))
    await new Promise<void>((resolve) => result.parent.close(() => resolve()))
  })
  const { frame } = result
  await frame.waitForSelector('#gsap-reveal')
  await frame.locator('#intersection').scrollIntoViewIfNeeded()
  await frame.waitForFunction(
    () =>
      document.querySelector('#intersection')?.getAttribute('data-visible') ===
      'true'
  )
  assert.ok(
    Number.parseFloat(
      await frame
        .locator('#gsap-reveal')
        .evaluate((element) => getComputedStyle(element).opacity)
    ) > 0
  )
  await frame.locator('#motion-reveal').scrollIntoViewIfNeeded()
  await frame.waitForFunction(
    () =>
      Number.parseFloat(
        getComputedStyle(document.querySelector('#motion-reveal')!).opacity
      ) > 0
  )
  assert.ok(
    Number.parseFloat(
      await frame
        .locator('#motion-reveal')
        .evaluate((element) => getComputedStyle(element).opacity)
    ) > 0
  )
  await frame.locator('#gsap-scrub').scrollIntoViewIfNeeded()
  assert.notEqual(
    await frame
      .locator('#gsap-scrub')
      .evaluate((element) => getComputedStyle(element).transform),
    'none'
  )
})
