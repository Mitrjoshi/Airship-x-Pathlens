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

test('mounts click hotspots on a scaled matching viewport and suppresses incompatible groups', async (t) => {
  const server = await createServer({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address === 'object')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  await page.setViewportSize({ width: 960, height: 600 })
  t.after(async () => {
    await browser.close()
    await server.close()
  })

  await page.goto(
    `http://127.0.0.1:${address.port}/tests/heatmap-overlay-fixture.html`
  )
  const canvas = page.locator('canvas[data-overlay-status]')
  await canvas.waitFor()
  assert.deepEqual(
    await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    })),
    { scrollWidth: 960, clientWidth: 960 }
  )
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return element?.dataset.overlayMeasurementReady === 'true'
  })

  const state = await canvas.evaluate((element) => {
    const canvas = element as HTMLCanvasElement
    const context = canvas.getContext('2d')!
    const centerPixels = [
      [432, 472],
      [528, 472],
      [432, 572],
      [336, 202],
    ].map(([x, y]) => context.getImageData(x, y, 1, 1).data[3])
    const belowViewportPixel = context.getImageData(336, 850, 1, 1).data[3]
    const image = context.getImageData(0, 0, canvas.width, canvas.height)
    let maxAlpha = 0
    for (let index = 3; index < image.data.length; index += 4)
      maxAlpha = Math.max(maxAlpha, image.data[index] ?? 0)
    const rect = canvas.getBoundingClientRect()
    return {
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight,
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      rectWidth: rect.width,
      rectHeight: rect.height,
      centerPixels,
      belowViewportPixel,
      maxAlpha,
      pointerEvents: getComputedStyle(canvas).pointerEvents,
      zIndex: getComputedStyle(canvas).zIndex,
      groups: element.getAttribute('data-overlay-groups'),
      compatibleGroups: element.getAttribute('data-overlay-compatible-groups'),
      drawnPoints: element.getAttribute('data-overlay-drawn-points'),
      liveViewport: element.getAttribute('data-overlay-live-viewport'),
      liveDocument: element.getAttribute('data-overlay-live-document'),
      rejectionReasons: element.getAttribute('data-overlay-rejection-reasons'),
      anchoredSamples: element.getAttribute('data-overlay-anchored-samples'),
      legacySamples: element.getAttribute('data-overlay-legacy-samples'),
    }
  })

  assert.ok(state.maxAlpha > 0, JSON.stringify(state))
  assert.equal(state.anchoredSamples, '1')
  assert.equal(state.legacySamples, '13')
  assert.equal(
    state.centerPixels.every((alpha) => alpha > 0),
    true,
    JSON.stringify(state)
  )
  assert.ok(state.centerPixels[0] > state.centerPixels[1])
  assert.ok(state.centerPixels[2] > 0)
  assert.equal(state.belowViewportPixel, 0)
  const initialPreviewWidth = await page
    .locator('[data-testid="dashboard-box"]')
    .evaluate((element) => element.getBoundingClientRect().width)
  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureCoverageTruncated?: (value: boolean) => void
      }
    ).setFixtureCoverageTruncated?.(true)
  })
  const warning = page.locator('[data-heatmap-completeness-warning]')
  await warning.waitFor()
  assert.match(await warning.textContent(), /recorded clicks/)
  assert.equal(
    await page
      .locator('[data-testid="dashboard-box"]')
      .evaluate((element) => element.getBoundingClientRect().width),
    initialPreviewWidth
  )
  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('movement')
  })
  await page.waitForFunction(() =>
    document
      .querySelector('[data-heatmap-completeness-warning]')
      ?.textContent?.includes('recorded movement events')
  )
  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureCoverageTruncated?: (value: boolean) => void
      }
    ).setFixtureCoverageTruncated?.(false)
  })
  await page.waitForFunction(
    () => !document.querySelector('[data-heatmap-completeness-warning]')
  )
  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('click')
  })
  assert.deepEqual(
    {
      clientWidth: state.clientWidth,
      clientHeight: state.clientHeight,
      backingWidth: state.backingWidth,
      backingHeight: state.backingHeight,
      rectWidth: state.rectWidth,
      rectHeight: state.rectHeight,
      pointerEvents: state.pointerEvents,
      zIndex: state.zIndex,
      groups: state.groups,
      compatibleGroups: state.compatibleGroups,
      drawnPoints: state.drawnPoints,
      liveViewport: state.liveViewport,
      liveDocument: state.liveDocument,
      rejectionReasons: state.rejectionReasons,
    },
    {
      clientWidth: 1920,
      clientHeight: 911,
      backingWidth: 1920,
      backingHeight: 911,
      rectWidth: 960,
      rectHeight: 455.5,
      pointerEvents: 'none',
      zIndex: '20',
      groups: '3',
      compatibleGroups: '1',
      drawnPoints: '13',
      liveViewport: '1920x911',
      liveDocument: '1920x2700',
      rejectionReasons:
        '{"document-height-incompatible":1,"viewport-dimensions-incompatible":1}',
    }
  )

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureDocumentHeight?: (value: number) => void
      }
    ).setFixtureDocumentHeight?.(3500)
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return (
      element?.dataset.overlayDrawnPoints === '0' &&
      element.dataset.overlayRejectionReasons ===
        '{"document-height-incompatible":2,"viewport-dimensions-incompatible":1}'
    )
  })
  assert.equal(
    await canvas.evaluate(
      (element) =>
        (element as HTMLCanvasElement)
          .getContext('2d')!
          .getImageData(432, 472, 1, 1).data[3]
    ),
    0
  )
  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureDocumentHeight?: (value: number) => void
      }
    ).setFixtureDocumentHeight?.(2700)
  })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayDrawnPoints === '13'
  )

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('movement')
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return (
      element?.dataset.overlayType === 'movement' &&
      element.dataset.overlayDrawnPoints === '1'
    )
  })
  const movementState = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return {
      oldClickPixel: context.getImageData(432, 472, 1, 1).data[3],
      movementPixel: context.getImageData(1248, 675, 1, 1).data[3],
      type: element.getAttribute('data-overlay-type'),
      groups: element.getAttribute('data-overlay-groups'),
      compatibleGroups: element.getAttribute('data-overlay-compatible-groups'),
      drawnPoints: element.getAttribute('data-overlay-drawn-points'),
      rejectionReasons: element.getAttribute('data-overlay-rejection-reasons'),
    }
  })
  assert.deepEqual(movementState, {
    oldClickPixel: 0,
    movementPixel: 203,
    type: 'movement',
    groups: '3',
    compatibleGroups: '1',
    drawnPoints: '1',
    rejectionReasons:
      '{"viewport-dimensions-incompatible":1,"document-height-incompatible":1}',
  })

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType?.('scroll')
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return (
      element?.dataset.overlayType === 'scroll' &&
      element.dataset.overlayDrawnPoints === '2' &&
      element.dataset.overlayReachPercent === '100'
    )
  })
  const scrollState = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    const top = Array.from(context.getImageData(960, 45, 1, 1).data)
    const bottom = Array.from(context.getImageData(960, 900, 1, 1).data)
    return {
      oldClickPixel: context.getImageData(432, 472, 1, 1).data[3],
      top,
      bottom,
      type: element.getAttribute('data-overlay-type'),
      groups: element.getAttribute('data-overlay-groups'),
      compatibleGroups: element.getAttribute('data-overlay-compatible-groups'),
      drawnPoints: element.getAttribute('data-overlay-drawn-points'),
      regions: element.getAttribute('data-overlay-region-count'),
      rejectionReasons: element.getAttribute('data-overlay-rejection-reasons'),
    }
  })
  assert.deepEqual(scrollState, {
    oldClickPixel: 41,
    top: [31, 199, 93, 41],
    bottom: [31, 199, 93, 41],
    type: 'scroll',
    groups: '2',
    compatibleGroups: '1',
    drawnPoints: '2',
    regions: '2',
    rejectionReasons: '{"viewport-dimensions-incompatible":1}',
  })

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach?.(0)
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return element?.dataset.overlayReachPercent === '0'
  })
  const zeroReach = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return Array.from(context.getImageData(960, 450, 1, 1).data)
  })
  assert.deepEqual(zeroReach, [249, 112, 112, 41])

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach?.(25)
  })
  await page.waitForFunction(() => {
    return (
      document.querySelector('canvas')?.dataset.overlayReachPercent === '25'
    )
  })
  const quarterReach = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return {
      reached: context.getImageData(960, 600, 1, 1).data,
      unreached: context.getImageData(960, 750, 1, 1).data,
      seam: context.getImageData(960, 675, 1, 1).data[3],
    }
  })
  assert.equal(quarterReach.reached[1] > quarterReach.reached[0], true)
  assert.equal(quarterReach.unreached[0] > quarterReach.unreached[1], true)
  assert.ok(quarterReach.seam > 0)

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureScroll?: (value: number) => void }
    ).setFixtureScroll?.(600)
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach?.(50)
  })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayReachPercent === '50'
  )
  const halfReach = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return {
      reached: context.getImageData(960, 700, 1, 1).data,
      unreached: context.getImageData(960, 800, 1, 1).data,
    }
  })
  assert.equal(halfReach.reached[1] > halfReach.reached[0], true)
  assert.equal(halfReach.unreached[0] > halfReach.unreached[1], true)

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureScroll?: (value: number) => void }
    ).setFixtureScroll?.(1500)
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach?.(80)
  })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayReachPercent === '80'
  )
  const eightyReach = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return {
      reached: context.getImageData(960, 600, 1, 1).data,
      unreached: context.getImageData(960, 700, 1, 1).data,
    }
  })
  assert.equal(eightyReach.reached[1] > eightyReach.reached[0], true)
  assert.equal(eightyReach.unreached[0] > eightyReach.unreached[1], true)

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureScroll?: (value: number) => void }
    ).setFixtureScroll?.(1789)
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach?.(99)
  })
  await page.waitForFunction(
    () => document.querySelector('canvas')?.dataset.overlayReachPercent === '99'
  )
  const ninetyNineReach = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return {
      reached: context.getImageData(960, 850, 1, 1).data,
      unreached: context.getImageData(960, 900, 1, 1).data,
    }
  })
  assert.equal(ninetyNineReach.reached[1] > ninetyNineReach.reached[0], true)
  assert.equal(
    ninetyNineReach.unreached[0] > ninetyNineReach.unreached[1],
    true
  )

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach?.(100)
  })
  await page.waitForFunction(
    () =>
      document.querySelector('canvas')?.dataset.overlayReachPercent === '100'
  )
  const fullReach = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return [
      Array.from(context.getImageData(960, 0, 1, 1).data),
      Array.from(context.getImageData(960, 910, 1, 1).data),
    ]
  })
  assert.deepEqual(fullReach, [
    [31, 199, 93, 41],
    [31, 199, 93, 41],
  ])

  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureMeasurementReady?: (value: boolean) => void
      }
    ).setFixtureMeasurementReady?.(false)
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return (
      element?.dataset.overlayStatus === 'alignment-pending' &&
      element.dataset.overlayMeasurementReady === 'false' &&
      element.dataset.overlayRegionCount === '0' &&
      element.dataset.overlayRejectionReasons ===
        '{"measurement-unavailable":1}'
    )
  })
  assert.equal(
    await canvas.evaluate(
      (element) =>
        (element as HTMLCanvasElement)
          .getContext('2d')!
          .getImageData(960, 450, 1, 1).data[3]
    ),
    0
  )
  await page.evaluate(() => {
    ;(
      window as Window & {
        setFixtureMeasurementReady?: (value: boolean) => void
      }
    ).setFixtureMeasurementReady?.(true)
  })
  await page.waitForFunction(
    () =>
      document.querySelector('canvas')?.dataset.overlayReachPercent === '100'
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

  await page.evaluate(() => {
    ;(
      window as Window & { setFixtureScroll?: (value: number) => void }
    ).setFixtureScroll?.(1500)
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('canvas[data-overlay-status]')
    return (
      element?.dataset.overlayType === 'click' &&
      element.dataset.overlayLiveScroll === '0x1500'
    )
  })
  const scrolledPixel = await canvas.evaluate((element) => {
    const context = (element as HTMLCanvasElement).getContext('2d')!
    return context.getImageData(336, 322, 1, 1).data[3]
  })
  assert.ok(scrolledPixel > 0)
})

