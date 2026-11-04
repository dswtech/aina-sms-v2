# Memory — Handoff Agent

| Item | Keterangan |
|---|---|
| Dokumen | Keadaan proyek dan handoff agent |
| Versi | v1.9 |
| Diperbarui | 4 November 2026 |
| Status | Aktif |

Memory bukan sumber requirement. Bila isi memory bertentangan dengan PRD atau ADR, ikuti PRD/ADR dan perbaiki memory.

## Keadaan terverifikasi

- PRD v1.0 disetujui sebagai baseline produk pada 30 Oktober 2026.
- Skill proyek `aina-sms-workflow` ditetapkan di [`.agents/skills/aina-sms-workflow/SKILL.md`](../../.agents/skills/aina-sms-workflow/SKILL.md) sebagai patokan kerja agent.
- Fondasi aplikasi Laravel monolith dengan Inertia, React, TypeScript, Tailwind CSS, dan shadcn/ui telah tersedia di repository sesuai [`adr/ADR-001-laravel-inertia-monolith.md`](adr/ADR-001-laravel-inertia-monolith.md).
- Produk adalah responsive web app internal untuk satu dealer dengan banyak tim.
- Hierarki: Admin → Branch Manager → Supervisor → Sales.
- Branch Manager membaca dashboard, forecast, dan laporan tanpa mengubah transaksi atau membaca coaching.
- MVP mencakup autentikasi, tim, Buku Pelanggan, lead pipeline, conversation/coaching, impor CSV, dashboard, weighted forecasting, serta Analisis Sumber dan Model.
- UI referensi menggunakan filter rentang tanggal, tabel transaksi, status, pagination, serta dialog detail bertab.
- Implementasi referensi mempunyai kelemahan pada mobile; yang diambil adalah pola interaksi, bukan responsivitasnya.
- Dependency PHP dan frontend telah tersedia. Baseline `main` tersinkron ke `caf2cf5` setelah merge PR #21; working tree bersih sebelum branch QA dibuat.
- Fondasi akses Fase 1 telah memakai autentikasi username, empat role server-side, status akun aktif, dan shell responsif; rencana implementasi berada di [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md).
- Fase 1 telah menyelesaikan dealer, tim, histori penempatan, scope organisasi, undangan sekali pakai, lifecycle Admin, dan audit aman. Gerbang PostgreSQL terisolasi, Pest, static analysis, frontend, build, serta browser tiga viewport telah lulus sesuai [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md).
- PostgreSQL development telah dikonfigurasi dan seeder akun development lokal telah dijalankan. Seeder dibatasi untuk environment local/testing dan credential tidak dicatat di dokumentasi.
- Implementasi Fase 0–5, CSV import, performance index, security hardening, halaman Transaksi, kontrol panel pengguna, combobox data, dan notifikasi floating telah digabungkan ke `main`.
- PR #21 telah menggabungkan seeder demo lokal lengkap: 72 pelanggan, 168 transaksi lintas seluruh tahap, aktivitas, follow-up, coaching beserta revisi, target, batch import, notifikasi, audit log, dan undangan.
- Seeder demo dijaga hanya untuk environment `local`, deterministik, dan tidak menggandakan data bila dijalankan kembali. Pagination pelanggan dan transaksi telah diverifikasi di browser.
- Verifikasi commit `c6ed3da`: frontend check, TypeScript, Pint, PHPStan, production build, serta Pest 150 tes (147 lulus, 3 skip) berhasil.
- Audit pada branch `codex/phase-6-accessibility-responsive-qa` menggunakan `playwright-cli`: 108 kombinasi halaman/viewport empat role pada 390/768/1440 tanpa horizontal page overflow pada keadaan awal yang diukur. Gerbang aksesibilitas belum lulus: 6 temuan P1 dan 4 P2 dicatat beserta bukti, lokasi source, serta batas cakupan di [laporan QA](accessibility-responsive-qa-2026-11-04.md). Perubahan branch ini hanya dokumentasi; temuan belum diperbaiki.
- Verifikasi ulang baseline `caf2cf5`: `composer ci:check` lulus (150 tes, 147 lulus, 3 skip, 896 assertions) dan production build lulus. Pemeriksaan memakai pnpm 11.25.0 yang sudah tersedia; PHPStan/CI dan browser Playwright berjalan di luar sandbox setelah kendala akses lokal.
- QA tidak menjalankan seeder, migration, import, atau penyimpanan data bisnis. Sesi akun demo telah di-logout; artefak screenshot/hasil DOM lokal berada di luar repository. `.playwright-cli/` adalah metadata lokal yang diabaikan Git.

