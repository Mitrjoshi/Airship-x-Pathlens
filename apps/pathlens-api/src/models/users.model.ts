import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { users, workspaces } from "../db/schema";

interface I_Payload {
  name: string;
  email: string;
  password: string;
}

export async function createUserModel(
  data: I_Payload
): Promise<{ id: string }[]> {
  return await db
    .insert(users)
    .values({
      email: data.email,
      password: data.password,
      name: data.name,
    })
    .returning({ id: users.id });
}

export async function getUserByEmailModel(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  return user;
}

export async function getUserByIDModel(id: string) {
  const [result] = await db
    .select({
      user: users,
      defaultWorkspace: workspaces,
    })
    .from(users)
    .leftJoin(
      workspaces,
      and(eq(workspaces.userId, users.id), eq(workspaces.isDefault, true))
    )
    .where(eq(users.id, id));

  if (!result) return null;

  return {
    ...result.user,
    defaultWorkspace: result.defaultWorkspace,
  };
}
