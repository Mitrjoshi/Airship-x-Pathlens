import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import type { ProxyConfig } from './config.js'
import { rewriteCss } from './rewrite-css.js'
import { rewriteHtml } from './rewrite-html.js'
import { RewriteError } from './rewrite-url.js'

const session = {
  sessionId: '00000000-0000-4000-8000-000000000001',
  workspaceId: '00000000-0000-4000-8000-000000000002',
  projectId: '00000000-0000-4000-8000-000000000003',
  projectDomainId: '00000000-0000-4000-8000-000000000004',
  userId: '00000000-0000-4000-8000-000000000005',
  canonicalHostname: 'example.com',
  allowedHostnames: ['example.com', 'www.example.com'],
  pathname: '/',
  device: 'desktop' as const,
  createdAt: '2026-10-22T10:00:00.000Z',
  expiresAt: '2026-10-22T10:10:00.000Z',
  revokedAt: null,
  previewIntent: 'compatibility' as const,
}

const config: ProxyConfig = {
  javascriptExecutionPolicy: 'static-only',
  port: 8082,
  publicOrigin: 'https://proxy.example.test',
  publicBasePath: '',
  authorizationUrl: 'https://api.example.test/validate',
  sharedSecret: 'test-secret',
  authorizationTimeoutMs: 100,
  dnsTimeoutMs: 100,
  connectionTimeoutMs: 100,
  tlsTimeoutMs: 100,
  requestTimeoutMs: 1000,
  maxHeaderBytes: 4096,
  maxResponseBytes: 1024 * 1024,
  maxRedirects: 5,
  maxConcurrentRequests: 2,
  maxHtmlBytes: 64 * 1024,
  maxCssBytes: 64 * 1024,
  maxRewrittenBytes: 128 * 1024,
  maxResourceUrlLength: 4096,
  maxCssImportDepth: 4,
  maxHtmlReferences: 100,
  maxTransformMs: 1000,
  allowedExternalOrigins: ['https://fonts.example.test'],
  embeddingOrigin: null,
  dashboardOrigin: 'http://localhost:5173',
  apiOrigin: 'http://localhost:8080',
}

function context(depth = 0) {
  return {
    session,
    handle: 'opaque-session-handle',
    proxyOrigin: config.publicOrigin,
    config,
    referenceCount: 0,
    depth,
  }
}

test('rewrites HTML resources using base href and disables active website behavior', () => {
  const output = rewriteHtml(
    `<!doctype html><base href="https://example.com/assets/"><link rel="stylesheet" href="css/site.css"><link rel="preload" href="/fonts/site.woff2" as="font"><img src="images/logo.png" srcset="images/logo.png 1x, /images/logo@2x.png 2x"><picture><source src="images/hero.webp"></picture><video poster="video/poster.jpg"></video><script src="/app.js"></script><script>alert(1)</script><form action="/submit"><input></form><a href="/contact">Contact</a><a href="#details">Details</a><img src="https://cdn.not-approved.test/image.png">`,
    {
      session,
      handle: 'opaque-session-handle',
      proxyOrigin: config.publicOrigin,
      pageUrl: 'https://example.com/',
      config,
    }
  )

  assert.match(output, /v1\/session\/opaque-session-handle\/resource\?t=/)
  assert.match(output, /application\/x-pathlens-disabled/)
  assert.match(
    output,
    /data-pathlens-navigation="https:\/\/example.com\/contact"/
  )
  assert.match(output, /href="#details"/)
  assert.match(output, /data-pathlens-blocked-resource="src"/)
  assert.doesNotMatch(output, /<form/i)
  assert.doesNotMatch(output, /onclick|onsubmit|alert\(1\)/i)
})

test('injects the controlled scroll bridge for heatmap previews', () => {
  const output = rewriteHtml(
    '<!doctype html><html><head></head><body></body></html>',
    {
      session: { ...session, previewIntent: 'heatmap' },
      handle: 'opaque-session-handle',
      proxyOrigin: config.publicOrigin,
      pageUrl: 'https://example.com/',
      config,
      allowExternalScripts: true,
      previewIntent: 'heatmap',
    }
  )

  assert.match(output, /runtime\/scroll-controller\.js/)
  assert.match(output, /runtime\/storage-compatibility\.js/)
  assert.match(output, /runtime\/routing-compatibility\.js/)
  assert.ok(
    output.indexOf('runtime/routing-compatibility.js') <
      output.indexOf('runtime/storage-compatibility.js')
  )
  assert.ok(
    output.indexOf('runtime/storage-compatibility.js') <
      output.indexOf('runtime/scroll-controller.js')
  )
})

