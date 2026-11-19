# ADR 010 — Tahap Delivery dihapus

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 19 November 2026 |
| Mengubah | PIP-02 dan PIP-07: DO menjadi tahap akhir transaksi yang berhasil |

## Konteks

Konfirmasi pengiriman unit bukan lingkup kerja pengguna saat ini. Tahap Delivery hanya menambah satu klik setelah DO, tanpa memengaruhi realisasi. Tahap ini juga menjadi satu-satunya hal yang mengunci pembatalan DO.

## Keputusan

- Pipeline menjadi Lead, Prospect, Hot Prospect, SPK, DO, dan Lost. `PipelineStage::Delivery` dihapus dari kode, laporan, export, dan tampilan.
- Migration `2026_11_20_100000_remove_delivery_stage` (tidak bisa dibalik):
  - Transaksi `delivery` kembali menjadi `do`, dengan `progress_at` sama dengan waktu event DO aktif.
  - Riwayat dengan tahap `delivery` dihapus.
  - Komentar yang dibuat di tahap `delivery` ditandai `do`.
  - Follow-up tertunda pada transaksi DO dibatalkan dengan alasan `Transaksi DO`.
- Saat transaksi masuk DO, follow-up tertunda dibatalkan otomatis (`Transaksi DO`), sama seperti Lost.
- Admin hanya dapat membatalkan DO di bulan Asia/Jakarta yang sama dengan event DO aktif. DO bulan lalu terkunci, supaya realisasi bulan yang sudah ditutup tidak berubah.
- Nilai tahap lama di notifikasi yang masih antre dibaca lewat `PipelineStage::labelOf()`, sehingga tidak error.

## Konsekuensi

- Catatan waktu dan pelaku konfirmasi pengiriman hilang permanen. Kalender delivery pasca-MVP memerlukan desain dan data baru.
- Export CSV Analytics kehilangan kolom Delivery, sehingga jumlah kolomnya berubah.
- DO yang tercatat tanggal 31 tidak dapat dibatalkan pada tanggal 1. Koreksi seperti itu perlu dicatat di luar sistem atau lewat permintaan baru.
- Production memerlukan backup sebelum `migrate` (ADR 006).
