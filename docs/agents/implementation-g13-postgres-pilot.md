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

## Tuning dashboard pada profil pilot

Branch `codex/g13-dashboard-pilot-performance` berangkat dari `main` `ce8c125` setelah PR #44. Instrumentasi sementara pada tiga request per role menunjukkan dashboard Branch Manager menghabiskan sekitar 0,65–0,72 detik memuat transaksi dan riwayat, 1,68–1,89 detik untuk ringkasan tim, 1,51–1,70 detik untuk total, dan 3,33–3,76 detik untuk rincian Sales. Penghitungan stagnant menambah sekitar 0,70 detik. Instrumentasi tidak dipertahankan dalam source aplikasi.

Dashboard kini memilih kolom yang dibutuhkan, mengambil flag keberadaan riwayat dengan `EXISTS`, mengelompokkan transaksi menurut tim dan Sales, serta menghitung setiap ringkasan dalam satu lintasan. Kandidat closing dan stagnant dipakai ulang oleh daftar prioritas dengan izin operasional yang sama. Rumus, pembulatan, bobot, periode Jakarta, dan perlakuan Delivery tanpa riwayat mengikuti kontrak sebelumnya. Regresi baru menghitung Delivery berulang dan batas periode, serta gagal pada baseline karena empat model riwayat ikut dimuat.

Pengukuran ulang memakai mesin, profil 10.000 transaksi, batas PHP 512 MiB, dan 30 sampel terukur per jalur seperti baseline.

| Dashboard | p95 baseline | p95 setelah tuning | p95 waktu SQL setelah tuning |
|---|---:|---:|---:|
| Supervisor | 4.944 ms | 1.006 ms | 30 ms |
| Branch Manager | 9.490 ms | 1.349 ms | 39 ms |

Kedua role memenuhi target 3 detik pada benchmark lokal. Puncak alokasi proses benchmark turun dari 132 ke 92 MiB. Jalur pembanding berada di bawah 0,51 detik pada p95, termasuk commit impor 100 baris. Suite PostgreSQL lulus 358 tes dengan tiga skip dan 3.398 assertions. Uji impor serentak lulus 13 assertions dan benchmark lulus 323 assertions. Review independen tidak menemukan temuan actionable. Data mentah tersimpan lokal di `.playwright-cli/g13-dashboard-after.txt`.

## Hasil profil kapasitas 100.000 transaksi

Pada 6 November 2026, baseline `d578124` diuji dengan `pwsh -NoProfile -File tests/Performance/run-postgres.ps1 -Profile capacity -BenchmarkOnly`. Profil memuat 100.000 transaksi, 185.715 kejadian tahap, 10 tim, dan 50 Sales dalam satu dealer sintetis. Pengukuran memakai Windows, Ryzen 7 8700F, PHP CLI 8.4.13 dengan batas 512 MiB, dan PostgreSQL 16.4 pada cluster loopback terisolasi. Metode tetap 30 sampel terukur per jalur setelah dua pemanasan.

| Jalur | p50 (ms) | p95 (ms) | p95 waktu SQL (ms) | Maks. query |
|---|---:|---:|---:|---:|
| Dashboard Supervisor | 2.093,87 | 2.511,03 | 137,87 | 14 |
| Dashboard Branch Manager | 12.739,13 | 13.674,66 | 380,99 | 8 |
| Analisis Pencapaian Branch Manager | 2.259,60 | 2.424,62 | 93,33 | 3 |
| Daftar Pelanggan Sales | 150,50 | 183,35 | 164,42 | 33 |
| Buat lead Sales | 11,28 | 13,11 | 5,30 | 16 |
| Preview impor 100 baris | 149,18 | 169,95 | 65,74 | 203 |
| Commit impor 100 baris | 512,52 | 544,51 | 259,58 | 804 |

Benchmark lulus 323 assertions fungsional, dengan puncak alokasi proses PHP 418 MiB. Cluster sementara dihentikan dan dibersihkan. Dashboard Supervisor memenuhi target p95 3 detik. Dashboard Branch Manager melewati 3 detik, dan Analisis Pencapaian melewati target navigasi 2 detik. Selisih antara waktu respons dan waktu SQL mengarahkan profiling berikutnya ke pekerjaan PHP di kedua jalur, dimulai dari Dashboard Branch Manager.

Batas PHP 128 MiB belum diuji ulang. Sampel berasal dari satu proses pengujian dengan request berurutan. Validasi pada hosting dan beban pengguna pilot tetap terbuka.

## Profiling Branch Manager pada kapasitas 100.000

