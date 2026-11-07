# Deployment awal Vercel

## Status dan tujuan

Panduan ini menyiapkan rilis awal Laravel pada Vercel dengan Neon dan Brevo SMTP (menggantikan percobaan Gmail). Pilihan pengguna dicatat di [PRD bagian 14](../agents/PRD.md#14-keputusan-terbuka) dan konteks hosting pada [ADR 005](../agents/adr/ADR-005-vercel-neon-pilot.md). Jalankan setiap perintah pada target dan versi aplikasi yang sudah disetujui.

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
| MAIL_HOST | smtp-relay.brevo.com |
| MAIL_PORT | 587 |
| MAIL_TIMEOUT | 30 |
| MAIL_USERNAME | SMTP login Brevo, dimasukkan pemilik ke environment server |
| MAIL_PASSWORD | SMTP key Brevo, dimasukkan pemilik ke environment server |
| MAIL_FROM_ADDRESS | Sender yang diverifikasi pada Brevo |
| MAIL_FROM_NAME | Nama pengirim yang disetujui |

Gunakan target environment dan cabang database yang sesuai. DB_URL bila diisi mengungguli URL integrasi. Runtime memilih DATABASE_URL_UNPOOLED sebelum DATABASE_URL karena transaksi PDO pada pooler Neon aktual gagal dengan SQLSTATE 25P02; bootstrap melalui koneksi langsung sudah berhasil mengirim undangan. URL migration juga memakai koneksi langsung. Ini konfigurasi pilot: pantau batas koneksi Neon saat menguji concurrency sebelum menaikkan beban. Secret disimpan sebagai variable sensitive. Catatan QA hanya mencatat keberadaan nama variable dan hasil pemeriksaan.

SMTP key dibuat oleh pemilik di Brevo, lalu dimasukkan langsung ke Vercel. Ini berbeda dari API key dan password akun Brevo. Lakukan redeploy setelah perubahan environment agar instance memakai konfigurasi baru.

## Penyiapan production yang diotorisasi

Pemilik mengotorisasi migration tanpa reset/seeder pada Neon production (main), diikuti undangan Admin melalui email. Akun dan password preview tidak disalin. Domain final adalah aiia.toyotabandung.web.id. DNS dikelola melalui Exabytes; pengguna menyatakan tidak ada layanan lain yang memakai domain. Zona baru mempertahankan A root yang terlihat sebelumnya dan menambahkan CNAME aiia sesuai target khusus project Vercel. Nameserver dipindahkan ke nilai yang ditampilkan zona Exabytes; Vercel sudah memverifikasi CNAME dan nameserver publik yang sesuai.

Command app:prepare-production hanya aktif jika AINA_PRODUCTION_SETUP_ENABLED=true, VERCEL_ENV=production, branch main, source commit sama dengan AINA_PRODUCTION_SETUP_COMMIT, dan deadline AINA_PRODUCTION_SETUP_EXPIRES_AT masih berlaku maksimal 15 menit. Koneksi wajib PostgreSQL langsung, dengan host dan database cocok PGHOST_UNPOOLED/PGDATABASE. APP_URL HTTPS wajib cocok AINA_PRODUCTION_DOMAIN. Identitas undangan berasal dari AINA_PRODUCTION_ADMIN_DEALER/NAME/EMAIL/USERNAME pada server.

Command mengambil session advisory lock pada koneksi langsung. Schema kosong (atau hanya ledger migration kosong) dapat dimigrasikan; schema existing dengan migration tertunda ditolak untuk backup dan review operator. Schema yang sudah lengkap boleh melewati migration. Bootstrap kemudian memakai command undangan yang sama, tanpa membuat password atau mencetak token. Matikan flag setelah hasil pertama diamati. Tidak ada reset, seeder atau migrasi tanpa otorisasi pada startup biasa.

Credential Brevo production telah diisi pemilik; setup masih dinonaktifkan sampai commit rilis, TLS domain dan persetujuan merge dipastikan. Rencana dan ledger berada di [rencana production](../superpowers/plans/2026-11-07-production-release.md).

## Penerapan schema dan aktivasi Admin

### Hasil undangan preview pada 7 November 2026

Commit 23b3369 pada deployment dpl_4BRKBKbMrRPQaMWdwZZnRKud8AuW berhasil mengirim undangan melalui Brevo pukul 19:02 WIB. Bootstrap memakai DATABASE_URL_UNPOOLED (atau POSTGRES_URL_NON_POOLING), setelah host, nama database dan pengguna dibandingkan dengan koneksi aplikasi agar tetap menunjuk target yang sama. Koneksi pooled sebelumnya gagal dengan SQLSTATE 25P02. Log server menyatakan accepted by SMTP; log Brevo menunjukkan satu email dengan event Sent dan Delivered. Brevo menampilkan alamat pengirim yang ditulis ulang ke domain brevosend.com. Ini belum membuktikan aktivasi, login pemilik atau penempatan pada inbox utama.

Flag bootstrap sudah dimatikan untuk deployment berikutnya. Pemilik membuka tautan email dan menetapkan password sendiri. Hindari deployment/alias tambahan sampai aktivasi dipastikan; jangan membuat atau mengirim ulang undangan yang masih aktif. Credential Brevo production, worker/scheduler dan gerbang lain tetap terpisah.

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

Monitoring dasar memakai workflow production-monitor pada main, dijadwalkan menit 7/22/37/52 setiap jam UTC dan dapat dijalankan manual dari tab Actions. Script deploy/vercel/monitor.mjs memeriksa HTTPS /up dan /login dengan timeout 30 detik, validasi TLS standar, tanpa mengikuti redirect, mengirim cookie/credential atau melakukan mutasi data bisnis. Middleware Laravel dapat membuat sesi anonim sementara untuk GET /login; monitor tidak menyimpan/menggunakan ulang cookie sesi. HTTP harus 200 dan memuat penanda halaman yang diharapkan. Path yang gagal dicoba sekali lagi setelah 10 detik. Kegagalan yang bertahan menghasilkan exit nonzero dan ringkasan path/status/kategori aman; body respons dan exception mentah tidak dipublikasikan pada repository publik.

Notifikasi memakai pengaturan GitHub Actions milik pengelola. Pada 8 November 2026 UI akun menunjukkan Email (Failed workflows only) sudah aktif; preferensi global tidak diubah. Ringkasan pemeriksaan ada pada Actions run. Pengiriman email kegagalan yang sebenarnya belum diuji; jangan mengklaim Delivered tanpa konfirmasi penerima. Memasang workflow pada main tidak menerbitkan release atau mengganti deployment aplikasi.

Jadwal GitHub bersifat best effort, dapat terlambat/dilewati ketika layanan sibuk, dan schedule repository publik dapat dinonaktifkan setelah 60 hari tanpa aktivitas; periksa status workflow berkala. Interval sekitar 15 menit ini bukan SLA uptime. /up menguji bootstrap, sedangkan /login menguji halaman masuk/session publik; keduanya bukan bukti login terautentikasi, semua query database, seluruh role, queue atau SMTP berfungsi. HTTP 500 pada route lain tetap memerlukan pemeriksaan log Vercel; workflow ini tidak menyalin log/secret ke GitHub. Kegagalan GitHub runner/setup sendiri juga dapat memicu notifikasi, sehingga bedakan dari kegagalan endpoint lewat step summary.

- Periksa deployment/build log dan runtime stderr di Vercel. Catat ID deployment, waktu, jalur yang gagal dan ringkasan error tersanitasi.
- Pantau /up untuk bootstrap aplikasi. Tambahkan smoke login dan pembacaan data sintetis untuk membuktikan koneksi database, session dan scope.
- Pantau error 5xx, durasi request, koneksi dan kapasitas Neon, ukuran antrean, umur job tertua, failed jobs serta intent pending/queued yang melewati target.
- Operator memeriksa worker dan scheduler saat antrean meningkat. Gunakan identifier job/notifikasi untuk penelusuran. Lakukan retry terarah setelah penyebab pulih sesuai runbook notifikasi.
- Tetapkan pemilik alert, kanal, interval pemeriksaan dan ambang operasional melalui IT/PO. Catat insiden dari awal deteksi sampai pemulihan.
- Verifikasi backup dan pemulihan sesuai [runbook backup](backup-restore.md), termasuk file CSV privat bila penyimpanan tersebut sudah dipilih.

## Rilis dan rollback

Pemicu rilis production mengikuti [ADR 006](../agents/adr/ADR-006-versioned-production-releases.md). Merge main menjalankan CI dan tidak memicu deployment Git Vercel setelah konfigurasi baru digabung. Preview branch tetap aktif. Di Vercel, Auto-Assign Custom Production Domains harus false; deployment current tetap melayani domain.

Persiapan satu kali: pemilik menyimpan Vercel token yang dibatasi ke tim deployment sebagai GitHub Actions Secret VERCEL_TOKEN (dapat memakai environment production). Jangan menaruh token pada chat, argumen command line atau file repository. Workflow tidak memerlukan salinan APP_KEY, koneksi Neon, atau credential Brevo. Secret belum terpasang sampai metadata GitHub menyatakan tersedia.

Untuk merilis, tunggu workflow tests pada push main untuk commit pilihan selesai sukses; buat GitHub Release dengan tag baru vMAJOR.MINOR.PATCH pada commit tersebut, isi catatan perubahan, lalu Publish sebagai stable release. Draft, prerelease atau push tag tanpa publikasi tidak mengubah production. Workflow production-release memeriksa commit/tag/CI sebelum menggunakan token, membangun SHA tersebut, menunggu READY dan promote eksplisit. Periksa Actions summary, deployment Vercel, health domain serta fungsi utama setelah rilis. Jangan memublikasikan release percobaan untuk sekadar menguji konfigurasi.

Tidak ada migration otomatis pada workflow ini. Terapkan perubahan schema hanya melalui rencana kompatibilitas, backup dan otorisasi operator yang terpisah sebelum merilis kode yang membutuhkannya. Bootstrap Admin awal tetap nonaktif. Kegagalan API atau timeout memerlukan rekonsiliasi deployment sebelum retry; pengiriman request ulang tidak otomatis.

Sebelum promotion, verifikasi commit, CI, build container, schema kompatibel, variabel environment, koneksi Neon, email sintetis dan akses empat role. Simpan deployment baik terakhir beserta hubungan versi schema dan konfigurasi.

Saat rollback Vercel, operator mengembalikan traffic ke deployment baik yang kompatibel. Periksa worker dan scheduler pada release tersebut karena daemon mengikuti production deployment. Lakukan smoke test dan amati log. Perubahan environment dan data database ditangani melalui rencana tersendiri. Pemulihan database mengikuti otorisasi dan runbook backup.

## Hal yang masih harus diverifikasi

Preview: pemilik sudah mengonfirmasi aktivasi/login Admin berhasil sesudah koneksi langsung diterapkan. Production: migration dan undangan menunggu rilis yang diotorisasi, lalu aktivasi/login perlu dikonfirmasi pemilik. Storage privat persisten untuk CSV, worker/scheduler, alert, rollback deployment, pengukuran beban aktual dan UAT manusia tetap gerbang terpisah. Paket Free dan resource beta perlu dievaluasi terhadap beban pilot aktual.

## Referensi

- [Panduan Laravel Vercel](https://vercel.com/kb/guide/laravel-php-with-docker)
- [Konfigurasi container](https://vercel.com/docs/functions/runtimes/container)
- [Daemon Vercel](https://vercel.com/docs/daemons)
- [Konfigurasi Gmail SMTP](https://support.google.com/mail/answer/7104828)
- [Google App Password](https://support.google.com/mail/answer/185833)

## Verifikasi persiapan source

CI lokal lulus dengan 385 tes backend, tiga skip, 3.669 assertions dan tujuh tes frontend. Pada PostgreSQL test sementara, 31 tes/196 assertions lulus untuk migration, bootstrap Admin, aktivasi dan konfigurasi deployment. Cluster dihentikan dan dibersihkan. Review independen selesai. Build dan operasi pada Vercel/Neon mengikuti gerbang verifikasi di atas.

Build awal tersedia pada [preview](https://aina-ec42kp99n-dhny1.vercel.app/up). Nilai secret yang diperlukan sudah disiapkan nama variabelnya pada formulir Vercel untuk diisi pemilik. Simpan perubahan environment dan redeploy sebelum smoke test login.
