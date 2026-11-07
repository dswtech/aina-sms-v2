# ADR 005 Deploy awal pada Vercel dan Neon

| Item | Keterangan |
|---|---|
| Status | Dipilih pengguna untuk deployment awal |
| Tanggal | 7 November 2026 |
| Rujukan | [PRD bagian 14](../PRD.md#14-keputusan-terbuka) |

## Keadaan

Pengguna memilih Vercel untuk deployment awal, Neon baru sebagai PostgreSQL, dan SMTP Gmail pribadi untuk email awal. Aplikasi memakai Laravel dan Inertia dalam satu repository sesuai ADR 001 serta PostgreSQL sesuai ADR 002.

## Keputusan

Web Laravel dikemas sebagai container PHP 8.4 dan FrankenPHP melalui Dockerfile.vercel. Frontend dibangun dari lockfile menggunakan Node 24 dan pnpm yang dinyatakan proyek. Wayfinder dijalankan pada build yang mempunyai PHP serta dependency Laravel. Runtime hanya mengekspos direktori public.

Neon menjadi penyimpanan database bersama. Session, cache lock dan antrean memakai database. Cabang database preview dipisahkan melalui integrasi Neon. Secret disimpan di environment server Vercel. Konfigurasi database menerima DB_URL eksplisit atau DATABASE_URL dari integrasi Neon.

Pengirim awal memakai Gmail SMTP dengan STARTTLS dan App Password dari pemilik akun. Aktivasi Admin pertama dilakukan melalui undangan email sekali pakai. Pemilik menetapkan password melalui halaman aktivasi.

## Konsekuensi dan gerbang

Container dan daemon Vercel merupakan layanan beta pada dokumentasi yang diperiksa. Worker queue dan scheduler memerlukan proses terkelola tersendiri agar recovery email setiap menit tetap berjalan. Pemakaian resource mengikuti kuota akun.

Filesystem container merupakan tempat sementara. Arsip CSV yang saat ini disimpan pada disk local membutuhkan penyimpanan privat persisten sebelum dipakai untuk data operasional. Proses commit impor memakai preview server pada session database.

Deployment awal memerlukan verifikasi build container, koneksi PostgreSQL, penerapan migration yang diotorisasi, konfigurasi secret dan pengiriman email sintetis. Pengaktifan untuk pengguna dealer mengikuti gerbang UAT dan operasional pada roadmap.

## Sumber

- [Container Laravel Vercel](https://vercel.com/kb/guide/laravel-php-with-docker)
- [Container runtime](https://vercel.com/docs/functions/runtimes/container)
- [Daemon Vercel](https://vercel.com/docs/daemons)
- [Gmail SMTP](https://support.google.com/mail/answer/7104828)
- [Google App Password](https://support.google.com/mail/answer/185833)
