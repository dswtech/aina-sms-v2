# Konten Lebih Lebar dan Kontrol Desktop Kompak — Rencana Implementasi

> **Untuk agent pelaksana:** WAJIB gunakan superpowers:subagent-driven-development (disarankan) atau superpowers:executing-plans untuk menjalankan rencana ini per task. Langkah memakai checkbox (`- [ ]`).

**Tujuan:** Halaman data memakai lebar desktop hingga 1536px dan kontrol 36px benar-benar aktif di monitor mouse lebar 1280px ke atas, tanpa mengubah mobile dan tablet.

**Arsitektur:** Perubahan hanya pada kelas Tailwind per halaman dan satu media query di `resources/css/app.css`. Tidak ada komponen, API, database, atau dependency baru. Tes browser `playwright-cli` yang sudah ada diubah lebih dulu agar gagal, lalu implementasi membuatnya lulus.

**Tech Stack:** Laravel + Inertia, React/TypeScript, Tailwind CSS v4, `playwright-cli` (`tests/Browser`), `pnpm`.

**Spec:** [`../specs/2026-11-09-wide-content-compact-controls-design.md`](../specs/2026-11-09-wide-content-compact-controls-design.md)

## Global Constraints

- Batas lebar halaman data: `max-w-screen-2xl` (1536px). Gutter `px-5 sm:px-8 lg:px-10` (Pelanggan: `px-4 sm:px-6 lg:px-8`) tidak diubah.
- Sembilan halaman data: `dashboard`, `targets/index`, `transactions/index`, `customers/index`, `analytics/index`, `analytics/mapping-area`, `analytics/financing`, `admin/users/index`, `admin/teams/index`.
- Tetap sempit, jangan disentuh: `imports` (6xl), `module-status` (5xl), `dealer-settings` (5xl), `transactions/create` (6xl), `team-performance`.
- Media query kontrol kompak menjadi tepat `(min-width: 1280px) and (hover: hover) and (pointer: fine)`. Tinggi kontrol: 36px di aturan itu, 44px di luar aturan itu.
- Tanpa package baru, migration, seeder, atau penulisan `.env` (rules/README.md bagian 2–4). Hanya data sintetis dan intercept dari tes browser.
- Commit mengikuti Conventional Commits; jalankan tes relevan sebelum commit; kerja di branch non-default lalu PR. Jangan stage perubahan `.gitignore` yang bukan bagian pekerjaan ini.

## Review Focus

1. Viewport tepat 1280px: kontrol harus 36px (batas bawah aturan). Diuji di Task 1.
2. Viewport 1024px (tablet landscape): kontrol harus tetap 44px dan tidak ada horizontal scroll. Diuji di Task 1.
3. Viewport 1920px: lebar konten tidak melebihi 1536px dan tidak ada horizontal scroll. Diuji di Task 1.
4. Tablet/laptop sentuh dengan pointer utama jari pada lebar ≥1280px harus tetap 44px: tidak bisa diemulasi lewat `run-code`, diperiksa manual lewat emulasi perangkat DevTools di Task 3.
5. Halaman Analisis saat dicetak tetap tanpa batas lebar (`print:max-w-none` di `analytics/index.tsx` tidak boleh hilang); diperiksa lewat diff di Task 2.

---

### Task 1: Tes browser gagal lebih dulu

**Files:**
- Modify: `tests/Browser/accessibility.js:1709-1748` (tes `compact controls align on desktop and retain touch sizes with filter drafts intact`) dan tambah satu tes baru tepat setelah tes itu berakhir.

**Interfaces:**
- Consumes: helper yang sudah ada di berkas itu: `test(name, run)`, `load(component?, props?, url?)`, `assert(cond, msg)`.
- Produces: tes `data pages use the 1536px cap and 36px controls from 1280px` yang gagal sebelum Task 2 dan lulus sesudahnya.

- [ ] **Step 1: Ubah ekspektasi tes lama.** Pada baris 1735 ganti `const expected = width >= 768 ? 36 : 44;` menjadi `const expected = width >= 1280 ? 36 : 44;`. Daftar lebar `[390, 768, 1440]` tetap; 768 kini mengharapkan 44.

- [ ] **Step 2: Angkat props transaksi agar dipakai bersama.** Pindahkan objek props pada pemanggilan `load('transactions/index', {...}, '/transactions')` di tes lama menjadi `const transactionsProps = {...}` di atas tes itu, lalu pakai di kedua tempat. Isi props tidak berubah.

- [ ] **Step 3: Tulis tes baru.** Untuk setiap `width` dalam `[1024, 1280, 1920]`: `page.setViewportSize({ width, height: 1100 })`, `load('transactions/index', transactionsProps, '/transactions')`, lalu assert dengan nilai spec:
  - tinggi `#search` = `width >= 1280 ? 36 : 44` (toleransi 0,5px, pesan menyebut `width`);
  - `document.documentElement.scrollWidth === innerWidth`;
  - `page.locator('main .max-w-screen-2xl').first().boundingBox()` ada dan `.width <= 1536.5`;
  - khusus `width === 1920`: `.width >= 1500` (membuktikan batas lama 1280px sudah hilang).

