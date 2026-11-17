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

## Deploy otomatis dari GitHub Release

Publikasi GitHub Release stable `vMAJOR.MINOR.PATCH` menjalankan workflow `production-release`: verifikasi tag dan CI main (`deploy/vercel/release.mjs verify`), SSH ke VPS, lalu `deploy/vps/ssh-deploy.sh` menjalankan `deploy.sh <sha>` di bawah `flock` (tidak ada dua deploy bersamaan), lalu `deploy/vercel/monitor.mjs` memeriksa `/up` dan `/login`. Merge ke main hanya menjalankan CI. Tanpa migration otomatis.

Key deploy adalah key ed25519 khusus di `authorized_keys` user deploy dengan opsi `restrict,command="/var/www/aina/ssh-deploy.sh"`; wrapper hanya menerima 40 karakter hex. Private key disimpan pemilik sebagai GitHub Secret `VPS_SSH_KEY`; host key VPS dipin di workflow. Untuk mengganti key: buat pasangan baru, ganti baris `aina-ci-deploy` di `authorized_keys`, perbarui secret. Salin `ssh-deploy.sh` ke `/var/www/aina/` bila skrip berubah.

## Penyiapan awal (fresh install, sudah dilakukan 17 November 2026)

1. Pemilik mengisi `MAIL_USERNAME`, `MAIL_PASSWORD` dan `MAIL_FROM_ADDRESS` di `/var/www/aina/shared/.env` (diedit langsung dengan `nano` karena `sudoedit` menolak folder yang dimiliki user). `APP_KEY` dibuat di server dengan `php artisan key:generate --force`.
2. `php artisan migrate --force` pada database `aina` yang kosong; tidak ada data dari Vercel/Neon.
3. `sudo systemctl enable --now aina-queue aina-scheduler`.
4. Admin pertama lewat `php artisan app:invite-first-admin`; pemilik menetapkan password sendiri dari email.
5. DNS: record `A aiia` ke IP VPS di Exabytes, lalu `sudo certbot --nginx -d aiia.toyotabandung.web.id`; port 80/443/22 harus dibuka juga di firewall Lighthouse instance (bukan hanya template).
6. SSH: `/etc/ssh/sshd_config.d/00-hardening.conf` mematikan login password dan root.

## Rollback

Arahkan `current` ke rilis sebelumnya di `releases` lalu restart worker.
