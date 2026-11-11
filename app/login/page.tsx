import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Masuk" };

export default function Page({ searchParams }: PageProps<"/login">) {
  return (
    <div className="grid min-h-svh place-items-center bg-brand p-4">
      <Suspense>
        <LoginForm next={searchParams.then((p) => (typeof p.next === "string" ? p.next : "/"))} />
      </Suspense>
    </div>
  );
}
