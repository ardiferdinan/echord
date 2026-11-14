import { ViewTransition } from "react";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { SetlistSync } from "@/components/SetlistSync";
import { PlayerBar } from "@/components/player/PlayerBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { TopBar } from "@/components/shell/TopBar";
import { TabBar } from "@/components/shell/TabBar";

/**
 * App shell: sidebar + scrolling main panel on black, player bar along the bottom (desktop);
 * full-bleed main panel, mini player and tabs on phones. The player lives here so audio survives navigation.
 */
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <PlayerProvider>
      <SetlistSync />
      <div className="grid h-svh grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-2 lg:p-2 lg:pb-0">
        <aside className="hidden min-h-0 lg:flex lg:flex-col">
          <Sidebar />
        </aside>
        <main id="content" className="min-h-0 overflow-y-auto overscroll-contain bg-panel lg:rounded-lg" data-scroll>
          <TopBar />
          <ViewTransition default="page">
            <div className="px-4 pb-12 sm:px-6">{children}</div>
          </ViewTransition>
        </main>
        <div className="bg-black px-2 pt-1 lg:col-span-2 lg:p-0">
          <PlayerBar />
          <TabBar />
        </div>
      </div>
    </PlayerProvider>
  );
}
