import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadEnvironment } from "./load-env";

function withFiles(
  files: Record<string, string>,
  target: NodeJS.ProcessEnv,
  callback: (directory: string) => void
) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pathlens-env-"));
  try {
    for (const [filename, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(directory, filename), content);
    }
    callback(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test("explicit process variables override .env", () => {
  const target = { DATABASE_URL: "postgresql://session:5432/postgres" };
  withFiles(
    { ".env": "DATABASE_URL=postgresql://transaction:6543/postgres\n" },
    target,
    (directory) => loadEnvironment(directory, target)
  );
  assert.equal(target.DATABASE_URL, "postgresql://session:5432/postgres");
});

test(".env.local overrides .env", () => {
  const target: NodeJS.ProcessEnv = {};
  withFiles(
    {
      ".env": "DATABASE_URL=postgresql://transaction:6543/postgres\n",
      ".env.local": "DATABASE_URL=postgresql://session:5432/postgres\n",
    },
    target,
    (directory) => loadEnvironment(directory, target)
  );
  assert.equal(target.DATABASE_URL, "postgresql://session:5432/postgres");
});

test(".env supplies missing values", () => {
  const target: NodeJS.ProcessEnv = {};
  withFiles(
    { ".env": "DATABASE_URL=postgresql://transaction:6543/postgres\n" },
    target,
    (directory) => loadEnvironment(directory, target)
  );
  assert.equal(target.DATABASE_URL, "postgresql://transaction:6543/postgres");
});

test("TLS variables preserve explicit process values", () => {
  const target: NodeJS.ProcessEnv = {
    DATABASE_SSL_REQUIRED: "true",
    DATABASE_SSL_CA: "C:\\secure\\approved.crt",
  };
  withFiles(
    {
      ".env":
        "DATABASE_SSL_REQUIRED=false\nDATABASE_SSL_CA=C:\\insecure\\old.crt\n",
    },
    target,
    (directory) => loadEnvironment(directory, target)
  );
  assert.equal(target.DATABASE_SSL_REQUIRED, "true");
  assert.equal(target.DATABASE_SSL_CA, "C:\\secure\\approved.crt");
});

test("missing files retain missing configuration for existing validation", () => {
  const target: NodeJS.ProcessEnv = {};
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pathlens-env-"));
  try {
    loadEnvironment(directory, target);
    assert.equal(target.DATABASE_URL, undefined);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
