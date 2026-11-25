# ADR 012 — Transaksi ganda dihapus dengan soft delete

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 25 November 2026 |
| Mengubah | PIP-07: transaksi DO bulan berjalan dapat dihapus Admin dan Supervisor (PIP-09) |

## Konteks

Transaksi ganda atau salah input hanya dapat ditutup sebagai Lost, sehingga tetap terhitung di laporan. Menghapus baris di database ikut menghapus riwayat tahap dan komentar coaching lewat foreign key, padahal keduanya harus tetap ada (PIP-01, CVS-08).

## Keputusan

- `deal_transactions` mendapat `deleted_at` dan `DealTransaction` memakai `SoftDeletes`. Semua query lewat model itu atau `whereHas('dealTransaction')` otomatis melewati transaksi terhapus; query baru pada riwayat tahap wajib melalui salah satunya.
- Batasnya `created_at` di bulan Asia/Jakarta berjalan. Semua kejadian transaksi itu pasti berada di bulan yang sama, sehingga laporan bulan lampau tidak berubah.
- Follow-up tertunda dibatalkan dengan alasan `Transaksi dihapus`. Riwayat tahap, komentar, aktivitas, dan pelanggan tidak disentuh.
- Audit `transaction.deleted` pada pelanggan mencatat pelaku, alasan, dan isi transaksi sebelum dihapus.

## Alternatif yang ditolak

- **Hapus permanen.** Memusnahkan riwayat tahap dan komentar.
- **Alasan Lost baru "transaksi ganda".** Setiap laporan harus mengecualikannya sendiri; satu yang terlewat membuat angka berbeda.

## Konsekuensi

- Supervisor tidak dapat Batalkan DO, tetapi dapat menghapus transaksi DO bulan ini milik timnya dan mengurangi realisasinya. Pengamannya adalah alasan wajib dan audit.
- Aplikasi tidak menyediakan pemulihan. Operator dapat mengosongkan `deleted_at`; follow-up yang dibatalkan tidak ikut kembali.
- Kode ini membutuhkan kolom `deleted_at`. Migration dijalankan sebelum rilis kode. Rollback kode memunculkan kembali transaksi yang sudah dihapus.
