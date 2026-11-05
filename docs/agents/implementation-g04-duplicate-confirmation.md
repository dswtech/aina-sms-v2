# G04 — Konfirmasi duplikat sebelum penyimpanan

Kebutuhan kanonik: [PRD](PRD.md), terutama CRM-02/CRM-08 dan alur 6.4–6.5. Pengguna menyetujui pekerjaan G04 serta memilih menahan penyimpanan jika pelanggan berada di luar akses Sales, lalu mengarahkan ke SPV/Admin tanpa membuka identitas pelanggan.

## Rencana implementasi

1. Reproduksi dengan feature test gagal: submit nomor yang sama tidak boleh membuat Customer, assignment, transaksi atau histori sebelum konfirmasi.
2. Pertahankan endpoint `POST /customers` dan validasi Inertia. Saat duplikat terdeteksi, kembalikan error tanpa write dan props `duplicateLead` berisi nomor yang disubmit serta kandidat minimal (UUID publik/nama) sesuai akses terkini. Nol kandidat berarti arahkan ke SPV/Admin; jangan kirim identitas di luar cakupan atau dealer lain.
3. Konfirmasi eksplisit memakai `existing_customer_id` UUID publik pada submit ulang. Server memeriksa ulang nomor, dealer dan izin update; buat peluang Lead pada Customer terpilih tanpa mengubah identitas/assignment lama. Draft unit/sumber/estimasi/catatan dipertahankan, catatan peluang disimpan dalam histori transaksi baru. Banyak kandidat legacy boleh dipilih; tidak ada penggabungan atau deduplikasi data lama.
4. Serialisasikan pemeriksaan dan pembuatan pelanggan per dealer dengan row lock dalam transaksi. Jalur import memakai lock yang sama dan memeriksa ulang duplikat saat commit, termasuk sesama baris; preview lama tidak boleh melewati pemeriksaan. Tidak menambah migration/dependency atau menjalankan write bisnis.
5. Form memakai panel konfirmasi di dialog yang sama, nama kandidat dan aksi jelas untuk membuat transaksi baru, serta batal/kembali tanpa write. Tampilkan error form, status penyimpanan dan kegagalan request; blokir submit berulang. Perubahan nomor menyembunyikan kandidat lama; server tetap memeriksa ulang saat konfirmasi.
6. Verifikasi feature test akses lintas role/dealer, normalisasi nomor, stale assignment, kandidat forged, data legacy, repeat order dan import. Jalankan suite penuh, static checks, build dan regresi browser mobile/desktop dengan data sintetis serta mutasi diintersep. Perbarui matriks UAT dan memory dengan bukti aktual.

## Batas

Tidak membuat identitas terpisah untuk nomor yang sudah terdaftar. Transaksi baru pada identitas lama tetap diizinkan setelah konfirmasi dan otorisasi. Tidak mengubah alur penugasan atau memperluas izin Sales. Penutupan G04 teknis tidak berarti UAT manusia, concurrency PostgreSQL atau seluruh gerbang rilis sudah lulus.


## Hasil implementasi dan verifikasi

Branch `codex/g04-customer-duplicate-confirmation` memakai baseline `main`/`origin/main` `d7afd39` (dashboard terbaru/PR #36). Perubahan yang sempat ditahan dilindungi dengan stash terarah lalu diterapkan kembali tanpa konflik; grafik, ranking dan disclosure dashboard terbaru dipertahankan.

- Sepuluh feature test konfirmasi gagal sebelum implementasi: server lama tetap menyimpan identitas baru, mengabaikan kandidat existing dan tidak memeriksa konfirmasi. Dua tes import juga gagal sebelum perbaikan: nomor berulang sama-sama lolos preview dan preview stale tetap di-commit.
- `POST /customers` tetap menjadi endpoint simpan. Field opsional `existing_customer_id` adalah UUID publik untuk konfirmasi eksplisit, bukan izin bypass. Props `duplicateLead` hanya tersedia setelah warning, berisi nomor yang disubmit dan UUID/nama kandidat yang boleh dilihat pada request terkini. Payload tidak memuat detail kandidat tersembunyi. Form mempertahankan draft ketika warning, batal atau request gagal.
- Transaksi baru memakai penanggung jawab Customer existing dan timnya, mempertahankan identitas serta assignment, dan mencatat pelaku/catatan peluang dalam histori Lead. Penyimpanan manual/import memakai lock induk dealer yang sama; commit CSV mengecek kembali nomor dan me-rollback seluruh batch jika preview menjadi stale. Duplikat sesama CSV ditandai saat preview.
- Review independen menemukan perbedaan nomor dengan spasi antara TrimStrings server dan draft React. Regresi browser gagal sebelum koreksi, lalu perbandingan trimmed lulus. Inspeksi screenshot juga menemukan tombol kandidat dua baris terpotong oleh kontrol desktop ringkas; regresi geometri gagal sebelum memakai atribut `data-comfortable-controls` yang sudah ada pada proyek. Pemeriksaan ulang review tidak menemukan temuan actionable tersisa; detector desain mengembalikan nol temuan.
- Verifikasi akhir Pest: **234 tes, 231 lulus, 3 skip, 2.106 assertions** pada SQLite in-memory. Lima tes frontend (termasuk grafik terbaru), lint/format frontend serta skrip browser G04, TypeScript, Pint, PHPStan dan production build lulus.
- `tests/Browser/customer-duplicate.js` lulus **18 kombinasi** Sales/SPV/Admin × 390/768/1440 × terang/gelap, plus nomor dengan spasi, batal, kandidat inaccessible/stale, perubahan nomor dan HTTP/jaringan gagal. Sebanyak 61 submit diintersep, nol write bisnis dan nol error JavaScript. Screenshot mobile gelap, desktop terang serta kandidat inaccessible diperiksa langsung; screenshot desktop koreksi diperiksa ulang.
- Regresi browser dashboard terbaru lulus **28 kondisi**; target/role metrics lulus **42 kondisi**, tanpa mutasi/error JavaScript. Bukti lokal tersanitasi G04 berada di `.playwright-cli/g04-*.png` dan diabaikan Git.

Tidak memasang dependency, membaca/mengubah file environment, membuat atau menjalankan migration/seeder, menulis database bisnis, mengirim email maupun melakukan deduplikasi data lama. Browser memakai fixture sintetis dan aset aplikasi asli; persistensi/otorisasi diverifikasi feature test terpisah. UAT manusia, browser dengan login/data bisnis dan concurrency PostgreSQL multikoneksi belum dijalankan; gerbang G13 tetap terbuka. Backup stash lokal G04 dipertahankan sebagai residu aman selama handoff.
