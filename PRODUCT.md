# Product Context — DealDrive Supervisor

<!-- impeccable:product-schema 1 -->

> Dokumen ini merangkum konteks produk untuk pekerjaan desain. Requirement kanonik tetap berada di [`docs/agents/PRD.md`](docs/agents/PRD.md); bila terjadi perbedaan, PRD dan ADR berlaku.

## Platform

web

## Stack

Prototipe Fase 0 menggunakan HTML, CSS, dan JavaScript mandiri tanpa package baru. Implementasi produk yang direncanakan adalah Laravel, Inertia, React TypeScript, Tailwind CSS, dan shadcn/ui dalam satu repository.

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

- Satu dealer dengan banyak tim dan hierarki Admin → Branch Manager → Supervisor → Sales.
- Sales bekerja mobile-first; Supervisor dan Branch Manager juga menggunakan tablet atau desktop.
- Tahap pipeline: Lead, Prospect, Hot Prospect, SPK, DO, Delivery, dan Lost.
- Sistem digunakan online; tidak ada native app, PWA, atau offline sync pada MVP.
- Semua waktu bisnis ditampilkan dalam zona Asia/Jakarta.

## Capabilities and Constraints

- Akses dan cakupan data selalu ditentukan server; menyembunyikan menu bukan pengamanan.
- Customer dapat mempunyai beberapa transaksi tanpa menggandakan identitas.
- Branch Manager hanya menerima agregat dan drilldown tersanitasi, serta tidak membaca coaching.
- Conversation berada dalam konteks transaksi dan menggabungkan komentar dengan aktivitas sistem.
- Forecast adalah perkiraan berbobot, bukan janji hasil.
- Analisis MVP mencakup Sumber dan Model; Area serta MSCP ditunda.
- Nama produk final, bobot forecast, penyedia email, lingkungan deployment, bukti SPK, dan retensi data masih terbuka di PRD.

## Brand Commitments

- Nama kerja: “DealDrive Supervisor”.
- Arah visual awal: netral dengan aksen biru.
- Bahasa antarmuka: Bahasa Indonesia dengan istilah domain dari PRD.
- Belum tersedia logo, font khusus, atau pedoman merek final.

## Evidence on Hand

- PRD, roadmap, glosarium domain, dan tiga ADR awal berada di `docs/agents/`.
- Belum ada source aplikasi, design system, screenshot produk, logo, atau data pelanggan nyata.
- Data pada prototipe wajib sintetis dan diberi penanda; klaim bisnis tidak boleh dibuat-buat.

## Product Principles

- Tindakan berikutnya harus terlihat sebelum ringkasan yang sekadar informatif.
- Informasi sensitif hanya muncul kepada role yang berwenang.
- Setiap angka agregat harus dapat ditelusuri ke data sumber.
- Mobile adalah komposisi kerja sendiri, bukan desktop yang diperkecil.
- Riwayat penting dipertahankan dan tidak ditimpa.

## Accessibility & Inclusion

Alur utama wajib dapat digunakan dengan keyboard, target sentuh minimal 44×44px, kontras memenuhi WCAG 2.2 AA, dan fungsi utama harus berjalan pada viewport 390px tanpa horizontal page scroll.
