import { currentUser } from "@/lib/session";

/** Who is signed in (for the account menu and admin-only buttons). */
export async function GET() {
  const u = await currentUser();
  return u ? Response.json({ id: u.id, username: u.username, email: u.email, role: u.role }) : Response.json({ error: "Perlu login" }, { status: 401 });
}
