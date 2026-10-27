import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const {
  chromium,
} = require('../../pathlens-heatmap-proxy/node_modules/playwright')
const webRoot = resolve(import.meta.dirname, '..')
const trackerSource = readFileSync(
  resolve(webRoot, '../pathlens-tracker/dist/tracker.global.js'),
  'utf8'
)

const positionedChildHtml = `<!doctype html>
<html><head><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1920px; min-height: 3000px; }
  body { position: relative; font: 20px sans-serif; }
  button { width: 220px; height: 54px; }
  #normal { margin: 100px 0 0 100px; }
  #sticky-header { position: sticky; top: 0; z-index: 5; height: 72px; background: #fff; }
  #sticky-header nav { display: flex; gap: 24px; padding: 18px 40px; }
  #sticky-header a, #fixed-header a { display: inline-block; width: 120px; height: 36px; }
  #fixed-header { position: fixed; left: 40px; top: 90px; z-index: 6; }
  #absolute { position: absolute; left: 420px; top: 520px; }
  #fixed { position: fixed; right: 80px; top: 120px; }
  #sticky { position: sticky; top: 180px; margin: 900px 0 0 900px; }
  #transform-shell { position: absolute; left: 250px; top: 1250px; transform: translateX(80px) scale(1.1); transform-origin: top left; }
  #nested { position: absolute; left: 1000px; top: 1700px; width: 420px; height: 260px; overflow: auto; border: 2px solid #222; }
  #nested-spacer { height: 500px; }
  #nested-button { margin-left: 80px; }
</style></head><body>
  <header id="sticky-header"><nav><a id="sticky-work">Work</a><a id="sticky-contact">Contact</a></nav></header>
  <div id="fixed-header"><a id="fixed-contact">Fixed contact</a></div>
  <button id="normal">normal</button>
  <button id="absolute">absolute</button>
  <button id="fixed">fixed</button>
  <button id="sticky">sticky</button>
  <div id="transform-shell"><button id="transformed">transformed</button></div>
  <div id="nested"><div id="nested-spacer"></div><button id="nested-button">nested</button></div>
  <script>
    const storage = new Map()
    const storageApi = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: (key) => storage.delete(key) }
    Object.defineProperty(window, 'localStorage', { value: storageApi })
    Object.defineProperty(window, 'sessionStorage', { value: storageApi })
    const nativeFetch = window.fetch.bind(window)
    window.fetch = (input, init) => {
      const url = String(input)
      if (url.includes('/tracking/config')) return Promise.resolve(new Response(JSON.stringify({ success: true, data: { scopes: ['events'] } }), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }))
      return nativeFetch(input, init)
    }
  </script>
  <script data-api-key="fixture-key" data-batch-size="100" data-debug="false">${trackerSource}</script>
  <script>
    const report = () => parent.postMessage({
      type: 'POSITIONED_FIXTURE_CLICKS',
      clicks: window.__PATHLENS__?.queue.filter((event) => event.type === 'click') ?? []
    }, '*')
    let layoutVersion = 0
    let activeRequest = null
    const measure = (request) => {
      activeRequest = request
      const documentWidth = Math.max(innerWidth, document.documentElement.scrollWidth)
      const documentHeight = Math.max(innerHeight, document.documentElement.scrollHeight)
      parent.postMessage({ version: 1, type: 'PATHLENS_MEASURE_STATE', sessionId: request.sessionId, nonce: request.nonce, requestId: request.requestId, viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth, documentHeight, scrollX: scrollX, scrollY: scrollY, maxScrollX: Math.max(0, documentWidth - innerWidth), maxScrollY: Math.max(0, documentHeight - innerHeight), layoutVersion: ++layoutVersion }, '*')
    }
    addEventListener('message', (event) => {
      if (event.source !== parent || !event.data) return
      if (event.data.type === 'PATHLENS_MEASURE_REQUEST') measure(event.data)
      if (event.data.type === 'PATHLENS_SCROLL') { scrollBy(0, event.data.delta); measure(event.data) }
    })
   addEventListener('click', (event) => {
     if (event.target instanceof Element && event.target.closest('a')) {
       event.preventDefault()
     }
     setTimeout(report, 0)
   })
    addEventListener('scroll', () => { report(); if (activeRequest) measure(activeRequest) })
    setTimeout(report, 300)
  </script>
</body></html>`

