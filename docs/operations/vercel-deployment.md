# Deployment awal Vercel

## Status dan tujuan

Panduan ini menyiapkan rilis awal Laravel pada Vercel dengan Neon dan Gmail SMTP. Pilihan pengguna dicatat di [PRD bagian 14](../agents/PRD.md#14-keputusan-terbuka) dan [ADR 005](../agents/adr/ADR-005-vercel-neon-pilot.md). Jalankan setiap perintah pada target dan versi aplikasi yang sudah disetujui.

Project Vercel bernama aina-sms. Database aina-sms-db memakai paket Neon Free di Singapore dan sudah terhubung ke project. Integrasi menyediakan variabel koneksi sensitif untuk production/preview dan mengaktifkan cabang database untuk deployment preview. Metadata koneksi diverifikasi melalui nama variabel.

## Konfigurasi build

Dockerfile.vercel memasang dependency PHP production dari composer.lock dan membangun aset dari pnpm-lock.yaml. Build memerlukan PHP saat plugin Wayfinder berjalan. Runtime FrankenPHP melayani hanya public dan membaca environment dari Vercel.

Docker build context mengecualikan file environment, credential Composer, dependency lokal, database SQLite, log, storage, artefak tes dan metadata agent. Startup membuat direktori sementara lalu menjalankan proses yang diminta. Migration dan seeder merupakan langkah operator tersendiri.

Untuk uji undangan yang diotorisasi pada pilot preview, startup dapat memanggil app:invite-preview-admin ketika AINA_PREVIEW_INVITATION_ENABLED=true. Command menolak production, branch selain codex/vercel-pilot-deployment, serta deadline kedaluwarsa atau lebih dari 15 menit. AINA_PREVIEW_INVITATION_EXPIRES_AT berisi Unix timestamp; identitas operator memakai AINA_PREVIEW_ADMIN_DEALER/NAME/EMAIL/USERNAME pada server. Command memakai bootstrap yang sama dengan lock transaksi dan penolakan Admin/undangan aktif. Tidak ada migration, seeder, password atau token aktivasi pada startup/log. Matikan flag setelah satu pengamatan hasil; deadline membatasi deployment lama agar tidak mengirim ulang ketika undangan kedaluwarsa.

Pada 7 November 2026 operator melaporkan seluruh migration pada cabang preview Neon sudah diterapkan melalui koneksi langsung; tidak ada migration tertunda. Percobaan Gmail diganti dengan uji Brevo SMTP (smtp-relay.brevo.com:587, SMTP login dan SMTP key). Credential Brevo preview sudah disimpan pemilik dan redeploy dpl_B9X6xmTfwPxo4yroCv6qiAwRdw4n mencapai READY; halaman login terbuka. Credential production belum diganti. Pengiriman undangan dari server masih menunggu bukti runtime.

Percobaan server pada deployment dpl_HskhBN4Mms6y937gmxSbQ8CobHo4 mencapai READY dan halaman login terbuka, tetapi log bootstrap tidak mengonfirmasi pengiriman. Flag bootstrap sudah dimatikan untuk deployment berikutnya. Operator kemudian memberikan notifikasi Brevo bahwa IP yang tidak diotorisasi diblokir untuk SMTP keys; kode 525 pada uji lokal sesuai kondisi ini. Pembatasan IP Brevo perlu diselesaikan sebelum mencoba ulang. Vercel Hobby tidak menyediakan Static IP; pilihan mempertahankan allowlist dengan IP keluar tetap atau menonaktifkan pembatasan khusus SMTP diputuskan pemilik. Jangan mematikan kontrol keamanan tanpa persetujuan khusus. Lihat [Brevo IP security](https://help.brevo.com/hc/en-us/articles/5740111683858-Authorize-and-block-IP-addresses-for-API-and-SMTP-security) dan [Vercel Static IPs](https://vercel.com/docs/networking/static-ips).

Setelah persetujuan khusus pemilik, pemblokiran IP SMTP Brevo dinonaktifkan dan status Deactivated diverifikasi di UI. Percobaan ulang dpl_BVfpiZNjiVMsAjVR9vuwkqAqNLja READY, tetapi bootstrap mengembalikan Illuminate\Database\QueryException; belum ada pengiriman terkonfirmasi. Flag kembali dimatikan untuk deployment berikutnya. Diagnosis SQLSTATE tanpa query/credential ditambahkan untuk menelusuri target runtime. Pengirim yang dipilih adalah dhny.ws@gmail.com; penerima Admin tetap sesuai input operator, tidak disalin ke dokumentasi.

Build container pada Vercel dari commit 1e95dda mencapai READY pada deployment dpl_9PAcVzTFFzV2Y1n3c1ojMNBVepzS. Endpoint /up menampilkan Application up melalui HTTPS. Login, koneksi database runtime dan pengiriman email memerlukan secret serta penerapan schema berikutnya.

## Konfigurasi server

| Nama | Nilai atau tindakan operator |
|---|---|
| APP_ENV | production |
| APP_DEBUG | false |
| APP_URL | URL HTTPS environment yang sedang dipakai |
| APP_KEY | Secret enkripsi Laravel baru dan stabil yang disimpan di Vercel |
| DB_CONNECTION | pgsql |
| DATABASE_URL | Disediakan integrasi Neon |
| DB_SSLMODE | require |
| SESSION_DRIVER | database |
| SESSION_SECURE_COOKIE | true |
| CACHE_STORE | database |
| QUEUE_CONNECTION | database |
| LOG_CHANNEL | stderr |
| INERTIA_SSR_ENABLED | false untuk build client awal |
| TRUSTED_PROXIES | * hanya pada deployment yang seluruh aksesnya melalui ingress Vercel |
| MAIL_MAILER | smtp |
| MAIL_SCHEME | smtp |
| MAIL_HOST | smtp.gmail.com |
| MAIL_PORT | 587 |
| MAIL_TIMEOUT | 30 |
| MAIL_USERNAME | Gmail pengirim, dimasukkan pemilik ke environment server |
| MAIL_PASSWORD | Google App Password, dimasukkan pemilik ke environment server |
| MAIL_FROM_ADDRESS | Alamat pengirim yang diizinkan akun Gmail |
| MAIL_FROM_NAME | Nama pengirim yang disetujui |

Gunakan target environment dan cabang database yang sesuai. DB_URL bila diisi mengungguli DATABASE_URL. URL migration memakai koneksi langsung dari integrasi bila diperlukan provider. Secret disimpan sebagai variable sensitive. Catatan QA hanya mencatat keberadaan nama variable dan hasil pemeriksaan.

App Password dibuat oleh pemilik akun Google yang mengaktifkan verifikasi dua langkah. Pemilik memasukkan credential langsung di Vercel. Lakukan redeploy setelah perubahan environment agar instance memakai konfigurasi baru.

## Penerapan schema dan aktivasi Admin

1. Pastikan target merupakan database Neon yang disepakati dan periksa status migration. Buat backup jika target sudah berisi data.
2. Setelah otorisasi write, jalankan migration pada release yang sama dengan web. Catat hasil dan jalankan pemeriksaan status migration.
3. Setelah Gmail SMTP dan APP_URL siap, operator mengirim undangan pertama dengan command berikut.

   ~~~text
   php artisan app:invite-first-admin --dealer="<nama dealer>" --name="<nama pemilik>" --email="<email pemilik>" --username="<username>" --force
   ~~~

4. Command membatasi bootstrap ke keadaan tanpa Admin dan tanpa undangan Admin aktif. Token hanya disimpan sebagai hash dan dikirim lewat email. Pengguna membuka tautan sekali pakai dan menetapkan password sendiri.
5. Konfirmasi login Admin, kemudian gunakan alur undangan aplikasi untuk membuat role lain.
6. Coba akun empat role dengan data sintetis pada environment yang disepakati. Cocokkan dashboard, pelanggan, transaksi, target, Analisis dan impor sesuai kewenangan.

Migration inviter nullable mendukung undangan sistem pertama. Seeder development tetap kompatibel dan menggunakan inviter Admin seperti sebelumnya. Pertahankan migration additive saat rollback kode. Mengembalikan NOT NULL memerlukan penanganan record undangan sistem yang sudah ada dan otorisasi terpisah.

## Worker dan scheduler

Gunakan panduan [coaching dan notifikasi](coaching-notifications.md) untuk status intent, retries dan semantik pengiriman. Proses web, queue dan scheduler memakai versi aplikasi, secret, database serta cache lock yang sama.

Vercel Daemons menyediakan proses container kontinu pada production. Command daemon mengganti ENTRYPOINT dan CMD image, sehingga startup direktori Laravel harus ikut dipanggil. Rencana command untuk operator berupa berikut.

~~~text
/app/deploy/vercel/start.sh php artisan queue:work --sleep=3 --tries=3 --timeout=60
/app/deploy/vercel/start.sh php artisan schedule:work
~~~

Tentukan instance/region, kuota dan mekanisme restart sebelum mengaktifkan daemon. Timeout SMTP 30 detik berada di bawah timeout worker 60 detik dan retry_after database bawaan 90 detik. Ukur beban serta latensi email pada konfigurasi aktual. Preview memerlukan pengujian worker terkontrol tersendiri karena daemon Vercel pada dokumentasi yang diperiksa hanya berjalan di production.

## Pemantauan dan penanganan gangguan

- Periksa deployment/build log dan runtime stderr di Vercel. Catat ID deployment, waktu, jalur yang gagal dan ringkasan error tersanitasi.
- Pantau /up untuk bootstrap aplikasi. Tambahkan smoke login dan pembacaan data sintetis untuk membuktikan koneksi database, session dan scope.
- Pantau error 5xx, durasi request, koneksi dan kapasitas Neon, ukuran antrean, umur job tertua, failed jobs serta intent pending/queued yang melewati target.
- Operator memeriksa worker dan scheduler saat antrean meningkat. Gunakan identifier job/notifikasi untuk penelusuran. Lakukan retry terarah setelah penyebab pulih sesuai runbook notifikasi.
- Tetapkan pemilik alert, kanal, interval pemeriksaan dan ambang operasional melalui IT/PO. Catat insiden dari awal deteksi sampai pemulihan.
- Verifikasi backup dan pemulihan sesuai [runbook backup](backup-restore.md), termasuk file CSV privat bila penyimpanan tersebut sudah dipilih.

## Rilis dan rollback

Sebelum promotion, verifikasi commit, CI, build container, schema kompatibel, variabel environment, koneksi Neon, email sintetis dan akses empat role. Simpan deployment baik terakhir beserta hubungan versi schema dan konfigurasi.

Saat rollback Vercel, operator mengembalikan traffic ke deployment baik yang kompatibel. Periksa worker dan scheduler pada release tersebut karena daemon mengikuti production deployment. Lakukan smoke test dan amati log. Perubahan environment dan data database ditangani melalui rencana tersendiri. Pemulihan database mengikuti otorisasi dan runbook backup.

## Hal yang masih harus diverifikasi

APP_KEY dan Gmail App Password, migration database Neon, login/aktivasi Admin, storage privat persisten untuk CSV, worker/scheduler, alert, rollback deployment, uji provider email serta UAT manusia. Paket Free dan resource beta perlu dievaluasi terhadap beban pilot aktual.

## Referensi

- [Panduan Laravel Vercel](https://vercel.com/kb/guide/laravel-php-with-docker)
- [Konfigurasi container](https://vercel.com/docs/functions/runtimes/container)
- [Daemon Vercel](https://vercel.com/docs/daemons)
- [Konfigurasi Gmail SMTP](https://support.google.com/mail/answer/7104828)
- [Google App Password](https://support.google.com/mail/answer/185833)

## Verifikasi persiapan source

CI lokal lulus dengan 385 tes backend, tiga skip, 3.669 assertions dan tujuh tes frontend. Pada PostgreSQL test sementara, 31 tes/196 assertions lulus untuk migration, bootstrap Admin, aktivasi dan konfigurasi deployment. Cluster dihentikan dan dibersihkan. Review independen selesai. Build dan operasi pada Vercel/Neon mengikuti gerbang verifikasi di atas.

Build awal tersedia pada [preview](https://aina-ec42kp99n-dhny1.vercel.app/up). Nilai secret yang diperlukan sudah disiapkan nama variabelnya pada formulir Vercel untuk diisi pemilik. Simpan perubahan environment dan redeploy sebelum smoke test login.
