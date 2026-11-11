# Echord

Chord lagu rohani berbasis teks: transpose, diagram gitar/piano + saran voicing sesuai band, setlist drag & drop per section, stage mode.

## Setup

1. Buat database di [Neon](https://neon.tech) (atau Vercel → Storage → Neon, `DATABASE_URL` terisi otomatis).
2. `cp .env.example .env.local`, isi `DATABASE_URL` dan `ADMIN_PASSWORD`.
3. `npm install`
4. `npx tsx --env-file=.env.local scripts/seed.ts` membuat tabel + 5 hymne public domain.
5. `npm run dev` lalu buka http://localhost:3000

Sudah pernah seed sebelumnya? Jalankan seed sekali lagi untuk migrasi (kolom `status`, tabel `shared_setlists`), aman diulang.

Tambah lagu di `/admin/new` (password = `ADMIN_PASSWORD`). Publik mengirim lewat `/submit`, lalu di-approve di `/admin/review`:
- Paste teks "chord di atas lirik" dari mana saja, dikonversi otomatis (judul `Judul - Penyanyi`, header Intro/Verse/Reff/Bridge/Int.).
- Atau cari lirik (LRCLIB), lalu tab **Klik chord**: klik suku kata untuk menaruh chord, ¶ untuk memecah section.
- Banyak lagu sekaligus: pisahkan dengan baris `---` atau drop beberapa file `.txt`.
- `⌘/Ctrl + Enter` untuk simpan dan lanjut ke lagu berikutnya.

## Share setlist

Di editor setlist klik **Bagikan** untuk mendapat link `/s/<id>`. Anggota band bisa langsung pakai stage mode, atau simpan salinan. Setelah setlist diubah, klik **Update link band**: link tetap sama, anggota tinggal refresh. Hak update hanya ada di browser pembuatnya (token).

## Struktur

- `lib/chordpro.ts`: parser/serializer ChordPro, transpose, import chords-over-words
- `lib/voicing.ts`: voicing gitar (chords-db), piano (tonal), saran sesuai konteks band
- `lib/storage.ts`: setlist & preferensi di localStorage
- `components/SetlistEditor.tsx`: drag & drop lagu dan section
- `app/(main)/setlists/[id]/play/Stage.tsx`: stage mode (auto-scroll, pedal PageDown, swipe)

`npm test` menjalankan tes lib.