test('diagnoses positioned click alignment through the tracker and live overlay path', async (t) => {
  const server = await createServer({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    define: {
      'import.meta.env.VITE_HEATMAP_PROXY_ORIGIN': 'window.__fixtureOrigin',
      'import.meta.env.VITE_HEATMAP_PROXY_JAVASCRIPT_POLICY': JSON.stringify(
        'isolated-script-runtime'
      ),
    },
    server: { host: 'localhost', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address === 'object')
  const origin = `http://localhost:${address.port}`
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  await page.addInitScript((value: string) => {
    ;(window as Window & { __fixtureOrigin?: string }).__fixtureOrigin = value
  }, origin)
  await page.route('**/dev/api/tracking/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { scopes: ['events'] } }),
    })
  )
  await page.route('**/v1/session/positioned/page', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: positionedChildHtml,
    })
  )
  t.after(async () => {
    await browser.close()
    await server.close()
  })

  await page.goto(`${origin}/tests/positioned-click-fixture.html`)
  const canvas = page.locator('canvas[data-overlay-status]')
  await canvas.waitFor()
  const frame = page
    .frames()
    .find((candidate) =>
      candidate.url().includes('/v1/session/positioned/page')
    )
  assert.ok(frame)
  await frame.locator('#normal').waitFor()
  await page.waitForFunction(() =>
    Boolean(
      (window as Window & { __positionedClicks?: unknown[] }).__positionedClicks
    )
  )

  const clickTarget = async (id: string) => {
    await frame.evaluate((targetId) => {
      const target = document.getElementById(targetId) as HTMLElement
      const rect = target.getBoundingClientRect()
      target.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        })
      )
    }, id)
    await page.waitForFunction((targetId) => {
      const clicks = (
        window as Window & { __positionedClicks?: Array<{ id?: string }> }
      ).__positionedClicks
      return Boolean(clicks?.some((click) => click.id === targetId))
    }, id)
  }

  await clickTarget('normal')
  await clickTarget('absolute')
  await clickTarget('fixed')
  await clickTarget('sticky')
  await clickTarget('transformed')
  await clickTarget('nested-button')
  await clickTarget('sticky-contact')
  await clickTarget('fixed-contact')
  await page.waitForFunction(
    () =>
      Number(
        document.querySelector('canvas')?.dataset.overlayDrawnPoints ?? 0
      ) > 0
  )

  const initial = await page.evaluate(() => ({
    clicks: (window as Window & { __positionedClicks?: unknown[] })
      .__positionedClicks,
    measurement: document.querySelector('canvas')?.dataset.overlayLiveScroll,
  }))
  assert.equal(initial.measurement, '0x0')
  assert.equal((initial.clicks as unknown[]).length, 8)

  const initialStickyClicks = (
    initial.clicks as Array<{
      id: string
      pageX: number
      pageY: number
      elementAnchor?: {
        anchorId?: string
        positionMode?: string
        effectivePositionMode?: string
        positioningAncestorDepth?: number
        relativeX?: number
        relativeY?: number
      }
    }>
  ).filter((click) => click.id === 'sticky-contact')
  const initialFixedClicks = (
    initial.clicks as Array<{
      id: string
      elementAnchor?: {
        effectivePositionMode?: string
        positioningAncestorDepth?: number
      }
    }>
  ).filter((click) => click.id === 'fixed-contact')
  assert.equal(initialStickyClicks.length, 1)
  assert.equal(initialFixedClicks.length, 1)
  assert.equal(initialStickyClicks[0]?.elementAnchor?.positionMode, 'static')
  assert.equal(
    initialStickyClicks[0]?.elementAnchor?.effectivePositionMode,
    'sticky'
  )
  assert.equal(
    initialStickyClicks[0]?.elementAnchor?.positioningAncestorDepth,
    2
  )
  assert.equal(
    initialFixedClicks[0]?.elementAnchor?.effectivePositionMode,
    'fixed'
  )
  assert.equal(
    initialFixedClicks[0]?.elementAnchor?.positioningAncestorDepth,
    1
  )

  await frame.evaluate(() => window.scrollTo(0, 700))
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector('canvas')
          ?.dataset.overlayLiveScroll?.split('x')[1]
      ) > 0
  )

  const scrolled = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    return {
      canvas: canvas.getBoundingClientRect().toJSON(),
      scroll: canvas.getAttribute('data-overlay-live-scroll'),
    }
  })
  const targetRects = await frame.evaluate(() =>
    Object.fromEntries(
      [
        'normal',
        'absolute',
        'fixed',
        'sticky',
        'transformed',
        'nested-button',
      ].map((id) => [
        id,
        document.getElementById(id)?.getBoundingClientRect().toJSON(),
      ])
    )
  )
  assert.equal(scrolled.scroll, '0x700')
  const rawClicks = await page.evaluate(
    () =>
      (window as Window & { __positionedClicks?: unknown[] }).__positionedClicks
  )
  const rawById = new Map(
    (rawClicks as Array<{ id: string; pageX: number; pageY: number }>).map(
      (click) => [click.id, click]
    )
  )
  const scale = scrolled.canvas.width / 1920
  const assertProjectedCenter = (id: string) => {
    const raw = rawById.get(id)!
    const target = (
      targetRects as Record<
        string,
        { left: number; top: number; width: number; height: number }
      >
    )[id]!
    const projected = {
      x: raw.pageX * scale,
      y: (raw.pageY - 700) * scale,
    }
    const actual = {
      x: (target.left + target.width / 2) * scale,
      y: (target.top + target.height / 2) * scale,
    }
    assert.ok(
      Math.abs(projected.x - actual.x) <= 1,
      `${id} x drift: ${JSON.stringify({ projected, actual })}`
    )
    assert.ok(
      Math.abs(projected.y - actual.y) <= 1,
      `${id} y drift: ${JSON.stringify({ projected, actual })}`
    )
  }
  assertProjectedCenter('normal')
  assertProjectedCenter('absolute')
  assertProjectedCenter('transformed')
  assertProjectedCenter('nested-button')
  const fixedTarget = (
    targetRects as Record<string, { top: number; height: number }>
  ).fixed
  const fixedProjectedY = (rawById.get('fixed')!.pageY - 700) * scale
  const fixedActualY = (fixedTarget.top + fixedTarget.height / 2) * scale
  assert.ok(Math.abs(fixedProjectedY - fixedActualY) > 10)

  await frame.evaluate(() => window.scrollTo(0, 1000))
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector('canvas')
          ?.dataset.overlayLiveScroll?.split('x')[1]
      ) >= 1000
  )
  const stickyAfterScroll = await frame.evaluate(() =>
    document.getElementById('sticky')?.getBoundingClientRect().toJSON()
  )
  assert.ok(stickyAfterScroll)
  const stickyProjectedY = (rawById.get('sticky')!.pageY - 1000) * scale
  assert.ok(
    Math.abs(
      stickyProjectedY -
        (stickyAfterScroll.y + stickyAfterScroll.height / 2) * scale
    ) > 10
  )

  await clickTarget('sticky-contact')
  await page.waitForFunction(
    () =>
      (
        (window as Window & { __positionedClicks?: Array<{ id: string }> })
          .__positionedClicks ?? []
      ).filter((click) => click.id === 'sticky-contact').length >= 2
  )
  const stickyClicksAfterScroll = await page.evaluate(() =>
    (
      (
        window as Window & {
          __positionedClicks?: Array<{
            id: string
            pageX: number
            pageY: number
            elementAnchor?: {
              anchorId?: string
              relativeX?: number
              relativeY?: number
              effectivePositionMode?: string
            }
          }>
        }
      ).__positionedClicks ?? []
    ).filter((click) => click.id === 'sticky-contact')
  )
  assert.equal(stickyClicksAfterScroll.length, 2)
  assert.equal(
    stickyClicksAfterScroll[0]?.elementAnchor?.anchorId,
    stickyClicksAfterScroll[1]?.elementAnchor?.anchorId
  )
  assert.equal(
    stickyClicksAfterScroll[1]?.elementAnchor?.effectivePositionMode,
    'sticky'
  )
  assert.ok(
    Math.abs(
      (stickyClicksAfterScroll[1]?.elementAnchor?.relativeX ?? -1) - 0.5
    ) < 0.01
  )
  assert.ok(
    Math.abs(
      (stickyClicksAfterScroll[1]?.elementAnchor?.relativeY ?? -1) - 0.5
    ) < 0.01
  )

  await frame.evaluate(() => {
    const nested = document.getElementById('nested')!
    nested.scrollTop = 250
  })
  const nestedAfterScroll = await frame.evaluate(() =>
    document.getElementById('nested-button')?.getBoundingClientRect().toJSON()
  )
  assert.ok(nestedAfterScroll)
  const nestedProjectedY = (rawById.get('nested-button')!.pageY - 1000) * scale
  assert.ok(
    Math.abs(
      nestedProjectedY -
        (nestedAfterScroll.y + nestedAfterScroll.height / 2) * scale
    ) > 10
  )
  t.diagnostic(JSON.stringify({ ...scrolled, targets: targetRects, rawClicks }))
})
