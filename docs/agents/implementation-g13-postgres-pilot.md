# G13 — Verifikasi PostgreSQL dan profil pilot

Baseline `64be0a5` (PR #43), branch `codex/g13-postgres-verification`. Acuan [G13](uat-matrix.md#g13), [skenario O02](uat-matrix.md#o02) dan [target PRD](PRD.md#11-kebutuhan-non-fungsional).

Pengguna memperkirakan satu hingga dua Supervisor dengan maksimum 20 Sales per tim dan target 50 penjualan per tim per bulan. Profil pilot memakai dua tim, 40 Sales, dan 10.000 transaksi sintetis pada 12 bulan. Volume sintetis adalah skenario pengukuran. Setelah pilot, gunakan jumlah lead yang tercatat untuk memilih volume uji berikutnya. Profil kapasitas 100.000 tetap tersedia dan gerbang tersebut tetap terbuka.

## Menjalankan verifikasi

Jalankan `pwsh -NoProfile -File tests/Performance/run-postgres.ps1` dengan PHP 8.4, `pdo_pgsql`, dan binari PostgreSQL yang sudah tersedia. Launcher membuat cluster baru pada port loopback, menjalankan suite penuh, uji impor serentak dan benchmark pada tiga database terpisah, kemudian menghentikan serta membersihkan cluster. `-BenchmarkOnly` mengulang pengukuran saja. `-Profile capacity` memilih 100.000 transaksi. `-MemoryLimit 128M` dapat dipakai untuk reproduksi batas memori.

## Bukti integrasi dan concurrency

- PostgreSQL 16.4. Suite penuh mencatat 357 lulus, tiga skip, 3.381 assertions.
- Uji concurrency mencatat 13 assertions. Dua proses PHP memakai koneksi independen dan dikonfirmasi menunggu lock dealer di `pg_stat_activity`. Untuk batch yang sama, satu commit berhasil dan replay mendapat 422. Untuk dua batch dengan nomor yang sama, satu commit berhasil dan batch kedua mendapat error duplikat. Jumlah akhir pelanggan, assignment dan transaksi masing-masing dua, dengan dua batch selesai.

## Metode benchmark

Benchmark menjalankan request melalui kernel HTTP Laravel dengan header Inertia pada PostgreSQL lokal, satu request pada satu waktu. Untuk setiap jalur, dua request pemanasan dikeluarkan dan 30 sampel dipakai untuk percentile nearest-rank. Pembacaan diukur sebelum data tambahan dari operasi tulis. Impor memakai 100 baris per batch. Waktu SQL berasal dari event query Laravel. Waktu browser, jaringan, load paralel, dan cold start deployment berada di luar angka ini.

Percobaan 100.000 transaksi pada batas PHP 128 MiB berhenti karena kehabisan memori. Run 512 MiB untuk volume tersebut dihentikan saat cakupan dialihkan ke pilot. Profil pilot pada 128 MiB juga mencapai batas ketika request Analisis pertama berjalan setelah dashboard di proses tes yang sama. Hasil ini mencerminkan proses PHPUnit yang menjalankan banyak request dan belum menetapkan batas memori proses web di hosting pilot.

## Hasil profil pilot

Windows, Ryzen 7 8700F, PHP CLI 8.4.13 dengan batas 512 MiB, PostgreSQL 16.4 lokal. Database awal berisi 10.000 transaksi dan 18.572 kejadian tahap. Benchmark lulus 323 assertions dan puncak alokasi PHP sebesar 132 MiB untuk seluruh proses tes.

| Jalur | p50 (ms) | p95 (ms) | p95 waktu SQL (ms) | Maks. query |
|---|---:|---:|---:|---:|
| Dashboard Supervisor | 4.841,53 | 4.944,37 | 51,59 | 15 |
| Dashboard Branch Manager | 9.133,85 | 9.490,04 | 81,31 | 9 |
| Analisis Pencapaian Branch Manager | 216,98 | 252,92 | 12,08 | 3 |
| Daftar Pelanggan Sales | 38,18 | 48,64 | 28,90 | 33 |
| Buat lead Sales | 12,22 | 15,48 | 5,86 | 16 |
| Preview impor 100 baris | 151,94 | 161,34 | 61,52 | 203 |
| Commit impor 100 baris | 504,89 | 594,03 | 277,23 | 804 |

Dashboard melewati target PRD 3 detik pada kedua role. Selisih waktu respons dengan waktu SQL menunjukkan bahwa profiling berikutnya perlu berfokus pada pemuatan model dan agregasi di PHP, lalu mengulang benchmark yang sama. Analisis, daftar dan buat lead berada di bawah target 2 detik pada profil ini. Latensi impor merupakan baseline batch 100 baris. Data mentah tersimpan lokal di `.playwright-cli/g13-pilot-512.txt`.

G13 tetap terbuka untuk dashboard pada profil pilot, kapasitas 100.000, dan verifikasi pada konfigurasi hosting serta beban pilot. Pengukuran ini tidak mengubah runtime aplikasi atau target PRD.
