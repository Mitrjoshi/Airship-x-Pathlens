import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'
import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage } from 'node:http'
import { join, normalize } from 'node:path'
import { PassThrough } from 'node:stream'
import { chromium } from 'playwright'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { PreviewSessionClaims } from '@workspace/contracts'
import { createProxyApp } from './app.js'
import type { ProxyConfig } from './config.js'
import type { RequestLike, RequestOptions } from './upstream-fetch.js'

type FixtureName = 'react' | 'next' | 'animation'
type PreviewIntent = 'compatibility' | 'heatmap'

const fixtures: Record<FixtureName, { host: string; handle: string }> = {
  react: { host: 'react.fixture.test', handle: 'manual-react-session' },
  next: { host: 'next.fixture.test', handle: 'manual-next-session' },
  animation: {
    host: 'animation.fixture.test',
    handle: 'manual-animation-session',
  },
}
const fixtureRoot = join(process.cwd(), '..', 'pathlens-heatmap-proxy-fixtures')
const initialFixture = (process.argv
  .find((value) => value.startsWith('--fixture='))
  ?.split('=', 2)[1] ?? 'react') as FixtureName
const initialViewport =
  process.argv
    .find((value) => value.startsWith('--viewport='))
    ?.split('=', 2)[1] === 'mobile'
    ? 'mobile'
    : 'desktop'
const initialIntent: PreviewIntent =
  process.argv
    .find((value) => value.startsWith('--mode='))
    ?.split('=', 2)[1] === 'heatmap'
    ? 'heatmap'
    : 'compatibility'

class ManualRequest extends EventEmitter implements RequestLike {
  setTimeout() {
    return this
  }
  end() {}
  destroy(error?: Error) {
    if (error) this.emit('error', error)
  }
}

function handleFor(name: FixtureName, intent: PreviewIntent): string {
  return `manual-${name}-${intent}`
}

function claims(
  name: FixtureName,
  intent: PreviewIntent
): PreviewSessionClaims {
  const value = fixtures[name]
  return {
    sessionId: `00000000-0000-4000-8000-${name === 'react' ? '000000000031' : name === 'next' ? '000000000032' : '000000000033'}`,
    workspaceId: '00000000-0000-4000-8000-000000000034',
    projectId: '00000000-0000-4000-8000-000000000035',
    projectDomainId: `00000000-0000-4000-8000-${name === 'react' ? '000000000036' : name === 'next' ? '000000000037' : '000000000038'}`,
    userId: '00000000-0000-4000-8000-000000000039',
    canonicalHostname: value.host,
    allowedHostnames: [value.host],
    pathname: '/contact',
    device: 'desktop',
    createdAt: '2099-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T01:00:00.000Z',
    revokedAt: null,
    previewIntent: intent,
  }
}

function typeFor(path: string): string {
  if (path.endsWith('.html')) return 'text/html'
  if (path.endsWith('.js')) return 'application/javascript'
  if (path.endsWith('.css')) return 'text/css'
  if (path.endsWith('.svg')) return 'image/svg+xml'
  if (path.endsWith('.json')) return 'application/json'
  return 'application/octet-stream'
}

function fileFor(name: FixtureName, requestPath: string): string {
  const path = requestPath.split('?', 1)[0] ?? '/'
  const root =
    name === 'next' ? join(fixtureRoot, 'out') : join(fixtureRoot, 'dist', name)
  const relative =
    name === 'next' && path === '/contact'
      ? 'contact/index.html'
      : path === '/contact'
        ? 'index.html'
        : path.slice(1)
  return join(root, relative)
}

function streamResponse(
  body: string | Buffer,
  contentType: string
): IncomingMessage {
  const result = new PassThrough() as unknown as IncomingMessage
  Object.assign(result, {
    statusCode: 200,
    headers: { 'content-type': contentType },
  })
  process.nextTick(() => (result as unknown as PassThrough).end(body))
  return result
}

function config(): ProxyConfig {
  return {
    javascriptExecutionPolicy: 'isolated-script-runtime',
    port: 0,
    publicOrigin: 'http://127.0.0.1:0',
    publicBasePath: '',
    dashboardOrigin: 'http://127.0.0.1:0',
    apiOrigin: 'http://127.0.0.1:9',
    authorizationUrl: 'http://127.0.0.1:9/validate',
    sharedSecret: 'manual-preview-secret',
    embeddingOrigin: null,
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
    isBase64Encoded: false,
    requestContext: {
      apiId: 'manual-preview',
      accountId: 'manual-preview',
      domainName: url.host,
      domainPrefix: 'manual-preview',
      routeKey: '$default',
      stage: '$default',
      requestId: randomUUID(),
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      http: {
        method: request.method ?? 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'pathlens-manual-preview',
      },
    },
  }
}

