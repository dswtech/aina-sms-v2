# Deployment VPS

Keputusan: [ADR 008](../agents/adr/ADR-008-vps-hosting.md). Tidak ada credential di dokumen ini; nilai secret hanya ada di `/var/www/aina/shared/.env` pada server.

## Komponen

| Bagian | Keterangan |
|---|---|
| OS | Ubuntu 26.04, 2 vCPU, 2 GB RAM, firewall ufw (22, 80, 443), fail2ban |
| Web | Nginx, vhost `deploy/vps/nginx.conf`, TLS dari Certbot |
| PHP | 8.5-FPM (repo Ubuntu) |
| Database | PostgreSQL lokal, role dan database `aina`, hanya 127.0.0.1 |
| Node | 24 dari nodejs.org (checksum diverifikasi), pnpm via corepack |
| Proses | `aina-queue.service`, `aina-scheduler.service` (user www-data) |
| Layout | `/var/www/aina/{releases,current,shared/.env,shared/storage}` |
| Backup | `/usr/local/sbin/aina-backup` via `/etc/cron.d/aina-backup` 02:17, retensi 14 hari, ke `/var/backups/aina` |

Setelah `certbot --nginx` berjalan, vhost aktif di `/etc/nginx/sites-available/aina` dikelola Certbot (blok 443 dan redirect ditambahkan) sehingga berbeda dari `deploy/vps/nginx.conf`, yang hanya templat awal HTTP. Port 443 juga harus dibuka di firewall/security group penyedia VPS, bukan hanya ufw.

## Deploy

Dari server sebagai user deploy:

~~~text
/var/www/aina/deploy.sh <tag-atau-sha>
~~~

Skrip meng-clone repository, memasang dependency production, membangun aset, menautkan `.env` dan storage dari `shared`, menjalankan `artisan optimize`, mengalihkan symlink `current`, lalu me-reload php-fpm dan me-restart worker. Skrip tidak menjalankan migration. Setelah mengubah `.env`, jalankan `php artisan optimize` di `current` dan restart kedua unit.

## Penyiapan awal yang diisi pemilik

1. Isi `APP_KEY` (salinan dari Vercel agar sesi dan data terenkripsi tetap valid), `MAIL_USERNAME`, `MAIL_PASSWORD` dan `MAIL_FROM_ADDRESS` langsung di server.
2. Migrasi data dari Neon dengan otorisasi eksplisit: `pg_dump -Fc` dari koneksi langsung Neon, `pg_restore` ke database `aina`, bandingkan jumlah baris, lalu `php artisan migrate:status`.
3. Aktifkan worker: `sudo systemctl enable --now aina-queue aina-scheduler`.
4. Uji dengan `curl --resolve aiia.toyotabandung.web.id:443:<IP>` sebelum DNS dipindah.
5. Cutover: turunkan TTL, ubah DNS di Exabytes ke IP VPS, jalankan `sudo certbot --nginx -d aiia.toyotabandung.web.id`, lalu `sudo certbot renew --dry-run`.

## Rollback

Kembalikan DNS ke Vercel selama Vercel masih dipertahankan; data yang ditulis di VPS sesudah cutover tidak ikut kembali. Untuk kode, arahkan `current` ke rilis sebelumnya di `releases` lalu restart worker.
