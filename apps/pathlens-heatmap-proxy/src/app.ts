import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda'
import { randomUUID } from 'node:crypto'
import { normalizePagePath } from '@workspace/contracts'
import type { PreviewSessionClaims } from '@workspace/contracts'
import type { SessionAuthorizationService } from './authorization.js'
import { rewriteCss } from './rewrite-css.js'
import { rewriteHtml } from './rewrite-html.js'
import { rewriteJavaScript } from './rewrite-javascript.js'
import { STORAGE_COMPATIBILITY_SCRIPT } from './storage-compatibility.js'
import { createRoutingCompatibilityScript } from './routing-compatibility.js'
import { createMeasurementControllerScript } from './measurement-controller.js'
import { isBlockedPreviewTrackingUrl } from './tracking-policy.js'
import { RewriteError } from './rewrite-url.js'
import {
  fetchUpstream,
  UpstreamSecurityError,
  type FetchRuntime,
} from './upstream-fetch.js'

export interface ProxyAppDependencies {
  authorization: SessionAuthorizationService
  fetchRuntime?: FetchRuntime
}

interface RouteContext {
  method: string
  path: string
  requestId: string
}

function json(
  statusCode: number,
  body: unknown,
  requestId: string
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      'x-request-id': requestId,
    },
    body: JSON.stringify(body),
  }
}

function browserHeaders(
  requestId: string,
  contentType: string,
  length: number,
  page: boolean,
  embeddingOrigin: string | null = null,
  javascriptExecutionPolicy: FetchRuntime['config']['javascriptExecutionPolicy'] = 'static-only',
  proxyOrigin = '',
  resource = false
): Record<string, string> {
  const runtimeScripts = javascriptExecutionPolicy === 'isolated-script-runtime'
  const staticSource = proxyOrigin || "'self'"
  return {
    'content-type': contentType,
    'content-length': String(length),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy':
      'accelerometer=(), camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'cross-origin-resource-policy':
      resource && runtimeScripts ? 'cross-origin' : 'same-origin',
    ...(resource && runtimeScripts
      ? { 'access-control-allow-origin': '*' }
      : {}),
    'cross-origin-opener-policy': 'same-origin',
    ...(page && !embeddingOrigin ? { 'x-frame-options': 'DENY' } : {}),
    'x-request-id': requestId,
    ...(page
      ? {
          // Static mode retains the proxy origin; runtime mode deliberately keeps
          // an opaque sandbox origin while allowing only proxy-served scripts.
          'content-security-policy': `default-src 'none'; base-uri 'none'; script-src ${runtimeScripts ? staticSource : "'none'"}; script-src-elem ${runtimeScripts ? staticSource : "'none'"}; script-src-attr 'none'; connect-src ${runtimeScripts ? staticSource : "'none'"}; style-src ${staticSource} 'unsafe-inline'; img-src ${staticSource}; font-src ${staticSource}; media-src ${staticSource}; object-src 'none'; frame-src 'none'; worker-src 'none'; manifest-src 'none'; form-action 'none'; sandbox ${runtimeScripts ? 'allow-scripts' : 'allow-same-origin'}; frame-ancestors ${embeddingOrigin ?? "'none'"}`,
        }
      : {}),
  }
}

function binary(
  statusCode: number,
  body: Buffer,
  contentType: string,
  requestId: string,
  page = false,
  embeddingOrigin: string | null = null,
  javascriptExecutionPolicy: FetchRuntime['config']['javascriptExecutionPolicy'] = 'static-only',
  proxyOrigin = '',
  resource = false
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: browserHeaders(
      requestId,
      contentType,
      body.length,
      page,
      embeddingOrigin,
      javascriptExecutionPolicy,
      proxyOrigin,
      resource
    ),
    isBase64Encoded: true,
    body: body.toString('base64'),
  }
}

function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  requestId: string,
  retryable = false
): APIGatewayProxyStructuredResultV2 {
  return json(
    statusCode,
    {
      success: false,
      error: { code, message, request_id: requestId, retryable },
    },
    requestId
  )
}

function getContext(event: APIGatewayProxyEventV2): RouteContext {
  return {
    method: event.requestContext.http.method.toUpperCase(),
    path: event.rawPath || '/',
    requestId: event.requestContext.requestId || randomUUID(),
  }
}

