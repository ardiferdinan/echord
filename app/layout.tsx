import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const satoshi = localFont({
  variable: "--font-satoshi",
  src: [
    { path: "./fonts/Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "./fonts/Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
});
const creato = localFont({
  variable: "--font-creato",
  src: [
    { path: "./fonts/CreatoDisplay-Medium.otf", weight: "500", style: "normal" },
    { path: "./fonts/CreatoDisplay-Bold.otf", weight: "700", style: "normal" },
    { path: "./fonts/CreatoDisplay-BoldItalic.otf", weight: "700", style: "italic" },
    { path: "./fonts/CreatoDisplay-ExtraBold.otf", weight: "800", style: "normal" },
    { path: "./fonts/CreatoDisplay-ExtraBoldItalic.otf", weight: "800", style: "italic" },
    { path: "./fonts/CreatoDisplay-Black.otf", weight: "900", style: "normal" },
    { path: "./fonts/CreatoDisplay-BlackItalic.otf", weight: "900", style: "italic" },
  ],
});

export const metadata: Metadata = {
  title: { default: "Echord — Chord Lagu Rohani & Setlist", template: "%s · Echord" },
  description: "Chord lagu rohani berbasis teks, transpose, diagram gitar & piano, dan setlist drag-and-drop untuk pelayanan dan gig.",
};

// set the saved theme before first paint (no light→dark flash)
const THEME_SCRIPT = `try{var t=localStorage.getItem("echord:theme");if(t==='"light"'||t==='"dark"')document.documentElement.dataset.theme=JSON.parse(t)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${satoshi.variable} ${creato.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <main className="w-full flex-1">{children}</main>
      </body>
    </html>
  );
}

