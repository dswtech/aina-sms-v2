# G06–G08 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. Track completion below.

**Goal:** Tutup gap teknis riwayat/audit, stagnan dan impor mobile dalam satu PR.

**Architecture:** Laravel/Inertia memakai sumber histori yang tersedia dan policy saat request. Satu presenter timeline dipakai detail Customer dan coaching; query dan accessor stagnan memakai cutoff bersama. Frontend mengikuti DESIGN.md.

**Tech Stack:** PHP/Laravel, React/TypeScript, Pest, browser fixture Playwright.

**Spec:** [Rancangan disetujui](design-g06-g08-history-stagnant-import.md).

## Global Constraints

- Satu branch `codex/g06-g08-history-stagnant-import`, baseline `958e983`, satu PR.
- Tidak membaca .env, memasang dependency, migration/seeder atau write database non-test.
- Scope server tidak diperluas; Branch Manager tidak menerima coaching/kontak, revisi hanya Admin.
- Hari kalender Asia/Jakarta: selisih tanggal > 3; fallback created_at; closed tidak stagnan.
- Test gagal sebelum implementasi perilaku non-trivial. Commit hanya setelah pemeriksaan relevan lulus.

## Review Focus

1. Akses Customer tetap ada saat sebagian transaksi sudah tidak boleh dibaca: uji payload/pagination mengecualikan transaksi dan aktivitasnya.
2. Transaksi tetap dapat dibaca setelah Customer berpindah assignment: coaching tidak memuat identitas/aktivitas hubungan Customer.
3. Timestamp sama dan reply: urutan stabil lintas pagination, konteks induk tidak membuka data di luar halaman/izin.
4. Pergantian hari UTC/Jakarta: accessor/filter/count/prioritas memakai cutoff identik.
5. Filename, nomor, model dan error panjang: semua informasi mobile terlihat, keyboard/retry/loading tetap dapat dipakai.

## Task 1: Backend histori G06

Files: `routes/web.php`, `app/Http/Controllers/Customer/CustomerHistoryController.php` (baru), `app/Services/TransactionTimeline.php` (baru), `app/Http/Controllers/Customer/DealCommentController.php`, `tests/Feature/Customer/CustomerHistoryTest.php` (baru).

Interfaces: GET `/customers/{customer}/history` mengembalikan JSON `transactions`, `activities` (paginator), `selected_transaction`, `timeline` (paginator). Parameter `transaction` public UUID, `activity_page`, `timeline_page`. GET coaching tetap Inertia dengan `transaction` dan `timeline`. Presenter `TransactionTimeline::paginate(DealTransaction $deal, User $actor, int $page = 1): array` menghasilkan `data`, `current_page`, `last_page`, `total`; page size 20. Event: `key`, `kind`, `occurred_at`, `actor_name`, `body`, `label`, dan untuk komentar `comment` (termasuk parent, snapshot, can_edit, revisions hanya Admin). Reorder query aktivitas bawaan secara eksplisit.

- [x] Tulis dan jalankan test gagal: dua transaksi/closed, pemilihan lama, >20 aktivitas/event, urutan campuran dan waktu sama, audit revision actor/time, seluruh Review Focus 1–3, foreign UUID/customer/dealer, inactive dan BM ditolak. Jalankan `php vendor/bin/pest tests/Feature/Customer/CustomerHistoryTest.php`.
- [x] Implementasikan controller/presenter, scope setiap read, pagination stabil. StageHistory adalah event berbeda dari CustomerActivity karena tidak ada FK provenance; jangan hapus event berdasarkan kemiripan teks/waktu. Semua komentar/reply menjadi event datar berkonteks root.
- [x] Jalankan test baru dan `tests/Feature/Customer` sampai lulus.

## Task 2: G07 stagnan

Files: `app/Models/DealTransaction.php`, `app/Http/Controllers/Customer/CustomerController.php`, `app/Http/Controllers/TransactionController.php`, pemakai lain hasil pencarian, `tests/Feature/Customer/StagnantConsistencyTest.php` (baru).

