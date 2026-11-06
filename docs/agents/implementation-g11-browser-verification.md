# G11 — Verifikasi browser terhadap server

Baseline `8c67ea6` (PR #42), branch `codex/g11-browser-verification`. Acuan [G11](uat-matrix.md#g11), [X02](uat-matrix.md#x02), dan [X03](uat-matrix.md#x03).

Jalankan `pnpm run build` lalu `pwsh -NoProfile -File tests/Browser/run-isolated.ps1` dengan PHP, PowerShell, Chrome, dan Playwright CLI yang tersedia lokal. Launcher membuat SQLite kosong di direktori temp, memverifikasi koneksi Laravel sebelum migrasi, memulai server loopback dengan port tersendiri, dan membersihkan sesi browser, proses PHP serta file database setelah selesai. Akun Sales dibuat dari factory test.

Pada Chrome dengan Playwright CLI 0.1.22, Sales berhasil login dan membuat lead melalui `POST /customers` (302). Tes memutus koneksi sebelum percobaan pertama, memeriksa pesan dan draft, menyambungkan kembali, lalu memastikan lead tampil setelah reload. Permintaan browser mengikuti jalur aplikasi normal. Daftar tanpa overflow dan fokus kembali setelah dialog dibuka dengan Enter dan ditutup dengan Escape pada 390×844, 768×360 dengan forced colors, dan 1440×900. Lint script browser, sintaks PHP, dan `composer ci:check` lulus. Pest 357 lulus dan tiga skip dengan 3.378 assertions. Tujuh tes frontend lulus.

Workflow GitHub Actions memasang `@playwright/cli@0.1.22` di direktori sementara runner setelah build dan pemeriksaan utama. Launcher memakai Chrome dan PowerShell bawaan Ubuntu 24.04, serta `pdo_sqlite` yang disiapkan oleh workflow. Regresi awal lulus pada PR #43.

G11 masih terbuka untuk state kegagalan, loading dan stale lintas blok, pengukuran posisi filter, zoom browser, pembaca layar nyata, serta waktu tugas dan UAT manusia. Bukti awal di atas hanya mencakup alur Sales yang diuji.

## Filter pelanggan mobile dan pemulihan Analisis

Branch `codex/g11-main-flow-recovery` memakai baseline `8eb1743` setelah PR #45. Pada Chrome 390×844, regresi awal gagal karena panel filter pelanggan selalu terbuka. Panel sekarang mulai terlipat pada mobile. Tes memeriksa pelanggan pertama terlihat pada layar awal, pencarian melalui Enter mencapai Laravel, dan query tetap ada ketika panel dilipat. Pada tablet dan desktop panel tetap mulai terbuka.

Tes Supervisor memakai laporan sintetis dengan periode tetap. Dua percobaan memutus jaringan dan mengembalikan 503 ketika filter periode dipakai. Tes menahan respons untuk memastikan laporan lama tetap tampil saat loading, lalu memeriksa pemberitahuan bahwa data yang tampil adalah data terakhir. Percobaan ulang memakai filter yang gagal dan mencapai Laravel. Respons sukses yang kosong menampilkan empty state, menghapus pemberitahuan, dan memindahkan fokus ke judul Analisis. Mengosongkan periode mempertahankan pilihan yang sudah dimuat. Kesalahan validasi meminta koreksi filter, sementara error autentikasi atau izin tetap mengikuti penanganan Inertia. Regresi fokus gagal sebelum perbaikan hasil review.

Kedua alur berjalan melalui launcher yang dipakai GitHub Actions. Build dan CI lokal lulus, termasuk 358 tes Pest lulus, tiga skip, 3.398 assertions, dan tujuh tes frontend. Regresi tambahan lulus untuk 21 kelompok aksesibilitas dan 12 kombinasi cetak. Simulasi kegagalan jaringan dan 503 dilakukan di browser pada fixture SQLite terisolasi. Verifikasi blok lain, zoom browser dan pembaca layar nyata masih terbuka.

## Pemulihan filter Transaksi

Branch `codex/g11-transaction-filter-recovery` berangkat dari `e8f4da7` setelah PR #46. Regresi Chrome 390×844 gagal pada baseline karena permintaan filter tidak mengumumkan loading. Saat filter dikirim, daftar Transaksi sekarang mengumumkan loading dan mempertahankan daftar yang sudah dimuat. Kegagalan jaringan dan respons 503 menandai data terakhir, mempertahankan draft serta URL filter aktif, dan menyediakan retry untuk query yang gagal termasuk tab. Retry berhasil mencapai Laravel, memperbarui hasil dan mengembalikan fokus keyboard ke judul.

Regresi juga mengirim rentang tanggal terbalik ke Laravel dan memeriksa error pada field, draft tanggal serta daftar lama tetap terlihat. Validasi meminta koreksi input. Review menemukan bahwa draft yang diedit setelah gagal bisa berbeda dari permintaan yang dikirim ulang. Regresi baru mereproduksi masalah itu. Sekarang jika draft berubah, pesan mengarahkan pengguna ke Terapkan dan tombol retry hanya tersedia ketika draft cocok lagi. Tes memakai launcher SQLite terisolasi yang sama dengan GitHub Actions.

Build produksi, launcher browser final, serta 21 kelompok regresi aksesibilitas lulus secara lokal. Regresi aksesibilitas memakai fixture sintetis dan menyadap aksi tulis. Status pagination, penyimpanan tahap Transaksi, dan pembaca layar nyata berada di luar skenario filter ini.

## Validasi dan penyimpanan tahap Transaksi

Baseline `d3b2e26` setelah PR #53. Pada Chrome 390×844, Supervisor membuka perubahan tahap dari daftar Transaksi dan mengirim SPK tanpa konfirmasi booking fee. Regresi awal gagal karena request Laravel memicu exception domain sebelum UI menerima pesan validasi.

Validasi request kini mensyaratkan konfirmasi booking fee untuk SPK. Tes fitur membuktikan input kosong atau `false` ditolak tanpa perubahan tahap atau tambahan histori. Tes browser memeriksa pesan validasi, pilihan tahap dan catatan yang tetap tersedia, serta tahap Lead yang tetap tampil. Setelah konfirmasi, retry mencapai transaksi yang sama dan tahap SPK tetap terlihat setelah reload.

Build produksi, lint regresi, empat skenario launcher browser dan `composer ci:check` lulus secara lokal. Pest mencatat 360 lulus, tiga skip dan 3.444 assertions. Browser memakai Laravel dengan SQLite sementara. Pemulihan setelah jaringan terputus saat penyimpanan tahap, pagination, zoom browser, pembaca layar nyata, dan UAT manusia masih terbuka.

## Pemulihan penyimpanan tahap saat offline

Baseline `f445af3` setelah PR #54. Regresi Chrome 390×844 memutus koneksi sebelum Supervisor mengirim SPK yang sudah dikonfirmasi. Baseline gagal karena formulir tidak menampilkan alert jaringan. Formulir kini mengumumkan gangguan, mempertahankan pilihan tahap, catatan dan centang booking fee, serta menonaktifkan Simpan dan Batal selama permintaan aktif. Setelah koneksi pulih, penyimpanan ulang manual mencapai transaksi yang sama dan SPK tetap terlihat setelah reload.

Build, lint regresi, empat skenario browser dan `composer ci:check` lulus lokal. Pest mencatat 360 lulus, tiga skip dan 3.443 assertions. Skenario memakai SQLite test dan memutus koneksi sebelum request terkirim. Respons yang hilang setelah server menyimpan, pagination, zoom, pembaca layar nyata dan UAT manusia masih terbuka.

## Pemulihan pagination Transaksi

Baseline `22d5c58` setelah PR #55. Fixture memuat 16 transaksi yang cocok dengan pencarian. Pada Chrome 390×844, baseline gagal mengumumkan loading saat halaman kedua diminta. Pagination sekarang memakai penanganan loading dan kegagalan yang sama dengan filter.

Regresi menahan permintaan halaman kedua lalu mengembalikan 503. Daftar dan URL halaman pertama tetap tampil. Coba lagi mencapai Laravel dengan nomor halaman, pencarian aktif dan tab yang sama, lalu mengganti isi daftar sambil mempertahankan draft pencarian yang belum diterapkan. Build, lint, lima skenario browser dan `composer ci:check` lulus lokal. Pest mencatat 360 lulus, tiga skip dan 3.443 assertions.

## Reflow pada viewport sempit

Baseline `945e0ae` setelah PR #56. Chrome menguji Supervisor pada 320×400 dan 720×450 CSS px. Dashboard, Pelanggan, Analisis dan Transaksi mencapai URL yang diharapkan dan tidak memiliki scroll horizontal pada dokumen. Form ubah tahap juga tidak memperlebar dokumen, dan tombol Simpan berada di dalam lebar viewport setelah digulir.

Build, lint regresi, enam skenario browser dan CI lokal lulus. Pest mencatat 360 lulus, tiga skip dan 3.441 assertions. Viewport diperkecil untuk menguji reflow. Zoom browser 200%, pembaca layar nyata dan UAT manusia masih terbuka.
