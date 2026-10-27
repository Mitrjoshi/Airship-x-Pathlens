export const REGION_ANCHOR_SCHEMA_VERSION = 1 as const
export const MAX_REGION_ANCHOR_BYTES = 2048
export const MAX_REGION_ID_LENGTH = 64
export const MAX_REGION_DIMENSION = 10_000_000
export const MAX_REGION_FINGERPRINT_LENGTH = 512

export type RegionAnchorKind = 'explicit' | 'semantic' | 'structural'

import type {
  ClickElementPositionMode,
  ClickElementRect,
} from './element-anchor'

export interface ClickRegionAnchor {
  schemaVersion: typeof REGION_ANCHOR_SCHEMA_VERSION
  regionId: string
  regionKind?: RegionAnchorKind
  structuralFingerprint?: string
  positionMode: ClickElementPositionMode
  relativeX: number
  relativeY: number
  capturedRect: ClickElementRect
}

export function hashRegionFingerprint(value: string): string {
  let hash = 2_166_136_261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, '0')}`
}
