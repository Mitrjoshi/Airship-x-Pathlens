import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";
import { createCanaryStore, RESERVE_CANARY_SQL } from "./slack-canary-store";

function mock(
  options: {
    fail?: string;
    code?: string;
    duplicate?: boolean;
    missing?: boolean;
  } = {}
) {
  const calls: string[] = [];
  let persisted = false;
  const client = {
    async query(sql: string) {
      calls.push(sql);
      if (options.fail && sql.startsWith(options.fail)) {
        throw Object.assign(new Error("Mock database failure"), {
          code: options.code,
        });
      }
      if (sql.startsWith("INSERT"))
        return { rowCount: options.duplicate ? 0 : 1 };
      if (sql === "COMMIT") persisted = true;
      if (sql.startsWith("SELECT")) {
        assert.equal(
          persisted,
          true,
          "verification must follow acknowledged commit"
        );
        return { rowCount: options.missing ? 0 : 1 };
      }
      return { rowCount: 0 };
    },
    release() {
      calls.push("RELEASE");
    },
  };
  return {
    calls,
    pool: {
      async connect() {
        return client;
      },
    } as unknown as Pick<Pool, "connect">,
  };
}

test("reservation explicitly casts UUID and text uses of operation ID", () => {
  assert.match(RESERVE_CANARY_SQL, /\$1::uuid/);
  assert.match(RESERVE_CANARY_SQL, /\$1::text/);
  assert.match(
    RESERVE_CANARY_SQL,
    /ON CONFLICT \(id\) DO NOTHING RETURNING id/
  );
});
test("successful reservation commits then verifies before permitting send", async () => {
  const m = mock();
  assert.equal(await createCanaryStore(m.pool, "actor").reserve(), true);
  assert.equal(m.calls[0], "BEGIN READ WRITE");
  assert.ok(
    m.calls.indexOf("COMMIT") < m.calls.findIndex((c) => c.startsWith("SELECT"))
  );
  assert.equal(m.calls[m.calls.length - 1], "RELEASE");
});
test("duplicate execution refuses permission to send", async () => {
  const m = mock({ duplicate: true });
  assert.equal(await createCanaryStore(m.pool, "actor").reserve(), false);
  assert.ok(!m.calls.some((c) => c.startsWith("SELECT")));
});
for (const [label, code] of [
  ["missing persistence", "42P01"],
  ["permission denied", "42501"],
  ["constraint violation", "23503"],
  ["transaction conflict", "40001"],
]) {
  test(`${label}: rollback and fail closed`, async () => {
    const m = mock({ fail: "INSERT", code });
    await assert.rejects(createCanaryStore(m.pool, "actor").reserve(), (e) => {
      assert.equal((e as { phase: string }).phase, "reservation");
      assert.equal((e as { databaseCode: string }).databaseCode, code);
      return true;
    });
    assert.ok(m.calls.includes("ROLLBACK"));
    assert.ok(!m.calls.includes("COMMIT"));
  });
}
test("ambiguous commit never permits Slack even if commit might have persisted", async () => {
  const m = mock({ fail: "COMMIT" });
  await assert.rejects(createCanaryStore(m.pool, "actor").reserve(), {
    phase: "commit",
  });
  assert.equal(m.calls.filter((c) => c === "COMMIT").length, 1);
  assert.ok(!m.calls.some((c) => c.startsWith("SELECT")));
});
test("failed read-back after commit fails closed without resetting reservation", async () => {
  const m = mock({ missing: true });
  await assert.rejects(createCanaryStore(m.pool, "actor").reserve(), {
    phase: "post_commit_verification",
  });
  assert.ok(!m.calls.includes("ROLLBACK"));
});
test("connection failure fails closed", async () => {
  const pool = {
    async connect() {
      throw Error("Mock connection failure");
    },
  } as unknown as Pick<Pool, "connect">;
  await assert.rejects(createCanaryStore(pool, "actor").reserve(), {
    phase: "connection",
  });
});
