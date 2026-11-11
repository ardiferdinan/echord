import { Frame, SearchPill } from "@/components/Frame";

/** Every page except home: the same blue frame, page content on a light sheet inside it. */
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="p-3 sm:p-4">
      <Frame search={<SearchPill />} className="flex min-h-[calc(100svh-2rem)] flex-col px-2 pb-2 pt-[84px] sm:px-3 sm:pb-3 sm:pt-[92px]">
        <div className="flex-1 rounded-[30px] bg-bg p-4 text-ink sm:p-6 lg:p-8">{children}</div>
      </Frame>
    </div>
  );
}
