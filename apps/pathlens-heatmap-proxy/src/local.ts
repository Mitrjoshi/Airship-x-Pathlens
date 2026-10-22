import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { createProxyApp } from './app.js'
import { ApiSessionAuthorizationService } from './authorization.js'
import { loadConfig } from './config.js'

const config = loadConfig()
const app = createProxyApp({
  authorization: new ApiSessionAuthorizationService(config),
  fetchRuntime: { config },
})

const server = createServer(async (request, response) => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))

  const result = await app({
    version: '2.0',
    routeKey: '$default',
    rawPath: request.url?.split('?', 1)[0] ?? '/',
    rawQueryString: request.url?.split('?', 2)[1] ?? '',
    headers: Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : (value ?? ''),
      ])
    ),
    requestContext: {
      apiId: 'local',
      accountId: 'local',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: request.method ?? 'GET',
        path: request.url ?? '/',
        protocol: 'HTTP/1.1',
        sourceIp: request.socket.remoteAddress ?? '127.0.0.1',
        userAgent: request.headers['user-agent'] ?? 'local',
      },
      requestId: randomUUID(),
      routeKey: '$default',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    body: Buffer.concat(chunks).toString('utf8') || undefined,
    pathParameters: undefined,
    stageVariables: undefined,
    isBase64Encoded: false,
  })

  response.statusCode = result.statusCode ?? 200
  for (const [key, value] of Object.entries(result.headers ?? {})) {
    response.setHeader(key, String(value))
  }

  if (request.method !== 'HEAD' && result.body) {
    response.end(
      result.isBase64Encoded ? Buffer.from(result.body, 'base64') : result.body
    )
  } else response.end()
})

server.listen(config.port, () => {
  console.info(`Heatmap proxy listening on http://localhost:${config.port}`)
})
