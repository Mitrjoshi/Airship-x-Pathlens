import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiSessionAuthorizationService } from './authorization.js'
import type { ProxyConfig } from './config.js'

const claims = {
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
  expiresAt: '2099-10-22T10:10:00.000Z',
  revokedAt: null,
  previewIntent: 'heatmap' as const,
}

const config = {
  authorizationUrl: 'https://api.example.test/validate',
  sharedSecret: 'test-secret',
  authorizationTimeoutMs: 10,
} as ProxyConfig

function captureLogs() {
  const logs: unknown[] = []
  const originalInfo = console.info
  const originalDebug = console.debug
  const originalWarn = console.warn
  console.info = (...args: unknown[]) => logs.push(args[0])
  console.debug = (...args: unknown[]) => logs.push(args[0])
  console.warn = (...args: unknown[]) => logs.push(args[0])
  return {
    logs,
    restore() {
      console.info = originalInfo
      console.debug = originalDebug
      console.warn = originalWarn
    },
  }
}

async function withFetch(
  implementation: typeof fetch,
  callback: () => Promise<void>
): Promise<void> {
  const original = globalThis.fetch
  globalThis.fetch = implementation
  try {
    await callback()
  } finally {
    globalThis.fetch = original
  }
}

test('classifies validated and upstream rejection diagnostics without logging handles', async () => {
  const captured = captureLogs()
  try {
    await withFetch(
      async () =>
        new Response(JSON.stringify({ success: true, data: claims }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      async () => {
        const service = new ApiSessionAuthorizationService(config)
        assert.deepEqual(
          await service.validate('opaque-handle', 'request-1'),
          claims
        )
      }
    )

    await withFetch(
      async () =>
        new Response(JSON.stringify({ error: { code: 'SESSION_EXPIRED' } }), {
          status: 401,
        }),
      async () => {
        const service = new ApiSessionAuthorizationService(config)
        assert.equal(await service.validate('opaque-handle', 'request-2'), null)
      }
    )

    assert.deepEqual(
      captured.logs.map((entry) => (entry as { category: string }).category),
      ['validated', 'authorization_rejected']
    )
    assert.equal(
      (captured.logs[0] as { session_id: string }).session_id,
      claims.sessionId
    )
    assert.equal('handle' in (captured.logs[0] as object), false)
    assert.equal('upstream_code' in (captured.logs[1] as object), true)
  } finally {
    captured.restore()
  }
})

test('classifies invalid upstream responses, timeouts, and network failures', async () => {
  const cases: Array<{
    implementation: typeof fetch
    category: string
  }> = [
    {
      implementation: async () => new Response('{', { status: 200 }),
      category: 'invalid_upstream_response',
    },
    {
      implementation: async (_input, init) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          )
        ),
      category: 'authorization_timeout',
    },
    {
      implementation: async () => {
        throw new Error('network unavailable')
      },
      category: 'authorization_network_failure',
    },
  ]

  for (const { implementation, category } of cases) {
    const captured = captureLogs()
    try {
      await withFetch(implementation, async () => {
        const service = new ApiSessionAuthorizationService(config)
        if (
          category === 'authorization_timeout' ||
          category === 'authorization_network_failure'
        ) {
          await assert.rejects(() =>
            service.validate('opaque-handle', 'request-3')
          )
        } else {
          assert.equal(
            await service.validate('opaque-handle', 'request-4'),
            null
          )
        }
      })
      assert.equal(
        (captured.logs[0] as { category: string }).category,
        category
      )
    } finally {
      captured.restore()
    }
  }
})
