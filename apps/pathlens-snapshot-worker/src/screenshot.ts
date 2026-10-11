import type { Browser } from 'playwright-core'

import { installRequestGuard, validatePublicHttpUrl } from './security.js'

const viewport = {
  height: 800,
  width: 1280,
} as const

const navigationTimeoutMs = 30_000

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
  viewportHeight = 900
): Promise<{ image: Buffer; width: number; height: number }> {
  await validatePublicHttpUrl(targetUrl)

  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
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
      await page.waitForTimeout(settleDelayMs)

      const dimensions = await page.evaluate(async () => {
        const browserWindow = globalThis as unknown as {
          document: {
            documentElement: { scrollHeight: number; scrollWidth: number }
          }
          innerHeight: number
          scrollTo(x: number, y: number): void
        }
        let previousHeight = 0

        for (let attempt = 0; attempt < 100; attempt += 1) {
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
          width: browserWindow.document.documentElement.scrollWidth,
          height: browserWindow.document.documentElement.scrollHeight,
        }
      })

      await page.waitForTimeout(settleDelayMs)
      await requestGuard.drain()
      await validatePublicHttpUrl(page.url())

      const image = await page.screenshot({
        fullPage: true,
        quality: 80,
        type: 'jpeg',
      })

      return { image, ...dimensions }
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
