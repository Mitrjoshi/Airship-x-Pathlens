import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "../db/client";
import { passwordResetTokens, users } from "../db/schema";

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetTokenModel(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

  await db.transaction(async (tx) => {
    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt)
        )
      );

    await tx.insert(passwordResetTokens).values({
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    });
  });

  return { token, expiresAt };
}

export async function consumePasswordResetTokenModel(
  token: string,
  password: string
): Promise<boolean> {
  const now = new Date();

  return db.transaction(async (tx) => {
    const [claimedToken] = await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .returning({ userId: passwordResetTokens.userId });

    if (!claimedToken) return false;

    await tx
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, claimedToken.userId),
          isNull(passwordResetTokens.usedAt)
        )
      );

    await tx
      .update(users)
      .set({ password })
      .where(eq(users.id, claimedToken.userId));

    return true;
  });
}
