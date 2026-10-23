import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const {
  chromium,
} = require('../../pathlens-heatmap-proxy/node_modules/playwright')
const webRoot = resolve(import.meta.dirname, '..')

const childHtml = `<!doctype html><style>body{margin:0;width:1920px;height:2700px}@media(max-width:600px){body{width:390px;height:1600px}}@media(min-width:601px) and (max-width:1100px){body{width:1024px;height:2000px}}</style><body><script>
document.body.dataset.responsiveLayout = innerWidth < 600 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop'
setTimeout(() => {
  let layoutVersion = 0
  let activeRequest = null
  const sendMeasurement = (event, data) => {
    const request = data.type === 'PATHLENS_MEASURE_REQUEST' ? data : activeRequest
    if (!request) return
    const documentWidth = Math.max(innerWidth, document.documentElement.scrollWidth)
    const documentHeight = Math.max(innerHeight, document.documentElement.scrollHeight)
    const measurement = { version: 1, type: 'PATHLENS_MEASURE_STATE', sessionId: request.sessionId, nonce: request.nonce, requestId: request.requestId, viewportWidth: innerWidth, viewportHeight: innerHeight, documentWidth, documentHeight, scrollX: 0, scrollY: window.scrollY, maxScrollX: Math.max(0, documentWidth - innerWidth), maxScrollY: Math.max(0, documentHeight - innerHeight), layoutVersion: ++layoutVersion }
    event.source.postMessage({ ...measurement, nonce: 'forged-nonce-0123456789' }, '*')
    event.source.postMessage({ ...measurement, requestId: 'stale-request-id' }, '*')
    event.source.postMessage(measurement, '*')
  }
  window.addEventListener('message', (event) => {
    const data = event.data
    if (event.source !== window.parent || !data) return
    if (data.type === 'PATHLENS_MEASURE_REQUEST') {
      event.source.postMessage({ type: 'TEST_MEASURE_REQUEST_OBSERVED' }, '*')
      activeRequest = data
      sendMeasurement(event, data)
    }
    if (data.type === 'PATHLENS_SCROLL' && Number.isFinite(data.delta)) {
      window.scrollBy(0, data.delta)
      sendMeasurement(event, data)
    }
  })
}, 100)
</script></body>`

