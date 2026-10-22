import { parse, serialize } from 'parse5'
import type { PreviewSessionClaims } from '@workspace/contracts'
import type { PreviewIntent } from '@workspace/contracts'
import type { ProxyConfig } from './config.js'
import { rewriteCss } from './rewrite-css.js'
import {
  assertTransformBudget,
  createScopedResourceUrl,
  resolveReference,
  RewriteError,
  type RewriteContext,
} from './rewrite-url.js'

interface HtmlAttribute {
  name: string
  value: string
}

interface HtmlNode {
  nodeName: string
  parentNode?: HtmlParent | null
  childNodes: HtmlNode[]
  tagName?: string
  attrs?: HtmlAttribute[]
  value?: string
}

interface HtmlParent {
  childNodes: HtmlNode[]
}

interface HtmlElement extends HtmlNode {
  tagName: string
  attrs: HtmlAttribute[]
}

export interface HtmlRewriteOptions {
  session: PreviewSessionClaims
  handle: string
  proxyOrigin: string
  pageUrl: string
  config: ProxyConfig
  allowExternalScripts?: boolean
  previewIntent?: PreviewIntent
}

function attr(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((item) => item.name === name)?.value
}

function setAttr(element: HtmlElement, name: string, value: string): void {
  const existing = element.attrs.find((item) => item.name === name)
  if (existing) existing.value = value
  else element.attrs.push({ name, value })
}

function removeAttr(element: HtmlElement, name: string): void {
  element.attrs = element.attrs.filter((item) => item.name !== name)
}

function blocked(element: HtmlElement, attribute: string): void {
  removeAttr(element, attribute)
  setAttr(element, 'data-pathlens-blocked-resource', attribute)
}

function removeNode(node: HtmlNode): void {
  const parent = node.parentNode ?? null
  if (!parent) return
  const index = parent.childNodes.indexOf(node)
  if (index >= 0) parent.childNodes.splice(index, 1)
}

function childrenText(element: HtmlElement): string {
  return element.childNodes
    .filter((node) => node.nodeName === '#text')
    .map((node) => ('value' in node ? node.value : ''))
    .join('')
}

function setText(element: HtmlElement, value: string): void {
  element.childNodes = [
    {
      nodeName: '#text',
      value,
      parentNode: element,
      childNodes: [],
    },
  ]
}

function appendScrollController(
  document: HtmlNode,
  proxyOrigin: string,
  handle: string
): void {
  const visit = (node: HtmlNode): boolean => {
    if (node.tagName?.toLowerCase() === 'head') {
      const parent = node as HtmlElement
      const script: HtmlElement = {
        nodeName: 'script',
        tagName: 'script',
        attrs: [
          {
            name: 'src',
            value: `${proxyOrigin}/v1/session/${encodeURIComponent(handle)}/runtime/scroll-controller.js`,
          },
        ],
        childNodes: [],
        parentNode: parent,
      }
      parent.childNodes.push(script)
      return true
    }
    return (node.childNodes ?? []).some(visit)
  }
  visit(document)
}

function prependStorageCompatibility(
  document: HtmlNode,
  proxyOrigin: string,
  handle: string
): void {
  const visit = (node: HtmlNode): boolean => {
    if (node.tagName?.toLowerCase() === 'head') {
      const parent = node as HtmlElement
      const script: HtmlElement = {
        nodeName: 'script',
        tagName: 'script',
        attrs: [
          {
            name: 'src',
            value: `${proxyOrigin}/v1/session/${encodeURIComponent(handle)}/runtime/storage-compatibility.js`,
          },
        ],
        childNodes: [],
        parentNode: parent,
      }
      parent.childNodes.unshift(script)
      return true
    }
    return (node.childNodes ?? []).some(visit)
  }
  visit(document)
}

function prependRoutingCompatibility(
  document: HtmlNode,
  proxyOrigin: string,
  handle: string
): void {
  const visit = (node: HtmlNode): boolean => {
    if (node.tagName?.toLowerCase() === 'head') {
      const parent = node as HtmlElement
      const script: HtmlElement = {
        nodeName: 'script',
        tagName: 'script',
        attrs: [
          {
            name: 'src',
            value: `${proxyOrigin}/v1/session/${encodeURIComponent(handle)}/runtime/routing-compatibility.js`,
          },
        ],
        childNodes: [],
        parentNode: parent,
      }
      parent.childNodes.unshift(script)
      return true
    }
    return (node.childNodes ?? []).some(visit)
  }
  visit(document)
}

