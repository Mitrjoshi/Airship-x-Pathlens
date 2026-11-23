import assert from "node:assert/strict";
import { join } from "node:path";
import { before, beforeEach, mock, test } from "node:test";
import { pathToFileURL } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const userId = "11111111-1111-4111-8111-111111111111";
const purchasedAt = new Date("2026-11-23T10:00:00.000Z");
const pool = new Pool();
let queries: Array<{ text: string; params: unknown[] }> = [];
let accountExists = true;
let storedDate: string | null = purchasedAt.toISOString();

mock.method(
  pool,
  "query",
  async (query: { text: string }, params: unknown[]) => {
    queries.push({ text: query.text, params });
    if (!accountExists) return { rows: [] };
    return {
      rows: query.text.startsWith("select")
        ? [[userId, true, "cus_test", "pi_test", storedDate]]
        : [[userId]],
    };
  }
);
mock.module(pathToFileURL(join(process.cwd(), "src/db/client.ts")).href, {
  namedExports: { db: drizzle(pool) },
});

let model: typeof import("./billing.model");
before(async () => {
  model = await import("./billing.model");
});
beforeEach(() => {
  queries = [];
  accountExists = true;
  storedDate = purchasedAt.toISOString();
});

test("entitlement selects the stored purchase timestamp for the requested user", async () => {
  const result = await model.getAccountEntitlement(userId);
  assert.deepEqual(result?.purchasedAt, purchasedAt);
  assert.match(queries[0]!.text, /"purchased_at"/);
  assert.deepEqual(queries[0]!.params, [userId]);
});

test("accounts without a known purchase date keep null", async () => {
  storedDate = null;
  assert.equal((await model.getAccountEntitlement(userId))?.purchasedAt, null);
});

test("missing accounts still return null", async () => {
  accountExists = false;
  assert.equal(await model.getAccountEntitlement(userId), null);
});

test("granting access atomically preserves the first recorded date on retries", async () => {
  await model.grantAccountLifetimeEntitlement({
    userId,
    stripeCustomerId: "cus_test",
    stripePaymentId: "pi_test",
    purchasedAt,
  });
  assert.match(
    queries[0]!.text,
    /"purchased_at" = coalesce\("users"\."purchased_at", \$\d+::timestamptz\)/
  );
  assert.ok(queries[0]!.params.includes(purchasedAt.toISOString()));
  assert.equal(queries[0]!.params[queries[0]!.params.length - 1], userId);
});