## Keputusan aktif

- Backend dan server utama: Laravel.
- Frontend: React + TypeScript melalui Inertia dalam repository yang sama.
- Database: PostgreSQL.
- UI: Tailwind CSS dan komponen shadcn/ui.
- Platform MVP: web app mobile-first, bukan native app dan bukan PWA.
- Detail transaksi: dialog adaptif pada desktop dan full-screen sheet/dialog pada mobile.
- Arah visual: neutral dengan blue accent.
- Forecast MVP: weighted pipeline tanpa AI.
- Conversation: timeline kronologis, reply sederhana, teks saja.
- Komentar dapat diedit oleh penulis selama lima menit; revisi lama tetap tersimpan dan komentar tidak dihapus permanen.
- Komentar baru memicu notifikasi in-app dan email. Email hanya memuat metadata aman dan tautan, bukan isi coaching.
- Customer dipisahkan dari transaksi; satu Customer dapat mempunyai beberapa peluang penjualan.
- “Buku Pelanggan Saya” menjadi phonebook kerja Sales dengan kontak terakhir, next follow-up, riwayat, dan aksi cepat.
- Data Customer merupakan aset dealer. Sales hanya menerima assignment; reassignment mempertahankan riwayat dan tidak ada bulk export atau sinkronisasi phonebook pribadi pada MVP.
- Menu Analisis menggunakan nama “Analisis”, bukan “Mapping”. Sumber dan Model masuk MVP; Area serta MSCP ditunda sampai data prasyarat tersedia.
- Roadmap kanonik pembangunan berada di [`roadmap.md`](roadmap.md), dimulai dari fondasi akses lalu Customer/pipeline sebelum coaching, forecast, dan analisis.
- Arah navigasi dan wireframe Fase 0 telah dipilih; keputusan kanonik berada di [`../design/aina-sms-navigation/direction-approved.md`](../design/aina-sms-navigation/direction-approved.md).
- Prototipe terpilih telah diperluas menjadi runtime lokal lengkap dengan hash route, data sesi, alur empat role, autentikasi, state, dan aksesibilitas; status verifikasi berada di [`../design/aina-sms-navigation/verification.md`](../design/aina-sms-navigation/verification.md).

## Keputusan terbuka

| Keputusan | Pemutus | Dampak bila belum diputuskan |
|---|---|---|
| Nama produk final | Product Owner | Branding dan judul aplikasi tetap memakai nama kerja. |
| Bobot forecast per tahap | Product Owner + operasional dealer | Forecast produksi belum dapat diaktifkan dengan nilai final. |
| Penyedia email | Product Owner + IT | Undangan dan email notifikasi belum dapat dikirim di production. |
| Lingkungan deployment | Product Owner + IT | Target konfigurasi dan runbook production belum dapat ditulis. |

## Langkah berikutnya

1. Perbaiki temuan keyboard, nama aksesibel, fokus dialog, kontras, dan target sentuh pada [laporan QA](accessibility-responsive-qa-2026-11-04.md), dengan test regresi untuk perubahan perilaku.
2. Lengkapi state QA yang belum diuji, kemudian lanjutkan UAT per role, runbook operasional, pilot, dan keputusan go-live sesuai roadmap. Audit halaman awal tidak menggantikan UAT.
3. Tetapkan bobot forecast bersama Product Owner dan operasional sebelum forecast production diaktifkan.

## Larangan memory

- Jangan menaruh password, token, credential, `.env`, atau data pelanggan di sini.
- Jangan menyalin requirement lengkap dari PRD.
- Jangan mencatat keputusan baru tanpa memperbarui dokumen kanoniknya terlebih dahulu.
