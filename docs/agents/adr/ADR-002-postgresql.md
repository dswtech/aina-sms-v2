# ADR-002 — Gunakan PostgreSQL sebagai database utama

| Item | Keterangan |
|---|---|
| Dokumen | ADR-002 — Database utama |
| Status | Berlaku |
| Ditetapkan | 28 Oktober 2026 |
| Rujukan | [`../PRD.md`](../PRD.md) |

## Keadaan

Produk menyimpan relasi dealer, tim, pengguna, lead, riwayat tahap, komentar, revisi komentar, target, dan data forecast. Dashboard dan laporan membutuhkan agregasi per waktu, tim, Sales, serta tahap pipeline. Pilihan database akan memengaruhi migration, query, deployment, dan strategi pengujian sehingga mahal dibalik setelah data produksi terkumpul.

## Keputusan

Gunakan PostgreSQL sebagai database utama. Gunakan constraint, foreign key, transaksi, dan index untuk menjaga integritas yang dapat ditegakkan di tingkat database. Test integrasi database harus memakai PostgreSQL test yang terisolasi ketika perilakunya bergantung pada fitur PostgreSQL.

## Ditolak — MySQL

MySQL dapat memenuhi kebutuhan dasar dan umum pada hosting Laravel, tetapi PostgreSQL dipilih karena kemampuan query dan agregasinya sesuai dengan arah reporting serta forecasting. Menjaga dua dialek sejak awal tidak memberi nilai pada MVP.

## Ditolak — SQLite sebagai database utama

SQLite baik untuk prototipe tunggal, tetapi perbedaan concurrency, constraint, dan perilaku query dapat menyembunyikan masalah yang baru muncul saat aplikasi dipakai banyak pengguna.

## Konsekuensi

- Deployment wajib menyediakan versi PostgreSQL yang didukung Laravel terpilih.
- Query dan migration hanya perlu mendukung PostgreSQL pada MVP.
- Unit test murni tidak memerlukan database; feature test database memakai lingkungan test terisolasi.
- Agent tidak boleh menjalankan migration atau write pada database non-test tanpa perintah eksplisit pengguna.