test('mounts LivePreviewIframe handshake after a delayed child listener', async (t) => {
  const server = await createServer({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    define: {
      'import.meta.env.VITE_HEATMAP_PROXY_ORIGIN': 'window.__fixtureOrigin',
      'import.meta.env.VITE_HEATMAP_PROXY_JAVASCRIPT_POLICY': JSON.stringify(
        'isolated-script-runtime'
      ),
    },
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address === 'object')
  const origin = `http://127.0.0.1:${address.port}`
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
  await page.route('**/v1/session/test/page', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: childHtml })
  )
  t.after(async () => {
    await browser.close()
    await server.close()
  })

  await page.goto(`${origin}/tests/live-preview-iframe-fixture.html`)
  const canvas = page.locator('canvas[data-overlay-status]')
  await canvas.waitFor()
  await page.waitForFunction(
    () =>
      document
        .querySelector('canvas')
        ?.getAttribute('data-overlay-drawn-points') === '3'
  )
  assert.ok(
    (await page.evaluate(
      () =>
        (window as Window & { __measurementRequestCount?: number })
          .__measurementRequestCount ?? 0
    )) <= 4
  )

  const state = await canvas.evaluate((element) => ({
    viewport: element.getAttribute('data-overlay-live-viewport'),
    document: element.getAttribute('data-overlay-live-document'),
    compatibleGroups: element.getAttribute('data-overlay-compatible-groups'),
    drawnPoints: element.getAttribute('data-overlay-drawn-points'),
  }))
  assert.deepEqual(state, {
    viewport: '1920x911',
    document: '1920x2700',
    compatibleGroups: '1',
    drawnPoints: '3',
  })
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    960
  )
  const initialPreviewLayout = await page.evaluate(() => {
    const iframe = document.querySelector('iframe')?.getBoundingClientRect()
    const canvas = document.querySelector('canvas')?.getBoundingClientRect()
    return {
      iframe: iframe ? { width: iframe.width, height: iframe.height } : null,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
    }
  })

  await page.evaluate(() => {
    ;(window as Window & { initialIframe?: HTMLIFrameElement }).initialIframe =
      document.querySelector('iframe') ?? undefined
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('movement')
  })

  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayType === 'movement'
  )
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayDrawnPoints === '1'
  )

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('scroll')
  })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return (
      canvas?.dataset.overlayType === 'scroll' &&
      canvas.dataset.overlaySourceProvenance === 'tracker-group' &&
      canvas.dataset.overlayBandCount === '0' &&
      canvas.dataset.overlayRegionCount === '2' &&
      canvas.dataset.overlayReachPercent === '100'
    )
  })
  const iframeIdentityBeforeScroll = await page.evaluate(
    () =>
      document.querySelector('iframe') ===
      (window as Window & { initialIframe?: HTMLIFrameElement }).initialIframe
  )
  assert.equal(iframeIdentityBeforeScroll, true)
  await page
    .locator('[aria-label="Heatmap preview interaction shield"]')
    .dispatchEvent('wheel', { deltaY: 300, deltaMode: 0 })
  await page.waitForFunction(() => {
    const value =
      document.querySelector('canvas')?.dataset.overlayLiveScroll ?? ''
    return Number(value.split('x')[1]) > 0
  })
  assert.deepEqual(
    await page.evaluate(() => {
      const iframe = document.querySelector('iframe')?.getBoundingClientRect()
      const canvas = document.querySelector('canvas')?.getBoundingClientRect()
      return {
        iframe: iframe ? { width: iframe.width, height: iframe.height } : null,
        canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      }
    }),
    initialPreviewLayout
  )

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('click')
  })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayType === 'click'
  )
  assert.equal(
    await page.evaluate(
      () =>
        document.querySelector('iframe') ===
        (window as Window & { initialIframe?: HTMLIFrameElement }).initialIframe
    ),
    true
  )

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureDevice?: (value: 'desktop' | 'mobile' | 'tablet') => void
      }
    ).setFixtureDevice?.('mobile')
  })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return (
      document
        .querySelector('[data-preview-viewport]')
        ?.getAttribute('data-preview-viewport') === '390x844' &&
      canvas?.dataset.overlayLiveViewport === '390x844' &&
      canvas.dataset.overlayDrawnPoints === '0'
    )
  })
  const mobileFrame = page.locator('iframe').contentFrame()
  assert.equal(
    await mobileFrame.locator('body').getAttribute('data-responsive-layout'),
    'mobile'
  )
  assert.equal(
    await page.evaluate(
      () =>
        document.querySelector('iframe') !==
        (window as Window & { initialIframe?: HTMLIFrameElement }).initialIframe
    ),
    true
  )

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureDevice?: (value: 'desktop' | 'mobile' | 'tablet') => void
      }
    ).setFixtureDevice?.('tablet')
  })
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-preview-viewport]')
        ?.getAttribute('data-preview-viewport') === '1024x768'
  )
  assert.equal(
    await page
      .locator('iframe')
      .contentFrame()
      .locator('body')
      .getAttribute('data-responsive-layout'),
    'tablet'
  )
  const requestCountBeforeUnmount = await page.evaluate(
    () =>
      (window as Window & { __measurementRequestCount?: number })
        .__measurementRequestCount ?? 0
  )
  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureMounted?: (value: boolean) => void }
    ).setFixtureMounted?.(false)
  })
  await page.waitForTimeout(900)
  assert.equal(
    await page.evaluate(
      () =>
        (window as Window & { __measurementRequestCount?: number })
          .__measurementRequestCount ?? 0
    ),
    requestCountBeforeUnmount
  )
  assert.deepEqual(consoleErrors, [])
})
