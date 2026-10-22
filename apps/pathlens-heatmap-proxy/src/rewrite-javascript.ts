import { parse, type ParserPlugin } from '@babel/parser'
import {
  createScopedResourceUrl,
  RewriteError,
  type RewriteContext,
} from './rewrite-url.js'

interface AstNode {
  type: string
  start?: number | null
  end?: number | null
  [key: string]: unknown
}

interface RewriteJavaScriptOptions {
  source: string
  baseUrl: string
  context: RewriteContext
  runtimeImageHelperNeeded?: boolean
}

interface Replacement {
  start: number
  end: number
  value: string
}

function rewriteViteModulePreloadHelper(
  source: string,
  options: RewriteJavaScriptOptions
): string {
  if (!source.includes('modulepreload')) return source

  const helperPattern =
    /([A-Za-z_$][\w$]*)\s*=\s*function\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{\s*return\s*`\/`\s*\+\s*\2\s*\}/
  const match = source.match(helperPattern)
  if (!match) return source

  const [, helperName, argumentName] = match
  const resourcePrefix = `${options.context.proxyOrigin}/v1/session/${encodeURIComponent(options.context.handle)}/resource?t=`
  const replacement = `${helperName}=function(${argumentName}){const t=new URL('/'+String(${argumentName}).replace(/^\\/+/,''),${JSON.stringify(options.baseUrl)}).href;return ${JSON.stringify(resourcePrefix)}+btoa(t).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')+'&depth=0'}`
  return source.replace(helperPattern, replacement)
}

const parserPlugins: ParserPlugin[] = [
  'dynamicImport',
  'importMeta',
  'topLevelAwait',
  'jsx',
]

function isNode(value: unknown): value is AstNode {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'type' in value &&
    typeof (value as { type?: unknown }).type === 'string'
  )
}

function stringLiteral(node: unknown): node is AstNode & { value: string } {
  return (
    isNode(node) &&
    node.type === 'StringLiteral' &&
    typeof node.value === 'string'
  )
}

function staticString(node: unknown): { node: AstNode; value: string } | null {
  if (stringLiteral(node)) return { node, value: node.value }
  if (!isNode(node) || node.type !== 'TemplateLiteral') return null
  const expressions = Array.isArray(node.expressions) ? node.expressions : []
  const quasis = Array.isArray(node.quasis) ? node.quasis : []
  const quasi = quasis[0]
  if (expressions.length || quasis.length !== 1 || !isNode(quasi)) return null
  const templateValue = quasi.value
  if (!templateValue || typeof templateValue !== 'object') return null
  const cooked = (templateValue as { cooked?: unknown }).cooked
  return typeof cooked === 'string' ? { node, value: cooked } : null
}

function identifier(node: unknown, name: string): boolean {
  return isNode(node) && node.type === 'Identifier' && node.name === name
}

function memberProperty(node: unknown, name: string): boolean {
  if (!isNode(node) || node.type !== 'MemberExpression') return false
  return (
    identifier(node.property, name) ||
    (node.computed === true &&
      stringLiteral(node.property) &&
      node.property.value === name)
  )
}

function objectProperty(node: AstNode, name: string): boolean {
  if (node.type !== 'ObjectProperty') return false
  return (
    identifier(node.key, name) ||
    (node.computed === false &&
      stringLiteral(node.key) &&
      node.key.value === name)
  )
}

function nodeRange(node: AstNode): { start: number; end: number } | null {
  return typeof node.start === 'number' && typeof node.end === 'number'
    ? { start: node.start, end: node.end }
    : null
}

function addReplacement(
  replacements: Replacement[],
  node: AstNode,
  value: string
): void {
  const range = nodeRange(node)
  if (range) replacements.push({ ...range, value })
}

function blockedExpression(message: string): string {
  return `Promise.reject(new TypeError(${JSON.stringify(message)}))`
}

function rewriteReference(
  value: string,
  options: RewriteJavaScriptOptions,
  depth = options.context.depth
): string {
  const rewritten = createScopedResourceUrl(
    value,
    options.baseUrl,
    options.context,
    depth
  )
  if (!rewritten) {
    throw new RewriteError(
      'SCRIPT_REFERENCE_NOT_ALLOWED',
      'The JavaScript resource reference is not allowed.'
    )
  }
  return rewritten
}

function rewriteSrcsetReference(
  value: string,
  options: RewriteJavaScriptOptions
): string {
  return value
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/)
      const source = parts.shift() ?? ''
      const rewritten = rewriteReference(source, options)
      return [rewritten, ...parts].join(' ')
    })
    .join(', ')
}

function sourceText(node: AstNode, source: string): string | null {
  const range = nodeRange(node)
  return range ? source.slice(range.start, range.end) : null
}

function markRuntimeImageReference(
  node: AstNode,
  options: RewriteJavaScriptOptions,
  replacements: Replacement[],
  srcset = false
): void {
  const expression = sourceText(node, options.source)
  if (!expression) return
  options.runtimeImageHelperNeeded = true
  addReplacement(
    replacements,
    node,
    `${srcset ? '__pathlensImageSrcset' : '__pathlensImage'}(${expression})`
  )
}

