import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Masuk" };

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <main id="content" className="grid min-h-svh place-items-center bg-gradient-to-b from-[#1e3a2a] to-app p-4">
      <Suspense>
        <LoginForm next={searchParams.then((p) => (typeof p.next === "string" ? p.next : "/"))} />
      </Suspense>
    </main>
  );
}
