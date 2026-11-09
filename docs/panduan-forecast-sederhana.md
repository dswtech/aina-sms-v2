# Forecast: fungsi dan cara membacanya

> Penjelasan singkat dengan bahasa sederhana, disusun 9 November 2026 atas pertanyaan pemilik. Angka pada contoh seluruhnya simulasi. Untuk rincian bobot, simulasi unit/gap dan cakupan role, lihat [panduan bobot forecast](panduan-bobot-forecast.md).

## Intinya

Forecast adalah tebakan terukur: kalau pipeline berjalan seperti biasanya, bulan ini kira-kira berapa unit yang jadi DO.

Bayangkan target bulan ini 20 unit dan sekarang sudah 8 unit DO. Pertanyaan SPV: apakah sisa waktunya cukup? Realisasi hanya menjawab "sudah berapa", tidak menjawab "akan sampai atau tidak". Forecast mengisi bagian itu.

## Cara kerjanya

Tidak semua calon pembeli akan jadi. Lead yang baru masuk peluangnya kecil, sedangkan transaksi yang sudah SPK hampir pasti jadi. Karena itu tiap transaksi aktif dihitung sebagian saja sesuai tahapnya.

| Tahap | Bobot baseline | Contoh unit | Hasil |
|---|---|---|---|
| Lead | 10% | 10 | 1,00 |
| Prospect | 25% | 8 | 2,00 |
| Hot Prospect | 50% | 4 | 2,00 |
| SPK | 75% | 3 | 2,25 |
| Jumlah berbobot | | | 7,25 |

Forecast = realisasi DO + jumlah berbobot. Pada contoh: 8 + 7,25 = 15,25 unit. Ini berarti "mungkin sekitar 15 unit", bukan janji.

Gap ke forecast = target dikurangi forecast, pada contoh 20 − 15,25 = 4,75. Artinya bulan ini masih kurang sekitar 5 unit dan perlu dikejar.

## Gunanya untuk SPV dan Branch Manager

- Mengetahui lebih awal kalau target berpotensi tidak tercapai, sebelum akhir bulan.
- Menentukan prioritas follow-up dan coaching: fokus ke Hot Prospect dan SPK yang paling dekat jadi, atau ke tim yang forecast-nya paling jauh dari target.
- Hanya transaksi dengan estimasi bulan closing di bulan itu yang dihitung. Transaksi tanpa estimasi closing tidak masuk, sehingga kelengkapan data memengaruhi hasil.

## Batasannya

- Forecast bukan janji. Bila tahap atau estimasi closing berubah, forecast ikut berubah.
- Akurasi bergantung pada bobot. Bobot 10/25/50/75% adalah baseline development (`config/forecast.php`, `approved` masih `false`) dan belum disetujui untuk production. Bila di dealer hanya 5% lead yang jadi, forecast akan terlalu optimistis.
- Forecast bulan yang sudah lewat tidak tersedia karena kondisi pipeline pada waktu itu tidak disimpan.

## Hubungan dengan menu Target

Target dan bobot adalah dua angka terpisah yang ditampilkan di tabel yang sama.

- Target adalah input manual SPV: target management, ditambah markup menjadi benchmark tim, lalu dialokasikan ke Sales (minimal total 100% dari benchmark). Target tidak memakai bobot.
- Bobot hanya memengaruhi kolom Forecast dan Gap ke forecast. Mengubah bobot tidak mengubah Target, Benchmark, atau Gap ke realisasi.

Pembahasan apakah halaman Target perlu menampilkan rincian forecast per tahap ditunda dan belum diputuskan.
