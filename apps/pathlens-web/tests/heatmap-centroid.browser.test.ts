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

test('projects weighted-centroid click points through a long mobile document', async (t) => {
  const server = await createServer({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address === 'object')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 360, height: 762 } })
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))
  t.after(async () => {
    await browser.close()
    await server.close()
  })

  await page.goto(
    `http://127.0.0.1:${address.port}/tests/heatmap-centroid-fixture.html`
  )
  const canvas = page.locator('canvas[data-overlay-status]')
  await canvas.waitFor()
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayDrawnPoints === '1'
  )

  const topAlpha = await canvas.evaluate(
    (element) =>
      (element as HTMLCanvasElement)
        .getContext('2d')!
        .getImageData(36, 100, 1, 1).data[3]
  )
  assert.ok(topAlpha > 0)

  await page.evaluate(() => {
    ;(
      window as Window & { setCentroidScroll?: (value: number) => void }
    ).setCentroidScroll?.(700)
  })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return (
      canvas?.dataset.overlayLiveScroll === '0x700' &&
      canvas.dataset.overlayDrawnPoints === '1'
    )
  })
  const middleAlpha = await canvas.evaluate(
    (element) =>
      (element as HTMLCanvasElement)
        .getContext('2d')!
        .getImageData(180, 300, 1, 1).data[3]
  )
  assert.ok(middleAlpha > 0)

  await page.evaluate(() => {
    ;(
      window as Window & { setCentroidScroll?: (value: number) => void }
    ).setCentroidScroll?.(3200)
  })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return (
      canvas?.dataset.overlayLiveScroll === '0x3200' &&
      canvas.dataset.overlayDrawnPoints === '1'
    )
  })
  const bottomAlpha = await canvas.evaluate(
    (element) =>
      (element as HTMLCanvasElement)
        .getContext('2d')!
        .getImageData(288, 500, 1, 1).data[3]
  )
  assert.ok(bottomAlpha > 0)
  assert.deepEqual(consoleErrors, [])
})
