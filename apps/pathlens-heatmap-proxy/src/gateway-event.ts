import { randomUUID } from 'node:crypto'

export interface NormalizedGatewayRequest {
  method: string
  path: string
  rawQueryString: string
  headers: Record<string, string>
  body?: string
  isBase64Encoded: boolean
  requestId: string
}

export class InvalidGatewayEventError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidGatewayEventError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function requiredString(
  value: unknown,
  field: string,
  allowEmpty = false
): string {
  if (typeof value !== 'string' || (!allowEmpty && value.length === 0)) {
    throw new InvalidGatewayEventError(`Invalid gateway event field: ${field}.`)
  }
  return value
}

function headers(single: unknown, multi: unknown): Record<string, string> {
  const result: Record<string, string> = {}
  if (single !== undefined && single !== null && !isRecord(single)) {
    throw new InvalidGatewayEventError('Invalid gateway event headers.')
  }
  if (multi !== undefined && multi !== null && !isRecord(multi)) {
    throw new InvalidGatewayEventError(
      'Invalid gateway event multiValueHeaders.'
    )
  }

  for (const [name, value] of Object.entries(single ?? {})) {
    if (typeof value !== 'string') {
      throw new InvalidGatewayEventError('Invalid gateway event header value.')
    }
    result[name] = value
  }
  for (const [name, value] of Object.entries(multi ?? {})) {
    if (
      !Array.isArray(value) ||
      value.some((item) => typeof item !== 'string')
    ) {
      throw new InvalidGatewayEventError(
        'Invalid gateway event multi-value header.'
      )
    }
    result[name] = value.join(',')
  }
  return result
}

function queryString(raw: unknown, single: unknown, multi: unknown): string {
  if (raw !== undefined) return requiredString(raw, 'rawQueryString', true)
  if (single !== undefined && single !== null && !isRecord(single)) {
    throw new InvalidGatewayEventError(
      'Invalid gateway event queryStringParameters.'
    )
  }
  if (multi !== undefined && multi !== null && !isRecord(multi)) {
    throw new InvalidGatewayEventError(
      'Invalid gateway event multiValueQueryStringParameters.'
    )
  }

  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(single ?? {})) {
    if (value !== null && typeof value !== 'string') {
      throw new InvalidGatewayEventError('Invalid gateway event query value.')
    }
    if (value !== null) params.append(name, value)
  }
  for (const [name, value] of Object.entries(multi ?? {})) {
    if (
      !Array.isArray(value) ||
      value.some((item) => item !== null && typeof item !== 'string')
    ) {
      throw new InvalidGatewayEventError(
        'Invalid gateway event multi-value query.'
      )
    }
    for (const item of value) if (item !== null) params.append(name, item)
  }
  return params.toString()
}

function requestId(requestContext: Record<string, unknown>): string {
  if (requestContext.requestId !== undefined) {
    return requiredString(requestContext.requestId, 'requestContext.requestId')
  }
  return randomUUID()
}

function stripStage(path: string, stage: unknown): string {
  if (typeof stage !== 'string' || stage.length === 0 || stage === '$default') {
    return path || '/'
  }
  const prefix = `/${stage}`
  if (path === prefix) return '/'
  return path.startsWith(`${prefix}/`) ? path.slice(prefix.length) : path || '/'
}

export function normalizeGatewayEvent(
  event: unknown
): NormalizedGatewayRequest {
  if (!isRecord(event) || !isRecord(event.requestContext)) {
    throw new InvalidGatewayEventError('Invalid gateway event requestContext.')
  }
  const context = event.requestContext
  const encoded = event.isBase64Encoded
  if (encoded !== undefined && typeof encoded !== 'boolean') {
    throw new InvalidGatewayEventError(
      'Invalid gateway event isBase64Encoded field.'
    )
  }

  if (event.version === '2.0') {
    if (!isRecord(context.http)) {
      throw new InvalidGatewayEventError('Invalid v2 requestContext.http.')
    }
    return {
      method: requiredString(
        context.http.method,
        'requestContext.http.method'
      ).toUpperCase(),
      path: requiredString(event.rawPath, 'rawPath', true) || '/',
      rawQueryString: queryString(event.rawQueryString, undefined, undefined),
      headers: headers(event.headers, undefined),
      ...(event.body === undefined || event.body === null
        ? {}
        : { body: requiredString(event.body, 'body', true) }),
      isBase64Encoded: encoded ?? false,
      requestId: requestId(context),
    }
  }

  if (typeof event.httpMethod !== 'string') {
    throw new InvalidGatewayEventError('Invalid gateway event httpMethod.')
  }
  const path = requiredString(event.path, 'path', true)
  return {
    method: requiredString(event.httpMethod, 'httpMethod').toUpperCase(),
    path: stripStage(path, context.stage),
    rawQueryString: queryString(
      undefined,
      event.queryStringParameters,
      event.multiValueQueryStringParameters
    ),
    headers: headers(event.headers, event.multiValueHeaders),
    ...(event.body === undefined || event.body === null
      ? {}
      : { body: requiredString(event.body, 'body', true) }),
    isBase64Encoded: encoded ?? false,
    requestId: requestId(context),
  }
}