function rewriteSrcset(
  value: string,
  baseUrl: string,
  context: RewriteContext
): string {
  return value
    .split(',')
    .map((candidate) => {
      const parts = candidate.trim().split(/\s+/)
      const source = parts.shift() ?? ''
      try {
        const rewritten = createScopedResourceUrl(source, baseUrl, context)
        if (!rewritten)
          throw new RewriteError(
            'SRCSET_BLOCKED',
            'The srcset reference is blocked.'
          )
        return [rewritten, ...parts].join(' ')
      } catch (error) {
        if (error instanceof RewriteError && error.code === 'REFERENCE_LIMIT')
          throw error
        return ''
      }
    })
    .filter(Boolean)
    .join(', ')
}

function rewriteResourceAttribute(
  element: HtmlElement,
  attribute: string,
  baseUrl: string,
  context: RewriteContext
): void {
  const value = attr(element, attribute)
  if (!value) return
  try {
    const rewritten = createScopedResourceUrl(value, baseUrl, context)
    if (rewritten) setAttr(element, attribute, rewritten)
    else blocked(element, attribute)
  } catch (error) {
    if (error instanceof RewriteError && error.code === 'REFERENCE_LIMIT')
      throw error
    blocked(element, attribute)
  }
}

function rewriteNavigation(element: HtmlElement, baseUrl: string): void {
  const value = attr(element, 'href')
  if (!value || value.startsWith('#')) return
  try {
    const target = resolveReference(value, baseUrl)
    if (!target) return
    setAttr(element, 'data-pathlens-navigation', target.href)
    setAttr(element, 'href', '#')
    removeAttr(element, 'target')
    removeAttr(element, 'download')
  } catch {
    setAttr(element, 'data-pathlens-blocked-navigation', 'true')
    setAttr(element, 'href', '#')
    removeAttr(element, 'target')
    removeAttr(element, 'download')
  }
}

