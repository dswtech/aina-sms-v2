# ADR 008 Hosting production pada VPS

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 17 November 2026; cutover mengikuti runbook |
| Mengubah | Bagian hosting ADR 005 (Vercel, Neon) dan pemicu rilis ADR 006 setelah cutover |

## Keadaan

Production berjalan pada Vercel Hobby dan Neon Free. Kuota Hobby habis (lihat memory 15 November 2026), worker queue dan scheduler belum pernah aktif, dan penyimpanan CSV privat persisten belum ada.

## Keputusan

Pemilik memindahkan production ke satu VPS Ubuntu yang dikelola sendiri, dipasang langsung tanpa Docker: Nginx dengan Certbot, PHP-FPM, PostgreSQL lokal (hanya 127.0.0.1), Node untuk build aset, serta dua unit systemd untuk queue worker dan scheduler. Domain tetap aiia.toyotabandung.web.id; DNS tetap di Exabytes. Rilis dibangun dari commit di server oleh skrip deploy dan tidak menjalankan migration (batas ADR 006 tetap berlaku). Workflow production-release tetap dipicu hanya oleh GitHub Release stable (merge ke main tidak men-deploy); setelah verifikasi tag dan CI, workflow memanggil SSH ke VPS dengan key khusus yang dibatasi pada satu perintah yang hanya menerima SHA commit. Backup harian pg_dump disimpan di server.

Ubuntu 26.04 hanya menyediakan PHP 8.5 dan PPA ondrej belum mendukungnya, sehingga server memakai PHP 8.5. CI (tests.yml) disamakan ke PHP 8.5 pada 18 November 2026 agar suite tes berjalan pada versi production. Persyaratan composer ^8.4.1 tetap, jadi 8.4 masih diizinkan tetapi tidak lagi diuji.

## Konsekuensi

Pemilik bertanggung jawab atas patch OS, backup, pemantauan dan titik kegagalan tunggal. Salinan backup di luar server, RPO dan RTO belum ditetapkan. Akun Vercel diblokir sehingga Vercel tidak lagi menjadi jalur rollback; kode rilis Vercel dihapus dari workflow. Rollback kode dilakukan dengan mengarahkan `current` ke rilis sebelumnya. Setelah rilis v1.2.3 membuktikan jalur SSH, vercel.json, Dockerfile.vercel, .dockerignore dan skrip startup Vercel dihapus, dan skrip rilis dipindah dari deploy/vercel ke deploy/release.

Runbook: [vps-deployment.md](../../operations/vps-deployment.md).
