import fs from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";

import { readMigrationFiles } from "drizzle-orm/migrator";
import { Pool } from "pg";

import "../config/load-env";
import { getDatabasePoolOptions } from "../db/connection-options";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle");
const TARGET_TAG = "0062_pale_rhodey";
const CONFIRMATION = "RECONCILE_0062_ALREADY_APPLIED";

type Journal = {
  entries: Array<{
    tag: string;
    when: number;
    breakpoints: boolean;
  }>;
};

function getTargetMetadata() {
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8")
  ) as Journal;
  const targetIndex = journal.entries.findIndex(
    (entry) => entry.tag === TARGET_TAG
  );
  if (targetIndex < 1) {
    throw new Error(`Unable to locate ${TARGET_TAG} in the migration journal.`);
  }
  const migrations = readMigrationFiles({
    migrationsFolder: MIGRATIONS_FOLDER,
  });
  const target = migrations[targetIndex];
  const previous = migrations[targetIndex - 1];
  if (!target || !previous) {
    throw new Error(`Unable to derive metadata for ${TARGET_TAG}.`);
  }
  return {
    target,
    previous,
    targetEntry: journal.entries[targetIndex],
  };
}

function getCanonicalPreviousHash(
  previous: ReturnType<typeof getTargetMetadata>["previous"]
) {
  const repositoryRoot = execFileSync("git", ["rev-parse", "--show-toplevel"])
    .toString()
    .trim();
  const relativePath = path
    .relative(
      repositoryRoot,
      path.join(MIGRATIONS_FOLDER, `${journalTag(previous)}.sql`)
    )
    .split(path.sep)
    .join("/");
  const canonicalSql = execFileSync("git", ["show", `HEAD:${relativePath}`]);
  const currentSql = fs.readFileSync(
    path.join(MIGRATIONS_FOLDER, `${journalTag(previous)}.sql`)
  );
  const normalizeLineEndings = (value: Buffer) =>
    value.toString().replace(/\r\n/g, "\n");
  if (normalizeLineEndings(canonicalSql) !== normalizeLineEndings(currentSql)) {
    throw new Error(
      "The checked-out previous migration differs from its committed Git version."
    );
  }

  const temporaryFolder = fs.mkdtempSync(
    path.join(os.tmpdir(), "pathlens-migration-hash-")
  );
  try {
    fs.mkdirSync(path.join(temporaryFolder, "meta"));
    fs.writeFileSync(
      path.join(temporaryFolder, `${journalTag(previous)}.sql`),
      canonicalSql
    );
    fs.writeFileSync(
      path.join(temporaryFolder, "meta/_journal.json"),
      JSON.stringify({
        version: "7",
        dialect: "postgresql",
        entries: [
          {
            idx: 0,
            version: "7",
            when: previous.folderMillis,
            tag: journalTag(previous),
            breakpoints: previous.bps,
          },
        ],
      })
    );
    return readMigrationFiles({ migrationsFolder: temporaryFolder })[0]!.hash;
  } finally {
    fs.rmSync(temporaryFolder, { recursive: true, force: true });
  }
}

function journalTag(migration: { folderMillis: number }) {
  const journal = JSON.parse(
    fs.readFileSync(path.join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8")
  ) as Journal;
  return (
    journal.entries.find((entry) => entry.when === migration.folderMillis)
      ?.tag ?? ""
  );
}

async function verifyPreconditions(client: import("pg").PoolClient) {
  const { target, previous, targetEntry } = getTargetMetadata();
  const canonicalPreviousHash = getCanonicalPreviousHash(previous);
  const latest = await client.query<{
    hash: string;
    created_at: string;
  }>(
    `SELECT hash, created_at::text
     FROM drizzle.__drizzle_migrations
     ORDER BY created_at DESC
     LIMIT 1`
  );
  if (
    latest.rows[0]?.created_at !== String(previous.folderMillis) ||
    ![previous.hash, canonicalPreviousHash].includes(latest.rows[0]?.hash ?? "")
  ) {
    throw new Error(
      `Expected migration history to end at ${previous.folderMillis} with the current or canonical derived previous hash; found ${latest.rows[0]?.created_at ?? "none"}.`
    );
  }

  const targetAlreadyRecorded = await client.query(
    `SELECT 1 FROM drizzle.__drizzle_migrations
     WHERE hash = $1 OR created_at = $2
     LIMIT 1`,
    [target.hash, target.folderMillis]
  );
  if (targetAlreadyRecorded.rowCount) {
    throw new Error(
      `${TARGET_TAG} is already recorded; refusing to duplicate it.`
    );
  }

  const relations = await client.query<{ relation: string | null }>(
    `SELECT to_regclass('public.' || name)::text AS relation
     FROM unnest($1::text[]) AS names(name)`,
    [
      [
        "chat_channel_members",
        "chat_channels",
        "chat_message_reactions",
        "chat_messages",
        "chat_pinned_messages",
      ],
    ]
  );
  if (relations.rows.some((row) => row.relation !== null)) {
    throw new Error("A chat relation still exists; refusing reconciliation.");
  }

  const notificationColumns = await client.query<{ column_name: string }>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'notifications'
       AND column_name IN ('channel_id', 'message_id')`
  );
  if (notificationColumns.rowCount) {
    throw new Error(
      "Legacy notification chat columns still exist; refusing reconciliation."
    );
  }

  const notificationChatConstraints = await client.query(
    `SELECT 1
     FROM pg_constraint constraint_row
     INNER JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
     INNER JOIN pg_namespace namespace_row ON namespace_row.oid = table_row.relnamespace
     WHERE namespace_row.nspname = 'public'
       AND table_row.relname = 'notifications'
       AND constraint_row.conname IN (
         'notifications_channel_id_chat_channels_id_fk',
         'notifications_message_id_chat_messages_id_fk'
       )`
  );
  if (notificationChatConstraints.rowCount) {
    throw new Error(
      "Legacy notification chat constraints still exist; refusing reconciliation."
    );
  }

  const payload = await client.query<{ data_type: string }>(
    `SELECT data_type
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'notifications'
       AND column_name = 'payload'`
  );
  if (payload.rows[0]?.data_type !== "jsonb") {
    throw new Error(
      "notifications.payload is missing or is not jsonb; refusing reconciliation."
    );
  }

  const deliveryTable = await client.query(
    `SELECT to_regclass('public.integration_notification_deliveries') AS relation`
  );
  if (deliveryTable.rows[0]?.relation !== null) {
    throw new Error(
      "The 0063 delivery table already exists; refusing reconciliation."
    );
  }

  return {
    targetHash: target.hash,
    targetCreatedAt: target.folderMillis,
    targetTag: targetEntry.tag,
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (apply && process.env.RECONCILE_0062_CONFIRM !== CONFIRMATION) {
    throw new Error(
      `Set RECONCILE_0062_CONFIRM=${CONFIRMATION} to apply the derived metadata.`
    );
  }

  const pool = new Pool({ ...getDatabasePoolOptions(), max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "LOCK TABLE drizzle.__drizzle_migrations IN SHARE ROW EXCLUSIVE MODE"
    );
    const plan = await verifyPreconditions(client);
    if (apply) {
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
         VALUES ($1, $2)`,
        [plan.targetHash, plan.targetCreatedAt]
      );
      await client.query("COMMIT");
      console.log(JSON.stringify({ applied: true, ...plan }));
    } else {
      await client.query("ROLLBACK");
      console.log(JSON.stringify({ applied: false, dryRun: true, ...plan }));
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
