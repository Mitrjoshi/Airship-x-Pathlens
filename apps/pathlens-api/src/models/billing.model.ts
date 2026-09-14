import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { users } from "../db/schema";

export async function getAccountEntitlement(userId: string) {
  const [account] = await db
    .select({
      id: users.id,
      lifetimeAccess: users.lifetimeAccess,
      stripeCustomerId: users.stripeCustomerId,
      stripePaymentId: users.stripePaymentId,
    })
    .from(users)
    .where(eq(users.id, userId));

  return account ?? null;
}

export async function grantAccountLifetimeEntitlement(data: {
  userId: string;
  stripeCustomerId: string | null;
  stripePaymentId: string | null;
}) {
  const [user] = await db
    .update(users)
    .set({
      lifetimeAccess: true,
      stripeCustomerId: data.stripeCustomerId,
      stripePaymentId: data.stripePaymentId,
    })
    .where(eq(users.id, data.userId))
    .returning({ id: users.id });

  return user ?? null;
}
