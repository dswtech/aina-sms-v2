# Coaching Inbox Implementation Plan

**Goal:** Halaman Coaching dua panel yang menampilkan semua percakapan coaching sampai Supervisor menandainya selesai.

**Architecture:** Satu kolom `deal_transactions.coaching_closed_at`; giliran dihitung dari penulis komentar terakhir. `DealCommentController@index` melayani `/coaching` dan `/transactions/{transaction}/coaching` dengan satu halaman Inertia. Pesan lama dimuat lewat feed yang sudah ada.

**Tech Stack:** Laravel, Inertia 3, React 19, Tailwind 4, shadcn Bubble (tanpa package baru), Pest, node:test, skrip Playwright `tests/Browser`.

**Spec:** [2026-11-25-coaching-inbox-design.md](../specs/2026-11-25-coaching-inbox-design.md)

## Global Constraints

- Tanpa package baru; `package.json` dan `composer.json` tidak berubah.
- Migration dan seeder tidak dijalankan pada database non-test tanpa perintah pengguna.
- Commit Conventional tanpa baris atribusi; teks UI bahasa Indonesia; teks minimal 12px; target sentuh 44px; warna hanya token tema.
- Branch Manager tidak menerima isi atau cuplikan coaching.

## Review Focus

- Sales membalas saat layar Supervisor usang, lalu Supervisor menekan Selesai: ditolak, komentar tidak terkubur.
- Transaksi berpindah Sales sesudah komentar: Sales lama kehilangan akses, giliran tetap dihitung dari komentar terakhir.
- Pencarian berisi `%` atau `_`: dicocokkan apa adanya.
- Transaksi tanpa komentar dibuka dari Beranda: panel kosong dengan form, bukan error.
- Dua komentar pada detik yang sama: komentar dengan id terbesar yang dianggap terakhir.

## Tasks

### Task 1: Status percakapan

Files: migration `2026_11_25_110000_add_coaching_closed_at_to_deal_transactions_table.php`, `DealTransaction`, `DealTransactionPolicy`, `DealCommentController`, `routes/web.php`, `DevelopmentDemoSeeder`; test `tests/Feature/Customer/CoachingInboxTest.php`.

Produces: `DealTransaction::latestComment(): HasOne`, `DealTransactionPolicy::closeCoaching(User, DealTransaction): bool`, route `transactions.coaching.update` (PATCH, `closed: bool`, `last_comment_id: int`).

- [ ] Test gagal: hanya Supervisor tim yang menutup/membuka; `last_comment_id` usang 422; komentar baru membuka lagi; audit tanpa isi; backfill hanya DO/Lost berkomentar.
- [ ] Implementasi, test lulus, commit.

### Task 2: Daftar percakapan

Files: `DealCommentController`, `TransactionTimeline`, `TransactionController::feed`, `routes/web.php`.

Produces: route `coaching.index`; props `conversations`, `counts {supervisor, sales}`, `tab`, `search`, `transaction|null`, `timeline|null`; komentar punya `is_mine` dan `author_role`; feed `kind=all`.

- [ ] Test gagal: giliran per role, cakupan akses, pencarian, pembiayaan, tab awal, halaman terbaru lebih dulu, tanpa telepon.
- [ ] Implementasi, sesuaikan `CoachingWorkflowTest`/`CustomerHistoryTest`, commit.

### Task 3: Filter satu transaksi

Files: `TransactionController::filtered`, `resources/js/pages/transactions/index.tsx`; test `tests/Feature/TransactionFiltersTest.php`.

- [ ] Test gagal: `transaction=<public_id>` hanya mengembalikan transaksi itu di daftar dan CSV; milik tim lain kosong; nilai bukan uuid ditolak.
- [ ] Implementasi mengikuti pola `closing_month`, commit.

### Task 4: Tampilan dua panel

Files: `components/ui/bubble.tsx`, `components/coaching/*`, `pages/transactions/coaching.tsx`, `lib/navigation.ts`, `lib/coaching.ts`; tests `tests/Frontend/coaching.test.mjs`, `navigation.test.mjs`, skrip `tests/Browser`.

- [ ] Test gagal untuk menu, pengelompokan bubble, dan pemisah hari Jakarta.
- [ ] Implementasi sesuai mockup v3, sesuaikan skrip browser, commit.

### Task 5: Dokumen dan verifikasi

- [ ] PRD CVS-15/16, knowledge, memory, uat-matrix, menu-structure, DESIGN, manifest, manual.
- [ ] `php artisan test`, tes frontend, `pnpm run check`, `tsc`, build, browser 390/768/1440 terang/gelap.
