"use client";
import { useActionState } from "react";
import { changeEmail, changePassword } from "./actions";

const Msg = ({ r }: { r: { ok?: string; error?: string } | null }) =>
  r?.error ? <p className="text-sm text-hot" role="alert">{r.error}</p> : r?.ok ? <p className="text-sm text-accent" role="status">{r.ok}</p> : null;

export function AccountForms({ email }: { email: string | null }) {
  const [er, emailAction, emailPending] = useActionState(changeEmail, null);
  const [pr, pwAction, pwPending] = useActionState(changePassword, null);
  return (
    <div className="grid max-w-xl gap-6">
      <form action={emailAction} className="grid gap-3 rounded-lg bg-card p-5">
        <h2 className="text-lg font-bold">Email</h2>
        <p className="-mt-2 text-sm text-muted">Bisa dipakai untuk masuk, selain username.</p>
        <input name="email" type="email" defaultValue={email ?? ""} placeholder="nama@email.com" autoComplete="email" className="input" aria-label="Email" />
        <Msg r={er} />
        <button disabled={emailPending} className="btn w-fit">{emailPending ? "Menyimpan…" : "Simpan email"}</button>
      </form>
      <form action={pwAction} className="grid gap-3 rounded-lg bg-card p-5">
        <h2 className="text-lg font-bold">Ganti password</h2>
        <input name="current" type="password" required placeholder="Password sekarang" autoComplete="current-password" className="input" aria-label="Password sekarang" />
        <input name="next" type="password" required minLength={8} placeholder="Password baru (min. 8 karakter)" autoComplete="new-password" className="input" aria-label="Password baru" />
        <input name="again" type="password" required minLength={8} placeholder="Ulangi password baru" autoComplete="new-password" className="input" aria-label="Ulangi password baru" />
        <Msg r={pr} />
        <button disabled={pwPending} className="btn btn-primary w-fit">{pwPending ? "Menyimpan…" : "Ganti password"}</button>
      </form>
    </div>
  );
}
