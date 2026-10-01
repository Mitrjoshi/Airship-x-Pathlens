import { and, eq } from "drizzle-orm";
import { db } from "../db/client";
import { users, workspaces } from "../db/schema";

interface I_Payload {
  name: string;
  email: string;
  password?: string | null;
  avatar?: string | null;
  githubId?: string | null;
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
      avatar: data.avatar,
      githubId: data.githubId,
    })
    .returning({ id: users.id });
}

export async function getUserByEmailModel(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));

  return user;
}

export async function getUserByGithubIdModel(githubId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubId, githubId));

  return user;
}

export async function linkGithubAccountModel(data: {
  id: string;
  githubId: string;
  avatar?: string | null;
}) {
  const [user] = await db
    .update(users)
    .set({
      githubId: data.githubId,
      avatar: data.avatar,
    })
    .where(eq(users.id, data.id))
    .returning({ id: users.id });

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

export async function updateUserModel(data: {
  id: string;
  name: string;
  email: string;
}) {
  const [user] = await db
    .update(users)
    .set({
      name: data.name,
      email: data.email,
    })
    .where(eq(users.id, data.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      createdAt: users.createdAt,
    });

  return user;
}

export async function updateUserPasswordModel(data: {
  id: string;
  password: string;
}) {
  const [user] = await db
    .update(users)
    .set({ password: data.password })
    .where(eq(users.id, data.id))
    .returning({ id: users.id });

  return user;
}

export async function deleteUserModel(id: string) {
  const [user] = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id });

  return user;
}
