"use client";
import { use, useActionState } from "react";
import { Mark } from "@/components/icons";
import { login } from "./actions";

export function LoginForm({ next }: { next: Promise<string> }) {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="w-full max-w-sm rounded-lg bg-panel px-8 py-10 text-center shadow-2xl shadow-black/60 sm:px-12">
      <Mark className="mx-auto size-12" />
      <h1 className="mt-6 text-3xl font-black tracking-[-0.03em]">Masuk ke Echord</h1>
      <p className="mt-2 text-sm text-muted">Perpustakaan chord pribadi.</p>
      <input type="hidden" name="next" value={use(next)} />
      <label className="mt-8 block text-left text-sm font-bold" htmlFor="password">Password</label>
      <input id="password" type="password" name="password" required autoFocus autoComplete="current-password" className="input mt-2" />
      {error && <p className="mt-3 text-left text-sm text-hot" role="alert">{error}</p>}
      <button disabled={pending} className="btn btn-primary mt-6 h-12 w-full text-base sm:h-12">{pending ? "Masuk…" : "Masuk"}</button>
    </form>
  );
}
