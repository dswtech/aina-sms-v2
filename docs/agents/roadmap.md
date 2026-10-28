# Roadmap Pembangunan Aplikasi

| Item | Keterangan |
|---|---|
| Dokumen | Urutan pembangunan dan gerbang kualitas |
| Versi | v1.0 |
| Tanggal | 28 Oktober 2026 |
| Status | Rencana aktif |
| Sumber kebutuhan | [`PRD.md`](PRD.md) |

Roadmap ini menjawab urutan kerja, bukan menetapkan tanggal kalender. Estimasi waktu baru dibuat setelah keputusan package, kapasitas tim, dan lingkungan deployment tersedia.

## Prinsip urutan

1. Keamanan akses dibangun sebelum data pelanggan dimasukkan.
2. Customer dan transaksi menjadi sumber data utama sebelum coaching, forecast, atau analisis dibuat.
3. Setiap fase menghasilkan bagian aplikasi yang dapat diuji dari ujung ke ujung pada mobile dan desktop.
4. Fase berikutnya tidak menutupi kegagalan fase sebelumnya; gerbang kualitas harus lulus lebih dahulu.
5. Package tidak dipasang sebelum persetujuan pengguna dan tidak ada migration atau database write non-test tanpa perintah eksplisit.

## Jalur kritis

`Persiapan → Akses → Customer & Pipeline → Coaching → Dashboard & Forecast → Analisis → Pilot`

Customer dan transaksi dikerjakan lebih awal karena seluruh aktivitas, coaching, forecast, dan laporan bergantung pada kualitas dua data tersebut.

## Fase 0 — Persiapan produk dan rancangan

**Tujuan:** memastikan tim membangun hal yang sama sebelum source aplikasi dibuat.

**Cakupan:**

- menyetujui PRD dan menutup keputusan yang menghambat fase awal;
- menyusun alur per role: Admin, Branch Manager, Supervisor, dan Sales;
- memfinalkan hubungan Customer, assignment, transaksi, tahap, aktivitas, dan follow-up;
- membuat wireframe mobile dan desktop untuk login, Buku Pelanggan, daftar transaksi, detail modal/sheet, dan dashboard dasar;
- menyusun matriks otorisasi, rancangan database, acceptance criteria, serta strategi unit/feature test;
- mengajukan daftar package beserta alasan dan alternatif untuk persetujuan pengguna.

**Gerbang keluar:**

- PRD dan tiga ADR awal diterima sebagai baseline;
- tidak ada keputusan struktur data atau akses yang masih ambigu untuk Fase 1–2;
- backlog requirement dapat dilacak ke test;
- persetujuan package diperoleh sebelum bootstrap.

## Fase 1 — Fondasi aplikasi dan akses

**Tujuan:** menyediakan kerangka aplikasi aman yang dapat dipakai seluruh modul berikutnya.

**Cakupan:**

- bootstrap Laravel, Inertia, React TypeScript, Tailwind, dan shadcn/ui setelah package disetujui;
- responsive application shell, navigasi per role, loading, empty, dan error state dasar;
- login, reset password, undangan sekali pakai, aktivasi/nonaktif akun;
- dealer, tim, membership, dan hierarki Admin → Branch Manager → Supervisor → Sales;
- policy/query scope server, audit dasar, konfigurasi server-only, dan fondasi test/CI.

**Test wajib:** autentikasi, undangan kedaluwarsa/terpakai, akun nonaktif, seluruh skenario akses lintas role/tim, secret tidak masuk Inertia props atau bundle, serta smoke test viewport 390/768/1440.

**Gerbang keluar:** seluruh route bisnis terlindungi server-side dan matriks akses lulus.

## Fase 2 — Buku Pelanggan dan pipeline penjualan

**Tujuan:** memberi Sales alat kerja pertama yang benar-benar dapat dipakai setiap hari.

**Cakupan Buku Pelanggan Saya:**

- Customer sebagai identitas kanonik yang terpisah dari transaksi;
- daftar pelanggan yang ditugaskan kepada Sales dengan pencarian dan filter;
- nama, telepon/WhatsApp, status hubungan, transaksi aktif, kontak terakhir, serta next follow-up;
- aksi cepat: telepon, tautan WhatsApp, catat aktivitas, jadwalkan follow-up, buat transaksi baru, dan lihat riwayat;
- kelompok kerja seperti Follow-up Hari Ini, Belum Dihubungi, Customer Aktif, Tidak Aktif, Pernah Membeli, Potensi Repeat Order, dan Potensi Referral;
- preferensi komunikasi/opt-out dan riwayat penugasan pelanggan;
- reassignment oleh pihak berwenang tanpa menghapus riwayat.

**Cakupan pipeline:**

- lead/transaksi dengan tahap Lead, Prospect, Hot Prospect, SPK, DO, Delivery, dan Lost;
- riwayat tahap append-only, aktivitas follow-up, alasan Lost, stagnant, pencarian, dan filter;
- detail menggunakan dialog besar di desktop dan full-screen sheet/dialog di mobile;
- satu Customer dapat mempunyai beberapa transaksi tanpa menggandakan identitas.

**Test wajib:** normalisasi nomor telepon dan kandidat duplikat, relasi satu Customer ke banyak transaksi, assignment/reassignment, pembatasan data per Sales/tim, opt-out, transisi tahap, Lost wajib beralasan, stagnant, serta alur utama pada tiga viewport.

