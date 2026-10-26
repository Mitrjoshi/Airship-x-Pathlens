/// <reference lib="dom" />

import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage } from 'node:http'
import { PassThrough } from 'node:stream'
import test from 'node:test'
import { chromium } from 'playwright'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { PreviewSessionClaims } from '@workspace/contracts'
import { createProxyApp } from './app.js'
import type { ProxyConfig } from './config.js'
import type { RequestLike, RequestOptions } from './upstream-fetch.js'

const claims: PreviewSessionClaims = {
  sessionId: '00000000-0000-4000-8000-000000000011',
  workspaceId: '00000000-0000-4000-8000-000000000012',
  projectId: '00000000-0000-4000-8000-000000000013',
  projectDomainId: '00000000-0000-4000-8000-000000000014',
  userId: '00000000-0000-4000-8000-000000000015',
  canonicalHostname: 'example.com',
  allowedHostnames: ['example.com'],
  pathname: '/contact',
  device: 'desktop',
  createdAt: '2026-10-22T10:00:00.000Z',
  expiresAt: '2099-10-22T10:10:00.000Z',
  revokedAt: null,
  previewIntent: 'compatibility' as const,
}

function anchorId(fingerprint: string): string {
  let hash = 2166136261
  for (let index = 0; index < fingerprint.length; index += 1) {
    hash ^= fingerprint.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

const stickyAnchorId = anchorId('explicit:sticky-contact')
const fixedAnchorId = anchorId('explicit:fixed-contact')

class FixtureRequest extends EventEmitter implements RequestLike {
  setTimeout() {
    return this
  }

  end() {}

  destroy(error?: Error) {
    if (error) this.emit('error', error)
  }
}

function response(body: string | Buffer, contentType: string): IncomingMessage {
  const result = new PassThrough() as unknown as IncomingMessage
  Object.assign(result, {
    statusCode: 200,
    headers: { 'content-type': contentType },
  })
  process.nextTick(() => (result as unknown as PassThrough).end(body))
  return result
}

function fixture(path: string): { body: string | Buffer; contentType: string } {
  if (path === '/contact') {
    return {
      contentType: 'text/html',
      body: `<html><head><link rel="modulepreload" href="/assets/nested.js?chunk=1"><style>.reveal{margin-top:1100px;opacity:0;transition:opacity 100ms linear}.sticky{position:sticky;top:0}.fixed{position:fixed;bottom:0}.nested{height:120px;overflow:auto}.nested-content{height:500px;padding-top:180px}.transformed{transform:translateZ(0)}</style><script defer src="/assets/app.js"></script><script type="module" src="/assets/module.js"></script><script src="https://evil.example.test/evil.js"></script></head><body><header class="sticky">Sticky <a data-pathlens-anchor="sticky-contact">Contact</a></header><main><h1 id="status">waiting</h1><p id="module">module-waiting</p><div id="app" data-ssr="server">SSR shell</div><section id="reveal" class="reveal">Reveal</section><div class="fixed"><a data-pathlens-anchor="fixed-contact">Fixed contact</a></div><div class="nested"><div class="nested-content"><button data-pathlens-anchor="nested-target">Nested</button></div></div><div class="transformed"><button data-pathlens-anchor="transformed-target">Transformed</button></div><button id="button" onclick="document.body.dataset.inline='ran'">Button</button></main></body></html>`,
    }
  }
  if (path === '/assets/app.js') {
    return {
      contentType: 'application/javascript',
      body: `document.querySelector('#status').textContent='classic-ran'; document.body.dataset.parentAccess = (() => { try { return String(window.parent.document) } catch { return 'blocked' } })(); document.body.dataset.cookie = (() => { try { return document.cookie } catch { return 'blocked' } })(); document.body.dataset.storage = (() => { try { return localStorage.getItem('x') ?? 'empty' } catch { return 'blocked' } })(); document.querySelector('#app').dataset.hydrated='true'; document.querySelector('#app').textContent='hydrated'; const image=document.createElement('img'); image.src='/assets/logo.svg'; image.loading='lazy'; document.body.append(image); const style=document.createElement('style'); style.textContent='.runtime-style{color:rgb(4,5,6)}'; document.head.append(style); const reveal=document.querySelector('#reveal'); new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) reveal.dataset.visible='true' }).observe(reveal); fetch('/api/data.json').then((response) => response.json()).then((data) => { document.body.dataset.api=data.value }).catch(() => {}); const xhr=new XMLHttpRequest(); xhr.open('HEAD','/api/head.json'); xhr.onload=() => { document.body.dataset.xhr=String(xhr.status) }; xhr.send(); fetch('/api/mutation.json', { method: 'POST' }).catch(() => {}); fetch('https://anotherbrand.com/private').catch(() => {}); import('https://evil.example.test/chunk.js').catch(() => {}); history.pushState({step:1},'',location.pathname+'?step=one'); history.pushState({step:2},'',location.pathname+'?step=two'); addEventListener('popstate',() => { document.body.dataset.popstate='true' }); try { new WebSocket('wss://anotherbrand.com/socket') } catch {} try { new Worker('/worker.js') } catch {} try { window.open('https://evil.example.test') } catch {} try { window.top.location.href='https://evil.example.test' } catch {} try { window.frameElement?.setAttribute('sandbox', 'allow-scripts allow-same-origin') } catch {} try { window.parent.postMessage({ type: 'FRAME_READY', session_id: 'session-one', protocol_version: 1 }, '*') } catch {}`,
    }
  }
  if (path === '/assets/module.js') {
    return {
      contentType: 'application/javascript',
      body: "import { nested } from './nested.js?chunk=1'; const loaded = await import('./dynamic.js?chunk=2'); document.querySelector('#module').textContent = 'module-ran-' + nested + '-' + loaded.dynamic",
    }
  }
  if (path.startsWith('/assets/nested.js')) {
    return {
      contentType: 'application/javascript',
      body: "export const nested = 'nested-ran'",
    }
  }
  if (path.startsWith('/assets/dynamic.js')) {
    return {
      contentType: 'application/javascript',
      body: "export const dynamic = 'dynamic-ran'",
    }
  }
  if (path === '/api/data.json') {
    return {
      contentType: 'application/json',
      body: JSON.stringify({ value: 'api-ran' }),
    }
  }
  if (path === '/api/head.json') {
    return { contentType: 'application/json', body: '{}' }
  }
  if (path.endsWith('.svg')) {
    return {
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>',
    }
  }
  return { contentType: 'text/plain', body: 'fixture' }
}

function makeConfig(parentOrigin: string, proxyOrigin: string): ProxyConfig {
  return {
    javascriptExecutionPolicy: 'isolated-script-runtime',
    port: 0,
    publicOrigin: proxyOrigin,
    publicBasePath: '',
    dashboardOrigin: parentOrigin,
    apiOrigin: 'http://127.0.0.1:9',
    authorizationUrl: 'http://127.0.0.1:9/validate',
    sharedSecret: 'browser-js-test-secret',
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
      apiId: 'browser-js-test',
      accountId: 'browser-js-test',
      domainName: url.host,
      domainPrefix: 'browser-js-test',
      http: {
        method: request.method ?? 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: request.socket.remoteAddress ?? '127.0.0.1',
        userAgent: request.headers['user-agent'] ?? 'browser-js-test',
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

test('runs only the explicitly enabled isolated script subset', async (t) => {
  let proxyOrigin = ''
  const parent = createServer((_request, reply) => {
    reply.setHeader('content-type', 'text/html; charset=utf-8')
    reply.end(
      `<iframe id="preview" src="${proxyOrigin}/v1/session/session-one/page/contact" sandbox="allow-scripts" referrerpolicy="no-referrer" allow=""></iframe><script>const frame=document.querySelector('#preview');const ids=${JSON.stringify([stickyAnchorId, fixedAnchorId])};window.addEventListener('message',(event)=>{if(event.source===frame.contentWindow&&event.data?.type==='PATHLENS_MEASURE_STATE'){document.body.dataset.anchorState=JSON.stringify(event.data);document.body.dataset.anchorRequestIds=(document.body.dataset.anchorRequestIds??'')+','+event.data.requestId}});frame.addEventListener('load',()=>{const base={version:1,type:'PATHLENS_MEASURE_REQUEST',sessionId:${JSON.stringify(claims.sessionId)},nonce:'0123456789abcdef0123456789abcdef'};frame.contentWindow.postMessage({...base,requestId:'invalid-anchor-request',anchorIds:Array(257).fill(ids[0])},'*');frame.contentWindow.postMessage({...base,requestId:'anchor-request',anchorIds:ids},'*')});</script>`
    )
  })
  const parentPort = await listen(parent)
  const parentOrigin = `http://127.0.0.1:${parentPort}`
  const runtimeConfig = makeConfig(parentOrigin, 'http://127.0.0.1:0')
  const requests: string[] = []
  const methods: string[] = []
  const proxy = createServer(async (request, reply) => {
    const url = new URL(request.url ?? '/', runtimeConfig.publicOrigin)
    const result = await createProxyApp({
      authorization: {
        validate: async (handle) =>
          handle === 'session-one'
            ? { ...claims, previewIntent: 'heatmap' as const }
            : null,
      },
      fetchRuntime: {
        config: runtimeConfig,
        transport: {
          lookup: (_hostname, _options, callback) =>
            callback(null, [{ address: '93.184.216.34', family: 4 }]),
          request: (options: RequestOptions, callback) => {
            requests.push(`${options.hostname}${options.path}`)
            methods.push(options.method)
            const requestHandle = new FixtureRequest()
            const item = fixture(options.path)
            process.nextTick(() =>
              callback(response(item.body, item.contentType))
            )
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
  runtimeConfig.publicOrigin = `http://127.0.0.1:${proxyPort}`
  proxyOrigin = runtimeConfig.publicOrigin

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  page.on('console', (message) =>
    console.log(`[browser:${message.type()}] ${message.text()}`)
  )
  page.on('requestfailed', (request) =>
    console.log(
      `[browser:requestfailed] ${request.url()} ${request.failure()?.errorText ?? ''}`
    )
  )
  page.on('pageerror', (error) =>
    console.log(`[browser:pageerror] ${error.message}`)
  )
  t.after(async () => {
    await browser.close()
    await new Promise<void>((resolve) => proxy.close(() => resolve()))
    await new Promise<void>((resolve) => parent.close(() => resolve()))
  })

  await page.goto(parentOrigin)
  const frame = page
    .frames()
    .find((candidate) => candidate.url().startsWith(proxyOrigin))
  assert.ok(frame)
  await frame.waitForSelector('#status')
  await frame.waitForFunction(
    () =>
      document.body.dataset.api === 'api-ran' &&
      document.body.dataset.xhr === '200' &&
      document.querySelector('#module')?.textContent ===
        'module-ran-nested-ran-dynamic-ran'
  )
  assert.equal(await frame.locator('#status').textContent(), 'classic-ran')
  assert.equal(
    await frame.locator('#module').textContent(),
    'module-ran-nested-ran-dynamic-ran'
  )
  assert.equal(
    await frame.locator('#app').getAttribute('data-hydrated'),
    'true'
  )
  assert.equal(await frame.locator('#app').textContent(), 'hydrated')
  await page.waitForFunction(() => {
    const state = JSON.parse(document.body.dataset.anchorState ?? '{}')
    return state.anchorResolutions?.every(
      (item: { status: string }) => item.status === 'matched'
    )
  })
  const anchorState = await page.evaluate(() =>
    JSON.parse(document.body.dataset.anchorState ?? '{}')
  )
  assert.equal(
    await page.evaluate(
      () => document.body.dataset.anchorRequestIds?.includes('invalid') ?? false
    ),
    false
  )
  assert.deepEqual(
    anchorState.anchorResolutions.map(
      (item: { anchorId: string; status: string }) => ({
        anchorId: item.anchorId,
        status: item.status,
      })
    ),
    [
      { anchorId: stickyAnchorId, status: 'matched' },
      { anchorId: fixedAnchorId, status: 'matched' },
    ]
  )
  const initialRects = await frame.evaluate(() =>
    ['sticky-contact', 'fixed-contact'].map((value) => {
      const element = document.querySelector(
        `[data-pathlens-anchor="${value}"]`
      )
      const rect = element?.getBoundingClientRect()
      return rect
        ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : null
    })
  )
  assert.deepEqual(
    anchorState.anchorResolutions.map(
      (item: {
        rect?: { left: number; top: number; width: number; height: number }
      }) => item.rect
    ),
    initialRects
  )
  assert.equal(
    await frame.evaluate(() => document.body.dataset.parentAccess),
    'blocked'
  )
  assert.equal(
    await frame.evaluate(() => document.body.dataset.cookie),
    'blocked'
  )
  assert.equal(
    await frame.evaluate(() => document.body.dataset.storage),
    'empty'
  )
  assert.equal(await frame.locator('#button').getAttribute('onclick'), null)
  assert.equal(
    await frame
      .locator('.sticky')
      .evaluate((element) => getComputedStyle(element).position),
    'sticky'
  )
  assert.equal(
    await frame
      .locator('.fixed')
      .evaluate((element) => getComputedStyle(element).position),
    'fixed'
  )
  assert.ok(
    await frame.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight
    )
  )
  await frame.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight)
  )
  await frame.waitForFunction(() => window.scrollY > 0)
  await page.waitForFunction(() => {
    const state = JSON.parse(document.body.dataset.anchorState ?? '{}')
    return state.anchorResolutions?.length === 2
  })
  const scrolledState = await page.evaluate(() =>
    JSON.parse(document.body.dataset.anchorState ?? '{}')
  )
  const scrolledRects = await frame.evaluate(() =>
    ['sticky-contact', 'fixed-contact'].map((value) => {
      const rect = document
        .querySelector(`[data-pathlens-anchor="${value}"]`)
        ?.getBoundingClientRect()
      return rect
        ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          }
        : null
    })
  )
  assert.deepEqual(
    scrolledState.anchorResolutions.map(
      (item: {
        rect?: { left: number; top: number; width: number; height: number }
      }) => item.rect
    ),
    scrolledRects
  )
  await frame.evaluate(() => history.back())
  await frame.waitForFunction(() => document.body.dataset.popstate === 'true')
  assert.equal(
    requests.some((request) => request.includes('evil.example.test')),
    false
  )
  assert.equal(
    requests.some((request) => request.includes('api.pathlens.test')),
    false
  )
  assert.equal(
    requests.some((request) => request.includes('anotherbrand.com')),
    false
  )
  assert.equal(methods.includes('POST'), false)
  assert.equal(new URL(frame.url()).origin, proxyOrigin)
})
