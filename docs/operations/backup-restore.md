# Runbook Backup dan Restore

## Tujuan

Dokumen ini menjelaskan langkah minimum untuk backup dan restore database aplikasi AINA SMS.

## Backup

1. Pastikan maintenance window atau traffic rendah.
2. Jalankan backup database sesuai engine:
   - PostgreSQL production: `pg_dump -Fc -f aina-sms-YYYYMMDD.dump aina_sms`
   - SQLite lokal/test: salin file database setelah aplikasi berhenti.
3. Simpan file backup di lokasi terpisah dari server aplikasi.
4. Catat versi aplikasi (`git rev-parse HEAD`) dan waktu backup.
5. Verifikasi ukuran file backup tidak nol dan dapat dibaca.

## Restore

1. Hentikan aplikasi atau alihkan traffic.
2. Pulihkan database dari backup:
   - PostgreSQL: `pg_restore -d aina_sms aina-sms-YYYYMMDD.dump`
3. Jalankan migrasi yang belum diterapkan:
   ```bash
   php artisan migrate --force
   ```
4. Bersihkan cache:
   ```bash
   php artisan optimize:clear
   ```
5. Jalankan smoke test:
   - login tiap role
   - dashboard
   - import CSV
   - analytics export

## Verifikasi pasca-restore

- Jumlah user, customer, dan transaksi sesuai backup.
- Role dan scope akses tetap benar.
- Tidak ada error 500 pada route utama.
- Log aplikasi tidak menunjukkan kegagalan database.

## Catatan keamanan

- Jangan simpan backup di repository.
- Jangan mengekspos file backup melalui web server.
- Batasi akses backup ke admin/infrastruktur.
- Uji restore secara berkala di environment non-production.
