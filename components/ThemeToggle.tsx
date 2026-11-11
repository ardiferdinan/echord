"use client";
import { useEffect } from "react";
import { useLocal } from "@/lib/storage";

const NEXT = { system: "light", light: "dark", dark: "system" } as const;
const LABEL = { system: "Tema: ikuti sistem", light: "Tema: terang", dark: "Tema: gelap" };
const ICON = { system: "◐", light: "☀", dark: "☾" };

export function ThemeToggle({ className = "text-muted hover:text-ink" }: { className?: string }) {
  const [theme, setTheme] = useLocal<"system" | "light" | "dark">("echord:theme", "system");
  useEffect(() => {
    const el = document.documentElement;
    if (theme === "system") delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);
  return (
    <button onClick={() => setTheme(NEXT[theme])} className={`btn-icon text-lg ${className}`} aria-label={LABEL[theme]} title={LABEL[theme]}>
      <span suppressHydrationWarning>{ICON[theme]}</span>
    </button>
  );
}
