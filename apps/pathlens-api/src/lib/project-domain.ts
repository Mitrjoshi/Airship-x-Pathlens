function toUrl(value: string): URL | null {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function normalizeHostname(value: string): string | null {
  const url = toUrl(value);
  return url?.hostname.toLowerCase().replace(/\.$/, "") ?? null;
}

function getAllowedHostnames(domain: string): Set<string> {
  const hostname = normalizeHostname(domain);
  if (!hostname) return new Set();

  const withoutWww = hostname.startsWith("www.") ? hostname.slice(4) : hostname;

  return new Set([withoutWww, `www.${withoutWww}`]);
}

export function isProjectOriginAllowed(
  projectDomain: string | null,
  origin: string | undefined,
  referer: string | undefined
): boolean {
  if (!projectDomain) return false;

  const requestSource = origin && origin !== "null" ? origin : referer;
  if (!requestSource) return false;

  const requestHostname = normalizeHostname(requestSource);
  if (!requestHostname) return false;

  return getAllowedHostnames(projectDomain).has(requestHostname);
}
