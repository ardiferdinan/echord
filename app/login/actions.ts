"use server";
import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION, isValidSession, sessionToken } from "@/lib/auth";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function login(_: string | null, form: FormData): Promise<string | null> {
  const password = String(form.get("password") ?? "");
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return "ADMIN_PASSWORD belum di-set di server.";
  if (!same(password, pw)) return "Password salah.";
  (await cookies()).set(SESSION, await sessionToken(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30,
  });
  const next = String(form.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION);
  redirect("/login");
}

/** Server actions are reachable by POST, so check the session there too, not only in proxy. */
export async function requireAuth() {
  if (!(await isValidSession((await cookies()).get(SESSION)?.value))) throw new Error("Perlu login");
}
