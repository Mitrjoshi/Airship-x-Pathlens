import type { Browser } from 'playwright'

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
