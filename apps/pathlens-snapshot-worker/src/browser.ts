import type { Browser } from 'playwright-core'
import { chromium as playwrightChromium } from 'playwright-core'

export async function launchBrowser(): Promise<Browser> {
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const { default: lambdaChromium } = await import('@sparticuz/chromium')

    return playwrightChromium.launch({
      args: lambdaChromium.args,
      executablePath: await lambdaChromium.executablePath(),
      headless: true,
    })
  }

  const { chromium } = await import('playwright')
  return chromium.launch({ headless: true })
}