function listen(
  server: ReturnType<typeof createServer>,
  requestedPort = 0
): Promise<number> {
  return new Promise((resolve) =>
    server.listen(requestedPort, '127.0.0.1', () =>
      resolve((server.address() as { port: number }).port)
    )
  )
}

function manualPage(proxyOrigin: string): string {
  const options = (Object.keys(fixtures) as FixtureName[])
    .map(
      (name) =>
        `<option value="${name}"${name === initialFixture ? ' selected' : ''}>${name}</option>`
    )
    .join('')
  const first = fixtures[initialFixture] ?? fixtures.react
  const handles = Object.fromEntries(
    (Object.keys(fixtures) as FixtureName[]).map((name) => [
      name,
      {
        compatibility: handleFor(name, 'compatibility'),
        heatmap: handleFor(name, 'heatmap'),
      },
    ])
  )
  const hostNames = Object.fromEntries(
    (Object.keys(fixtures) as FixtureName[]).map((name) => [
      name,
      fixtures[name]?.host,
    ])
  )
  return `<!doctype html><meta charset="utf-8"><title>Pathlens manual live preview</title><style>body{margin:0;font:14px system-ui;color:#172033;background:#eef1f6}header{display:flex;gap:12px;align-items:center;padding:12px;background:#fff;position:sticky;top:0;z-index:2;flex-wrap:wrap}#status{margin-left:auto;color:#526fe8}.stage{display:flex;justify-content:center;padding:24px}.frame{position:relative;width:1280px;height:760px;border:1px solid #cad2e2;background:#fff}.mobile{width:390px;height:844px}iframe{display:block;width:100%;height:100%;border:0}#shield{position:absolute;inset:0;z-index:1;background:transparent;cursor:default}</style><header><strong>Pathlens live proxy manual preview</strong><label>Fixture <select id="fixture">${options}</select></label><label>Mode <select id="mode"><option value="compatibility"${initialIntent === 'compatibility' ? ' selected' : ''}>Interactive Compatibility Mode</option><option value="heatmap"${initialIntent === 'heatmap' ? ' selected' : ''}>Non-Interactive Heatmap Mode</option></select></label><button data-viewport="desktop">Desktop</button><button data-viewport="mobile">Mobile</button><span id="status">${first.host}/contact | ${initialIntent === 'heatmap' ? 'Non-Interactive Heatmap Mode' : 'Interactive Compatibility Mode'}</span></header><div class="stage"><div id="frame" class="frame${initialViewport === 'mobile' ? ' mobile' : ''}"><iframe id="preview" sandbox="allow-scripts" referrerpolicy="no-referrer" allow=""></iframe><div id="shield" hidden aria-label="Heatmap preview interaction shield"></div></div></div><script>const proxy=${JSON.stringify(proxyOrigin)},handles=${JSON.stringify(handles)},hosts=${JSON.stringify(hostNames)};const fixture=document.querySelector('#fixture'),mode=document.querySelector('#mode'),frame=document.querySelector('#preview'),box=document.querySelector('#frame'),shield=document.querySelector('#shield'),status=document.querySelector('#status');let touchY=null;function label(){return mode.value==='heatmap'?'Non-Interactive Heatmap Mode':'Interactive Compatibility Mode'}function load(){const name=fixture.value,selectedMode=mode.value;frame.src=proxy+'/v1/session/'+handles[name][selectedMode]+'/page/contact';shield.hidden=selectedMode!=='heatmap';status.textContent=hosts[name]+'/contact | '+label()}function stop(event){event.preventDefault();event.stopPropagation()}function scrollByDelta(delta){if(!Number.isFinite(delta)||delta===0)return;frame.contentWindow.postMessage({version:1,type:'PATHLENS_SCROLL',delta},'*')}shield.addEventListener('click',stop);shield.addEventListener('dblclick',stop);shield.addEventListener('pointerdown',stop);shield.addEventListener('pointermove',stop);shield.addEventListener('dragstart',stop);shield.addEventListener('keydown',stop);shield.addEventListener('wheel',(event)=>{stop(event);scrollByDelta(event.deltaY)},{passive:false});shield.addEventListener('touchstart',(event)=>{stop(event);touchY=event.touches[0]?.clientY??null},{passive:false});shield.addEventListener('touchmove',(event)=>{stop(event);const current=event.touches[0]?.clientY;if(touchY===null||current===undefined)return;scrollByDelta(touchY-current);touchY=current},{passive:false});shield.addEventListener('touchend',(event)=>{stop(event);touchY=null},{passive:false});fixture.addEventListener('change',load);mode.addEventListener('change',load);document.querySelectorAll('[data-viewport]').forEach((button)=>button.addEventListener('click',()=>box.classList.toggle('mobile',button.dataset.viewport==='mobile')));frame.addEventListener('load',()=>status.textContent=hosts[fixture.value]+'/contact | '+label()+' | loaded');frame.addEventListener('error',()=>status.textContent+=' | load error');load()</script>`
}

