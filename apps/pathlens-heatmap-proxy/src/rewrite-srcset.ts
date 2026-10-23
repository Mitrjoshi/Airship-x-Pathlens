export interface SrcsetCandidate {
  source: string
  descriptors: string[]
}

const descriptorPattern = /^(?:\d+(?:\.\d+)?w|\d+(?:\.\d+)?x)$/

export function parseSrcset(value: string): SrcsetCandidate[] {
  const candidates: SrcsetCandidate[] = []
  let cursor = 0

  while (cursor < value.length) {
    while (cursor < value.length && /\s/.test(value[cursor] ?? '')) cursor += 1
    if (cursor >= value.length) break

    const sourceStart = cursor
    while (cursor < value.length && !/\s/.test(value[cursor] ?? '')) cursor += 1
    let source = value.slice(sourceStart, cursor)

    if (source.endsWith(',')) {
      source = source.slice(0, -1)
      if (source) candidates.push({ source, descriptors: [] })
      continue
    }

    while (cursor < value.length && /\s/.test(value[cursor] ?? '')) cursor += 1
    const descriptorStart = cursor
    while (cursor < value.length && value[cursor] !== ',') cursor += 1
    const descriptorText = value.slice(descriptorStart, cursor).trim()
    const descriptors = descriptorText ? descriptorText.split(/\s+/) : []

    if (descriptors.some((descriptor) => !descriptorPattern.test(descriptor))) {
      candidates.push({ source, descriptors: [] })
      if (value[cursor] === ',') cursor += 1
      continue
    }

    candidates.push({ source, descriptors })
    if (value[cursor] === ',') cursor += 1
  }

  return candidates
}
