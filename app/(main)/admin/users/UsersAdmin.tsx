"use client";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/users";
import { ConfirmButton } from "@/components/ConfirmButton";
import { addUser, removeUser, resetPassword } from "./actions";

export function UsersAdmin({ users, meId }: { users: User[]; meId: number }) {
  const [r, action, pending] = useActionState(addUser, null);
  const router = useRouter();
  return (
    <div className="grid max-w-3xl gap-8">
      <form action={action} className="grid gap-3 rounded-lg bg-card p-5 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">Buat akun baru</h2>
        <input name="username" required placeholder="username (huruf kecil, angka, . _ -)" autoCapitalize="none" spellCheck={false} className="input" aria-label="Username" />
        <input name="email" type="email" placeholder="email (opsional)" className="input" aria-label="Email" />
        <input name="password" type="text" required minLength={8} placeholder="password awal (min. 8 karakter)" autoComplete="off" className="input sm:col-span-2" aria-label="Password awal" />
        {r?.error && <p className="text-sm text-hot sm:col-span-2" role="alert">{r.error}</p>}
        {r?.ok && <p className="text-sm text-accent sm:col-span-2" role="status">{r.ok} Berikan username & password ini ke pemiliknya; password bisa diganti di Akun saya.</p>}
        <button disabled={pending} className="btn btn-primary w-fit">{pending ? "Membuat…" : "Buat akun"}</button>
      </form>

      <section>
        <h2 className="mb-3 text-lg font-bold">Semua akun ({users.length})</h2>
        <ul className="divide-y divide-line rounded-lg bg-card">
          {users.map((u) => (
            <UserRow key={u.id} u={u} me={u.id === meId} onChanged={() => router.refresh()} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function UserRow({ u, me, onChanged }: { u: User; me: boolean; onChanged: () => void }) {
  const [pw, setPw] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  return (
    <li className="flex flex-wrap items-center gap-3 p-4">
      <span className="grid size-9 place-items-center rounded-full bg-[#1ed760] font-black uppercase text-black">{u.username[0]}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{u.username}{me && <span className="ml-2 text-xs text-muted">(kamu)</span>}</span>
        <span className="block truncate text-xs text-muted">{u.role === "superadmin" ? "Super admin" : "Member"}{u.email ? ` · ${u.email}` : ""} · sejak {new Date(u.created_at).toLocaleDateString("id-ID")}</span>
      </span>
      {pw === null ? (
        !me && <button className="btn h-8 px-3 text-xs sm:h-8" onClick={() => setPw("")}>Reset password</button>
      ) : (
        <span className="flex items-center gap-2">
          <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="password baru" autoComplete="off" className="input h-8 w-44 text-sm sm:h-8" aria-label={`Password baru untuk ${u.username}`} />
          <button className="btn btn-primary h-8 px-3 text-xs sm:h-8" onClick={async () => { const r = await resetPassword(u.id, pw); setMsg(r); if (r?.ok) setPw(null); }}>Simpan</button>
          <button className="text-xs text-muted hover:text-ink" onClick={() => setPw(null)}>Batal</button>
        </span>
      )}
      {!me && u.role !== "superadmin" && (
        <ConfirmButton className="btn h-8 border-hot/50 px-3 text-xs text-hot hover:border-hot sm:h-8" armedClassName="!border-hot !bg-hot !text-black" confirmLabel="Yakin hapus? Setlistnya ikut terhapus" onConfirm={async () => { const r = await removeUser(u.id); setMsg(r); if (r?.ok) onChanged(); }}>
          Hapus
        </ConfirmButton>
      )}
      {msg && <p className={`w-full text-xs ${msg.error ? "text-hot" : "text-accent"}`}>{msg.error ?? msg.ok}</p>}
    </li>
  );
}
