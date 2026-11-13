import { Mark } from "@/components/icons";

/** Public share links: no login, no app shell; just the setlist on a dark panel. */
export default function ShareLayout({ children }: LayoutProps<"/s">) {
  return (
    <div className="min-h-svh bg-app sm:p-2">
      <main id="content" className="min-h-svh bg-panel px-4 pb-12 sm:min-h-[calc(100svh-1rem)] sm:rounded-lg sm:px-8">
        <header className="flex h-16 items-center gap-2">
          <Mark className="size-8" />
          <span className="text-xl font-black tracking-[-0.03em]">echord</span>
        </header>
        {children}
      </main>
    </div>
  );
}
