import assert from 'node:assert/strict'
import test from 'node:test'
import type { ProxyConfig } from './config.js'
import { rewriteJavaScript } from './rewrite-javascript.js'
import { RewriteError, type RewriteContext } from './rewrite-url.js'

const session = {
  sessionId: '00000000-0000-4000-8000-000000000001',
  workspaceId: '00000000-0000-4000-8000-000000000002',
  projectId: '00000000-0000-4000-8000-000000000003',
  projectDomainId: '00000000-0000-4000-8000-000000000004',
  userId: '00000000-0000-4000-8000-000000000005',
  canonicalHostname: 'example.com',
  allowedHostnames: ['example.com'],
  pathname: '/',
  device: 'desktop' as const,
  createdAt: '2026-10-22T10:00:00.000Z',
  expiresAt: '2026-10-22T10:10:00.000Z',
  revokedAt: null,
  previewIntent: 'compatibility' as const,
}

const config: ProxyConfig = {
  javascriptExecutionPolicy: 'isolated-script-runtime',
  port: 8082,
  publicOrigin: 'https://proxy.example.test',
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
  allowedExternalOrigins: [],
  embeddingOrigin: null,
  dashboardOrigin: 'http://localhost:5173',
  apiOrigin: 'http://localhost:8080',
}

function context(): RewriteContext {
  return {
    session,
    handle: 'opaque-session-handle',
    proxyOrigin: config.publicOrigin,
    config,
    referenceCount: 0,
    depth: 0,
  }
}

test('rewrites module imports and read-only browser URLs with AST ranges', () => {
  const output = rewriteJavaScript({
    source:
      "import './nested.js?chunk=1'; export { value } from '/shared.js'; fetch('/api/data.json'); const xhr = new XMLHttpRequest(); xhr.open('GET', '/api/head.json'); const image = new Image(); image.src = '/assets/logo.svg';",
    baseUrl: 'https://example.com/assets/app.js',
    context: context(),
  })

  assert.equal(
    (output.match(/v1\/session\/opaque-session-handle\/resource/g) ?? [])
      .length,
    5
  )
  assert.match(
    output,
    /fetch\("https:\/\/proxy\.example\.test\/v1\/session\/opaque-session-handle\/resource\?t=/
  )
  assert.match(
    output,
    /xhr\.open\('GET', "https:\/\/proxy\.example\.test\/v1\/session\/opaque-session-handle\/resource\?t=/
  )
})

test('keeps equivalent module imports on one browser module URL', () => {
  const first = rewriteJavaScript({
    source: "import './shared.js'",
    baseUrl: 'https://example.com/assets/first.js',
    context: { ...context(), depth: 1 },
  })
  const second = rewriteJavaScript({
    source: "import './shared.js'",
    baseUrl: 'https://example.com/assets/first.js',
    context: { ...context(), depth: 2 },
  })

  assert.equal(first, second)
  assert.match(first, /[?&]depth=0(?:&|"|')/)
})

test('rewrites Vite modulepreload asset URLs through the session resource route', () => {
  const output = rewriteJavaScript({
    source:
      'const qi=`modulepreload`,Ji=function(e){return`/`+e}; const load=()=>Ji(`assets/contact.js`)',
    baseUrl: 'https://example.com/assets/index.js',
    context: context(),
  })

  assert.doesNotMatch(output, /return`\/`\+e/)
  assert.match(
    output,
    /v1\/session\/opaque-session-handle\/resource\?t=.*depth=0/
  )
})

test('rewrites static src object properties used by compiled UI frameworks', () => {
  const output = rewriteJavaScript({
    source: `const props = { src: '/logo.svg' }`,
    baseUrl: 'https://example.com/assets/app.js',
    context: context(),
  })

  assert.equal(
    (output.match(/v1\/session\/opaque-session-handle\/resource/g) ?? [])
      .length,
    1
  )
  assert.doesNotMatch(output, /src: ['"]\/logo\.svg/)
})

test('rewrites JavaScript-created srcset and srcSet values', () => {
  const output = rewriteJavaScript({
    source:
      "const source=document.createElement('source'); source.setAttribute('srcset','/logo.svg 1x, /logo.svg 2x'); const props={srcSet:'/logo.svg 1x'};",
    baseUrl: 'https://example.com/contact',
    context: context(),
  })

  assert.equal(
    (output.match(/v1\/session\/opaque-session-handle\/resource/g) ?? [])
      .length,
    3
  )
  assert.doesNotMatch(output, /srcset['"]?,['"]?\/?logo\.svg/)
})

test('rewrites dynamic React image props through the authorized resolver', () => {
  const output = rewriteJavaScript({
    source:
      "const skills=[{image:'/skills/reactjs.svg'}]; const screenshots=['/projects/screenshots/pathlens.png']; const makeImage=(value)=>value; const render=(item)=>({src:makeImage(item.image)}); const renderScreenshot=(item)=>({src:makeImage(item)});",
    baseUrl: 'https://example.com/assets/skills.js',
    context: context(),
  })

  assert.match(output, /__pathlensImageResolver__/)
  assert.match(output, /src:__pathlensImage\(makeImage\(item\.image\)\)/)
  assert.match(output, /src:__pathlensImage\(makeImage\(item\)\)/)
  assert.doesNotMatch(output, /image:['"]\/skills\/reactjs\.svg/)
  assert.doesNotMatch(output, /['"]\/projects\/screenshots\/pathlens\.png['"]/)
})

test('fails closed for unauthorized dynamic imports without fetching them', () => {
  const output = rewriteJavaScript({
    source: "import('https://anotherbrand.com/chunk.js').catch(() => {});",
    baseUrl: 'https://example.com/assets/app.js',
    context: context(),
  })

  assert.match(output, /Promise\.reject\(new TypeError\(/)
  assert.doesNotMatch(output, /anotherbrand\.com\/chunk\.js/)
})

test('rejects syntax that cannot be safely parsed', () => {
  assert.throws(
    () =>
      rewriteJavaScript({
        source: 'const = invalid;',
        baseUrl: 'https://example.com/assets/app.js',
        context: context(),
      }),
    (error: unknown) =>
      error instanceof RewriteError &&
      error.code === 'SCRIPT_SYNTAX_UNSUPPORTED'
  )
})
