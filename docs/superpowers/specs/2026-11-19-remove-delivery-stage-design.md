# Desain: Hapus tahap Delivery

Tanggal: 19 November 2026
Status: menunggu persetujuan

## Maksud dan alasan

Konfirmasi pengiriman unit bukan lingkup kerja pengguna saat ini. Tahap Delivery dihapus total dari pipeline: Lead → Prospect → Hot Prospect → SPK → DO, ditambah Lost. DO menjadi tahap akhir transaksi yang berhasil.

## Tujuan

- Tahap `delivery` tidak ada lagi di kode, data, tampilan, laporan, export, dokumen, maupun tes.
- Data lama tetap konsisten: transaksi yang sudah Delivery tetap terhitung sebagai DO, dengan bulan realisasi yang sama.
- Angka bulan yang sudah lewat tidak bisa berubah karena pembatalan DO.

## Bukan tujuan

- Tidak menggantinya dengan field "tanggal kirim" atau kalender delivery. Kalau dibutuhkan lagi, itu permintaan baru.
- Tidak mengubah aturan DO yang lain: checklist PO/DP/Unit, snapshot area dan pembiayaan, serta bulan realisasi.

## Anti-tujuan

- Halaman error karena ada nilai `delivery` yang tersisa di database.
- Realisasi bulan lalu bergeser diam-diam.

## Pendekatan yang dipertimbangkan

| Pendekatan                                                             | Untung                                      | Rugi                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------- |
| A. Pensiunkan dari tampilan (enum tetap, UI dan laporan disembunyikan) | Tidak ada migrasi production, mudah dibalik | Sisa "Delivery" di kode                                                |
| **B. Hapus total (dipilih)**                                           | Kode bersih, satu bahasa tahap              | Migrasi production yang tidak bisa dibalik; catatan waktu kirim hilang |

Pemilik memilih B.

## Keputusan

### 1. Migrasi data (satu migration, tidak bisa dibalik)

Urutan di dalam satu transaksi database:

1. `stage_histories`: hapus baris dengan `to_stage = 'delivery'`. Isinya hanya waktu dan pelaku konfirmasi. Baris dengan `from_stage = 'delivery'` tidak mungkin ada, karena Delivery tahap terkunci; migrasi tetap menghapusnya bila ditemukan.
2. `deal_transactions` dengan `current_stage = 'delivery'`: ubah ke `do` dan set `progress_at` ke `created_at` event DO yang aktif (baris `to_stage = 'do'` yang tidak dibalikkan, terbaru). `last_activity_at` tidak diubah.
3. `deal_comments.stage_at_creation = 'delivery'`: ubah ke `do`.
4. Follow-up `pending` pada transaksi yang `current_stage = 'do'`: ubah ke `cancelled` dengan `cancel_reason = 'Transaksi DO'`. Ini menyamakan data lama dengan aturan baru di poin 3.

`down()` sengaja tidak mengembalikan data; tulis komentar satu baris tentang itu.

Notifikasi in-app lama tidak perlu diubah karena teksnya sudah tersimpan saat dikirim. Email notifikasi komentar yang masih antre dengan tahap `delivery` bisa gagal saat dirender (`PipelineStage::from`). Pastikan antrean kosong saat deploy, atau ubah render email ke `tryFrom` dengan label cadangan. Builder bebas memilih; cara kedua lebih aman.

### 2. Enum dan aturan tahap

- Hapus `PipelineStage::Delivery`. `closedValues()` menjadi DO dan Lost.
- Hapus cabang Delivery di `DealTransaction::transitionTo`. Aturan "tahap selesai terkunci" berlaku penuh untuk DO dan Lost.
- Hapus `DealTransactionPolicy::confirmDelivery`, cabang otorisasinya di `CustomerController::updateStage`, `do_event_id required_if:to_stage,delivery` di `UpdateDealStageRequest`, serta `can_confirm_delivery` di `TransactionController` dan tipe TypeScript.

### 3. Follow-up dibatalkan saat DO

Di `transitionTo`, pembatalan otomatis follow-up `pending` berlaku untuk Lost dan DO. Alasannya `Transaksi Lost` atau `Transaksi DO`.

### 4. Batalkan DO hanya di bulan yang sama

