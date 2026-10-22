import * as csstree from 'css-tree'
import type { ProxyConfig } from './config.js'
import {
  assertTransformBudget,
  createScopedResourceUrl,
  type RewriteContext,
  RewriteError,
} from './rewrite-url.js'

export interface CssRewriteOptions {
  baseUrl: string
  context: RewriteContext
  config: ProxyConfig
  depth: number
}

function rewriteReference(
  value: string,
  options: CssRewriteOptions,
  depth: number
): string {
  const result = createScopedResourceUrl(
    value,
    options.baseUrl,
    options.context,
    depth
  )
  if (!result) {
    throw new RewriteError(
      'CSS_REFERENCE_NOT_ALLOWED',
      'Fragment and empty CSS resource references are not allowed.'
    )
  }
  return result
}

export function rewriteCss(css: string, options: CssRewriteOptions): string {
  if (Buffer.byteLength(css, 'utf8') > options.config.maxCssBytes) {
    throw new RewriteError('CSS_TOO_LARGE', 'The stylesheet is too large.')
  }
  if (options.depth > options.config.maxCssImportDepth) {
    throw new RewriteError(
      'CSS_IMPORT_DEPTH',
      'The stylesheet import depth exceeded its limit.'
    )
  }

  const startedAt = Date.now()
  let ast: csstree.CssNode
  try {
    ast = csstree.parse(css, { context: 'stylesheet' })
  } catch {
    throw new RewriteError('CSS_INVALID', 'The stylesheet is invalid.')
  }

  csstree.walk(ast, {
    visit: 'Url',
    enter(node) {
      node.value = rewriteReference(node.value, options, options.depth + 1)
      assertTransformBudget(startedAt, options.config)
    },
  })

  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name.toLowerCase() !== 'import' || !node.prelude) return
      csstree.walk(node.prelude, {
        visit: 'String',
        enter(stringNode) {
          stringNode.value = rewriteReference(
            stringNode.value,
            options,
            options.depth + 1
          )
          assertTransformBudget(startedAt, options.config)
        },
      })
    },
  })

  const output = csstree.generate(ast)
  if (Buffer.byteLength(output, 'utf8') > options.config.maxRewrittenBytes) {
    throw new RewriteError(
      'REWRITTEN_TOO_LARGE',
      'The rewritten stylesheet is too large.'
    )
  }
  return output
}
