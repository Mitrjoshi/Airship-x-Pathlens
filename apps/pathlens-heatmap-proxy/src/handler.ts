import type { Handler } from 'aws-lambda'
import { ApiSessionAuthorizationService } from './authorization.js'
import { createProxyApp } from './app.js'
import { loadConfig } from './config.js'
import { normalizeGatewayEvent } from './gateway-event.js'

const config = loadConfig()
const app = createProxyApp({
  authorization: new ApiSessionAuthorizationService(config),
  fetchRuntime: { config },
})

export const handler: Handler = async (event) => {
  const result = await app(event)

  let isHead = false
  try {
    isHead = normalizeGatewayEvent(event).method === 'HEAD'
  } catch {
    return result
  }

  return isHead ? { ...result, body: undefined } : result
}