`DealTransactionPolicy::cancelDo` menambah syarat: bulan `created_at` event DO aktif sama dengan bulan saat ini, keduanya di zona Asia/Jakarta. Pakai helper bulan Asia/Jakarta yang sudah ada di proyek (misalnya `ReportingPeriod`), jangan membuat helper baru.

- DO tanggal 31 Oktober tidak bisa dibatalkan pada 1 November. Ini disetujui pemilik.
- Transaksi bekas Delivery otomatis terkunci karena DO-nya ada di bulan lalu, kecuali DO dan Delivery-nya terjadi di bulan berjalan. Dalam kasus itu Admin masih bisa membatalkannya bulan ini, dan itu memang diinginkan.
- Tombol "Batalkan DO" mengikuti `can_cancel_do` yang sudah ada, jadi tombol hilang sendiri. Endpoint tetap ditolak lewat policy.
- PRD perlu menyebut aturan ini di PIP-07.

### 5. Tampilan dan laporan

Kolom atau baris Delivery dihapus dari:

- Transaksi (`pages/transactions/index.tsx`): aksi "Konfirmasi Delivery".
- Modal detail (`transaction-detail-modal.tsx`, `stage-form.tsx`): tombol dan mode `delivery`; `StageAction` tinggal `'cancel' | null`.
- `detail-properties.tsx`: `LOCKED_VEHICLE_STAGES` tanpa `delivery`. `TransactionController` (aturan kendaraan terkunci) juga menyesuaikan.
- Buku Pelanggan (`CustomerController` filter): `whereIn([do, delivery])` menjadi `where(current_stage, do)`.
- Dashboard: `PipelineChart` tanpa `delivery`; teks "DO atau Delivery" dan "Delivery mencatat ..." diubah.
- Analytics: kolom Delivery di tampilan dan export CSV (header Sumber dan Model) dihapus; `AnalyticsController` hanya menghitung SPK dan DO.
- Kinerja Tim (`TeamPerformance`, `team-performance.tsx`): hitungan `delivered_in_period` dihapus.
- Pencapaian Tahap (`StageAchievements::STAGES`): tanpa Delivery.
- `stage-badge.tsx`, `lib/transaction-detail.ts` (komentar), `module-status.tsx` ("Lead sampai DO atau Lost").
- `DevelopmentDemoSeeder`: 30 transaksi Delivery menjadi DO.

Perubahan export CSV mengubah jumlah kolom. Siapa pun yang mengolah file export lama di spreadsheet perlu tahu.

### 6. Dokumen

- ADR baru (`ADR-010`): Delivery dihapus dan DO hanya bisa dibatalkan di bulan yang sama. ADR lama tidak ditulis ulang.
- PRD: PIP-02, PIP-07, ANL-03, cerita pengguna nomor 6, ringkasan aturan tahap, dan baris "alur Lead sampai Delivery/Lost". Kalender delivery pasca-MVP tetap disebut sebagai kemungkinan masa depan.
- `knowledge.md` (hapus istilah Delivery), `memory.md`, `uat-matrix.md`.
- Panduan peran atau manual yang menyebut Konfirmasi Delivery, bila ada.

### 7. Tes

- Ubah atau hapus tes feature dan tes browser yang menyentuh Delivery (sekitar 20 tes feature dan 9 tes browser di `tests/Browser`).
- Tes baru:
    - Migrasi: Delivery menjadi DO, riwayat Delivery terhapus, `progress_at` sama dengan waktu event DO, komentar terkonversi, follow-up pending pada DO dibatalkan.
    - Follow-up pending dibatalkan saat DO.
    - Batalkan DO ditolak untuk DO bulan lalu (waktu Jakarta, termasuk batas 23.59 tanggal 31 dan 00.00 tanggal 1), dan diizinkan untuk DO bulan ini.

## Rilis

- Migration production mengubah data dan tidak bisa dibalik. Ambil backup sebelum deploy sesuai `docs/operations/backup-restore.md`. Sesuai aturan proyek, migration production hanya dijalankan dengan perintah eksplisit pemilik.
- Catat di catatan rilis: Delivery dihapus, export Analytics kehilangan satu kolom, dan Batalkan DO dibatasi ke bulan berjalan.

## Diserahkan ke builder

- Bentuk pesan error dan teks UI kecil.
- Apakah render email notifikasi memakai `tryFrom` atau cukup menunggu antrean kosong (lihat bagian 1).
- Urutan pengerjaan dan pembagian commit.
