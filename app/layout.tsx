import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  variable: "--font-satoshi",
  src: [
    { path: "./fonts/Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "./fonts/Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: { default: "Echord · Chord lagu rohani", template: "%s · Echord" },
  description: "Perpustakaan chord lagu rohani pribadi: transpose, chord angka, diagram gitar dan piano, setlist, dan preview lagu.",
};
export const viewport: Viewport = { themeColor: "#000000" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${satoshi.variable} h-full`}>
      <body className="min-h-full">
        <a href="#content" className="sr-only z-[60] rounded-full bg-ink px-5 py-3 font-bold text-app focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
          Lewati ke konten
        </a>
        {children}
      </body>
    </html>
  );
}
