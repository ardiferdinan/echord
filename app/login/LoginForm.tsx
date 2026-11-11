"use client";
import { use, useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ next }: { next: Promise<string> }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="w-full max-w-sm rounded-[32px] bg-bg p-8 text-ink shadow-2xl shadow-black/20">
      <p className="display text-3xl italic">echord</p>
      <p className="mt-1 text-sm text-muted">Perpustakaan chord pribadi. Masukkan password.</p>
      <input type="hidden" name="next" value={use(next)} />
      <input type="password" name="password" required autoFocus autoComplete="current-password" placeholder="Password" aria-label="Password" className="input mt-6 w-full" />
      {error && <p className="mt-3 text-sm text-hot" role="alert">{error}</p>}
      <button disabled={pending} className="btn btn-primary mt-4 w-full">{pending ? "Masuk…" : "Masuk"}</button>
    </form>
  );
}
