import assert from "node:assert/strict";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, before, beforeEach, mock, test } from "node:test";
import type { Request, Response } from "express";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import { passwordResetTokens, users } from "../db/schema";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

type TestUser = {
  id: string;
  password: string | null;
  googleId?: string;
  githubId?: string;
};

let user: TestUser | undefined;
let insertedTokens = 0;
let validToken = false;
let invalidatedTokens = 0;
const dialect = new PgDialect();

mock.module(sourcePath("models/users.model.ts"), {
  namedExports: {
    getUserByEmailModel: async () => user,
  },
});

// Exercise the real reset model against a transaction stub, including its SQL
// eligibility predicate. No database or email service is contacted.
mock.module(sourcePath("db/client.ts"), {
  namedExports: {
    db: {
      transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          insert: () => ({
            values: async () => {
              insertedTokens++;
              validToken = true;
            },
          }),
          update: (table: unknown) => ({
            set: (values: { password?: string }) => ({
              where: (condition: SQL) => {
                if (table === users) {
                  const query = dialect.sqlToQuery(condition);
                  assert.match(query.sql, /"users"\."password" is not null/);
                  assert.match(query.sql, /"users"\."password" <>/);
                  assert.ok(query.params.includes(""));
                  assert.ok(query.params.includes(user?.id));

                  return {
                    returning: async () => {
                      if (!user?.password) return [];
                      user.password = values.password!;
                      return [{ id: user.id }];
                    },
                  };
                }

                assert.equal(table, passwordResetTokens);
                return {
                  then: (resolve: (value: undefined) => void) => {
                    invalidatedTokens++;
                    resolve(undefined);
                  },
                  returning: async () => {
                    if (!validToken || !user) return [];
                    validToken = false;
                    return [{ userId: user.id }];
                  },
                };
              },
            }),
          }),
        }),
    },
  },
});

let requestReset: typeof import("./password-reset.controller").requestPasswordReset;
let confirmReset: typeof import("./password-reset.controller").confirmPasswordReset;
let sendEmail: ReturnType<typeof mock.fn<typeof fetch>>;
let originalEnv: NodeJS.ProcessEnv;

before(async () => {
  const controller = await import("./password-reset.controller");
  requestReset = controller.requestPasswordReset;
  confirmReset = controller.confirmPasswordReset;
});

beforeEach(() => {
  user = undefined;
  insertedTokens = 0;
  validToken = false;
  invalidatedTokens = 0;
  sendEmail = mock.method(
    globalThis,
    "fetch",
    async () => new globalThis.Response(null, { status: 200 })
  );
  originalEnv = { ...process.env };
  process.env.RESEND_API_KEY = "test-only-key";
  process.env.RESEND_FROM_EMAIL = "test@example.com";
  process.env.WEB_APP_URL = "https://example.com";
});

afterEach(() => {
  sendEmail.mock.restore();
  process.env = originalEnv;
});

async function call(
  controller: (req: Request, res: Response) => Promise<unknown>,
  body: Record<string, unknown>
) {
  let status = 200;
  let response: unknown;
  const res = {
    status(value: number) {
      status = value;
      return this;
    },
    json(value: unknown) {
      response = value;
      return this;
    },
  };
  await controller({ body } as Request, res as Response);
  return { status, body: response };
}

const genericResponse = {
  status: 200,
  body: {
    success: true,
    message:
      "If an account exists, we sent sign-in instructions to your email.",
  },
};

for (const provider of ["empty-password", "unknown"]) {
  test(`${provider} reset requests return generic success without tokens or emails`, async () => {
    if (provider !== "unknown") {
      user = {
        id: "user-1",
        password: provider === "empty-password" ? "" : null,
      };
    }

    assert.deepEqual(
      await call(requestReset, { email: "test@example.com" }),
      genericResponse
    );
    assert.equal(insertedTokens, 0);
    assert.equal(sendEmail.mock.callCount(), 0);
  });
}

