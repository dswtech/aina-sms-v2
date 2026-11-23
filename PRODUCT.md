# Product Context — AIna DealDrive

<!-- impeccable:product-schema 1 -->

> Dokumen ini merangkum konteks produk untuk pekerjaan desain. Requirement kanonik tetap berada di [`docs/agents/PRD.md`](docs/agents/PRD.md); bila terjadi perbedaan, PRD dan ADR berlaku.

## Platform

web

## Stack

Aplikasi production dalam satu repository: Laravel 13 (PHP 8.4), Inertia 3, React 19 TypeScript, Tailwind CSS 4, shadcn/ui, PostgreSQL, dan Vite+ (ADR 001–002). Rilis bertag versi (ADR 006); production berjalan di VPS (ADR 008).

## Users

- Sales bekerja dari ponsel untuk menemukan pelanggan, melakukan follow-up, dan memperbarui transaksi dengan cepat.
- Supervisor memantau pipeline tim, mengatur target dan penugasan, serta memberi coaching.
- Branch Manager membaca kinerja, forecast, dan analisis lintas tim tanpa mengakses data kontak atau coaching.
- Admin mengelola akun, undangan, tim, penempatan, konfigurasi dealer, dan akses audit.

## Product Purpose

Menyatukan hubungan pelanggan, pipeline penjualan, tindak lanjut, coaching, target, forecast, dan analisis agar pekerjaan dealer tidak lagi tersebar pada chat dan spreadsheet. Keberhasilan utama adalah tindakan lapangan yang lebih cepat, lead tidak terlupakan, dan laporan yang dapat direkonsiliasi ke transaksi sumber.

## Positioning

Customer menjadi identitas hubungan jangka panjang yang terpisah dari transaksi, sementara “Buku Pelanggan Saya” mengubah daftar kontak menjadi ruang kerja yang selalu menunjukkan kontak terakhir dan langkah berikutnya.

## Operating Context

- Satu dealer dengan banyak tim dan hierarki Admin → Branch Manager → Supervisor → Sales. Model data mengenal Dealer, tetapi production hanya melayani satu dealer.
- Sales bekerja mobile-first; Supervisor dan Branch Manager juga menggunakan tablet atau desktop.
- Tahap pipeline: Lead, Prospect, Hot Prospect, SPK, DO, dan Lost. DO adalah tahap akhir yang berhasil; Delivery dihapus (ADR 010).
- Sistem digunakan online; tidak ada native app, PWA, atau offline sync pada MVP.
- Semua waktu bisnis ditampilkan dalam zona Asia/Jakarta.

## Capabilities and Constraints

- Akses dan cakupan data selalu ditentukan server; menyembunyikan menu bukan pengamanan.
- Customer dapat mempunyai beberapa transaksi tanpa menggandakan identitas.
- Branch Manager hanya menerima agregat dan drilldown tersanitasi, serta tidak membaca coaching.
- Conversation berada dalam konteks transaksi dan menggabungkan komentar dengan aktivitas sistem.
- Forecast adalah perkiraan berbobot, bukan janji hasil.
- Analisis mencakup Pencapaian Tahap, Pembiayaan, dan Mapping Area (FOA/PMA dari snapshot DO). MSCP ditutup: porsi per leasing pada Analisis Pembiayaan sudah memenuhi kebutuhan.
- Bobot forecast disetujui 13 November 2026: Lead 10%, Prospect 25%, Hot Prospect 50%, SPK 75%.
- Masuk SPK cukup dengan konfirmasi eksplisit booking fee diterima, dengan pelaku dan waktu tercatat.
- Data pelanggan dan audit disimpan tanpa batas waktu; ditinjau ulang setelah satu tahun production.
- Semua keputusan terbuka PRD bagian 14 sudah ditutup; keputusan baru dicatat di PRD atau ADR.

## Brand Commitments

- Nama produk final: “AIna DealDrive” (13 November 2026).
- Arah visual awal: netral dengan aksen biru.
- Bahasa antarmuka: Bahasa Indonesia dengan istilah domain dari PRD.
- Ikon aplikasi ada (`public/favicon.svg`, `AppLogoIcon`); belum ada font khusus atau pedoman merek final.

## Evidence on Hand

- PRD, roadmap, glosarium, ADR 001–010, matriks UAT, dan catatan implementasi berada di `docs/agents/`; arah navigasi di `docs/design/`.
- Aplikasi berjalan di production (v1.7.0) dengan DESIGN.md sebagai design system terdokumentasi.
- Production menyimpan data pelanggan nyata. Mock, screenshot, preview, dan artifact desain wajib memakai data sintetis berlabel “Data contoh”; data production tidak boleh disalin ke sana.
- Klaim bisnis, testimoni, atau angka kinerja tidak boleh dibuat-buat.

## Product Principles

- Tindakan berikutnya harus terlihat sebelum ringkasan yang sekadar informatif.
- Informasi sensitif hanya muncul kepada role yang berwenang.
- Setiap angka agregat harus dapat ditelusuri ke data sumber.
- Mobile adalah komposisi kerja sendiri, bukan desktop yang diperkecil.
- Riwayat penting dipertahankan dan tidak ditimpa.

## Accessibility & Inclusion

Alur utama wajib dapat digunakan dengan keyboard, target sentuh minimal 44×44px, kontras memenuhi WCAG 2.2 AA, dan fungsi utama harus berjalan pada viewport 390px tanpa horizontal page scroll.
