function toUrl(value: string): URL | null {
  try {
    return new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

function hasValidDomainSuffix(hostname: string): boolean {
  const labels = hostname.toLowerCase().split(".");
  const topLevelDomain = labels[labels.length - 1] ?? "";

  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
    ) &&
    /^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(topLevelDomain)
  );
}

export function normalizeProjectHostname(value: string): string | null {
  const url = toUrl(value);
  return (
    url?.hostname
      .toLowerCase()
      .replace(/^www\./, "")
      .replace(/\.$/, "") ?? null
  );
}

export function normalizeProjectDomain(value: string): string | null {
  const url = toUrl(value.trim());

  if (!url || !hasValidDomainSuffix(url.hostname)) return null;

  url.pathname = "/";
  url.search = "";
  url.hash = "";

  return url.origin;
}

export function normalizeProjectDomains(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => normalizeProjectDomain(value))
        .filter((value): value is string => Boolean(value))
    ),
  ];
}

function getAllowedHostnames(domains: readonly string[]): Set<string> {
  const hostnames = domains
    .map((domain) => normalizeProjectHostname(domain))
    .filter((domain): domain is string => Boolean(domain));

  return new Set(
    hostnames.flatMap((hostname) => {
      const withoutWww = hostname.startsWith("www.")
        ? hostname.slice(4)
        : hostname;

      return [withoutWww, `www.${withoutWww}`];
    })
  );
}

export function isProjectOriginAllowed(
  projectDomains: readonly string[] | string | null,
  origin: string | undefined,
  referer: string | undefined
): boolean {
  if (!projectDomains) return false;

  const domains =
    typeof projectDomains === "string" ? [projectDomains] : projectDomains;
  const requestSource = origin && origin !== "null" ? origin : referer;
  if (!requestSource) return false;

  const requestHostname = normalizeProjectHostname(requestSource);
  if (!requestHostname) return false;

  return getAllowedHostnames(domains).has(requestHostname);
}