function getSessionHandle(path: string): string | null {
  const match = path.match(/^\/v1\/session\/([^/]+)(?:\/|$)/)
  return match?.[1] ?? null
}

function getPagePath(path: string): string | null {
  const marker = '/page'
  const index = path.indexOf(marker)
  if (index < 0) return null

  const value = path.slice(index + marker.length)
  if (!value || value === '/') return '/'

  try {
    return normalizePagePath(decodeURIComponent(value))
  } catch {
    return null
  }
}

function queryValue(
  event: APIGatewayProxyEventV2,
  name: string
): string | null {
  return new URLSearchParams(event.rawQueryString || '').get(name)
}

function pageUrl(session: PreviewSessionClaims): string {
  return `https://${session.canonicalHostname}${session.pathname}`
}

function decodeResourceTarget(value: string): string {
  try {
    return Buffer.from(value, 'base64url').toString('utf8')
  } catch {
    throw new RewriteError(
      'RESOURCE_URL_INVALID',
      'The resource URL is invalid.'
    )
  }
}

function transformError(error: unknown): {
  status: number
  code: string
  message: string
} {
  const code =
    error instanceof UpstreamSecurityError || error instanceof RewriteError
      ? error.code
      : 'UPSTREAM_ERROR'
  const status = code.includes('INVALID')
    ? 400
    : code.includes('SCRIPT_')
      ? 422
      : code.includes('TOO_LARGE') ||
          code.includes('LIMIT') ||
          code.includes('TIMEOUT')
        ? 413
        : code.includes('NOT_ALLOWED') ||
            code.includes('PRIVATE') ||
            code.includes('ORIGIN')
          ? 403
          : 502
  return {
    status,
    code,
    message: 'The authorized preview resource could not be served.',
  }
}

function publicSessionContext(session: PreviewSessionClaims) {
  return {
    session_id: session.sessionId,
    project_id: session.projectId,
    domain_id: session.projectDomainId,
    canonical_hostname: session.canonicalHostname,
    pathname: session.pathname,
    device: session.device,
    preview_intent: session.previewIntent,
    expires_at: session.expiresAt,
  }
}

