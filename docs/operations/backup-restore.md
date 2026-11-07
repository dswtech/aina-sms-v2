# Runbook Backup dan Restore

## Tujuan

Memulihkan database PostgreSQL AINA SMS dengan data dan hak akses yang sesuai. Restore dilakukan ke database terpisah terlebih dahulu agar hasilnya dapat diperiksa sebelum perpindahan aplikasi.

## Persiapan operasional

Operator menetapkan target server, jadwal dan lokasi penyimpanan, enkripsi, retensi, serta pemilik backup. Product Owner dan IT menetapkan batas kehilangan data yang dapat diterima (RPO) dan target waktu pemulihan (RTO). Keputusan hosting dan kebutuhan production mengikuti [PRD](../agents/PRD.md#14-keputusan-terbuka).

Simpan backup di luar direktori publik dan di lokasi terpisah dari server aplikasi dengan akses terbatas. Simpan versi aplikasi, versi PostgreSQL, waktu backup dan checksum bersama catatan operasional. Simpan secret aplikasi melalui mekanisme pengelolaan secret yang disetujui.

## Backup

1. Verifikasi identitas server, database, versi PostgreSQL dan kewenangan operator. Gunakan autentikasi yang disediakan operator.
2. Gunakan client PostgreSQL yang kompatibel. Buat arsip custom dengan perintah berikut.

   ~~~text
   pg_dump -Fc -f <file-backup> <database-sumber>
   ~~~

3. Pastikan perintah selesai dengan exit code 0, ukuran file lebih dari nol, dan pembacaan daftar arsip berhasil.

   ~~~text
   pg_restore --list <file-backup>
   ~~~

4. Terapkan enkripsi dan salin ke penyimpanan backup sesuai kebijakan yang disetujui. Cocokkan checksum setelah penyalinan.
5. Jalankan drill restore berkala untuk memastikan arsip dapat dipulihkan.

## Restore ke target terpisah

1. Dapatkan otorisasi write untuk target restore. Periksa koneksi dan pastikan target merupakan database kosong yang terpisah dari database aktif.
2. Verifikasi checksum dan akses dekripsi backup. Siapkan role PostgreSQL, extension, secret aplikasi dan versi source yang sesuai dengan backup.
3. Jalankan perintah berikut. Hentikan proses jika exit code bukan 0.

   ~~~text
   pg_restore --exit-on-error --single-transaction -d <database-target-kosong> <file-backup>
   ~~~

4. Bandingkan isi tabel, jumlah record, relasi, audit dan sequence ID dengan catatan sumber. Periksa status migration dengan versi aplikasi yang sesuai backup. Migration tambahan membutuhkan rencana kompatibilitas dan otorisasi operator.
5. Lakukan login empat role dan cek dashboard, Pelanggan, Transaksi, halaman impor serta Analisis sesuai akses. Verifikasi akun yang tidak berwenang mendapat penolakan. Uji impor dan ekspor end-to-end pada lingkungan uji yang disetujui.
6. Catat waktu pemulihan dari awal penanganan insiden hingga aplikasi siap dipakai, termasuk persiapan, pengambilan backup, dekripsi, restore dan validasi.
7. Setelah hasil disetujui, operator mengalihkan aplikasi pada maintenance window dan memantau error. Rencana rollback mencatat versi aplikasi, koneksi database dan kompatibilitas schema. Latih rollback terpisah sebelum rollout production.

## Drill otomatis dengan data sintetis

Jalankan dari root repository dalam proses PowerShell baru.

~~~powershell
pwsh -NoProfile -File tests/Operations/run-backup-restore.ps1
~~~

Prasyarat berupa PHP 8.4 dengan pdo_pgsql, dependency proyek, build frontend yang tersedia, PowerShell 7, serta initdb, pg_ctl, createdb, pg_dump, pg_restore dan psql pada PATH. Gunakan versi client PostgreSQL yang sama dengan server drill.

Launcher membuat cluster PostgreSQL baru di direktori sementara pada port loopback acak. Database sumber dan target bernama aina_restore_source dan aina_restore_target. Autentikasi trust hanya digunakan pada cluster sintetis loopback sementara. Worker PHP memverifikasi environment testing, driver, host, username dan nama database sebelum bekerja.

Fixture memuat empat role, tim, assignment, pelanggan lintas dealer, transaksi Prospect/DO/Delivery, checklist DO, coaching dan audit. Arsip custom dipulihkan secara atomik ke database target kosong. Fingerprint SHA-256 seluruh baris tiap tabel dan nilai sequence dibandingkan sebelum smoke test. Login melalui kernel HTTP Laravel menguji akun hasil restore, kemudian halaman sesuai peran dan penolakan akses Branch Manager ke Pelanggan diperiksa. Worker gagal dengan exit code nonzero bila assertion gagal. Cluster dihentikan dan direktori sementara dibersihkan setelah proses selesai.

## Hasil drill lokal pada 7 November 2026

Baseline source 830b546, PostgreSQL 16.4 lokal dan PHP 8.4.13 pada Windows. Fixture memuat 5 akun, 4 pelanggan, 3 transaksi, 3 histori tahap, 3 komentar dan 1 catatan audit.

Arsip custom berukuran 111.734 byte. pg_dump memerlukan 198 ms dan pg_restore 405 ms pada percobaan yang lulus. Isi 29 tabel dan nilai seluruh sequence identik. Login dan halaman utama empat role lulus, termasuk penolakan akses Pelanggan untuk Branch Manager. Seluruh migration sudah tercatat diterapkan pada database hasil restore. Cluster dihentikan dan dibersihkan.

Angka durasi hanya mengukur perintah dump dan restore fixture kecil di mesin lokal. Kesiapan O03 tetap memerlukan drill pada hosting dan volume yang disetujui, penyimpanan backup terenkripsi, validasi pengambilan backup, impor/ekspor end-to-end, rollback deployment serta pengukuran terhadap RPO/RTO operasional.
