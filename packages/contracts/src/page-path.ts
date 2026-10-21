export function normalizePagePath(value: string | null | undefined): string {
  const input = typeof value === 'string' ? value.trim() : ''

  if (!input) return '/'

  let pathname = input

  try {
    pathname = /^[a-z][a-z\d+.-]*:\/\//i.test(input)
      ? new URL(input).pathname
      : new URL(input, 'https://pathlens.invalid').pathname
  } catch {
    const fallback = input.split(/[?#]/, 1)[0] ?? ''

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(fallback) || fallback.startsWith('//')) {
      return '/'
    }

    pathname = fallback
  }

  if (!pathname.startsWith('/')) pathname = `/${pathname}`

  pathname = pathname.replace(/\/+$/, '')

  return pathname || '/'
}
