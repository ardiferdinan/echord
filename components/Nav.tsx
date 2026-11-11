import Link from "next/link";
import { logout } from "@/app/login/actions";
import { ThemeToggle } from "./ThemeToggle";

/** Dot cluster mark, echoing the reference logo: six dots = six strings. */
function Mark() {
  const dots = [[7, 12], [12, 7], [17, 12], [12, 17], [12, 12], [7, 17]];
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === 4 ? 2.6 : 1.8} fill={i === 4 ? "var(--hot)" : "currentColor"} />
      ))}
    </svg>
  );
}

/** onBrand: sitting on a blue slab (hero shoulders) instead of the page background. */
export function Brand({ onBrand = false }: { onBrand?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Echord beranda">
      <span className={`grid size-10 place-items-center rounded-full ${onBrand ? "bg-bg text-ink" : "bg-brand text-on-brand"}`}>
        <Mark />
      </span>
      <span className={`display text-2xl italic ${onBrand ? "text-on-brand" : ""}`}>echord</span>
    </Link>
  );
}

export function NavLinks({ onBrand = false }: { onBrand?: boolean }) {
  const link = `grid h-11 place-items-center rounded-full px-3 text-[15px] font-medium sm:h-10 sm:text-sm ${
    onBrand ? "text-on-brand/85 hover:bg-on-brand/15 hover:text-on-brand" : "text-muted hover:text-ink"
  }`;
  return (
    <div className="flex items-center gap-1">
      <Link href="/" className={`${link} hidden sm:grid`}>Lagu</Link>
      <Link href="/chords" className={link}>Chord</Link>
      <Link href="/setlists" className={link}>Setlist</Link>
      <ThemeToggle className={onBrand ? "text-on-brand/85 hover:bg-on-brand/15 hover:text-on-brand" : undefined} />
      <form action={logout}>
        <button className={link} title="Keluar" aria-label="Keluar">
          <svg viewBox="0 0 24 24" className="size-5 sm:hidden" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
          </svg>
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </form>
      <Link href="/admin/new" className={`btn btn-dark ml-1 hidden ${onBrand ? "lg:inline-flex" : "sm:inline-flex"}`}>+ Tambah lagu</Link>
    </div>
  );
}
