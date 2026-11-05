# Dashboard analitik seimbang

Tanggal: 5 November 2026. Baseline: `007d59d` (PR #35), branch `codex/dashboard-analytics-layout`. Pengguna menyetujui desain analitik seimbang untuk empat role. Requirement tetap pada [PRD](PRD.md), keputusan visual pada [DESIGN](../../DESIGN.md).

## Desain dan implementasi

- Pertahankan KPI, filter bulan, dan catatan periode. Susun bagian bawah menjadi grid desktop 2:1 mulai 1280px: tim/pipeline lalu Sales/kontributor. Tablet/mobile bertumpuk; prioritas tiga kolom mulai 1024px.
- Dua batang sejajar membandingkan realisasi dengan forecast yang sudah mencakup realisasi. Skala bersama mencakup nilai terbesar dan target yang diizinkan. Fallback skala satu hanya saat semua nilai kosong/nol; nilai desimal di bawah satu tetap memakai maksimum aktual.
- Ranking Sales memakai realisasi menurun, forecast menurun (null sesudah nol), lalu nama dengan locale Indonesia. Awalnya lima Sales; tombol membuka semua. Rincian tim/Sales menggunakan tabel/list lama di disclosure native tanpa menghilangkan field historis.
- Pipeline mengikuti tujuh tahap dalam urutan domain, menampilkan angka dan batang distribusi, bukan konversi. Kontributor membandingkan rupiah berbobot. Angka dan label tetap terbaca tanpa tooltip.
- Admin tidak menerima penanda/angka management; Sales hanya memakai props cakupan personal. Branch Manager tidak mendapat prioritas/coaching. Transaksi tanpa tim tetap menjadi catatan agregat terpisah.
- Tidak ada endpoint, schema, migration, dependency, atau rumus laporan baru. Tipe baris kinerja diekspor untuk reuse. `PriorityLists.showCounts` bersifat opsional dan default mati agar halaman lain tetap sama. Script frontend menjalankan semua `*.test.mjs`.

## Bukti verifikasi

- Tes helper ditulis/dijalankan gagal sebelum implementasi. Lima tes frontend lulus, mencakup urutan, immutability, nol/null, pencapaian melampaui target dan presisi skala pecahan.
- `composer ci:check` lulus: frontend lint/format, TypeScript, lima tes frontend, Pint, PHPStan, Pest 228 lulus/3 skip (2.082 assertions pada run lengkap). Suite mencakup perubahan G04 yang sedang dikerjakan terpisah dalam checkout bersama; perubahan tersebut tidak termasuk cakupan dashboard.
- Production build lulus memakai executable Vite+ lokal. Shim pnpm sistem mencoba mengunduh pnpm; CI memakai pnpm bawaan runtime yang sudah tersedia, tanpa instalasi package. PHPStan memerlukan eksekusi di luar sandbox untuk pembacaan konfigurasi/worker.
- `tests/Browser/dashboard-layout.js`: 28 kondisi lulus, empat role × 390/768/1440 × dua tema, ditambah data kosong dan forecast historis pada dua viewport. Memeriksa grid, batas lima baris, pengurutan, expand/collapse, disclosure keyboard, rincian, target minimum 44px dan page overflow. Regresi awal menemukan tombol desktop 36px; diperbaiki memakai pola `data-comfortable-controls` yang sudah tersedia lalu lulus.
- `tests/Browser/target-role-metrics.js`: 42 kondisi lulus pada dashboard empat role, Target SPV/Admin, dan Kinerja Tim BM × tiga viewport × dua tema. Regresi menyesuaikan akses rincian dashboard melalui disclosure.
- Kedua suite browser memakai dokumen Inertia sintetis berlabel Data contoh dan aset aplikasi asli. Nol error JavaScript, nol request mutasi, nol write bisnis. Tidak login ke akun bisnis, menjalankan migration/seeder, atau mengirim email.
- Review kode independen tidak menemukan temuan actionable. Screenshot perwakilan desktop SPV dan mobile Sales pada kedua tema diperiksa langsung. Artefak lokal berada di `.playwright-cli/dashboard-*.png` dan tidak masuk Git.

## Tinjauan visual

ROUND 1
Seen in one second: Kinerja kini dapat dibandingkan dari panjang batang; pipeline tampil sebagai panel pendamping.
Idea (one sentence): Ubah angka yang bertumpuk menjadi perbandingan kinerja yang tetap dapat direkonsiliasi ke rincian.
Live thing: Filter periode, rincian angka dan perluasan ranking Sales memakai data sesuai cakupan pengguna.
Layout words by section: tim=perbandingan / pipeline=distribusi / Sales=ranking / kontributor=nilai berbobot / prioritas=tindakan.
Scores: design 7.5 · usability 8 · creativity 7 · content 8 → overall 7.6 (penilaian subjektif, bukan skor alat).
Caps applied: Konvensi aplikasi dan design system proyek dipertahankan; bukan halaman marketing.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. Biru realisasi/forecast tema gelap terlalu mirip pada `dashboard-supervisor-1440-dark.png`; forecast diubah ke biru lebih muda dan screenshot diulang.
2. Screenshot full-page saat disclosure mendapat fokus menangkap sticky header di tengah gambar; screenshot diulang setelah blur dan scroll ke atas. Ini artefak pengambilan gambar, bukan perubahan shell.
3. KPI/catatan lama membuat grafik mulai di bawah fold terutama mobile (`dashboard-sales-390-light.png`); dipertahankan sesuai batas perubahan yang disetujui, tanpa memperluas redesign ke bagian atas.

## Batas bukti dan handoff

Tidak menjalankan UAT manusia, pembaca layar atau perangkat sentuh fisik. Pemeriksaan browser sintetis tidak membuktikan isi data bisnis lokal. Tidak ada baseline screenshot otomatis sebelum perubahan dan tidak mengklaim hasil inspector desain yang tidak dijalankan. Gambar/foto eksternal tidak digunakan. Perubahan G04 pada modul pelanggan/impor serta manifest dokumennya berasal dari pekerjaan lain dan harus tetap dipertahankan di luar commit dashboard.