export function createProxyApp({
  authorization,
  fetchRuntime,
}: ProxyAppDependencies) {
  return async function handle(
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyStructuredResultV2> {
    const context = getContext(event)

    try {
      if (context.path === '/health/live' && context.method === 'GET') {
        return json(200, { status: 'ok' }, context.requestId)
      }

      if (context.path === '/health/ready' && context.method === 'GET') {
        return json(
          200,
          { status: 'ok', authorization: 'configured' },
          context.requestId
        )
      }

      if (!context.path.startsWith('/v1/session/')) {
        return errorResponse(
          404,
          'NOT_FOUND',
          'Route not found.',
          context.requestId
        )
      }

      if (context.method !== 'GET' && context.method !== 'HEAD') {
        return errorResponse(
          405,
          'METHOD_NOT_ALLOWED',
          'Only GET and HEAD are supported.',
          context.requestId
        )
      }

      const handle = getSessionHandle(context.path)
      if (!handle) {
        return errorResponse(
          401,
          'SESSION_MISSING',
          'Preview session is missing.',
          context.requestId
        )
      }

      const session = await authorization.validate(handle)
      if (!session) {
        return errorResponse(
          401,
          'SESSION_EXPIRED',
          'Preview session is missing, expired, revoked, or stale.',
          context.requestId
        )
      }

      if (context.path.endsWith('/status')) {
        return json(
          200,
          { success: true, data: publicSessionContext(session) },
          context.requestId
        )
      }

      if (context.path.endsWith('/runtime/scroll-controller.js')) {
        if (
          session.previewIntent !== 'heatmap' ||
          !fetchRuntime ||
          fetchRuntime.config.javascriptExecutionPolicy !==
            'isolated-script-runtime'
        ) {
          return errorResponse(
            404,
            'NOT_FOUND',
            'Route not found.',
            context.requestId
          )
        }
        const body = Buffer.from(
          createMeasurementControllerScript(
            session.sessionId,
            fetchRuntime.config.embeddingOrigin ?? null
          ),
          'utf8'
        )
        return binary(
          200,
          body,
          'application/javascript; charset=utf-8',
          context.requestId,
          false,
          null,
          fetchRuntime.config.javascriptExecutionPolicy,
          fetchRuntime.config.publicOrigin,
          true
        )
      }

      if (context.path.endsWith('/runtime/storage-compatibility.js')) {
        if (
          !fetchRuntime ||
          fetchRuntime.config.javascriptExecutionPolicy !==
            'isolated-script-runtime'
        ) {
          return errorResponse(
            404,
            'NOT_FOUND',
            'Route not found.',
            context.requestId
          )
        }
        const body = Buffer.from(STORAGE_COMPATIBILITY_SCRIPT, 'utf8')
        return binary(
          200,
          body,
          'application/javascript; charset=utf-8',
          context.requestId,
          false,
          null,
          fetchRuntime.config.javascriptExecutionPolicy,
          fetchRuntime.config.publicOrigin,
          true
        )
      }

      if (context.path.endsWith('/runtime/routing-compatibility.js')) {
        if (
          !fetchRuntime ||
          fetchRuntime.config.javascriptExecutionPolicy !==
            'isolated-script-runtime'
        ) {
          return errorResponse(
            404,
            'NOT_FOUND',
            'Route not found.',
            context.requestId
          )
        }
        const body = Buffer.from(
          createRoutingCompatibilityScript(session.pathname),
          'utf8'
        )
        return binary(
          200,
          body,
          'application/javascript; charset=utf-8',
          context.requestId,
          false,
          null,
          fetchRuntime.config.javascriptExecutionPolicy,
          fetchRuntime.config.publicOrigin,
          true
        )
      }

      if (context.path.includes('/page')) {
        const requestedPath = getPagePath(context.path)
        if (!requestedPath) {
          return errorResponse(
            400,
            'PATH_NOT_ALLOWED',
            'The preview pathname is invalid.',
            context.requestId
          )
        }

        if (requestedPath !== session.pathname) {
          return errorResponse(
            403,
            'PATH_NOT_ALLOWED',
            'The pathname is outside the preview session.',
            context.requestId
          )
        }

        if (!fetchRuntime) {
          return errorResponse(
            501,
            'PROXY_NOT_IMPLEMENTED',
            'HTML fetching is disabled.',
            context.requestId
          )
        }
        try {
          const upstream = await fetchUpstream(
            { ...fetchRuntime, requestId: context.requestId },
            {
              session,
              url: pageUrl(session),
              method: context.method as 'GET' | 'HEAD',
              category: 'page',
            }
          )
          if (context.method === 'HEAD') {
            return {
              statusCode: upstream.statusCode,
              headers: browserHeaders(
                context.requestId,
                'text/html; charset=utf-8',
                0,
                true,
                fetchRuntime.config.embeddingOrigin,
                fetchRuntime.config.javascriptExecutionPolicy,
                fetchRuntime.config.publicOrigin
              ),
            }
          }
          const rewritten = rewriteHtml(upstream.body.toString('utf8'), {
            session,
            handle,
            proxyOrigin: fetchRuntime.config.publicOrigin,
            pageUrl: upstream.finalUrl,
            config: fetchRuntime.config,
            allowExternalScripts:
              fetchRuntime.config.javascriptExecutionPolicy ===
              'isolated-script-runtime',
            previewIntent: session.previewIntent,
          })
          const body = Buffer.from(rewritten)
          return {
            ...binary(
              200,
              body,
              'text/html; charset=utf-8',
              context.requestId,
              true,
              fetchRuntime.config.embeddingOrigin,
              fetchRuntime.config.javascriptExecutionPolicy,
              fetchRuntime.config.publicOrigin
            ),
            headers: browserHeaders(
              context.requestId,
              'text/html; charset=utf-8',
              body.length,
              true,
              fetchRuntime.config.embeddingOrigin,
              fetchRuntime.config.javascriptExecutionPolicy,
              fetchRuntime.config.publicOrigin
            ),
          }
        } catch (error) {
          const failure = transformError(error)
          return errorResponse(
            failure.status,
            failure.code,
            failure.message,
            context.requestId
          )
        }
      }

      if (context.path.includes('/resource')) {
        if (!fetchRuntime) {
          return errorResponse(
            501,
            'PROXY_NOT_IMPLEMENTED',
            'Resource fetching is disabled.',
            context.requestId
          )
        }
        const encodedTarget = queryValue(event, 't')
        if (
          !encodedTarget ||
          encodedTarget.length > fetchRuntime.config.maxResourceUrlLength
        ) {
          return errorResponse(
            400,
            'RESOURCE_URL_INVALID',
            'The resource URL is invalid.',
            context.requestId
          )
        }
        const depth = Number(queryValue(event, 'depth') ?? 0)
        if (
          !Number.isSafeInteger(depth) ||
          depth < 0 ||
          depth > fetchRuntime.config.maxCssImportDepth + 1
        ) {
          return errorResponse(
            413,
            'RESOURCE_DEPTH_LIMIT',
            'The resource nesting limit was exceeded.',
            context.requestId
          )
        }
        try {
          const resourceTarget = decodeResourceTarget(encodedTarget)
          if (isBlockedPreviewTrackingUrl(resourceTarget)) {
            return errorResponse(
              403,
              'TRACKING_DISABLED',
              'Pathlens tracking resources are disabled in previews.',
              context.requestId
            )
          }
          const upstream = await fetchUpstream(
            { ...fetchRuntime, requestId: context.requestId },
            {
              session,
              url: resourceTarget,
              method: context.method as 'GET' | 'HEAD',
              category: 'resource',
            }
          )
          if (
            fetchRuntime.config.javascriptExecutionPolicy === 'static-only' &&
            (upstream.contentType === 'application/javascript' ||
              upstream.contentType === 'text/javascript')
          ) {
            return errorResponse(
              403,
              'SCRIPT_DISABLED',
              'Active scripts are disabled in Step 4B.',
              context.requestId
            )
          }
          let body = upstream.body
          let contentType = upstream.contentType || 'application/octet-stream'
          if (
            upstream.contentType === 'text/css' &&
            context.method !== 'HEAD'
          ) {
            const rewritten = rewriteCss(upstream.body.toString('utf8'), {
              baseUrl: upstream.finalUrl,
              context: {
                session,
                handle,
                proxyOrigin: fetchRuntime.config.publicOrigin,
                config: fetchRuntime.config,
                referenceCount: 0,
                depth,
              },
              config: fetchRuntime.config,
              depth,
            })
            body = Buffer.from(rewritten)
            contentType = 'text/css; charset=utf-8'
          }
          if (
            fetchRuntime.config.javascriptExecutionPolicy ===
              'isolated-script-runtime' &&
            (upstream.contentType === 'application/javascript' ||
              upstream.contentType === 'text/javascript') &&
            context.method !== 'HEAD'
          ) {
            body = Buffer.from(
              rewriteJavaScript({
                source: upstream.body.toString('utf8'),
                baseUrl: upstream.finalUrl,
                context: {
                  session,
                  handle,
                  proxyOrigin: fetchRuntime.config.publicOrigin,
                  config: fetchRuntime.config,
                  referenceCount: 0,
                  depth: Math.min(
                    depth + 1,
                    fetchRuntime.config.maxCssImportDepth + 1
                  ),
                },
              })
            )
            contentType =
              upstream.contentType === 'text/javascript'
                ? 'text/javascript'
                : 'application/javascript'
          }
          if (context.method === 'HEAD') {
            return {
              statusCode: upstream.statusCode,
              headers: browserHeaders(
                context.requestId,
                contentType,
                body.length,
                false,
                null,
                fetchRuntime.config.javascriptExecutionPolicy,
                fetchRuntime.config.publicOrigin,
                true
              ),
            }
          }
          return binary(
            upstream.statusCode,
            body,
            contentType,
            context.requestId,
            false,
            null,
            fetchRuntime.config.javascriptExecutionPolicy,
            fetchRuntime.config.publicOrigin,
            true
          )
        } catch (error) {
          const failure = transformError(error)
          return errorResponse(
            failure.status,
            failure.code,
            failure.message,
            context.requestId
          )
        }
      }

      return errorResponse(
        404,
        'NOT_FOUND',
        'Route not found.',
        context.requestId
      )
    } catch (error) {
      console.error('Heatmap proxy request failed.', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      })
      return errorResponse(
        500,
        'INTERNAL_ERROR',
        'The preview request could not be completed.',
        context.requestId,
        true
      )
    }
  }
}
