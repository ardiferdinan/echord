"use server";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION, SESSION_DAYS, sessionToken } from "@/lib/auth";
import { createUser, ensureTables, findLogin, userCount, verifyPassword } from "@/lib/users";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const id = String(form.get("login") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!id || !password) return "Isi username/email dan password.";
  await ensureTables();

  let userId: number;
  if ((await userCount()) === 0) {
    // first run: ADMIN_PASSWORD creates the super admin with the username (or email) typed here
    const pw = process.env.ADMIN_PASSWORD;
    if (!pw) return "ADMIN_PASSWORD belum di-set di server.";
    if (!same(password, pw)) return "Belum ada akun. Masuk pertama kali memakai ADMIN_PASSWORD untuk membuat akun super admin.";
    const email = id.includes("@") ? id.toLowerCase() : null;
    const username = (email ? email.split("@")[0] : id).toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 32) || "admin";
    try {
      userId = await createUser({ username, email, password, role: "superadmin" });
    } catch (e) {
      return (e as Error).message;
    }
  } else {
    const u = await findLogin(id);
    if (!u || !(await verifyPassword(password, u.password_hash))) return "Username/email atau password salah.";
    userId = u.id;
  }

  (await cookies()).set(SESSION, await sessionToken(userId), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * SESSION_DAYS,
  });
  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION);
  redirect("/login");
}
