import { Suspense } from "react";
import { connection } from "next/server";
import { SongForm } from "@/components/SongForm";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Tambah lagu" };

export default function Page() {
  return (
    <Suspense>
      <AdminOnly />
    </Suspense>
  );
}

async function AdminOnly() {
  await connection();
  const u = await currentUser();
  if (u?.role !== "superadmin") return <p className="pt-8 text-muted">Hanya super admin yang bisa menambah lagu ke perpustakaan.</p>;
  return <SongForm />;
}