Interfaces: `DealTransaction::stagnantCutoff(): CarbonImmutable` (awal hari Jakarta minus tiga hari dalam UTC), `scopeStagnant(Builder $query): void`; accessor menggunakan cutoff yang sama. Dashboard/TeamPerformance yang memakai accessor mengikuti perubahan ini.

- [x] Tambah test gagal pada null, tepat cutoff, satu detik sebelum/sesudah, seluruh closed stages, UTC/Jakarta, filter/count Customer/Transaksi dan dashboard/prioritas. Aktivitas baru harus menghilangkan stagnant. Jalankan file Pest baru.
- [x] Implementasikan cutoff/scope dan ganti semua query stagnant ad hoc. Jalankan test baru dan suite dashboard/pipeline relevan sampai lulus.

## Task 3: G08 kartu impor

Files: `resources/js/pages/imports/index.tsx`, `tests/Browser/import-responsive.js` (baru).

Interfaces: props/server import tidak berubah. `<768px` memakai daftar berlabel; `>=768px` memakai tabel tanpa kehilangan field. Ukuran kontrol dan token mengikuti DESIGN.md.

- [x] Buat browser regression gagal: seluruh field preview/batch/error, panjang teks, valid/invalid, empty/error/loading/disabled, keyboard, 390/768/1440 × light/dark. Semua write diintersep.
- [x] Implementasikan list/kartu serta wrapping dan feedback loading. Jalankan regresi sampai lulus; periksa screenshot langsung.

## Task 4: UI riwayat G06

Files: `resources/js/components/transaction-timeline.tsx` (baru), `resources/js/components/customer-history.tsx` (baru), `resources/js/pages/customers/index.tsx`, `resources/js/pages/transactions/coaching.tsx`, `resources/js/types/history.ts` (baru), `tests/Browser/customer-history.js` (baru).

Interfaces: types mengikuti Task 1. Customer history dimuat saat detail dibuka dengan fetch JSON same-origin, abort/guard stale response saat customer/transaction berganti. Pilihan transaksi mengubah active_deal untuk seluruh handler/form pada detail; reset draft/action dialog yang menunjuk transaksi sebelumnya. Timeline bersama menerima page/events, onReply/onEdit; revision disclosure hanya saat properti tersedia. Coaching pagination memakai GET Inertia preserveScroll. Form aksi existing dan policy server dipertahankan.

- [x] Tambah regresi browser gagal untuk memilih transaksi closed/lama, >20 event/aktivitas dan pagination, urutan reply/tahap/aktivitas, revision Admin, loading/error/retry/stale, keyboard, filter/scroll preservation. Periksa request mutasi menunjuk transaksi terpilih melalui intercept.
- [x] Implementasikan komponen dan integrasikan; ganti bagian riwayat/coaching terpisah dengan timeline. Hindari snapshot izin lama setelah request server menolak atau Customer hilang dari props.
- [x] Jalankan TypeScript, frontend checks dan browser regression sampai lulus; screenshot 390/768/1440 dan kedua tema.

## Task 5: Integrasi dan delivery

Files: dokumen ini, `docs/agents/uat-matrix.md`, `docs/agents/memory.md`, `docs/agents/README.md`.

- [x] Jalankan `composer ci:check`, `pnpm run build`, browser regression relevan dan `git diff --check`. Pastikan database test terisolasi; catat skip dan batas bukti.
- [x] Review independen seluruh diff; tangani temuan dengan test gagal/lulus dan jalankan ulang pemeriksaan yang terdampak.
- [x] Isi bukti, batas UAT manusia/PostgreSQL/performa, hasil aktual dan residu lokal di dokumentasi. Perbarui status gap tanpa mengklaim UAT manusia selesai.
- [x] Commit Conventional Commits, push branch ini, buat satu PR. Tidak merge otomatis.

