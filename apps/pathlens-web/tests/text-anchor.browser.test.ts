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

test('captures ordinary direct text with a text-range anchor', async (t) => {
  const server = await createServer({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address === 'object')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } })
  await page.route('**/dev/api/tracking/config', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { scopes: ['events'] } }),
    })
  )
  await page.route('**/text-anchor-fixture', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html><html><body>
        <div id="contact-shell" style="width:800px;height:180px;padding:70px 30px;font:32px Arial">
          CONTACT
        </div>
        <script data-api-key="fixture-key" data-batch-size="100">${trackerSource}</script>
      </body></html>`,
    })
  )
  t.after(async () => {
    await browser.close()
    await server.close()
  })

  await page.goto(`http://127.0.0.1:${address.port}/text-anchor-fixture`)
  await page.locator('#contact-shell').waitFor()
  await page.waitForTimeout(200)
  await page.locator('#contact-shell').evaluate((element) => {
    const text = Array.from(element.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    )
    if (!text) throw new Error('text fixture did not render a text node')
    const range = document.createRange()
    range.selectNodeContents(text)
    const rect = range.getBoundingClientRect()
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
        pageX: rect.left + rect.width / 2,
        pageY: rect.top + rect.height / 2,
      })
    )
  })
  await page.waitForFunction(() => {
    const queue = (window as Window & { __PATHLENS__?: { queue?: unknown[] } })
      .__PATHLENS__?.queue
    return Boolean(queue?.some((event: any) => event.type === 'click'))
  })

  await page.locator('#contact-shell').evaluate((element) => {
    const rect = element.getBoundingClientRect()
    element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + 10,
        clientY: rect.top + 10,
        pageX: rect.left + 10,
        pageY: rect.top + 10,
      })
    )
  })
  await page.waitForFunction(() => {
    const queue = (window as Window & { __PATHLENS__?: { queue?: unknown[] } })
      .__PATHLENS__?.queue
    return (
      (queue?.filter((event: any) => event.type === 'click').length ?? 0) === 2
    )
  })

  const result = await page.evaluate(() => {
    const queue = (
      window as Window & {
        __PATHLENS__?: { queue?: Array<{ type: string; elementAnchor?: any }> }
      }
    ).__PATHLENS__?.queue
    const clicks = queue?.filter((event) => event.type === 'click') ?? []
    const click = clicks[0]
    const paddingClick = clicks[1]
    const shell = document
      .querySelector('#contact-shell')!
      .getBoundingClientRect()
    return { click, paddingClick, shell }
  })

  assert.ok(result.click?.elementAnchor, JSON.stringify(result))
  assert.equal(result.click.elementAnchor.textNodeIndex, 0)
  assert.equal(typeof result.click.elementAnchor.textOffsetBucket, 'number')
  assert.ok(result.click.elementAnchor.capturedRect.width < result.shell.width)
  assert.ok(
    result.click.elementAnchor.capturedRect.height < result.shell.height
  )
  assert.equal(result.paddingClick?.elementAnchor, undefined)
})
