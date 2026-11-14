"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { cleanEmail, createUser, deleteUser, setPassword } from "@/lib/users";

type Result = { ok?: string; error?: string } | null;

export async function addUser(_: Result, form: FormData): Promise<Result> {
  try {
    await requireAdmin();
    const username = String(form.get("username") ?? "");
    await createUser({ username, email: cleanEmail(String(form.get("email") ?? "")), password: String(form.get("password") ?? ""), role: "member" });
    revalidatePath("/admin/users");
    return { ok: `Akun ${username.trim().toLowerCase()} dibuat.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function resetPassword(id: number, password: string): Promise<Result> {
  try {
    await requireAdmin();
    await setPassword(id, password);
    return { ok: "Password direset." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function removeUser(id: number): Promise<Result> {
  try {
    const me = await requireAdmin();
    if (id === me.id) return { error: "Tidak bisa menghapus akun sendiri." };
    await deleteUser(id); // the super admin can never be deleted (lib/users.ts)
    revalidatePath("/admin/users");
    return { ok: "Akun dihapus." };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