**Gerbang keluar:** Sales dapat menemukan pelanggan, menghubungi, mencatat hasil, menjadwalkan langkah berikutnya, dan menggerakkan transaksi sampai Delivery/Lost tanpa kebocoran data.

## Fase 3 — Pekerjaan harian, coaching, dan notifikasi

**Tujuan:** membantu Sales dan Supervisor mengetahui tindakan hari ini serta mendokumentasikan arahan.

**Cakupan:**

- daftar Follow-up Hari Ini, terlambat, belum dihubungi, dan stagnant;
- conversation timeline yang menggabungkan komentar dan system event;
- reply sederhana, edit lima menit, revision history, dan tanpa penghapusan permanen;
- in-app notification dan email metadata-plus-link tanpa isi coaching;
- Supervisor melihat prioritas tim dan memberi arahan pada transaksi yang tepat.

**Test wajib:** akses conversation, Branch Manager ditolak, batas waktu edit, revision tersimpan, komentar tidak dapat dihapus permanen, notifikasi, retry antrean, dan render email tanpa isi coaching.

**Gerbang keluar:** alur follow-up dan coaching ujung ke ujung lulus untuk Sales dan Supervisor.

## Fase 4 — Target, dashboard, dan forecasting

**Tujuan:** mengubah data operasional menjadi kendali pencapaian.

**Cakupan:**

- target per Sales dan tim dengan audit perubahan;
- realisasi, jumlah per tahap, gap, freshness, dan daftar tindakan prioritas;
- weighted forecast per Sales dan tim dengan bobot server-side;
- dashboard Supervisor, Branch Manager agregat lintas tim, serta dukungan audit Admin;
- penjelasan komponen forecast agar tidak dianggap sebagai janji hasil.

**Test wajib:** rumus unit test, rekonsiliasi dashboard ke transaksi sumber, batas periode, timezone Asia/Jakarta, scope role, serta target performa dashboard.

**Gerbang keluar:** target, realisasi, forecast, dan gap konsisten untuk periode yang sama dan bobot produksi telah disetujui.

## Fase 5 — Analisis dan laporan

**Tujuan:** menjelaskan pola yang menghasilkan penjualan, bukan hanya total akhirnya.

**Cakupan MVP:**

- Analisis Sumber untuk jumlah, porsi, perjalanan tahap, dan conversion;
- Analisis Model untuk jumlah dan porsi SPK, DO, dan Delivery;
- mode tanggal Akuisisi dan Pencapaian dengan arti yang berbeda;
- drilldown ke daftar transaksi yang mempertahankan filter;
- CSV dan PDF agregat;
- drilldown Branch Manager tersanitasi tanpa kontak, catatan hubungan, atau coaching.

**Ditunda:** Analisis Area menunggu data lokasi terstruktur. MSCP menunggu modul leasing dan definisi operasional yang disetujui.

**Test wajib:** rumus jumlah/porsi/conversion, batas periode dan mode tanggal, rekonsiliasi drilldown, sanitasi role, serta ekspor tanpa data sensitif.

**Gerbang keluar:** setiap angka dapat ditelusuri ke transaksi sumber dan hasil ekspor sama dengan filter layar.

## Fase 6 — Import, hardening, dan pilot

**Tujuan:** menyiapkan aplikasi untuk digunakan oleh orang nyata dengan data nyata secara terkendali.

**Cakupan:**

- template, preview, validasi, dan audit CSV import;
- security review, accessibility, responsive QA, performance, observability, backup/restore runbook, dan penanganan kegagalan;
- rekonsiliasi data awal serta deduplikasi sebelum import disetujui;
- UAT per role, pelatihan singkat, pilot pada tim terbatas, dan perbaikan temuan kritis;
- keputusan go-live berdasarkan bukti UAT dan metrik kesiapan.

**Test wajib:** import parsial tidak diam-diam, idempotency sesuai desain, akses file, volume/performance, negative authorization, accessibility, dan regression suite penuh.

**Gerbang keluar:** tidak ada temuan kritis terbuka, pengguna pilot menyelesaikan alur utama, dan runbook operasional tersedia.

## Fase 7 — Pasca-MVP

Fase ini baru direncanakan setelah MVP dipakai dan data dasarnya terbukti sehat:

- Analisis Area;
- leasing dan MSCP;
- document tracker;
- delivery calendar;
- distribusi laporan terjadwal;
- repeat/referral automation yang tetap menghormati consent;
- kalibrasi bobot forecast dari data historis dan evaluasi AI bila datanya cukup.

Setiap item membutuhkan kebutuhan, aturan akses, dan acceptance criteria tambahan sebelum implementasi.

## Prioritas pengerjaan terdekat

1. Selesaikan Fase 0 dan minta persetujuan package.
2. Bangun Fase 1 sampai matriks akses lulus.
3. Bangun satu vertical slice Fase 2: Customer → assignment → transaksi → aktivitas → next follow-up → tampilan mobile.
4. Setelah vertical slice stabil, lengkapi seluruh pipeline dan baru lanjut ke coaching.

Urutan ini memberi nilai kepada Sales lebih cepat sekaligus mencegah dashboard atau forecast dibangun di atas data pelanggan yang belum rapi.
