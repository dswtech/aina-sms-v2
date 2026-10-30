# Memory — Handoff Agent

| Item | Keterangan |
|---|---|
| Dokumen | Keadaan proyek dan handoff agent |
| Versi | v1.7 |
| Diperbarui | 30 Oktober 2026 |
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
- Dependency PHP dan frontend telah dipasang; pemeriksaan backend, frontend, type-check, dan production build lulus pada 29 Oktober 2026.
- Fondasi akses Fase 1 telah memakai autentikasi username, empat role server-side, status akun aktif, dan shell responsif; rencana implementasi berada di [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md).
- Fase 1 telah menyelesaikan dealer, tim, histori penempatan, scope organisasi, undangan sekali pakai, lifecycle Admin, dan audit aman. Gerbang PostgreSQL terisolasi, Pest, static analysis, frontend, build, serta browser tiga viewport telah lulus sesuai [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md).
- PostgreSQL development telah dikonfigurasi dan seeder akun development lokal telah dijalankan. Seeder dibatasi untuk environment local/testing dan credential tidak dicatat di dokumentasi.
- Branch kerja aktif berada di `codex/phase-2-customer-slice` yang dibuat bersih dari `origin/main` tanpa residu atau cache lokal.
- Vertical slice Fase 2 (Customer → assignment → transaksi → aktivitas → next follow-up → mobile) telah diimplementasikan di branch tersebut sesuai [`implementation-phase-2-customer-slice.md`](implementation-phase-2-customer-slice.md).
- Model dan skema Fase 2 mencakup `Customer`, `CustomerAssignment`, `DealTransaction`, `StageHistory`, `CustomerActivity`, dan `FollowUp` beserta policy server-side `CustomerPolicy` dan `DealTransactionPolicy`.
- Endpoint `/customers` menyediakan filter kelompok kerja, pencarian nama/nomor, sorting server-side, pembuatan lead, pencatatan aktivitas, penjadwalan follow-up, dan perubahan tahap dengan guard SPK/Lost.
- Branch Manager sengaja ditolak (403) dari route `/customers` karena role tersebut hanya menerima laporan agregat tersanitasi; endpoint agregat belum dibuat.
- Verifikasi Fase 2: Pint, PHPStan, `pnpm check`, `types:check`, production build lulus; Pest 131 tes (128 lulus, 3 skip karena Fortify nonaktif); layout 390/768/1440 diverifikasi melalui DOM tanpa overflow horizontal.

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

1. Push branch `codex/phase-2-customer-slice` dan buka pull request terhadap `main` untuk review vertical slice Fase 2.
2. Lanjutkan modul roadmap berikutnya setelah PR Fase 2 diterima, dengan mempertahankan matriks akses dan audit Fase 1 sebagai invariant.

## Larangan memory

- Jangan menaruh password, token, credential, `.env`, atau data pelanggan di sini.
- Jangan menyalin requirement lengkap dari PRD.
- Jangan mencatat keputusan baru tanpa memperbarui dokumen kanoniknya terlebih dahulu.