Baseline `eb91e3f` setelah PR #48. Instrumentasi sementara mengukur tiga request Dashboard Branch Manager dan tiga request Analisis Pencapaian November 2026 dengan fixture, mesin, dan batas 512 MiB yang sama dengan benchmark kapasitas. Angka per tahap adalah rentang waktu dinding dari tiga sampel. Gunakan benchmark kapasitas sebelumnya untuk p95.

| Jalur dan tahap | Rentang (detik) |
|---|---:|
| Dashboard — memuat transaksi dan Sales | 2,51–2,65 |
| Dashboard — mengelompokkan transaksi per tim dan Sales | 0,91–0,97 |
| Dashboard — merangkum Sales | 1,00–1,10 |
| Dashboard — menghitung transaksi stagnan | 6,56–6,76 |
| Analisis — memuat transaksi, histori tahap dan Sales | 0,56–0,61 |
| Analisis — menghitung tahap per Sumber | 0,56–0,57 |
| Analisis — menghitung tahap per Model | 0,50–0,57 |
| Analisis — membentuk payload drilldown | 0,44–0,50 |

Pada request ketiga, Dashboard memerlukan 12,69 detik dengan 0,33 detik waktu SQL. Analisis memerlukan 2,39 detik dengan 0,09 detik waktu SQL. Dashboard memanggil accessor stagnan per transaksi dan membentuk cutoff Jakarta untuk setiap transaksi aktif yang memiliki tanggal. Analisis memuat model histori, lalu memeriksa SPK, DO, dan Delivery lagi untuk masing-masing dimensi. Profiling mengisolasi biaya jalur tersebut sebelum optimasi.

Eksperimen kedua menjalankan kedua filter stagnan pada koleksi yang sama. Filter standar memerlukan 7,12–7,74 detik. Filter yang menghitung cutoff sekali sebelum loop memerlukan 5,19–5,34 detik dan menghasilkan urutan ID yang identik pada ketiga request. Penghematan di tahap ini sekitar 1,90–2,40 detik per request, dengan lebih dari lima detik tersisa untuk pemrosesan baris di PHP. Karena kedua filter dijalankan berurutan, hasil ini mengukur biaya tahap, bukan p95 endpoint setelah perubahan.

Langkah berikutnya adalah mengukur penghitungan stagnan melalui scope SQL yang sudah ada untuk Branch Manager dan menjaga kecocokan dengan batas hari Jakarta serta scope laporan. Setelah itu, ukur ulang biaya pemuatan transaksi dan agregasi Dashboard. Untuk Analisis, ukur dampak flag keberadaan histori SPK, DO, dan Delivery terhadap penghitungan kedua dimensi sambil menjaga semantik Akuisisi, Pencapaian, dan ekspor. Kedua run diagnostik lulus delapan assertions masing-masing pada PostgreSQL terisolasi. Instrumentasi dan percobaan dilepas dari source setelah pengukuran.

## Penghitungan stagnan Branch Manager di SQL

Baseline `1e51e4a` setelah PR #49. Branch Manager menghitung transaksi stagnan melalui scope laporan dan scope stagnan yang sudah ada. Regresi dashboard menguji dealer lain, transaksi tertutup dan tanpa tim, batas hari Jakarta, fallback ke tanggal pembuatan, serta pemakaian agregasi SQL. Regresi gagal sebelum perubahan pada pemeriksaan query dan lulus setelahnya.

Benchmark kapasitas diulang dengan `pwsh -NoProfile -File tests/Performance/run-postgres.ps1 -Profile capacity` pada PostgreSQL 16.4 lokal, PHP 8.4.13 dengan batas 512 MiB dan fixture 100.000 transaksi yang sama. Setiap jalur memakai 30 sampel setelah dua pemanasan.

| Jalur | p95 awal (detik) | p95 setelah perubahan (detik) |
|---|---:|---:|
| Dashboard Branch Manager | 13,67 | 6,82 |
| Dashboard Supervisor | 2,51 | 2,12 |
| Analisis Pencapaian Branch Manager | 2,42 | 2,72 |

Dashboard Branch Manager sekitar 50% lebih cepat pada p95 dan masih di atas target 3 detik. Waktu SQL p95 sebesar 0,42 detik dengan maksimum sembilan query. Pengukuran berikutnya berfokus pada pemuatan dan agregasi transaksi Dashboard. Analisis masih di atas target 2 detik. Puncak alokasi PHP untuk seluruh proses benchmark turun dari 418 ke 380 MiB. Pengukuran memakai request berurutan dan belum mencakup hosting atau beban pengguna pilot.

`composer ci:check` lulus dengan 359 tes Pest, tiga skip, 3.408 assertions dan tujuh tes frontend. Suite PostgreSQL terisolasi lulus 359 tes, tiga skip dan 3.409 assertions. Uji impor serentak lulus 13 assertions dan benchmark kapasitas lulus 323 assertions. Cluster sementara dibersihkan.
