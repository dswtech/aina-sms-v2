# G03 — Rekonsiliasi Laporan dan Data Demo Development

Tanggal: 5 November 2026. Commit implementasi `8504ac0`; [PR #31](https://github.com/dswtech/aina-sms-v2/pull/31). Branch `codex/g03-reporting-reconciliation`, baseline `9e13957` (PR #30 merged).
Sumber keputusan: [PRD](PRD.md), [ADR PostgreSQL](adr/ADR-002-postgresql.md), [aturan proyek](../../rules/README.md).

## Tujuan dan perubahan

- Dashboard dan Analisis menggunakan batas bulan Jakarta yang sama: UTC awal inklusif sampai awal bulan berikutnya eksklusif. Bulan default juga Jakarta; input periode/mode/dimensi Analisis divalidasi untuk layar dan CSV.
- Scope laporan mengikuti dealer dan `team_id` transaksi, sehingga perpindahan Sales tidak memindahkan histori antar-tim. Izin operasional/coaching tetap menggunakan policy yang sudah ada; scope laporan tidak memberi izin tambahan.
- Akuisisi tetap kohort tanggal pembuatan, sedangkan Pencapaian memakai kejadian tahap unik per transaksi. Angka dua mode tidak dipaksa sama karena penyebutnya berbeda. Delivery Pencapaian direkonsiliasi dengan realisasi dashboard.
- Total target Sales per tim kini diseleksi berdasarkan `user_id` penerima. Eloquent `only()` sebelumnya memilih primary key record target meskipun koleksi sudah `keyBy(user_id)`, sehingga ringkasan dan baris tim bisa berbeda. Tes dan preview demo mereproduksi lalu memverifikasi perbaikannya.
- `public_id` kini ikut proyeksi query Analisis; ID drilldown sebelumnya null karena kolom itu tidak dipilih.
- Koneksi PostgreSQL aplikasi menetapkan timezone UTC, bukan mengikuti timezone server. Uji PostgreSQL mereproduksi pergeseran tujuh jam sebelum perbaikan. Tidak mengubah timezone global server atau menggeser timestamp historis.
- Query metadata notifikasi memakai JSON containment yang mendukung kolom teks JSON PostgreSQL dan SQLite, baik pada coaching, recovery antrean maupun seeder. Tidak diperlukan migration baru untuk perbaikan ini.

## Migration lokal yang diotorisasi

Pengguna memerintahkan migration dijalankan. Preflight memeriksa environment local, koneksi PostgreSQL loopback, identitas database cocok, dan bukan replica; nilai credential tidak dicetak dan `.env` tidak dibuka.

Dua migration tertunda dijalankan dalam batch 6: snapshot tahap komentar G01 dan target tim/estimasi closing G02. Pemeriksaan memastikan kedua tabel serta kedua kolom tersedia; jumlah pelanggan, transaksi, komentar dan history tidak berubah. Tidak menjalankan seeder akun, reset, migration fresh, worker, scheduler bisnis atau pengiriman email.

## Seeder development

`DevelopmentReportingSeeder` dapat dijalankan mandiri setelah demo dasar tersedia, dan dipanggil juga oleh `DevelopmentDemoSeeder`, termasuk ketika demo dasar sudah ada:

```powershell
php artisan db:seed --class=DevelopmentReportingSeeder
```

- Guard hanya environment local. Seeder tidak membuat akun atau credential, tidak mengubah production dan aman dijalankan ulang.
- Seleksi fixture memerlukan dealer/customer demo dan catatan event awal yang khas dari demo dasar. Komentar juga dibatasi template fixture; tim dibatasi nama tim kanonik seeder. Transaksi manual pada customer demo, komentar manual dan tim manual tidak ikut diisi.
- Data contoh mencakup target tim bulan sebelumnya/berjalan beserta audit; estimasi bulan berjalan, bulan berikutnya dan sebagian belum diketahui. Target serta estimasi yang sudah terisi dipertahankan, begitu juga timestamp bisnis.
- Snapshot komentar kosong diturunkan dari kejadian terakhir pada/sebelum waktu komentar, memakai `reorder()` agar urutan ASC bawaan relasi tidak menang. Tidak menebak dari tahap terkini.
- Notifikasi coaching contoh mempunyai `email_status=demo`, tanpa dispatch job/email dan tidak dipilih scheduler recovery. Read state/notifikasi yang sudah ada tidak digandakan atau direset.
- User secara terpisah menyetujui pelaksanaan seeder lokal. Hasil: 6 target tim, 91 estimasi closing, 92 snapshot coaching, 41 notifikasi demo; jumlah pelanggan/transaksi/komentar/history tetap.
- Review menemukan urutan snapshot fixture sempat mengambil kejadian pertama. Setelah tes regresi dan perbaikan, 66 snapshot demo yang baru diisi dan 30 metadata notifikasi demo terkait dikoreksi dari timeline fixture yang sama. Timestamp bisnis dan data non-demo tidak diubah, tanpa pengiriman email.

Aturan proyek kini meminta seeder development diselaraskan setiap kali migration ditambahkan. Pembuatan seeder tetap terpisah dari izin menjalankannya pada database non-test.

## Bukti dan ledger

- Baseline: 186 tes, 183 lulus, 3 skip, 1269 assertions.
- RED G03: selisih batas bulan, scope setelah pindah tim, tim nonaktif, bulan default UTC, input invalid dan CSV direproduksi; juga ID drilldown null. Tes instan UTC PostgreSQL menunjukkan `17:00` menjadi `10:00` sebelum timezone koneksi ditetapkan.
- Tes seeder mencakup idempotensi, guard testing/staging/production, data manual pada customer demo, tim manual, target/estimasi manual, snapshot multi-event, timestamp tetap, dan tidak ada email/job termasuk saat recovery command diuji.
- Review independen selesai; dua temuan pembatas fixture dan pemilihan event snapshot ditangani dengan tes yang gagal dahulu lalu lulus. Tidak ada temuan review actionable yang ditunda.
- Suite lengkap SQLite/CI dan PostgreSQL dijalankan terpisah. Untuk PostgreSQL, dibuat database test bernama acak yang terpisah dari database bisnis; proses Pest mendapat konfigurasi di memori dan database test tersebut dibersihkan setelah selesai. Test antrean memakai koneksi test aktif, bukan hardcode SQLite.
- Laporan dari demo lokal dibaca tanpa mutasi; Delivery dashboard dan Analisis Pencapaian cocok, dan ID drilldown tersedia. Preview browser memakai props laporan tersanitasi serta dokumen/mutasi yang diintersep, bukan login nyata atau UAT. Delapan belas kombinasi Dashboard Supervisor/Analisis/Kinerja Tim Branch Manager × 390/768/1440 × terang/gelap lulus tanpa overflow atau error JavaScript dan tanpa mutasi browser. Screenshot desktop terang/mobile gelap diperiksa langsung; ringkasan target Sales dan baris tim cocok.

## Verifikasi akhir

- `composer ci:check` lulus: 205 tes, 202 lulus, 3 skip, 1534 assertions; format/lint frontend, TypeScript, Pint dan PHPStan lulus.
- Suite PostgreSQL penuh lulus: 205 tes, 202 lulus, 3 skip, 1533 assertions. Database test khusus dibersihkan setelah run. Ini pemeriksaan integrasi, bukan concurrency atau benchmark volume.
- Production build lulus. Preview browser terakhir lulus 18/18 kombinasi, tanpa error/mutasi, dan data target Sales pada header serta baris tim cocok.
- Validasi dokumentasi mempertahankan 80 requirement unik PRD/matriks; catatan implementasi terdaftar dalam manifest.

## Batas dan langkah berikut

Timestamp historis yang ditulis sebelum koreksi timezone koneksi tidak diubah otomatis: audit provenance diperlukan sebelum koreksi data lama diputuskan. Data demo lama juga tidak dianggap baseline transaksi nyata.

Suite PostgreSQL bukan bukti concurrency atau p95 pada 100.000 transaksi. Gerbang G13/performa, bobot forecast production, UAT, operasional email/backup/restore dan Fase 6 tetap terbuka. Setelah review/merge perubahan ini, lanjutkan gap duplikat G04 serta gerbang yang tersisa di [matriks UAT](uat-matrix.md).
