import Link from "next/link";
import { Mark } from "@/components/icons";

export const metadata = { title: "Tidak ditemukan" };

export default function NotFound() {
  return (
    <main id="content" className="grid min-h-svh place-items-center bg-panel p-6 text-center">
      <div className="max-w-md">
        <Mark tile className="mx-auto size-16" />
        <h1 className="headline mt-8 text-5xl">Halaman tidak ditemukan</h1>
        <p className="mt-4 text-muted">Mungkin lagunya sudah dihapus, atau alamatnya salah ketik.</p>
        <Link href="/" className="btn btn-dark mt-8 h-12 px-8 text-base sm:h-12">Ke beranda</Link>
        <p className="mt-6 text-sm"><Link href="/search" className="text-muted underline underline-offset-4 hover:text-ink">Cari lagu</Link></p>
      </div>
    </main>
  );
}
