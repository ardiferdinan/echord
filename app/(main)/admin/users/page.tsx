import { Suspense } from "react";
import { connection } from "next/server";
import { currentUser } from "@/lib/session";
import { listUsers } from "@/lib/users";
import { UsersAdmin } from "./UsersAdmin";

export const metadata = { title: "Kelola akun" };

export default function Page() {
  return (
    <div className="pt-4">
      <h1 className="text-3xl font-black tracking-[-0.03em] sm:text-4xl">Kelola akun</h1>
      <p className="mb-6 mt-2 text-muted">Hanya super admin yang bisa membuat akun. Tiap akun punya setlist sendiri.</p>
      <Suspense fallback={<div className="h-64 max-w-3xl animate-pulse rounded-lg bg-white/5" />}>
        <Users />
      </Suspense>
    </div>
  );
}

async function Users() {
  await connection();
  const me = await currentUser();
  if (me?.role !== "superadmin") return <p className="text-muted">Halaman ini hanya untuk super admin.</p>;
  return <UsersAdmin users={await listUsers()} meId={me.id} />;
}
