# Konten lebih lebar dan kontrol desktop kompak — desain singkat

| Item | Keterangan |
|---|---|
| Tanggal | 9 November 2026 |
| Ukuran | Perubahan kecil |
| Status | Disetujui pemilik dan diimplementasikan, 9 November 2026 |

## Latar belakang dan tujuan

Pemilik memakai monitor 1920×1080 tanpa layar sentuh. Pada halaman Transaksi konten berhenti di 1280px dan menyisakan sekitar 300px kosong di kiri dan kanan, padahal tabel memiliki 10 kolom. Input, select, dan tombol tampil sekitar 44px, bukan 36px yang ditetapkan [`DESIGN.md`](../../../DESIGN.md).

Tujuan: memakai lebar desktop dengan lebih baik dan mengembalikan kontrol desktop ke 36px, tanpa mengubah tampilan mobile.

## Bukan tujuan

- Tidak mengganti sistem desain, palet, tipografi, atau komponen. Draf `docs/design/design.md` (template Data-Dense Dashboard) dibatalkan pemilik dan tidak dipakai.
- Tidak mengubah layout mobile atau tablet, target sentuh 44px di layar sentuh/sempit, API, database, atau dependency.
- Tidak melebarkan form dan halaman pengaturan.

## Anti-tujuan

Baris tabel yang terlalu panjang di monitor ultrawide, atau kontrol desktop yang menjadi lebih kecil dari 36px.

## Pendekatan

1. Batas lebih besar, satu nilai untuk semua halaman.
2. Tanpa batas, selebar layar: tabel paling lega, tetapi baris terlalu panjang di 2560px ke atas.
3. **Dipilih pemilik:** batas bergantung jenis halaman. Halaman data memakai batas lebar; form dan pengaturan tetap sempit. Alasan: tabel dan dashboard mendapat ruang, field form tidak terentang.

## Rancangan

**Lebar konten.** Pada halaman data ganti `max-w-7xl` (1280px) dengan `max-w-screen-2xl` (1536px): `dashboard`, `targets`, `transactions/index`, `customers/index`, `analytics/index`, `analytics/mapping-area`, `analytics/financing`, `admin/users/index`, `admin/teams/index`. Gutter `px-5 sm:px-8 lg:px-10` tetap. Pada 1920px konten memakai sekitar 1536px dari 1666px yang tersedia. Di bawah 1536px lebar tetap mengikuti layar.

Tetap sempit: `imports` (6xl), `module-status` dan `dealer-settings` (5xl), `transactions/create` (6xl). `team-performance` tidak memiliki batas sendiri dan tidak diubah.

**Kontrol desktop.** Di [`resources/css/app.css`](../../../resources/css/app.css) ubah media query kompak dari `(min-width: 768px) and (hover: hover) and (pointer: fine) and (not (any-pointer: coarse))` menjadi `(min-width: 1280px) and (hover: hover) and (pointer: fine)`. Penyebab: Windows dapat melaporkan `any-pointer: coarse` walau tidak ada layar sentuh (driver pen, layar virtual, dok laptop sentuh), sehingga aturan 36px tidak pernah aktif. Ambang lebar naik dari 768px ke 1280px (pilihan pemilik) agar tablet, termasuk tablet dengan keyboard/trackpad dan hybrid Windows, tidak pernah mendapat 36px. Perangkat yang pointer utamanya jari tetap memakai 44px.

**Dokumen.** Perbarui bagian Struktur dan Komponen di `DESIGN.md`: batas lebar halaman data 1536px, dan syarat kontrol 36px berupa pointer utama mouse tanpa klausa `any-pointer`. Daftarkan dokumen ini di manifest `docs/agents/README.md`.

## Risiko yang diketahui

Laptop hybrid lebar 1280px ke atas dengan mouse sebagai pointer utama mendapat kontrol 36px, padahal sebagian penggunanya menyentuh layar. Diterima pemilik; bila terbukti mengganggu, kembalikan klausa `any-pointer`. Perilaku iPad dengan keyboard/trackpad belum diverifikasi di perangkat nyata; pelaksana hanya dapat menguji dengan emulasi.

## Diserahkan ke pelaksana

- Memeriksa tes yang menegaskan ukuran atau lebar lama (`tests/Browser/dashboard-layout.js` memuat ambang 1280) dan menyesuaikannya.
- Memverifikasi di browser pada 390, 768, 1440, dan 1920px, terang dan gelap: tanpa horizontal scroll, tinggi kontrol 36px (mouse, lebar 1280px ke atas) dan 44px (mobile dan tablet 768px).
- Menjalankan `composer ci:check` dan regresi browser terkait sebelum commit; kerja di branch non-default lalu PR.
