/** Stage mode: full screen, no app shell. */
export default function StageLayout({ children }: LayoutProps<"/">) {
  return <main id="content" className="min-h-svh bg-panel">{children}</main>;
}
