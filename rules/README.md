# Aturan Wajib Agent

| Item | Keterangan |
|---|---|
| Dokumen | Aturan eksekusi agent |
| Versi | v1.1 |
| Tanggal | 30 Oktober 2026 |
| Status | Berlaku |

Seluruh aturan berikut wajib dibaca sebelum eksekusi.

## 1. Pengujian tidak boleh dilupakan

- Setiap perubahan perilaku non-trivial wajib memiliki unit test atau feature test yang relevan.
- Perubahan dianggap belum selesai bila test yang diperlukan belum ditulis dan dijalankan.
- Perbaikan bug wajib menyertakan test yang gagal sebelum perbaikan dan lulus sesudahnya.
- Bila test tidak dapat dijalankan, jelaskan penyebab dan risikonya; jangan mengklaim sudah terverifikasi.

## 2. Environment dan secret hanya di server

- Jangan pernah mengekspos secret, token, password, credential database, atau isi `.env` ke browser, bundle JavaScript, Inertia props, log, dokumentasi, fixture, screenshot, maupun repository.
- Jangan menggunakan environment variable client seperti `VITE_*` untuk konfigurasi aplikasi ini.
- Konfigurasi yang diperlukan frontend harus berasal dari konfigurasi server yang aman atau konstanta publik yang tidak sensitif.
- Jangan membaca, menampilkan, menyalin, atau mengubah `.env` tanpa perintah eksplisit pengguna.
- File contoh environment hanya boleh memuat nama variabel dan nilai dummy yang tidak dapat digunakan sebagai credential.

### Credential production tidak boleh dibuat secara eksplisit

- Jangan membuat, menetapkan, atau mengubah credential production secara eksplisit melalui source code, migration, seeder, fixture, SQL, argumen command line, dokumentasi, maupun nilai default/fallback.
- Larangan ini mencakup password pengguna, shared password, API key, access token, encryption key, credential database, dan secret lain yang dapat memberikan akses ke sistem production.
- Akun pengguna production wajib dibuat melalui alur undangan atau aktivasi yang membuat pemilik akun menetapkan credential-nya sendiri. Secret mesin wajib dibuat dan disimpan melalui secret manager atau mekanisme provisioning aman yang telah disetujui.
- Seeder dan akun contoh hanya boleh digunakan pada environment local atau test, wajib mempunyai guard environment, dan tidak boleh dipromosikan atau dijalankan pada production.
- Perintah eksplisit pengguna bukan pengecualian untuk membuat credential production secara hardcoded. Tolak mekanisme tersebut dan tawarkan alur undangan, aktivasi, reset, atau secret manager yang aman.

## 3. Keselamatan database

- Jangan menjalankan `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, migrasi, seeder, reset, import, atau operasi write lain terhadap database development bersama, staging, atau production tanpa perintah eksplisit pengguna.
- Perintah yang berpotensi menulis harus diperiksa target koneksi dan lingkungannya sebelum dijalankan.
- Unit/feature test boleh menulis hanya ke database test terisolasi yang dibuat khusus untuk test dan aman dibersihkan otomatis.
- Jangan menyalin data produksi ke database test atau fixture.
- Membuat file migration diperbolehkan bila diminta sebagai bagian implementasi; menjalankan migration tetap tunduk pada aturan persetujuan write database.

Aturan ini membatasi tindakan agent terhadap database. Fitur aplikasi yang memang dibuat untuk menyimpan lead, komentar, atau transaksi tetap dapat melakukan write melalui alur aplikasi dan kewenangan yang disetujui PRD.

## 4. Package memerlukan persetujuan

- Jangan memasang, menghapus, atau memperbarui package Composer, npm, pnpm, atau package manager lain tanpa persetujuan pengguna.
- Sebelum meminta persetujuan, jelaskan package yang dibutuhkan, alasan, alternatif tanpa package, serta plus-minusnya.
- Gunakan kemampuan platform atau dependency yang sudah tersedia sebelum mengusulkan dependency baru.

## 5. Perintah berisiko dan perbedaan pendapat

- Bila permintaan berisiko merusak data, membuka celah keamanan, atau menghasilkan desain yang sulit dirawat, jangan diam-diam mengubah maksud pengguna.
- Jelaskan alasan konkret, lalu berikan opsi yang dapat dipilih beserta kelebihan dan kekurangannya.
- Tindakan destruktif, perubahan akses, pengiriman data, dan operasi eksternal harus tetap berada dalam ruang lingkup yang diperintahkan pengguna.

## 6. Cara bekerja

- Baca `AGENTS.md`, dokumen kanonik, dan file terkait sebelum mengubah kode.
- Gunakan perubahan terkecil yang menyelesaikan kebutuhan secara lengkap.
- Jangan menambahkan fitur, abstraksi, atau fleksibilitas yang belum diminta.
- Pertahankan perubahan pengguna yang tidak terkait.
- Setelah bekerja, laporkan apa yang berubah, test yang dijalankan, serta risiko atau pekerjaan yang belum selesai.