test('includes an AWS stage base path on HTML, runtime, CSS, and resource URLs', () => {
  const awsConfig = { ...config, publicBasePath: '/dev' }
  const output = rewriteHtml(
    '<!doctype html><html><head><link rel="stylesheet" href="/site.css"><script type="module" src="/module.js"></script></head><body><img src="/image.png"></body></html>',
    {
      session: { ...session, previewIntent: 'heatmap' },
      handle: 'opaque-session-handle',
      proxyOrigin: config.publicOrigin,
      pageUrl: 'https://example.com/',
      config: awsConfig,
      allowExternalScripts: true,
      previewIntent: 'heatmap',
    }
  )

  assert.match(
    output,
    /https:\/\/proxy\.example\.test\/dev\/v1\/session\/opaque-session-handle\/resource/
  )
  assert.match(
    output,
    /https:\/\/proxy\.example\.test\/dev\/v1\/session\/opaque-session-handle\/runtime\//
  )
  assert.doesNotMatch(output, /proxy\.example\.test\/dev\/dev\//)
  const scopedOutput = rewriteHtml('<img src="/image.png">', {
    session: { ...session, previewIntent: 'heatmap' },
    handle: 'opaque-session-handle',
    proxyOrigin: config.publicOrigin,
    pageUrl: 'https://example.com/',
    config: awsConfig,
  })
  assert.equal(
    rewriteHtml(scopedOutput, {
      session,
      handle: 'opaque-session-handle',
      proxyOrigin: config.publicOrigin,
      pageUrl: 'https://example.com/',
      config: awsConfig,
    }),
    scopedOutput
  )
})

test('rewrites CSS URLs and imports relative to the stylesheet URL', () => {
  const output = rewriteCss(
    '@import "nested/theme.css"; .hero { background-image: url(../images/hero.png); } @font-face { src: url("/fonts/site.woff2") format("woff2"); }',
    {
      baseUrl: 'https://example.com/assets/css/site.css',
      context: context(),
      config,
      depth: 0,
    }
  )
  assert.equal(
    (output.match(/v1\/session\/opaque-session-handle\/resource/g) ?? [])
      .length,
    3
  )
  assert.match(output, /depth=1/)
})

test('blocks unauthorized CSS references instead of producing arbitrary proxy URLs', () => {
  assert.throws(
    () =>
      rewriteCss(
        'body { background: url(https://cdn.not-approved.test/bg.png) }',
        {
          baseUrl: 'https://example.com/site.css',
          context: context(),
          config,
          depth: 0,
        }
      ),
    (error: unknown) =>
      error instanceof RewriteError &&
      error.code === 'RESOURCE_ORIGIN_NOT_ALLOWED'
  )
})

test('allows only explicitly configured external static origins', () => {
  const output = rewriteCss(
    'body { background: url(https://fonts.example.test/font.woff2) }',
    {
      baseUrl: 'https://example.com/site.css',
      context: context(),
      config,
      depth: 0,
    }
  )
  assert.match(output, /v1\/session\/opaque-session-handle\/resource\?t=/)
  assert.throws(
    () =>
      rewriteCss('body { background: url(data:image/png;base64,abc) }', {
        baseUrl: 'https://example.com/site.css',
        context: context(),
        config,
        depth: 0,
      }),
    RewriteError
  )
})

test('preserves scoped resource URLs across repeated HTML and CSS rewriting', () => {
  const htmlOptions = {
    session,
    handle: 'opaque-session-handle',
    proxyOrigin: config.publicOrigin,
    pageUrl: 'https://example.com/contact',
    config,
  }
  const firstHtml = rewriteHtml('<img src="/images/banner.png">', htmlOptions)
  const secondHtml = rewriteHtml(firstHtml, htmlOptions)
  assert.equal(secondHtml, firstHtml)

  const cssOptions = {
    baseUrl: 'https://example.com/assets/site.css',
    context: context(),
    config,
    depth: 0,
  }
  const firstCss = rewriteCss(
    'body{background:url("/images/banner.png")}',
    cssOptions
  )
  const secondCss = rewriteCss(firstCss, cssOptions)
  assert.equal(secondCss, firstCss)
})

test('rejects a scoped resource URL belonging to another session', () => {
  const otherSessionUrl = `${config.publicOrigin}/v1/session/other-session/resource?t=${Buffer.from('https://example.com/image.png').toString('base64url')}&depth=0`
  const output = rewriteHtml(`<img src="${otherSessionUrl}">`, {
    session,
    handle: 'opaque-session-handle',
    proxyOrigin: config.publicOrigin,
    pageUrl: 'https://example.com/contact',
    config,
  })
  assert.match(output, /data-pathlens-blocked-resource="src"/)
  assert.doesNotMatch(output, /other-session\/resource/)
})

test('keeps legitimate commas inside srcset URLs', () => {
  const output = rewriteHtml(
    '<img srcset="/images/banner,wide.webp 1x, /images/banner@2x.webp 2x">',
    {
      session,
      handle: 'opaque-session-handle',
      proxyOrigin: config.publicOrigin,
      pageUrl: 'https://example.com/contact',
      config,
    }
  )
  assert.equal(
    (output.match(/v1\/session\/opaque-session-handle\/resource/g) ?? [])
      .length,
    2
  )
})

test('rewrites the controlled nested fixture site', () => {
  const fixture = readFileSync(
    new URL('../test-fixtures/site/index.html', import.meta.url),
    'utf8'
  )
  const output = rewriteHtml(fixture, {
    session,
    handle: 'opaque-session-handle',
    proxyOrigin: config.publicOrigin,
    pageUrl: 'https://example.com/',
    config,
  })
  assert.match(output, /resource\?t=/)
  assert.match(output, /application\/x-pathlens-disabled/)
  assert.match(
    output,
    new RegExp(
      Buffer.from('https://fonts.example.test/site.woff2').toString('base64url')
    )
  )
})