test('benchmarks synthetic Click density sizes without production data', async (t) => {
  const server = await createServer({
    root: webRoot,
    configFile: resolve(webRoot, 'vite.config.ts'),
    server: { host: '127.0.0.1', port: 0 },
  })
  await server.listen()
  const address = server.httpServer?.address()
  assert.ok(address && typeof address === 'object')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  await page.setViewportSize({ width: 960, height: 600 })
  t.after(async () => {
    await browser.close()
    await server.close()
  })

  await page.goto(
    `http://127.0.0.1:${address.port}/tests/heatmap-overlay-fixture.html`
  )
  await page.waitForFunction(
    () =>
      document.querySelector('canvas')?.dataset.overlayMeasurementReady ===
      'true'
  )

  for (const count of [100, 1_000, 10_000, 20_000, 50_000]) {
    const elapsed = await page.evaluate((nextCount) => {
      const start = performance.now()
      ;(
        window as Window & {
          setFixtureSyntheticClickCount?: (value: number | null) => void
        }
      ).setFixtureSyntheticClickCount?.(nextCount)
      return start
    }, count)
    await page.waitForFunction(
      (expected) =>
        document.querySelector('canvas')?.dataset.overlayDrawnPoints ===
        String(expected),
      count
    )
    const duration = await page.evaluate(
      (startedAt) => performance.now() - startedAt,
      elapsed
    )
    console.log(`density benchmark ${count}: ${duration.toFixed(1)}ms`)
    assert.ok(Number.isFinite(duration))
  }
})
