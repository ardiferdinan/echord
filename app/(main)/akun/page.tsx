import { Suspense } from "react";
import { connection } from "next/server";
import { currentUser } from "@/lib/session";
import { AccountForms } from "./AccountForms";

export const metadata = { title: "Akun saya" };

export default function Page() {
  return (
    <div className="pt-4">
      <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">Akun saya</h1>
      <Suspense fallback={<div className="mt-6 h-64 max-w-xl animate-pulse rounded-lg bg-white/5" />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  await connection();
  const u = await currentUser();
  if (!u) return null;
  return (
    <>
      <p className="mb-6 mt-2 text-muted">
        <b className="text-ink">{u.username}</b> · {u.role === "superadmin" ? "Super admin" : "Member"} · setlist kamu tersimpan di akun ini
      </p>
      <AccountForms email={u.email} />
    </>
  );
}