async function main(): Promise<void> {
  if (!fixtures[initialFixture])
    throw new Error(
      'Use --fixture=react, --fixture=next, or --fixture=animation.'
    )
  const runtime = config()
  const sessions = Object.fromEntries(
    (Object.keys(fixtures) as FixtureName[]).flatMap((name) =>
      (['compatibility', 'heatmap'] as PreviewIntent[]).map((intent) => [
        handleFor(name, intent),
        claims(name, intent),
      ])
    )
  )
  const proxy = createServer(async (request, reply) => {
    const url = new URL(request.url ?? '/', runtime.publicOrigin)
    const result = await createProxyApp({
      authorization: { validate: async (handle) => sessions[handle] ?? null },
      fetchRuntime: {
        config: runtime,
        transport: {
          lookup: (_hostname, _options, callback) =>
            callback(null, [{ address: '93.184.216.34', family: 4 }]),
          request: (options: RequestOptions, callback) => {
            const name = (Object.keys(fixtures) as FixtureName[]).find(
              (key) => fixtures[key]?.host === options.hostname
            )
            const requestHandle = new ManualRequest()
            if (
              name === 'react' &&
              options.path.split('?', 1)[0] === '/api/fixture.json'
            ) {
              process.nextTick(() =>
                callback(
                  streamResponse(
                    JSON.stringify({ value: 'fixture-api' }),
                    'application/json'
                  )
                )
              )
              return requestHandle
            }
            const file = name ? fileFor(name, options.path) : ''
            if (!file || !normalize(file).startsWith(normalize(fixtureRoot))) {
              process.nextTick(() =>
                callback(streamResponse('not found', 'text/plain'))
              )
              return requestHandle
            }
            try {
              process.nextTick(() =>
                callback(streamResponse(readFileSync(file), typeFor(file)))
              )
            } catch {
              process.nextTick(() =>
                callback(streamResponse('not found', 'text/plain'))
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
  runtime.publicOrigin = `http://127.0.0.1:${proxyPort}`
  const dashboard = createServer((_request, reply) => {
    reply.setHeader('content-type', 'text/html; charset=utf-8')
    reply.end(manualPage(runtime.publicOrigin))
  })
  const dashboardPort = await listen(
    dashboard,
    Number(process.env.PATHLENS_MANUAL_PREVIEW_PORT ?? 8093)
  )
  runtime.dashboardOrigin = `http://127.0.0.1:${dashboardPort}`
  runtime.embeddingOrigin = runtime.dashboardOrigin
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({
    viewport:
      initialViewport === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 1000 },
  })
  const safeUrl = (value: string) =>
    value
      .replace(/\/v1\/session\/[^/]+/g, '/v1/session/<session>')
      .replace(/[?&]t=[^&]*/g, '?t=<resource>')
  page.on('console', (message) => {
    const text = message.text()
    const security = /csp|sandbox|blocked|violates|origin|permission/i.test(
      text
    )
    console.log(
      `[browser:${message.type() === 'error' ? (security ? 'security-block' : 'runtime-error') : message.type()}] ${text}`
    )
  })
  page.on('pageerror', (error) =>
    console.log(`[browser:runtime-error] ${error.message}`)
  )
  page.on('requestfailed', (request) => {
    const reason = request.failure()?.errorText ?? ''
    const security = /csp|blocked|cors|denied/i.test(reason)
    console.log(
      `[browser:${security ? 'security-request-block' : 'request-failed'}] ${safeUrl(request.url())} ${reason}`
    )
  })
  await page.goto(`http://127.0.0.1:${dashboardPort}`)
  console.log(`Manual preview: http://127.0.0.1:${dashboardPort}`)
  console.log(
    'Close the visible Chromium window or press Ctrl+C to stop. No arbitrary URL input is enabled.'
  )
  await new Promise<void>((resolve) =>
    browser.on('disconnected', () => resolve())
  )
  await new Promise<void>((resolve) => proxy.close(() => resolve()))
  await new Promise<void>((resolve) => dashboard.close(() => resolve()))
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
