# Memory — Handoff Agent

| Item | Keterangan |
|---|---|
| Dokumen | Keadaan proyek dan handoff agent |
| Versi | v1.0 |
| Diperbarui | 28 Oktober 2026 |
| Status | Aktif |

Memory bukan sumber requirement. Bila isi memory bertentangan dengan PRD atau ADR, ikuti PRD/ADR dan perbaiki memory.

## Keadaan terverifikasi

- Repository belum berisi source aplikasi; hanya sumber diskusi dan paket dokumentasi agent.
- Produk adalah responsive web app internal untuk satu dealer dengan banyak tim.
- Hierarki: Admin → Branch Manager → Supervisor → Sales.
- Branch Manager membaca dashboard, forecast, dan laporan tanpa mengubah transaksi atau membaca coaching.
- MVP mencakup autentikasi, tim, lead pipeline, conversation/coaching, impor CSV, dashboard, dan weighted forecasting.
- UI referensi menggunakan filter rentang tanggal, tabel transaksi, status, pagination, serta dialog detail bertab.
- Implementasi referensi mempunyai kelemahan pada mobile; yang diambil adalah pola interaksi, bukan responsivitasnya.
- Tidak ada package yang telah dipasang dan tidak ada database yang telah dibuat atau diubah.

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

## Keputusan terbuka

| Keputusan | Pemutus | Dampak bila belum diputuskan |
|---|---|---|
| Nama produk final | Product Owner | Branding dan judul aplikasi tetap memakai nama kerja. |
| Bobot forecast per tahap | Product Owner + operasional dealer | Forecast produksi belum dapat diaktifkan dengan nilai final. |
| Penyedia email | Product Owner + IT | Undangan dan email notifikasi belum dapat dikirim di production. |
| Lingkungan deployment | Product Owner + IT | Target konfigurasi dan runbook production belum dapat ditulis. |

## Langkah berikutnya

1. Review dan setujui PRD serta ADR awal.
2. Minta persetujuan pengguna sebelum memasang package atau membuat starter project.
3. Setelah persetujuan, scaffold aplikasi berdasarkan ADR-001 tanpa menyentuh database shared.
4. Rancang database, kontrak server, wireframe per role, dan checklist pembangunan dari requirement PRD.

## Larangan memory

- Jangan menaruh password, token, credential, `.env`, atau data pelanggan di sini.
- Jangan menyalin requirement lengkap dari PRD.
- Jangan mencatat keputusan baru tanpa memperbarui dokumen kanoniknya terlebih dahulu.