for (const providers of [["Google"], ["GitHub"], ["Google", "GitHub"]]) {
  for (const password of [null, ""]) {
    test(`passwordless ${providers.join("/")} account (${JSON.stringify(password)}) receives sign-in guidance without a token`, async () => {
      user = {
        id: "user-1",
        password,
        ...(providers.includes("Google") ? { googleId: "google-1" } : {}),
        ...(providers.includes("GitHub") ? { githubId: "github-1" } : {}),
      };

      assert.deepEqual(
        await call(requestReset, { email: "test@example.com" }),
        genericResponse
      );
      assert.equal(insertedTokens, 0);
      assert.equal(validToken, false);
      assert.equal(sendEmail.mock.callCount(), 1);
      const [url, options] = sendEmail.mock.calls[0].arguments;
      assert.equal(url, "https://api.resend.com/emails");
      const email = JSON.parse(options!.body as string);
      assert.deepEqual(email.to, ["test@example.com"]);
      assert.equal(email.subject, "Sign in to your Pathlens account");
      for (const content of [email.text, email.html]) {
        assert.ok(content.includes("test@example.com"));
        assert.ok(content.includes(providers.join(" or ")));
        assert.ok(content.includes("directly through"));
        assert.ok(content.includes("https://example.com/login"));
        assert.ok(content.includes("safely ignore this email"));
        assert.ok(!content.includes("/password-reset"));
        assert.ok(!content.includes("token="));
        for (const unlinked of ["Google", "GitHub"].filter(
          (provider) => !providers.includes(provider)
        )) {
          assert.ok(!content.includes(unlinked));
        }
      }
    });
  }
}

test("provider guidance escapes the email address in HTML", async () => {
  user = { id: "user-1", password: null, googleId: "google-1" };
  assert.deepEqual(
    await call(requestReset, { email: "test'name@example.com" }),
    genericResponse
  );
  const email = JSON.parse(
    sendEmail.mock.calls[0].arguments[1]!.body as string
  );
  assert.ok(email.text.includes("test'name@example.com"));
  assert.ok(email.html.includes("test&#39;name@example.com"));
});

test("a failed provider reminder does not create a reset token or report delivery", async () => {
  user = { id: "user-1", password: null, githubId: "github-1" };
  sendEmail.mock.mockImplementation(
    async () => new globalThis.Response(null, { status: 503 })
  );
  const log = mock.method(console, "error", () => {});
  try {
    assert.deepEqual(await call(requestReset, { email: "test@example.com" }), {
      status: 503,
      body: {
        success: false,
        message: "Password reset email is temporarily unavailable.",
      },
    });
    assert.equal(insertedTokens, 0);
  } finally {
    log.mock.restore();
  }
});

for (const linkedProvider of [false, true]) {
  test(`password account${linkedProvider ? " with linked Google" : ""} receives a reset email`, async () => {
    user = {
      id: "user-1",
      password: "old-password",
      ...(linkedProvider ? { googleId: "google-1" } : {}),
    };

    assert.deepEqual(
      await call(requestReset, { email: "test@example.com" }),
      genericResponse
    );
    assert.equal(insertedTokens, 1);
    assert.equal(sendEmail.mock.callCount(), 1);
    const email = JSON.parse(
      sendEmail.mock.calls[0].arguments[1]!.body as string
    );
    assert.equal(email.subject, "Reset your Pathlens password");
    assert.match(email.text, /https:\/\/example.com\/password-reset\?token=/);
    assert.match(email.html, /https:\/\/example.com\/password-reset\?token=/);
  });
}

for (const password of [null, ""]) {
  test(`an old token cannot set a password on an account with ${JSON.stringify(password)} password`, async () => {
    user = { id: "user-1", password, githubId: "github-1" };
    validToken = true;

    const result = await call(confirmReset, {
      token: "old-reset-token",
      password: "new-password",
      confirmPassword: "new-password",
    });

    assert.equal(result.status, 400);
    assert.deepEqual(result.body, {
      success: false,
      message: "This reset link is invalid or has expired.",
    });
    assert.equal(user.password, password);
  });
}

test("a password account can reset once and invalidates its other reset tokens", async () => {
  user = { id: "user-1", password: "old-password", githubId: "github-1" };
  validToken = true;
  const payload = {
    token: "valid-reset-token",
    password: "new-password",
    confirmPassword: "new-password",
  };

  assert.equal((await call(confirmReset, payload)).status, 200);
  assert.equal(user.password, "new-password");
  assert.equal(invalidatedTokens, 1);
  assert.equal((await call(confirmReset, payload)).status, 400);
  assert.equal(sendEmail.mock.callCount(), 0);
});
