import type { APIGatewayProxyHandlerV2 } from 'aws-lambda'
import { ApiSessionAuthorizationService } from './authorization.js'
import { createProxyApp } from './app.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createProxyApp({
  authorization: new ApiSessionAuthorizationService(config),
  fetchRuntime: { config },
})

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const result = await app(event)

  return event.requestContext.http.method.toUpperCase() === 'HEAD'
    ? { ...result, body: undefined }
    : result
}