## Ledger

- 5 November: rancangan disetujui pengguna; subagent diizinkan bila membantu. Branch sudah terisolasi dari default, working tree awal hanya dokumen rancangan/manifest tugas ini. Native tool Windows dipakai; tidak membutuhkan worktree tambahan karena branch khusus sudah aktif dan tidak ada perubahan pengguna yang berkonflik.
- Ruling: satu PR tetap mengizinkan subtask independen G07/G08 dikerjakan subagent; parent menangani kontrak G06 dan integrasi. Tidak commit selama subtask masih berjalan agar verifikasi mewakili tree yang stabil.
- Ruling: payload comments/stage_history/recent_activities lama di daftar Customer dan comments lama di coaching dihapus setelah review membuktikan duplikasi tanpa batas. UI dan test kini memakai endpoint/timeline terpaginate; ringkasan transaksi awal dipertahankan.
- Ruling: aksi cepat dari daftar memakai ringkasan terkini Customer yang ditekan; aksi dari detail memakai transaksi histori terpilih. Identitas draft direset saat transaksi berubah/akses dicabut, dipertahankan saat paging atau kegagalan sementara. Fokus kembali ke pemicu memakai preventScroll agar posisi daftar tetap.
- RED/GREEN: tujuh test awal histori gagal 404/timeline tidak ada; sesudah implementasi lulus. Regresi tambahan membuktikan kebocoran aktivitas lama, aksi linked tanpa izin dan duplikasi histori sebelum koreksi. Regresi stagnant membuktikan cutoff/null/dashboard serta count transaksi tersembunyi sebelum perbaikan. Browser mereproduksi kartu impor belum tersedia, pemilih transaksi belum ada, quick action lintas Customer salah target, draft hilang pada retry dan scroll bergeser sebelum koreksi.
- Verifikasi akhir: composer ci:check lulus (tujuh tes frontend; Pest 283 tes/280 lulus/3 skip, 2.439 assertions; lint/format/TypeScript/Pint/PHPStan). Production build lulus memakai pnpm 11.25.0 lokal, jaringan package manager dinonaktifkan. Tidak memasang package; warning optional fontaine dari build sudah ada dan tidak memerlukan perubahan dependency.
- Browser: G06 enam kombinasi viewport/tema plus skenario izin/stale/retry/draft/aksi/scroll/coaching lulus, tiga submit diintersep; G08 enam kombinasi plus empty/invalid/error/loading/keyboard lulus, dua submit diintersep. G04 18 kombinasi, G05 enam dan aksesibilitas 21 kelompok lulus; fixture lama diselaraskan tanpa membuang assertion. Nol write bisnis dan pageerror pada suite baru; respons 503/403 memang disimulasikan untuk skenario gagal.
- Review backend dan UI independen selesai; seluruh temuan actionable diperbaiki dan diuji ulang. Screenshot perwakilan G06 mobile terang/desktop gelap serta G08 mobile gelap/desktop terang diperiksa langsung. Detector app impor nol FAIL/nol error konsol pada tiga viewport; satu warning alignment angka desktop diwarisi tabel lama dan dipertahankan untuk konsistensi.
- Batas: database test SQLite in-memory; tidak menjalankan PostgreSQL baru, concurrency, benchmark p95, server-save E2E atau UAT manusia. Tidak ada migration/seeder/dependency atau akses .env/write bisnis. Bukti screenshot/log lokal di .playwright-cli (ignored), server QA loopback dihentikan saat handoff.
- Delivery: commit implementasi `2019e82`, [PR #40](https://github.com/dswtech/aina-sms-v2/pull/40), target `main`. Branch fitur sudah didorong; tidak merge. Server QA 8019 dan empat sesi browser tugas sudah ditutup. Konektor GitHub menolak create PR dengan 403 izin integrasi; PR yang sama berhasil dibuat melalui sesi GitHub CLI yang tersedia.
