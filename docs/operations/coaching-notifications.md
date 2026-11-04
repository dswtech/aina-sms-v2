# Runbook Coaching dan Notifikasi

## Cakupan G01

Penulisan dan koreksi komentar dibatasi ke Sales pemilik transaksi dan Supervisor tim yang berhak. Admin hanya membaca untuk audit; Branch Manager tidak memperoleh halaman coaching. Reply hanya satu tingkat, dengan parent pada transaksi yang sama. Stage snapshot berasal dari server saat komentar dibuat dan tidak berubah ketika tahap transaksi atau isi komentar berubah.

Notifikasi ditujukan ke Sales pemilik transaksi dan Supervisor aktif pada tim Sales tersebut, selain penulis. Admin, Branch Manager, Sales lain, tim/dealer asing dan akun nonaktif tidak menjadi penerima. Hak penerima diperiksa ulang saat job email berjalan. Halaman `/transactions/{transaction}/coaching` hanya mengirim transaksi dan conversation yang diotorisasi, tanpa payload Customer, sehingga tetap dapat dipakai pemilik transaksi resmi setelah assignment Customer berubah.

## Persiapan deployment

1. Jalankan pemeriksaan dan backup sesuai prosedur rilis yang disetujui. Perubahan schema adalah migration additive `2026_11_05_000000_add_stage_at_creation_to_deal_comments` untuk kolom nullable `stage_at_creation`.
2. Setelah mendapat otorisasi write pada target yang benar, operator menerapkan migration melalui mekanisme deployment. Pekerjaan G01 tidak menjalankan migration pada database development, staging atau production.
3. Tidak melakukan backfill tahap komentar lama: nilainya tetap null dan UI menampilkan “Tahap saat kirim belum tercatat”. Jangan mengisi dari tahap transaksi saat ini karena riwayat itu tidak diketahui.
4. Gunakan queue asynchronous yang persisten; konfigurasi Laravel bawaan menyediakan database queue dan tabel jobs/failed_jobs sudah berasal dari fondasi aplikasi. Worker harus memakai versi kode dan database yang sama. Mode sync/null tidak memberikan jaminan retry durable yang sama.
5. Jalankan worker terkelola, misalnya `php artisan queue:work --tries=3 --timeout=60`. Job memakai tiga percobaan dengan backoff 30 dan 120 detik; sesuaikan timeout transport/worker dan retry_after agar job tidak diproses bersamaan. Jadwal dan kapasitas worker tetap perlu pengukuran operasional.
6. Aktifkan Laravel scheduler melalui mekanisme hosting yang disetujui. `coaching:queue-emails` dijadwalkan setiap menit dengan withoutOverlapping; command ini memulihkan intent email pending, bukan memindai isi komentar.
7. Untuk rollback aplikasi, pertahankan kolom additive selama memungkinkan agar snapshot tidak hilang. Rollback schema memerlukan backup dan persetujuan terpisah. Tidak ada perintah deployment/worker/scheduler yang dijalankan otomatis oleh dokumen ini.

## Penyimpanan dan pemulihan email

Komentar dan notifikasi database metadata disimpan dalam satu transaksi. Notifikasi database menyimpan `email_status` sebagai intent pengiriman; body coaching tidak dimasukkan ke metadata atau payload queue. Setelah commit, action mencoba memasukkan job ke antrean. Jika enqueue gagal, intent tetap pending dan komentar/notifikasi in-app tidak dibatalkan.

| Status | Arti dan tindak lanjut |
|---|---|
| pending | Intent tersimpan, belum berhasil masuk queue. Scheduler/`php artisan coaching:queue-emails` mencoba kembali. |
| queued | Queue menerima job. Worker mengerjakan dan melakukan retry saat provider gagal. |
| sent | Channel SMTP selesai menyerahkan pesan; bukan bukti penerima production sudah membuka atau bahkan menerima di mailbox akhir. |
| cancelled | Penerima/record tidak lagi memenuhi syarat saat diproses; tidak dikirim. |
| failed | Percobaan worker habis. Periksa failed job dan warning berbasis identifier; setelah penyebab pulih, operator dapat menjalankan `php artisan queue:retry <failed-job-id>`. Job mengecek hak akses kembali dan tidak mengirim ulang intent berstatus sent/cancelled. |

Pemulihan pending mengunci baris intent dan mengubah status bersama proses enqueue; pemanggilan biasa berulang tidak menggandakan job. Pengiriman memiliki semantik at-least-once: crash setelah SMTP menerima pesan tetapi sebelum commit status sent masih dapat menghasilkan email duplikat pada retry. Jangan mengklaim exactly-once atau pencapaian SLA lima menit tanpa pengukuran O01.