function runtimeImageHelper(options: RewriteJavaScriptOptions): string {
  const hosts = [
    options.context.session.canonicalHostname,
    ...options.context.session.allowedHostnames,
  ].map((hostname) =>
    hostname
      .toLowerCase()
      .replace(/^www\./, '')
      .replace(/\.$/, '')
  )
  const externalOrigins = options.context.config.allowedExternalOrigins
  const blockedTracking = [
    {
      origin: 'https://pathlens-tracker.s3.ap-south-1.amazonaws.com',
      paths: ['/tracker.global.js'],
    },
    {
      origin: 'https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com',
      paths: [
        '/dev/api/events',
        '/dev/api/replay/chunks',
        '/dev/api/tracking/config',
      ],
    },
  ]
  return `const __pathlensImageResolver__=(value)=>{let u;try{u=new URL(String(value??''),${JSON.stringify(options.baseUrl)})}catch{return''}if(u.protocol!=='http:'&&u.protocol!=='https:')return'';if(u.username||u.password||u.port)return'';const h=u.hostname.toLowerCase().replace(/^www\\./,'').replace(/\\.$/,'');const allowed=${JSON.stringify(hosts)}.includes(h)||${JSON.stringify(externalOrigins)}.includes(u.origin);if(!allowed)return'';if(${JSON.stringify(blockedTracking)}.some((item)=>item.origin===u.origin&&item.paths.includes(u.pathname)))return'';const t=u.href;return ${JSON.stringify(`${options.context.proxyOrigin}/v1/session/${encodeURIComponent(options.context.handle)}/resource?t=`)}+btoa(t).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')+'&depth=1'};const __pathlensImage=__pathlensImageResolver__;const __pathlensImageSrcset=(value)=>String(value??'').split(',').map((candidate)=>{const parts=candidate.trim().split(/\\s+/);const source=__pathlensImageResolver__(parts.shift()??'');return[source,...parts].join(' ')}).join(', ');`
}

