// Who is signed in, for server components, route handlers and server actions (not a "use server" file:
// these must not become callable actions themselves).
import { cookies } from "next/headers";
import { SESSION, sessionUser } from "./auth";
import { getUser, type User } from "./users";

/** The signed-in user (still in the database), or null. */
export async function currentUser(): Promise<User | null> {
  const id = await sessionUser((await cookies()).get(SESSION)?.value);
  return id === null ? null : ((await getUser(id).catch(() => undefined)) ?? null);
}

/** Server actions are reachable by POST, so check the session there too, not only in proxy. */
export async function requireAuth(): Promise<User> {
  const u = await currentUser();
  if (!u) throw new Error("Perlu login");
  return u;
}

/** Changing the song library and managing accounts: the super admin only. */
export async function requireAdmin(): Promise<User> {
  const u = await requireAuth();
  if (u.role !== "superadmin") throw new Error("Hanya super admin.");
  return u;
}
