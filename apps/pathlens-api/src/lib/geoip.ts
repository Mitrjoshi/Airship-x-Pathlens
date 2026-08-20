import { isIP } from "node:net";
import type { Request } from "express";
import geoip from "geoip-lite";

export interface GeoLocation {
  country: string | null;
  countryCode: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
}

const IPV4_MAPPED_IPV6_PREFIX = "::ffff:";

function normalizeIp(raw: string | undefined | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();

  if (isIP(trimmed) === 0) return null;

  if (trimmed.toLowerCase().startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
    const ipv4 = trimmed.slice(IPV4_MAPPED_IPV6_PREFIX.length);

    return isIP(ipv4) === 4 ? ipv4 : null;
  }

  return trimmed;
}

export function getClientIp(req: Request): string | null {
  return normalizeIp(req.ip ?? req.socket.remoteAddress);
}

export function getGeoLocation(ip: string | null): GeoLocation | null {
  if (!ip) return null;

  try {
    const lookup = geoip.lookup(ip);

    if (!lookup) return null;

    return {
      country: lookup.country || null,
      countryCode: lookup.country || null,
      region: lookup.region || null,
      city: lookup.city || null,
      timezone: lookup.timezone || null,
    };
  } catch {
    return null;
  }
}
