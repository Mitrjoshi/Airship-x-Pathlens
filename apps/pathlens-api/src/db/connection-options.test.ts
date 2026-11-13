import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getDatabasePoolOptions,
  getDrizzleDatabaseCredentials,
} from "./connection-options";

const databaseUrl =
  "postgresql://user:password@example.test:5432/database?sslmode=require";

function withEnvironment(
  values: Record<string, string | undefined>,
  callback: () => void
) {
  const previous = new Map(
    Object.keys(values).map((key) => [key, process.env[key]])
  );
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("local connections remain compatible without required TLS", () => {
  withEnvironment(
    {
      DATABASE_URL: databaseUrl,
      DATABASE_SSL_REQUIRED: "false",
      DATABASE_SSL_CA: undefined,
    },
    () => {
      assert.deepEqual(getDatabasePoolOptions(), {
        connectionString: databaseUrl,
      });
    }
  );
});

test("required TLS rejects missing CA configuration", () => {
  withEnvironment(
    {
      DATABASE_URL: databaseUrl,
      DATABASE_SSL_REQUIRED: "true",
      DATABASE_SSL_CA: undefined,
    },
    () => {
      assert.throws(
        () => getDatabasePoolOptions(),
        /DATABASE_SSL_CA is required/
      );
    }
  );
});

test("verified TLS removes conflicting URL SSL parameters", () => {
  const temporaryFolder = fs.mkdtempSync(
    path.join(os.tmpdir(), "pathlens-connection-options-")
  );
  const caPath = path.join(temporaryFolder, "supabase-ca.crt");
  fs.writeFileSync(caPath, "approved-ca-bundle");
  try {
    withEnvironment(
      {
        DATABASE_URL: databaseUrl,
        DATABASE_SSL_REQUIRED: "true",
        DATABASE_SSL_CA: caPath,
      },
      () => {
        const poolOptions = getDatabasePoolOptions();
        assert.equal(new URL(poolOptions.connectionString).search, "");
        assert.deepEqual(poolOptions.ssl, {
          ca: "approved-ca-bundle",
          rejectUnauthorized: true,
        });

        const credentials = getDrizzleDatabaseCredentials();
        assert.equal("url" in credentials, false);
        if ("url" in credentials) return;
        assert.equal(credentials.host, "example.test");
        assert.equal(credentials.port, 5432);
        assert.equal(credentials.database, "database");
        assert.equal(credentials.ssl.rejectUnauthorized, true);
      }
    );
  } finally {
    fs.rmSync(temporaryFolder, { recursive: true, force: true });
  }
});
