import type { Browser, Page } from 'playwright-core'

import { installRequestGuard, validatePublicHttpUrl } from './security.js'

const viewport = {
  height: 800,
  width: 1280,
} as const

const navigationTimeoutMs = 30_000
const assetWaitTimeoutMs = 5_000
const screenshotTimeoutMs = 30_000
const maxScreenshotWidth = 10_000
const maxScreenshotHeight = 20_000
const maxScreenshotPixels = 50_000_000

async function waitForPageAssets(page: Page) {
  await page.evaluate(async (timeoutMs) => {
    const browserDocument = globalThis as unknown as {
      fonts?: { ready: Promise<unknown> }
      images: Array<{
        complete: boolean
        addEventListener(
          type: string,
          listener: () => void,
          options?: { once: boolean }
        ): void
      }>
    }
    const timeout = new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs)
    })
    const fonts = browserDocument.fonts?.ready ?? Promise.resolve()
    const images = Array.from(browserDocument.images)
      .filter((image) => !image.complete)
      .map(
        (image) =>
          new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener('error', () => resolve(), { once: true })
          })
      )

    await Promise.race([Promise.all([fonts, ...images]), timeout])
  }, assetWaitTimeoutMs)
}

export async function captureProjectScreenshot(
  browser: Browser,
  targetUrl: URL,
  settleDelayMs: number
): Promise<Buffer> {
  await validatePublicHttpUrl(targetUrl)

  const context = await browser.newContext({
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    viewport,
  })

  try {
    const page = await context.newPage()
    const requestGuard = await installRequestGuard(page)

    try {
      await page.goto(targetUrl.href, {
        timeout: navigationTimeoutMs,
        waitUntil: 'domcontentloaded',
      })
      await page.waitForTimeout(settleDelayMs)
      await waitForPageAssets(page)
      await requestGuard.drain()
      await validatePublicHttpUrl(page.url())
      await requestGuard.drain()

      const image = await page.screenshot({
        fullPage: false,
        quality: 100,
        type: 'jpeg',
      })

      await requestGuard.drain()
      return image
    } catch (error) {
      const violation = requestGuard.getViolation()
      if (violation) throw violation
      throw error
    } finally {
      await requestGuard.dispose()
    }
  } finally {
    await context.close()
  }
}

export async function captureHeatmapScreenshot(
  browser: Browser,
  targetUrl: URL,
  settleDelayMs: number,
  viewportWidth = 1280,
  viewportHeight = 900,
  device = 'desktop',
  deviceScaleFactor = 1
): Promise<{
  image: Buffer
  width: number
  height: number
  viewportWidth: number
  viewportHeight: number
  deviceScaleFactor: number
}> {
  await validatePublicHttpUrl(targetUrl)
  const boundedSettleDelayMs = Math.min(Math.max(settleDelayMs, 0), 5_000)

  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor,
    hasTouch: device === 'mobile' || device === 'tablet',
    isMobile: device === 'mobile' || device === 'tablet',
    serviceWorkers: 'block',
    viewport: { width: viewportWidth, height: viewportHeight },
  })

  try {
    const page = await context.newPage()
    const requestGuard = await installRequestGuard(page)

    try {
      await page.goto(targetUrl.href, {
        timeout: navigationTimeoutMs,
        waitUntil: 'domcontentloaded',
      })
      await page.waitForTimeout(boundedSettleDelayMs)
      await waitForPageAssets(page)

      const dimensions = await page.evaluate(async () => {
        const browserWindow = globalThis as unknown as {
          document: {
            documentElement: { scrollHeight: number; scrollWidth: number }
            body?: { scrollHeight?: number; scrollWidth?: number }
          }
          innerHeight: number
          scrollTo(x: number, y: number): void
        }
        let previousHeight = 0
        const deadline = Date.now() + 15_000

        for (
          let attempt = 0;
          attempt < 100 && Date.now() < deadline;
          attempt += 1
        ) {
          const height = browserWindow.document.documentElement.scrollHeight
          const step = Math.max(browserWindow.innerHeight * 0.85, 400)

          for (let y = 0; y < height; y += step) {
            browserWindow.scrollTo(0, y)
            await new Promise((resolve) => setTimeout(resolve, 150))
          }

          await new Promise((resolve) => setTimeout(resolve, 300))
          const nextHeight = browserWindow.document.documentElement.scrollHeight
          if (nextHeight === previousHeight) break
          previousHeight = nextHeight
        }

        browserWindow.scrollTo(0, 0)

        return {
          width: Math.max(
            browserWindow.document.documentElement.scrollWidth,
            browserWindow.document.body?.scrollWidth ?? 0
          ),
          height: Math.max(
            browserWindow.document.documentElement.scrollHeight,
            browserWindow.document.body?.scrollHeight ?? 0
          ),
        }
      })

      if (
        dimensions.width > maxScreenshotWidth ||
        dimensions.height > maxScreenshotHeight ||
        dimensions.width * dimensions.height > maxScreenshotPixels
      ) {
        throw new Error('The page exceeds the screenshot size limits')
      }

      await page.waitForTimeout(boundedSettleDelayMs)
      await waitForPageAssets(page)
      await requestGuard.drain()
      await validatePublicHttpUrl(page.url())

      const image = await page.screenshot({
        fullPage: true,
        quality: 80,
        timeout: screenshotTimeoutMs,
        type: 'jpeg',
      })

      return {
        image,
        ...dimensions,
        viewportWidth,
        viewportHeight,
        deviceScaleFactor,
      }
    } catch (error) {
      const violation = requestGuard.getViolation()
      if (violation) throw violation
      throw error
    } finally {
      await requestGuard.dispose()
    }
  } finally {
    await context.close()
  }
}
