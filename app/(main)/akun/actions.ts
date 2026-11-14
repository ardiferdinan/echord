"use server";
import { requireAuth } from "@/lib/session";
import { cleanEmail, findLogin, setEmail, setPassword, verifyPassword } from "@/lib/users";

type Result = { ok?: string; error?: string } | null;

export async function changePassword(_: Result, form: FormData): Promise<Result> {
  try {
    const me = await requireAuth();
    const current = String(form.get("current") ?? ""), next = String(form.get("next") ?? ""), again = String(form.get("again") ?? "");
    const row = await findLogin(me.username);
    if (!row || !(await verifyPassword(current, row.password_hash))) return { error: "Password sekarang salah." };
    if (next !== again) return { error: "Ulangi password baru dengan sama persis." };
    await setPassword(me.id, next);
    return { ok: "Password diganti." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function changeEmail(_: Result, form: FormData): Promise<Result> {
  try {
    const me = await requireAuth();
    await setEmail(me.id, cleanEmail(String(form.get("email") ?? "")));
    return { ok: "Email disimpan." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