Kegagalan enqueue dan kegagalan final dicatat hanya dengan identifier, tanpa credential atau body coaching. Queue/worker serta penyimpanan failed jobs tetap memerlukan kontrol akses dan monitoring. Jangan menghapus notifikasi database yang masih diperlukan sebagai intent pengiriman sebelum lifecycle/retensi disepakati.

## Development: Mailtrap Sandbox

Mailtrap Sandbox dipilih untuk development pada 5 November 2026; ini tidak menetapkan provider production. Credential hanya berada di `.env` lokal yang diabaikan Git. Tidak ada credential/token, account ID, inbox ID atau message ID yang ditulis di runbook ini.

Konfigurasi server memakai `MAIL_MAILER`, `MAIL_SCHEME`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD` dan identitas pengirim. Sandbox memakai host `sandbox.smtp.mailtrap.io`, port 2525 dan STARTTLS; pastikan `MAIL_URL` tidak menimpa konfigurasi tersebut. Jangan memakai variabel frontend atau fallback credential di source. Jika config cache aktif atau worker berumur panjang, muat ulang melalui prosedur lokal/rilis yang berwenang setelah perubahan konfigurasi.

Mailtrap CLI tersedia pada mesin development dan autentikasi API-nya terpisah dari credential SMTP. Gunakan konfigurasi CLI yang sudah diamankan; jangan menaruh token pada argumen command atau dokumentasi. Untuk memeriksa email sintetis milik pengujian:

```text
mailtrap accounts list
mailtrap sandboxes list --account-id <account-id>
mailtrap messages list --account-id <account-id> --sandbox-id <sandbox-id>
mailtrap messages source --account-id <account-id> --sandbox-id <sandbox-id> --id <test-message-id>
```

Pilih pesan berdasarkan subjek unik pengujian sebelum membaca source; jangan menyalin pesan lain atau credential ke bukti QA. Mengirim lewat CLI saja tidak membuktikan integrasi SMTP Laravel. Untuk verifikasi integrasi, kirim template sintetis dari Laravel ke Sandbox dan gunakan CLI untuk mengonfirmasi tangkapan, metadata tahap dan tautan coaching. Jangan membuat transaksi/pelanggan nyata untuk pengujian provider.

## Bukti verifikasi 5 November 2026

- Regresi backend baru mereproduksi delapan kegagalan awal; tes tambahan mereproduksi parent ID nol yang semula menjadi 500, intent hilang saat enqueue gagal, dan retry eksplisit yang semula terlewat.
- Suite G01 memeriksa role/scope, otorisasi sebelum validasi parent, reply invalid tanpa efek samping, stage snapshot immutable/legacy, Admin baca saja, penerima yang tepat, metadata tanpa body, mark-read milik penerima, pembukaan transaksi setelah reassignment Customer, perubahan akses sebelum delivery, boundary edit 299/300/301 detik, rollback, retry provider lewat worker database terisolasi, pemulihan enqueue serta replay sesudah selesai.
- `composer ci:check` lulus: 171 tes, 168 lulus, 3 skip, 1065 assertions; lint/format, TypeScript, Pint dan PHPStan lulus. Tiga skip tetap tes halaman 2FA dengan guard fitur yang tidak diaktifkan.
- Production build lulus. Regresi browser 17 kelompok lulus/0 gagal dengan fixture/intercept; G01 diuji pada 390/1440px untuk Sales dan Admin, termasuk reply, validasi error dan mode baca. Regresi lama tetap memeriksa 390/768/1440px. Screenshot Sales mobile/Admin desktop diperiksa; detector desain tidak menghasilkan temuan.
- Mailtrap: STARTTLS dan autentikasi SMTP berhasil; konfigurasi Laravel lokal diverifikasi tanpa menampilkan nilainya. Satu email sintetis dikirim lewat Laravel SMTP dengan template metadata coaching dan dikonfirmasi memakai Mailtrap CLI: tertangkap di Sandbox, tahap asal dan URL coaching benar. Tidak ada email ke mailbox penerima nyata. Pengujian SMTP ini tidak menjalankan lifecycle komentar/queue pada database bisnis; jalur tersebut diuji pada SQLite test terisolasi.
- Review independen menemukan dua masalah yang telah diperbaiki: tautan tidak boleh bergantung pada assignment Customer, dan enqueue gagal harus memiliki intent yang dapat dipulihkan. Pemeriksaan ulang tidak menemukan temuan actionable pada perbaikan tersebut.
- Migration development belum dijalankan; worker/scheduler development maupun production tidak diaktifkan oleh pekerjaan ini. Pengujian PostgreSQL/concurrency produksi, load test, seluruh kombinasi UI dan UAT manusia belum dijalankan. [Gerbang O01–O05](../agents/uat-matrix.md#gerbang-operasional-terpisah) tetap terbuka.
