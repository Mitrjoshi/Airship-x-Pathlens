export function normalizeWheelDelta(
  deltaY: number,
  deltaMode: number,
  lineHeight: number,
  pageHeight: number
): number {
  const multiplier =
    deltaMode === 1
      ? Number.isFinite(lineHeight) && lineHeight > 0
        ? lineHeight
        : 16
      : deltaMode === 2
        ? pageHeight
        : 1

  return deltaY * multiplier
}

export function getTouchScrollDelta(
  previousY: number,
  currentY: number
): number {
  return previousY - currentY
}
