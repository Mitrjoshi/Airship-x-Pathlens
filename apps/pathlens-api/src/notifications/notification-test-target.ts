import fs from "node:fs";
import path from "node:path";

import { Pool, type PoolConfig } from "pg";

import "../config/load-env";

const SUPABASE_HOST_SUFFIXES = [".supabase.co", ".pooler.supabase.com"];

function isSupabaseHost(hostname: string) {
  return SUPABASE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function projectReference(hostname: string) {
  if (hostname.startsWith("db.") && hostname.endsWith(".supabase.co")) {
    return hostname.slice("db.".length, -".supabase.co".length);
  }
  if (hostname.endsWith(".pooler.supabase.com")) {
    return hostname.slice(0, -".pooler.supabase.com".length).split(".")[0];
  }
  return undefined;
}

export type NotificationTestTarget = {
  connectionString: string;
  poolOptions: PoolConfig;
  sharedStaging: boolean;
  projectReference: string;
};

export function getNotificationTestTarget():
  { target: NotificationTestTarget } | { reason: string } {
  const stagingUrl = process.env.DATABASE_URL?.trim();
  const configuredUrl =
    process.env.PATHLENS_NOTIFICATION_TEST_DATABASE_URL?.trim();
  const allowShared =
    process.env.PATHLENS_ALLOW_STAGING_NOTIFICATION_TESTS === "true";
  const connectionString =
    configuredUrl || (allowShared ? stagingUrl : undefined);

  if (!connectionString) {
    return {
      reason:
        "PATHLENS_NOTIFICATION_TEST_DATABASE_URL is required, or explicitly opt in with PATHLENS_ALLOW_STAGING_NOTIFICATION_TESTS=true.",
    };
  }
  if (!stagingUrl) return { reason: "DATABASE_URL is required." };

  let targetUrl: URL;
  let staging: URL;
  try {
    targetUrl = new URL(connectionString);
    staging = new URL(stagingUrl);
  } catch {
    return { reason: "The notification test database URL is invalid." };
  }

  const sharedStaging = connectionString === stagingUrl;
  if (sharedStaging && !allowShared) {
    return {
      reason: "Shared staging notification tests require explicit opt-in.",
    };
  }
  if (
    !isSupabaseHost(targetUrl.hostname) ||
    !isSupabaseHost(staging.hostname)
  ) {
    return {
      reason:
        "The notification test target must be a recognized Supabase host.",
    };
  }
  if (targetUrl.hostname !== staging.hostname) {
    return {
      reason:
        "The notification test target must belong to the expected staging Supabase project.",
    };
  }
  if (decodeURIComponent(targetUrl.pathname.slice(1)) !== "postgres") {
    return {
      reason: "The notification test target database must be postgres.",
    };
  }
  const reference = projectReference(targetUrl.hostname);
  const stagingReference = projectReference(staging.hostname);
  if (!reference || reference !== stagingReference) {
    return {
      reason:
        "The notification test target Supabase project reference does not match staging.",
    };
  }
  if (process.env.DATABASE_SSL_REQUIRED !== "true") {
    return {
      reason:
        "DATABASE_SSL_REQUIRED=true is required; TLS verification cannot be bypassed.",
    };
  }
  const caPath = process.env.DATABASE_SSL_CA?.trim();
  if (!caPath)
    return {
      reason: "DATABASE_SSL_CA is required for staging notification tests.",
    };
  const resolvedCaPath = path.resolve(caPath);
  if (!fs.existsSync(resolvedCaPath)) {
    return {
      reason: "DATABASE_SSL_CA does not point to an existing certificate.",
    };
  }

  const ca = fs.readFileSync(resolvedCaPath, "utf8");
  const urlWithoutSslParameters = new URL(targetUrl.toString());
  for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    urlWithoutSslParameters.searchParams.delete(parameter);
  }
  return {
    target: {
      connectionString: urlWithoutSslParameters.toString(),
      poolOptions: {
        connectionString: urlWithoutSslParameters.toString(),
        ssl: { ca, rejectUnauthorized: true },
        max: 8,
        statement_timeout: 15_000,
        connectionTimeoutMillis: 10_000,
      },
      sharedStaging,
      projectReference: reference,
    },
  };
}

export function createNotificationTestPool() {
  const result = getNotificationTestTarget();
  if ("reason" in result) throw new Error(result.reason);
  return new Pool(result.target.poolOptions);
}
