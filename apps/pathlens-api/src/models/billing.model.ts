import { eq, sql } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";

export async function getAccountEntitlement(userId: string) {
  const [account] = await db
    .select({
      id: users.id,
      lifetimeAccess: users.lifetimeAccess,
      stripeCustomerId: users.stripeCustomerId,
      stripePaymentId: users.stripePaymentId,
      purchasedAt: users.purchasedAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  return account ?? null;
}

export async function grantAccountLifetimeEntitlement(data: {
  userId: string;
  stripeCustomerId: string | null;
  stripePaymentId: string | null;
  purchasedAt: Date;
}) {
  const [user] = await db
    .update(users)
    .set({
      lifetimeAccess: true,
      stripeCustomerId: data.stripeCustomerId,
      stripePaymentId: data.stripePaymentId,
      // Webhook retries must not replace the original purchase timestamp.
      purchasedAt: sql`coalesce(${users.purchasedAt}, ${data.purchasedAt.toISOString()}::timestamptz)`,
    })
    .where(eq(users.id, data.userId))
    .returning({ id: users.id });

  return user ?? null;
}
