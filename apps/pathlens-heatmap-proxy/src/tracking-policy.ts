const BLOCKED_TRACKING_RESOURCES = [
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
] as const

type BlockedTrackingResource = {
  origin: string
  paths: readonly string[]
}

export function isBlockedPreviewTrackingUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }

  return (
    BLOCKED_TRACKING_RESOURCES as readonly BlockedTrackingResource[]
  ).some(
    (resource) =>
      resource.origin === url.origin && resource.paths.includes(url.pathname)
  )
}

export function previewTrackingBlockReason(rawUrl: string): string | null {
  return isBlockedPreviewTrackingUrl(rawUrl)
    ? 'Known Pathlens tracking resources are disabled in previews.'
    : null
}