- [ ] **Step 4: Jalankan tes dan pastikan gagal.** Bangun frontend (`pnpm run build`), sajikan aplikasi lokal sesuai pola `tests/Browser/run-isolated.ps1` (pwsh, `APP_ENV=testing`, SQLite sementara, server `php -S` loopback), lalu `playwright-cli "-s=<sesi>" run-code --filename tests/Browser/accessibility.js`. Ekspektasi: tes baru gagal (locator `.max-w-screen-2xl` tidak ada; tinggi kontrol 44 di 1280) dan tes lama gagal pada 768/1440 sesuai kondisi saat ini. Catat pesan gagalnya.

- [ ] **Step 5: Commit tes.** `git add tests/Browser/accessibility.js` lalu `git commit -m "test(ui): expect 36px controls from 1280px and 1536px data-page cap"`.

---

### Task 2: Implementasi kelas lebar dan media query

**Files:**
- Modify: `resources/css/app.css:238`
- Modify: `resources/js/pages/dashboard.tsx:43`, `resources/js/pages/targets/index.tsx:13`, `resources/js/pages/transactions/index.tsx:572`, `resources/js/pages/customers/index.tsx:468`, `resources/js/pages/analytics/index.tsx:182`, `resources/js/pages/analytics/mapping-area.tsx:15`, `resources/js/pages/analytics/financing.tsx:15`, `resources/js/pages/admin/users/index.tsx:313`, `resources/js/pages/admin/teams/index.tsx:241`

**Interfaces:**
- Consumes: tes dari Task 1.
- Produces: perilaku yang dipakai Task 3 untuk dokumentasi dan verifikasi.

- [ ] **Step 1: Ubah media query.** Di `app.css:238` ganti seluruh kondisi menjadi `@media (min-width: 1280px) and (hover: hover) and (pointer: fine) {`. Isi blok tidak berubah.

- [ ] **Step 2: Ganti kelas lebar.** Pada setiap berkas di atas ganti `max-w-7xl` dengan `max-w-screen-2xl` pada satu elemen pembungkus yang tercantum; kelas lain di elemen itu (termasuk `print:max-w-none` di `analytics/index.tsx`) tidak berubah. Setelah itu `grep -rn "max-w-7xl" resources/js/pages` hanya boleh menyisakan hasil di luar sembilan berkas tersebut (tidak ada).

- [ ] **Step 3: Pastikan utilitas ada di CSS hasil build.** `pnpm run build`, lalu cari `max-w-screen-2xl` di berkas CSS dalam `public/build/assets`. Bila Tailwind v4 tidak menghasilkannya, ganti ke `max-w-[96rem]` di sembilan berkas dan di selector tes Task 1, lalu catat penyimpangan dari spec di bagian bukti spec.

- [ ] **Step 4: Jalankan tes dan pastikan lulus.** Ulangi perintah Task 1 Step 4. Ekspektasi: seluruh `accessibility.js` lulus, termasuk tes baru. Jalankan juga `dashboard-layout.js` dengan cara yang sama; ambang 1280 di baris 433 adalah breakpoint panel, bukan batas konten, dan harus tetap lulus tanpa perubahan.

- [ ] **Step 5: Commit.** `git add resources/css/app.css resources/js/pages` lalu `git commit -m "feat(ui): widen data pages to 1536px and enable 36px controls from 1280px"`.

---

### Task 3: Dokumen dan verifikasi akhir

**Files:**
- Modify: `DESIGN.md` (bagian Struktur dan baris kontrol di Komponen)
- Modify: `docs/agents/README.md` (daftarkan rencana ini di manifest; status spec menjadi diimplementasikan)
- Modify: `docs/agents/memory.md` (satu entri handover singkat di atas "Keadaan terverifikasi")

**Interfaces:**
- Consumes: hasil verifikasi Task 2.

- [ ] **Step 1: Perbarui `DESIGN.md`.** Pada Struktur tambah satu baris: halaman data memakai batas konten 1536px, form dan pengaturan tetap sempit. Pada Komponen ganti klausa "pada viewport minimal 768px dengan mouse presisi tanpa perangkat sentuh" dengan "pada viewport minimal 1280px dengan pointer utama mouse; tablet, layar sentuh dan mobile tetap minimal 44px".

- [ ] **Step 2: Perbarui manifest dan memory.** Tambah baris rencana ini di tabel manifest `docs/agents/README.md` (jenis Rencana). Di `memory.md` catat: apa yang berubah, bukti tes yang benar-benar dijalankan, dan bahwa perilaku iPad dengan keyboard/trackpad serta uji perangkat sentuh nyata belum diverifikasi.

- [ ] **Step 3: Verifikasi otomatis.** Jalankan `composer ci:check`. Ekspektasi: lulus semua (frontend lint/format, TypeScript, test frontend, Pest, Pint, PHPStan). Bila ada yang gagal, jangan commit; laporkan keluarannya.

- [ ] **Step 4: Verifikasi visual manual.** Dengan server lokal dan data demo/sintetis: buka Transaksi di 390, 768, 1280, 1920px terang dan gelap lewat browser; periksa konten melebar di 1920, tidak ada horizontal scroll, dan kontrol 36px hanya di ≥1280. Lalu di DevTools emulasi perangkat sentuh pada lebar 1440: kontrol harus 44px (Review Focus 4). Simpan tangkapan layar di `.playwright-cli/` (diabaikan Git).

- [ ] **Step 5: Commit dan PR.** `git add DESIGN.md docs/agents` lalu `git commit -m "docs(ui): record 1536px content cap and 1280px compact-control threshold"`. Push branch non-default dan buka PR; jangan merge atau deploy tanpa perintah pemilik.
