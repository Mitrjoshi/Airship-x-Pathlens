import fs from "node:fs";
import path from "node:path";

import "../config/load-env";

type VerifiedSsl = {
  ca: string;
  rejectUnauthorized: true;
};

export type DrizzleDatabaseCredentials =
  | { url: string }
  | {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
      ssl: VerifiedSsl;
    };

function readConnectionOptions() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const sslRequired = process.env.DATABASE_SSL_REQUIRED === "true";
  const caPath = process.env.DATABASE_SSL_CA;
  if (sslRequired && !caPath) {
    throw new Error(
      "DATABASE_SSL_CA is required when DATABASE_SSL_REQUIRED=true"
    );
  }

  if (!caPath) return { connectionString };

  const url = new URL(connectionString);
  for (const parameter of ["sslmode", "sslrootcert", "sslcert", "sslkey"]) {
    url.searchParams.delete(parameter);
  }

  const ssl: VerifiedSsl = {
    ca: fs.readFileSync(path.resolve(caPath), "utf8"),
    rejectUnauthorized: true,
  };

  return { connectionString: url.toString(), ssl };
}

export function getDatabasePoolOptions() {
  return readConnectionOptions();
}

export function getDrizzleDatabaseCredentials(): DrizzleDatabaseCredentials {
  const options = readConnectionOptions();
  if (!options.ssl) return { url: options.connectionString };

  const url = new URL(options.connectionString);
  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: options.ssl,
  };
}
