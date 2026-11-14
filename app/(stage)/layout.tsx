import { SetlistSync } from "@/components/SetlistSync";

/** Stage mode: full screen, no app shell (setlists still sync to the account: keys changed on stage are saved). */
export default function StageLayout({ children }: LayoutProps<"/">) {
  return (
    <main id="content" className="min-h-svh bg-panel">
      <SetlistSync />
      {children}
    </main>
  );
}
