# Memory — Handoff Agent

| Item | Keterangan |
|---|---|
| Dokumen | Keadaan proyek dan handoff agent |
| Versi | v1.1 |
| Diperbarui | 29 Oktober 2026 |
| Status | Aktif |

Memory bukan sumber requirement. Bila isi memory bertentangan dengan PRD atau ADR, ikuti PRD/ADR dan perbaiki memory.

## Keadaan terverifikasi

- Repository belum berisi source aplikasi; hanya sumber diskusi dan paket dokumentasi agent.
- Produk adalah responsive web app internal untuk satu dealer dengan banyak tim.
- Hierarki: Admin → Branch Manager → Supervisor → Sales.
- Branch Manager membaca dashboard, forecast, dan laporan tanpa mengubah transaksi atau membaca coaching.
- MVP mencakup autentikasi, tim, Buku Pelanggan, lead pipeline, conversation/coaching, impor CSV, dashboard, weighted forecasting, serta Analisis Sumber dan Model.
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
- Customer dipisahkan dari transaksi; satu Customer dapat mempunyai beberapa peluang penjualan.
- “Buku Pelanggan Saya” menjadi phonebook kerja Sales dengan kontak terakhir, next follow-up, riwayat, dan aksi cepat.
- Data Customer merupakan aset dealer. Sales hanya menerima assignment; reassignment mempertahankan riwayat dan tidak ada bulk export atau sinkronisasi phonebook pribadi pada MVP.
- Menu Analisis menggunakan nama “Analisis”, bukan “Mapping”. Sumber dan Model masuk MVP; Area serta MSCP ditunda sampai data prasyarat tersedia.
- Roadmap kanonik pembangunan berada di [`roadmap.md`](roadmap.md), dimulai dari fondasi akses lalu Customer/pipeline sebelum coaching, forecast, dan analisis.
- Arah navigasi dan wireframe Fase 0 telah dipilih; keputusan kanonik berada di [`../design/aina-sms-navigation/direction-approved.md`](../design/aina-sms-navigation/direction-approved.md).

## Keputusan terbuka

| Keputusan | Pemutus | Dampak bila belum diputuskan |
|---|---|---|
| Nama produk final | Product Owner | Branding dan judul aplikasi tetap memakai nama kerja. |
| Bobot forecast per tahap | Product Owner + operasional dealer | Forecast produksi belum dapat diaktifkan dengan nilai final. |
| Penyedia email | Product Owner + IT | Undangan dan email notifikasi belum dapat dikirim di production. |
| Lingkungan deployment | Product Owner + IT | Target konfigurasi dan runbook production belum dapat ditulis. |

## Langkah berikutnya

1. Selesaikan perluasan serta review prototipe terpilih di [`../design/aina-sms-navigation/`](../design/aina-sms-navigation/) sebagai bagian gerbang Fase 0.
2. Minta persetujuan pengguna atas package sebelum membuat starter project.
3. Setelah persetujuan, mulai Fase 1 berdasarkan ADR-001 tanpa menjalankan write pada database non-test.
4. Setelah matriks akses lulus, kerjakan vertical slice Customer → assignment → transaksi → aktivitas → next follow-up.

## Larangan memory

- Jangan menaruh password, token, credential, `.env`, atau data pelanggan di sini.
- Jangan menyalin requirement lengkap dari PRD.
- Jangan mencatat keputusan baru tanpa memperbarui dokumen kanoniknya terlebih dahulu.
