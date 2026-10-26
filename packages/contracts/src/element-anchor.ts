export const CLICK_ELEMENT_ANCHOR_SCHEMA_VERSION = 1 as const
export const MAX_CLICK_ELEMENT_ANCHOR_BYTES = 4096
export const MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH = 64
export const MAX_CLICK_ELEMENT_ANCHOR_DEPTH = 8
export const MAX_CLICK_ELEMENT_SCROLL_ANCESTORS = 4
export const MAX_CLICK_ELEMENT_ANCHOR_DIMENSION = 10_000_000

export type ClickElementPositionMode =
  'static' | 'absolute' | 'fixed' | 'sticky'

export interface ClickElementRect {
  left: number
  top: number
  width: number
  height: number
}

export interface ClickElementStickyInset {
  top?: number
  right?: number
  bottom?: number
  left?: number
}

export interface ClickElementScrollAncestor {
  anchorId: string
  scrollLeft: number
  scrollTop: number
  maxScrollLeft: number
  maxScrollTop: number
}

export interface ClickElementAnchor {
  schemaVersion: typeof CLICK_ELEMENT_ANCHOR_SCHEMA_VERSION
  anchorId: string
  positionMode: ClickElementPositionMode
  effectivePositionMode?: ClickElementPositionMode
  positioningAncestorDepth?: number
  positioningAncestorAnchorId?: string
  relativeX: number
  relativeY: number
  capturedRect: ClickElementRect
  transformedAncestor: boolean
  stickyInset?: ClickElementStickyInset
  scrollAncestors: ClickElementScrollAncestor[]
}

// This is an identity fingerprint, not an authorization or privacy primitive.
export function hashClickAnchorFingerprint(value: string): string {
  let hash = 2_166_136_261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