function visit(
  node: AstNode,
  options: RewriteJavaScriptOptions,
  replacements: Replacement[]
): void {
  const rewriteLiteral = (literal: AstNode, value: string): void => {
    try {
      addReplacement(
        replacements,
        literal,
        JSON.stringify(rewriteReference(value, options))
      )
    } catch (error) {
      if (error instanceof RewriteError) throw error
      throw new RewriteError(
        'SCRIPT_REFERENCE_NOT_ALLOWED',
        'The JavaScript resource reference is not allowed.'
      )
    }
  }

  const rewriteModuleLiteral = (literal: AstNode, value: string): void => {
    try {
      // Module identity must not vary with traversal depth, or shared runtimes
      // such as React are evaluated more than once in the browser.
      addReplacement(
        replacements,
        literal,
        JSON.stringify(rewriteReference(value, options, 0))
      )
    } catch (error) {
      if (error instanceof RewriteError) throw error
      throw new RewriteError(
        'SCRIPT_REFERENCE_NOT_ALLOWED',
        'The JavaScript resource reference is not allowed.'
      )
    }
  }

  if (
    (node.type === 'ImportDeclaration' ||
      node.type === 'ExportNamedDeclaration' ||
      node.type === 'ExportAllDeclaration') &&
    stringLiteral(node.source)
  ) {
    rewriteModuleLiteral(node.source, node.source.value as string)
  }

  if (
    node.type === 'CallExpression' &&
    isNode(node.callee) &&
    node.callee.type === 'Import'
  ) {
    const argument = node.arguments instanceof Array ? node.arguments[0] : null
    const staticArgument = staticString(argument)
    if (staticArgument) {
      try {
        rewriteModuleLiteral(staticArgument.node, staticArgument.value)
      } catch (error) {
        if (error instanceof RewriteError) {
          addReplacement(replacements, node, blockedExpression(error.message))
          return
        }
        throw error
      }
    }
  }

  if (node.type === 'ImportExpression') {
    const staticSource = staticString(node.source)
    if (staticSource) {
      try {
        rewriteModuleLiteral(staticSource.node, staticSource.value)
      } catch (error) {
        if (error instanceof RewriteError) {
          addReplacement(replacements, node, blockedExpression(error.message))
          return
        }
        throw error
      }
    }
  }

  if (node.type === 'CallExpression' && identifier(node.callee, 'fetch')) {
    const argument = node.arguments instanceof Array ? node.arguments[0] : null
    const staticArgument = staticString(argument)
    if (staticArgument) {
      try {
        rewriteLiteral(staticArgument.node, staticArgument.value)
      } catch (error) {
        if (error instanceof RewriteError) {
          addReplacement(replacements, node, blockedExpression(error.message))
          return
        }
        throw error
      }
    }
  }

  if (node.type === 'CallExpression' && memberProperty(node.callee, 'open')) {
    const argumentsList = node.arguments instanceof Array ? node.arguments : []
    const method = argumentsList[0]
    const url = argumentsList[1]
    const staticUrl = staticString(url)
    if (stringLiteral(method) && staticUrl) {
      try {
        rewriteLiteral(staticUrl.node, staticUrl.value)
      } catch (error) {
        if (error instanceof RewriteError) {
          addReplacement(replacements, node, blockedExpression(error.message))
          return
        }
        throw error
      }
    }
  }

  if (
    node.type === 'CallExpression' &&
    memberProperty(node.callee, 'setAttribute')
  ) {
    const argumentsList = node.arguments instanceof Array ? node.arguments : []
    const attribute = argumentsList[0]
    const value = argumentsList[1]
    if (
      stringLiteral(attribute) &&
      (attribute.value === 'src' ||
        attribute.value === 'href' ||
        attribute.value === 'srcset' ||
        attribute.value === 'srcSet')
    ) {
      const staticValue = staticString(value)
      if (staticValue) {
        if (attribute.value === 'srcset' || attribute.value === 'srcSet') {
          addReplacement(
            replacements,
            staticValue.node,
            JSON.stringify(rewriteSrcsetReference(staticValue.value, options))
          )
        } else rewriteLiteral(staticValue.node, staticValue.value)
      } else if (
        attribute.value === 'src' ||
        attribute.value === 'srcset' ||
        attribute.value === 'srcSet'
      ) {
        markRuntimeImageReference(
          value as AstNode,
          options,
          replacements,
          attribute.value === 'srcset' || attribute.value === 'srcSet'
        )
      }
    }
  }

  if (
    node.type === 'AssignmentExpression' &&
    memberProperty(node.left, 'src') &&
    staticString(node.right)
  ) {
    const staticValue = staticString(node.right)
    if (staticValue) rewriteLiteral(staticValue.node, staticValue.value)
  } else if (
    node.type === 'AssignmentExpression' &&
    memberProperty(node.left, 'src') &&
    isNode(node.right)
  ) {
    markRuntimeImageReference(node.right, options, replacements)
  }

  if (objectProperty(node, 'src')) {
    const staticValue = staticString(node.value)
    if (staticValue) rewriteLiteral(staticValue.node, staticValue.value)
    else if (
      !isNode(node.value) ||
      (node.value.type !== 'Identifier' &&
        node.value.type !== 'MemberExpression')
    )
      markRuntimeImageReference(node.value as AstNode, options, replacements)
  }

  if (objectProperty(node, 'image')) {
    const staticValue = staticString(node.value)
    if (staticValue) rewriteLiteral(staticValue.node, staticValue.value)
  }

  if (node.type === 'ArrayExpression' && Array.isArray(node.elements)) {
    const values = node.elements
      .filter(isNode)
      .map((element) => staticString(element))
    if (
      values.length === node.elements.length &&
      values.length > 0 &&
      values.every(
        (value) =>
          value !== null &&
          value.value.startsWith('/') &&
          /\.(?:avif|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(value.value)
      )
    ) {
      for (const value of values) {
        if (value) rewriteLiteral(value.node, value.value)
      }
    }
  }

  if (objectProperty(node, 'srcset') || objectProperty(node, 'srcSet')) {
    const staticValue = staticString(node.value)
    if (staticValue) {
      addReplacement(
        replacements,
        staticValue.node,
        JSON.stringify(rewriteSrcsetReference(staticValue.value, options))
      )
    } else
      markRuntimeImageReference(
        node.value as AstNode,
        options,
        replacements,
        true
      )
  }

  for (const value of Object.values(node)) {
    if (isNode(value)) visit(value, options, replacements)
    else if (Array.isArray(value)) {
      for (const item of value)
        if (isNode(item)) visit(item, options, replacements)
    }
  }
}

export function rewriteJavaScript(options: RewriteJavaScriptOptions): string {
  const rewrittenSource = rewriteViteModulePreloadHelper(
    options.source,
    options
  )
  let ast: AstNode
  try {
    ast = parse(rewrittenSource, {
      sourceType: 'unambiguous',
      sourceFilename: options.baseUrl,
      plugins: parserPlugins,
    }).program as unknown as AstNode
  } catch {
    throw new RewriteError(
      'SCRIPT_SYNTAX_UNSUPPORTED',
      'The JavaScript syntax cannot be safely rewritten.'
    )
  }

  const rewriteOptions = { ...options, source: rewrittenSource }
  const replacements: Replacement[] = []
  visit(ast, rewriteOptions, replacements)
  replacements.sort((left, right) => right.start - left.start)
  let output = rewrittenSource
  let end = Number.POSITIVE_INFINITY
  for (const replacement of replacements) {
    if (replacement.end > end) continue
    output =
      output.slice(0, replacement.start) +
      replacement.value +
      output.slice(replacement.end)
    end = replacement.start
  }
  return rewriteOptions.runtimeImageHelperNeeded
    ? `${runtimeImageHelper(rewriteOptions)}`
        .replaceAll(
          'const __pathlensImageResolver__=',
          'var __pathlensImageResolver__='
        )
        .replaceAll(';const __pathlensImage=', ';var __pathlensImage=')
        .replaceAll(
          ';const __pathlensImageSrcset=',
          ';var __pathlensImageSrcset='
        ) + output
    : output
}
