# G10 — Rencana verifikasi impor dan ekspor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Melengkapi bukti teknis [G10](uat-matrix.md#g10) dan memperbaiki celah yang direproduksi oleh regresi.

**Architecture:** Pertahankan preview/commit CSV Laravel dan ekspor Analisis agregat yang ada. PDF tetap melalui browser print. Tambahkan assertion terhadap ledger independen, bukan sekadar menyamakan dua respons dari implementasi yang sama.

**Tech Stack:** Laravel, Pest, SQLite test in-memory, Inertia/React, browser QA yang sudah tersedia.

**Spec:** [PRD bagian impor](PRD.md#76-csv-import-imp), [Analisis](PRD.md#710-analisis-penjualan-anl), [G10](uat-matrix.md#g10), serta ADR arsitektur/database/platform pada manifest.

**Status:** Rencana disetujui dan implementasi diverifikasi. Branch `codex/g10-import-export-verification`, baseline `264d9d6` (PR #41 merged). Tes awal `php vendor/bin/pest tests/Feature/ImportTest.php tests/Feature/AnalyticsTest.php --compact`: 7 lulus, 93 assertions.

## Batas dan pendekatan

- Rekomendasi: perluas tes endpoint yang ada, reproduksi bug sebelum perbaikan, lalu verifikasi cetak nyata dengan aset aplikasi dan data sintetis. Ini mempertahankan alur pengguna serta dependency saat ini.
- Alternatif renderer PDF server memerlukan evaluasi dependency dan kontrak baru. Tidak diperlukan untuk memeriksa mekanisme Save as PDF yang sudah ada; pertimbangkan terpisah jika hasil cetak tidak memenuhi penerimaan operasional.
- Tanpa dependency baru, pembacaan/perubahan `.env`, migration atau write database bisnis. Write hanya pada database test terisolasi; unggahan test memakai filesystem fake.
- Test tidak membuktikan concurrency PostgreSQL, benchmark volume, UAT manusia, penerimaan hasil cetak oleh operasional atau kesiapan production. Gerbang tersebut tetap terpisah.
- Jalankan sendiri dalam sesi ini. Simpan bukti dan batas cakupan sebelum commit Conventional Commits dan PR non-default; jangan merge otomatis.

## Fokus review

1. Akses berganti antara preview dan commit: tim/Sales nonaktif, perpindahan tim, role membership dan dealer harus diperiksa kembali.
2. Sesi berisi preview aktor sebelumnya atau batch lain: jangan mengirim data pelanggan kepada aktor yang tidak berhak.
3. Kesalahan pada baris kedua setelah baris pertama ditulis: seluruh Customer, assignment, transaksi, audit dan status batch harus rollback.
4. CSV rusak atau detail melampaui batas schema: tampilkan error per baris tanpa kegagalan database atau konversi angka diam-diam.
5. Ekspor cetak panjang, kosong, dua mode dan dua tema: seluruh agregat terbaca, konteks periode/mode tersedia, kontak/coaching/drilldown tidak tercetak.

## Task 1 — Impor: akses, validasi dan commit atomik

**Files:** `tests/Feature/ImportTest.php`; jika regresi membuktikan masalah, `app/Http/Controllers/ImportController.php`. Periksa batas field pada migration dan form manual sebelum menetapkan assertion.

**Interfaces:** Route `imports.index`, `imports.template`, `imports.preview`, `imports.commit`; session `import_preview`; model `CsvImportBatch`. Tidak menambah endpoint.

- [x] Tambahkan tes Supervisor berhasil mengimpor ke tim aktif sendiri; penolakan guest/Sales/BM serta commit batch aktor/dealer asing, batch non-preview, sesi hilang/tidak cocok. Assert nol mutasi bisnis untuk penolakan.
- [x] Uji template lengkap dengan parsing CSV; header/contoh sesuai kontrak impor dan istilah form. Preview memuat nomor baris/error tepat, menolak field invalid dan duplikat ternormalisasi dalam file, tanpa Customer/transaksi/assignment baru.
- [x] Uji file disimpan privat; path/isi file dan preview aktor lain tidak dikirim pada index/preview, akses HTTP file tidak membuka unggahan. Verifikasi scope ringkasan batch sesuai kewenangan tanpa mengarang hak produk baru.
- [x] Uji commit setelah Sales dinonaktifkan, membership berakhir, tim nonaktif atau cakupan berubah. Assert error dapat dipahami, tidak ada partial write, preview tetap dapat diperiksa atau diunggah ulang.
- [x] Uji rollback pada kegagalan pertengahan batch, unggah ulang file terkoreksi, serta submit ulang batch selesai dengan sesi lama. Assert jumlah Customer, transaksi, assignment, audit, ringkasan batch dan pembersihan sesi yang tepat.
- [x] Jalankan tes sebelum mengubah source. Catat failure yang mereproduksi bug, gunakan `systematic-debugging`, lalu perbaiki akar masalah sekecil mungkin. Tes cakupan yang langsung lulus menjadi bukti perilaku existing, bukan klaim siklus red/green.
- [x] Jalankan `php vendor/bin/pest tests/Feature/ImportTest.php --compact` dan suite akses/import terkait; seluruhnya harus lulus.

## Task 2 — Ekspor CSV dan PDF/print

**Files:** `tests/Feature/AnalyticsTest.php` atau test G10 terfokus; `tests/Browser/analytics-export.js` untuk regresi cetak yang mengikuti pola browser existing. Perubahan `AnalyticsController.php`/halaman Analisis hanya jika ada bug teruji.

**Interfaces:** `analytics.index` dan `analytics.csv` memakai periode Jakarta, mode Akuisisi/Pencapaian dan scope laporan yang sama. Dimensi/value memilih drilldown; agregat Sumber/Model tetap mencakup periode dan scope, sesuai perilaku existing.

- [x] Buat ledger sintetis eksplisit dua tim/dealer, beberapa sumber/model, kejadian tahap berulang dan batas bulan Jakarta. Untuk Admin/SPV/BM, parse CSV dan assert seluruh kolom, angka, porsi, conversion, urutan/kelengkapan kategori, filename serta periode/mode terhadap ledger.
- [x] Assert guest/Sales tidak dapat mengekspor dan tidak ada identitas/kontak/catatan/coaching atau transaksi dealer/tim asing di CSV. Uji data kosong dan label kategori dengan koma, tanda kutip, newline serta karakter pemicu formula spreadsheet; bila terbukti berbahaya, tambahkan regresi dan perlindungan sel teks.
- [x] Verifikasi browser print memakai aset aplikasi nyata dan props sintetis tersanitasi. Assert tombol memanggil print, media cetak hanya agregat, periode/mode benar, kedua tabel tersedia, aksi/filter/drilldown tersembunyi; data kosong/panjang, mode dan tema diperiksa.
- [x] Hasilkan PDF QA lokal melalui browser yang tersedia, periksa teks dan render halaman perwakilan untuk clipping, pemisahan halaman dan keterbacaan. Gunakan skill PDF bila menginspeksi artefak PDF. Jangan menganggap fixture browser sebagai bukti endpoint server atau UAT operasional.
- [x] Jika ada kegagalan, reproduksi lebih dahulu dan perbaiki minimum; jalankan ulang tes terdampak dan build bila aset berubah.

## Task 3 — Verifikasi penuh dan delivery

**Files:** dokumen ini, `uat-matrix.md`, `memory.md`, `README.md` manifest agent.

- [x] Jalankan `composer ci:check`, production build jika diperlukan untuk QA browser, serta lint/format script browser yang ditambah. Gunakan executable dependency lokal bila shim mencoba mengunduh; jangan memasang dependency.
- [x] Jalankan regresi browser ekspor dan impor yang terdampak. Catat jumlah skenario, error JS dan batas bukti; periksa screenshot/PDF perwakilan.
- [x] Review diff terhadap PRD dan fokus review di atas. Jalankan `git diff --check`; perbarui bukti matriks dan handoff dengan hasil aktual, tanpa menutup gerbang yang belum diuji.
- [ ] Setelah semua pemeriksaan relevan lulus, commit Conventional Commits dan buka PR ke `main`; laporkan link, verifikasi serta residu. Jangan commit bila tes gagal.

## Ledger verifikasi

- Impor. Preview memvalidasi pemilik batch dan membersihkan sesi yang tidak cocok. Supervisor melihat riwayat batch sendiri, sementara Admin melihat ringkasan dealer. Pemilihan tim mempertimbangkan dealer, status aktif dan role membership. Commit memeriksa ulang baris dalam transaksi dan menampilkan kegagalan per baris tanpa menyimpan sebagian batch.
- Ruling: Riwayat Supervisor dibatasi pada batch sendiri karena nama file bisa berisi identitas dan batch tidak menyimpan satu tim asal. Audit lintas batch tetap tersedia bagi Admin.
- Ruling: Hasil browser print menggunakan aturan warna dan lebar kolom khusus kertas. Renderer PDF mengikuti browser yang digunakan operator.
- Bukti impor/ekspor. 49 tes tambahan lulus dengan 566 assertions. Regresi merah mencakup preview lintas aktor, Sales atau membership berubah, detail baris tidak valid, jumlah kolom berbeda, spasi username Sales, label formula CSV dan kebocoran shell serta warna gelap saat cetak.
- Browser. 12 kombinasi ekspor dan enam kombinasi impor responsif lulus. Regresi impor juga memeriksa keyboard, loading, error dan empty state. Semua write browser diintersep. Tidak ada error JavaScript. Ekstraksi teks pada 10 PDF sintetis mengonfirmasi agregat tanpa drilldown atau identitas operator. Render perwakilan normal, kosong dan multipage diperiksa.
- CI akhir. `composer ci:check` lulus dengan tujuh tes frontend, lint/format, TypeScript, Pint, PHPStan, serta Pest 357 lulus dan tiga skip dari 360 tes dengan 3.379 assertions. Production build dan lint/format regresi browser lulus.
- Review. Reviewer independen tidak berjalan karena batas penggunaan model. Review mandiri menemukan dan menutup ketidakkonsistenan trim username Sales, lalu tes terkait dijalankan ulang.
- Batas bukti. Tes replay memakai permintaan berurutan, sementara concurrency PostgreSQL dan p95 tetap pada G13. UAT manusia dan penerimaan hasil cetak oleh operasional masih terbuka.
