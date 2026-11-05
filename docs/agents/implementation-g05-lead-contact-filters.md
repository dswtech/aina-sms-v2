# G05 — Lead, filter dan preferensi kontak

Sumber kebutuhan tetap [PRD](PRD.md), terutama CRM-01/06/15. Baseline `main` `86de38b` memuat G04/PR #37. Branch kerja: `codex/g05-lead-contact-filters`.

## Keputusan dan batas

- Pengguna memilih penolakan global seluruh kontak ditambah kanal pilihan WhatsApp/telepon/keduanya. Gunakan kolom `opt_out` dan `contact_channel_preference` yang sudah tersedia; tidak perlu migration/dependency.
- Pengguna menyetujui SPV/Admin wajib memilih Sales aktif dalam cakupan, sedangkan Sales pembuat otomatis menjadi penanggung jawab. Penulis Customer/histori tetap akun pembuat. Konfirmasi duplikat mempertahankan PIC pelanggan lama; pelanggan tanpa PIC Sales aktif diarahkan memperbarui penugasan terlebih dahulu.
- Estimasi bulan closing sudah tersedia sejak implementasi laporan; gunakan field tersebut sebagai estimasi pembelian, tanpa membuat data estimasi lain yang tumpang tindih.

## Implementasi

1. Filter transaksi menambahkan `date_from`, `date_to` (tanggal lead dibuat, inklusif menurut Asia/Jakarta) dan `source`. Terapkan di atas scope actor, gabungkan dengan filter lama, pertahankan query pada tab/pagination. Pilihan sumber hanya berasal dari transaksi yang boleh dilihat actor. Tanggal/rentang/source invalid ditolak server.
2. `PATCH /customers/{customer}/contact-preferences` memperbarui preferensi dan penolakan sesuai izin update Customer, memeriksa kembali setelah row lock, serta menyimpan audit sebelum/sesudah tanpa kontak/identitas sensitif di metadata. Nilai awal dapat diisi pada lead baru. Konfirmasi duplikat G04 tidak menimpa preferensi pelanggan lama.
3. Form detail pelanggan dapat mengubah preferensi. Seluruh aksi telepon/WhatsApp pada kartu, tabel dan footer mengikuti penolakan serta kanal pilihan. Riwayat tetap tersedia. Data legacy tanpa pilihan kanal mempertahankan kedua aksi bila tidak ada penolakan; status ini tidak dilabeli sebagai persetujuan eksplisit.

4. Pemilihan PIC memakai `sales_id` pada lead baru SPV/Admin. Request Sales melarang override PIC; server mengecek dealer, role, status aktif dan tim SPV setelah user lock. PIC baru menentukan assignment serta atribusi tim transaksi, sementara pelaku histori tetap pembuat. Tim nonaktif tidak menerima peluang baru. Tidak mengubah assignment pelanggan existing lewat konfirmasi duplikat.

## Verifikasi implementasi

- Sepuluh tes awal filter/consent gagal sebelum implementasi. Sembilan kasus PIC gagal sebelum perbaikan (satu kasus preservasi assignment existing sudah lulus). Regresi sumber `0` dan tim nonaktif juga gagal sebelum koreksi.
- Feature test memeriksa batas tanggal Jakarta, scope sumber, invalid payload, audit, penolakan akses, preferensi lead baru, preservasi consent/assignment duplikat, kewajiban memilih Sales, role/dealer/status/membership target, pelaku histori dan penolakan transaksi pelanggan existing tanpa PIC aktif.
- Pest: **258 tes, 255 lulus, 3 skip, 2.228 assertions**, memakai SQLite in-memory. Tujuh tes frontend, TypeScript, format/lint frontend beserta skrip browser baru, Pint, PHPStan dan production build lulus.
- Browser sintetis `tests/Browser/lead-contact-filters.js` lulus enam kombinasi 390/768/1440 × terang/gelap. Setiap kombinasi mencakup preferensi/refusal, filter tanggal/sumber dan input lead tiga role (18 submit lead). Ditambah dua skenario HTTP/jaringan gagal: draft tetap tersedia dan consent yang belum tersimpan tidak mengaktifkan aksi kontak. Total 32 request tulis diintersep, nol write bisnis/error JavaScript.
- Regresi duplikat G04 lulus 18 kombinasi plus whitespace, kandidat inaccessible/stale, batal, ganti nomor dan kegagalan request; 61 submit diintersep, nol write bisnis/error JavaScript. Fixture G04 kini memilih PIC untuk SPV/Admin sesuai kontrak baru.
- Screenshot lead SPV mobile gelap, preferensi pelanggan desktop terang serta filter mobile terang diperiksa langsung. Artefak lokal berada di `.playwright-cli/g05-*.png` dan diabaikan Git. Detector desain mengembalikan nol temuan; review independen tidak menemukan temuan actionable.

Audit aksesibilitas tambahan menangkap fixture lama yang belum mengikuti kontrak kanal, disclosure rincian dashboard serta editor target bulanan yang sudah merged. Fixture diselaraskan: nilai kanal valid `any`, membuka disclosure numerik untuk assertion tabel, kontrol filter saat ini, dan payload target atomik dengan alokasi. Audit ulang lulus **21 kelompok, nol gagal**, dengan 12 request mutasi diintersep. Fixture kini menghitung tiga baris rincian Sales, sementara entri grafik/kontributor mengikuti layout grafik yang sudah merged. Perubahan fixture direview independen tanpa temuan actionable.

Tidak ada migration, seeder, dependency baru atau write database bisnis. Browser memakai fixture sintetis serta aset aplikasi asli; persistensi/otorisasi dibuktikan feature test terpisah. UAT manusia, browser login/data bisnis, seluruh kombinasi filter/pagination, serta concurrency PostgreSQL multikoneksi belum dijalankan. G06/G07 dan gerbang operasional tetap terpisah.