function walk(
  node: HtmlNode,
  baseUrl: string,
  context: RewriteContext,
  config: ProxyConfig,
  startedAt: number,
  allowExternalScripts: boolean
): void {
  if (
    node.nodeName !== '#text' &&
    node.nodeName !== '#comment' &&
    'tagName' in node
  ) {
    const element = node as HtmlElement
    const tag = element.tagName.toLowerCase()
    if (tag === 'script') {
      const source = attr(element, 'src')
      const scriptType = attr(element, 'type')?.toLowerCase().trim()
      const supportedScript =
        !scriptType ||
        scriptType === 'module' ||
        scriptType === 'text/javascript' ||
        scriptType === 'application/javascript'
      if (allowExternalScripts && source && supportedScript) {
        try {
          const rewritten = createScopedResourceUrl(source, baseUrl, context)
          if (rewritten) setAttr(element, 'src', rewritten)
        } catch {
          removeAttr(element, 'src')
        }
        if (scriptType !== 'module') removeAttr(element, 'type')
      } else if (source) {
        removeAttr(element, 'src')
      }
      if (!allowExternalScripts || !source || !attr(element, 'src')) {
        setAttr(element, 'type', 'application/x-pathlens-disabled')
        removeAttr(element, 'async')
        removeAttr(element, 'defer')
      }
      for (const item of [...element.attrs]) {
        if (item.name.toLowerCase().startsWith('on'))
          removeAttr(element, item.name)
      }
      setText(element, '')
    } else if (
      tag === 'form' ||
      tag === 'iframe' ||
      tag === 'object' ||
      tag === 'embed'
    ) {
      removeNode(node)
      return
    } else if (
      tag === 'meta' &&
      attr(element, 'http-equiv')?.toLowerCase() === 'refresh'
    ) {
      removeNode(node)
      return
    } else {
      const rel = (attr(element, 'rel') ?? '').toLowerCase().split(/\s+/)
      if (
        tag === 'link' &&
        rel.some((value) =>
          ['stylesheet', 'preload', 'modulepreload', 'icon'].includes(value)
        )
      ) {
        rewriteResourceAttribute(element, 'href', baseUrl, context)
      } else if (tag === 'img' || tag === 'source') {
        rewriteResourceAttribute(element, 'src', baseUrl, context)
        const srcset = attr(element, 'srcset')
        if (srcset) {
          const rewritten = rewriteSrcset(srcset, baseUrl, context)
          if (rewritten) setAttr(element, 'srcset', rewritten)
          else removeAttr(element, 'srcset')
        }
      } else if (tag === 'video') {
        rewriteResourceAttribute(element, 'src', baseUrl, context)
        rewriteResourceAttribute(element, 'poster', baseUrl, context)
      } else if (tag === 'a') {
        rewriteNavigation(element, baseUrl)
      }
      if (tag === 'style') {
        try {
          setText(
            element,
            rewriteCss(childrenText(element), {
              baseUrl,
              context,
              config,
              depth: context.depth,
            })
          )
        } catch (error) {
          if (error instanceof RewriteError && error.code === 'REFERENCE_LIMIT')
            throw error
          setText(element, '')
          setAttr(element, 'data-pathlens-blocked-style', 'true')
        }
      }
      const style = attr(element, 'style')
      if (style) {
        try {
          setAttr(
            element,
            'style',
            rewriteCss(`*{${style}}`, {
              baseUrl,
              context,
              config,
              depth: context.depth,
            }).replace(/^\*\{(.*)\}$/, '$1')
          )
        } catch (error) {
          if (error instanceof RewriteError && error.code === 'REFERENCE_LIMIT')
            throw error
          removeAttr(element, 'style')
        }
      }
      for (const item of [...element.attrs]) {
        if (item.name.toLowerCase().startsWith('on'))
          removeAttr(element, item.name)
        if (
          item.name === 'formaction' ||
          item.name === 'srcdoc' ||
          item.name === 'action'
        )
          removeAttr(element, item.name)
        if (item.name === 'download') removeAttr(element, item.name)
      }
    }
    if (tag === 'base') removeAttr(element, 'href')
  }
  for (const child of [...(node.childNodes ?? [])])
    walk(child, baseUrl, context, config, startedAt, allowExternalScripts)
  assertTransformBudget(startedAt, config)
}

export function rewriteHtml(html: string, options: HtmlRewriteOptions): string {
  if (Buffer.byteLength(html, 'utf8') > options.config.maxHtmlBytes) {
    throw new RewriteError('HTML_TOO_LARGE', 'The HTML document is too large.')
  }
  const startedAt = Date.now()
  const document = parse(html)
  const root = document as unknown as HtmlNode
  const context: RewriteContext = {
    session: options.session,
    handle: options.handle,
    proxyOrigin: options.proxyOrigin,
    config: options.config,
    referenceCount: 0,
    depth: 0,
  }
  let baseUrl = options.pageUrl
  const findBase = (node: HtmlNode): void => {
    if (
      node.tagName &&
      node.tagName.toLowerCase() === 'base' &&
      attr(node as HtmlElement, 'href')
    ) {
      try {
        baseUrl = new URL(
          attr(node as HtmlElement, 'href') ?? '',
          options.pageUrl
        ).href
      } catch {
        baseUrl = options.pageUrl
      }
      return
    }
    for (const child of node.childNodes ?? []) findBase(child)
  }
  findBase(root)
  walk(
    root,
    baseUrl,
    context,
    options.config,
    startedAt,
    options.allowExternalScripts ?? false
  )
  if (options.allowExternalScripts) {
    prependStorageCompatibility(root, options.proxyOrigin, options.handle)
    prependRoutingCompatibility(root, options.proxyOrigin, options.handle)
  }
  if (options.previewIntent === 'heatmap' && options.allowExternalScripts) {
    appendScrollController(root, options.proxyOrigin, options.handle)
  }
  const output = serialize(document)
  if (Buffer.byteLength(output, 'utf8') > options.config.maxRewrittenBytes) {
    throw new RewriteError(
      'REWRITTEN_TOO_LARGE',
      'The rewritten HTML is too large.'
    )
  }
  return output
}
