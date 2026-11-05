# ADR-004 — Rencana target bulanan dan alokasi tersimpan

| Item | Keterangan |
|---|---|
| Status | Berlaku |
| Ditetapkan | 5 November 2026 |
| Rujukan produk | [PRD](../PRD.md) |

## Keadaan

Target sebelumnya berupa angka tim dan Sales yang independen. Kebutuhan baru menghubungkan target management, markup SPV, benchmark tim, dan alokasi personal. Menghitung alokasi dari anggota terkini akan mengubah target historis saat Sales keluar atau pindah tim.

## Keputusan

- Pertahankan `team_targets.target_units` sebagai target management. Simpan markup, benchmark hasil perhitungan server, dan versi rencana pada record tim/bulan yang sama.
- Simpan alokasi dalam `team_target_allocations`, unik per rencana dan Sales. Relasi tim/periode mengikuti rencana tersimpan, bukan penempatan anggota terkini. Penambahan anggota tidak otomatis membuat alokasi.
- Gunakan decimal database empat angka di belakang koma. Kalkulasi dan validasi target memakai integer berskala 10.000 pada PHP dan JavaScript; persentase laporan hanya untuk tampilan. Benchmark dan pembagian rata dibulatkan ke atas pada presisi tersebut.
- Simpan seluruh rencana dan audit dalam satu transaksi. Kunci pengguna berurutan sebelum tim sebagai induk stabil, sesuai urutan administrasi penempatan; baca ulang keanggotaan setelah lock dan tolak versi yang tertinggal. Snapshot audit menyimpan nilai management, markup, benchmark, versi, serta alokasi sebelum/sesudah.
- Target lama tetap tersedia tanpa benchmark sampai SPV menyimpan rencana baru. Tidak ada backfill hubungan organisasi yang tidak mempunyai bukti. Target Sales lama tetap disimpan sebagai data legacy; alokasi baru menjadi acuan personal untuk periode yang telah diadopsi.
- Endpoint individual lama hanya melayani target legacy; tidak boleh mengubah target yang sudah masuk rencana terkelola.

## Alternatif

Menghitung ulang dari anggota aktif ditolak karena mengubah tanggung jawab historis. Menambahkan tim langsung ke target Sales lama ditolak karena relasi user/bulan lama tidak membuktikan tim asal, dan tidak memadai untuk alokasi pada dua tim setelah perpindahan.

## Konsekuensi

Laporan harus membedakan total alokasi tersimpan dari alokasi anggota aktif. Anggota keluar mempertahankan alokasi dan kontribusi historis; kekurangan kapasitas menjadi peringatan operasional. Nilai target bukan jumlah kendaraan pecahan yang sudah terjual: realisasi tetap dihitung dari Delivery utuh.

Migration tidak mengubah record target lama menjadi rencana baru. Rollback mempertahankan tipe decimal pada kolom target/audit lama agar nilai tidak terpotong. Migration dan seeder development memerlukan otorisasi pelaksanaan tersendiri pada database non-test.
