# Design System — AIna DealDrive

> Keputusan struktur kanonik berada di [`docs/design/aina-sms-navigation/direction-approved.md`](docs/design/aina-sms-navigation/direction-approved.md). Requirement produk tetap mengikuti PRD dan ADR.

## Karakter

Ruang kerja operasional yang tenang dan sigap. Informasi penting dibedakan melalui urutan, ukuran, dan satu aksen biru; bukan melalui dekorasi.

## Struktur

- Desktop: sidebar berlabel sekitar 228px dan lembar kerja putih di dalam frame biru-abu sangat muda.
- Halaman data (Dashboard, Target, Transaksi, Pelanggan, Analisis, Admin pengguna dan tim) memakai batas konten 1536px (`max-w-screen-2xl`); form dan pengaturan tetap sempit (5xl/6xl).
- Tablet: sidebar dilipat; navigasi dan konten tetap mempertahankan urutan desktop.
- Mobile: empat tujuan utama termasuk “Lainnya”; detail transaksi menjadi full-screen sheet.
- Sales memulai dari antrean waktu. Role lain memulai dari dashboard operasional.

## Token visual

- Ground: `#e9f0f8`.
- Surface: `#ffffff`.
- Ink: `#0f172a`.
- Secondary ink: `#526175`.
- Accent/action: `#1769e0`; dark accent text: `#0f4faa`.
- Border: `#dbe4f0`; control border: `#c4d0df`.
- Negative: `#b42318`; warning: `#92400e`; positive: `#08783e`.
- Font: system sans-serif; scale utama 12/14/16/24px.
- Radius: 8px untuk kontrol, 12px untuk panel, 14px untuk dialog.

## Komponen

- Navigasi aktif memakai perubahan surface dan warna teks, tanpa sidebar gelap.
- KPI berada dalam satu strip terbagi, tanpa ikon atau sparkline.
- Tabel desktop berubah menjadi kartu/list mobile dengan field penting tetap tersedia.
- Input, dropdown, combobox, selector tanggal/bulan dan tombol standar memakai tinggi 36px pada viewport minimal 1280px dengan pointer utama mouse (`hover: hover` dan `pointer: fine`). Mobile, tablet, dan perangkat dengan pointer utama jari tetap minimal 44px. Input memakai surface background, border token input tanpa shadow normal; ring fokus dan error tetap terlihat. Tombol ikon/header dan footer detail pelanggan yang membungkus label mempertahankan ukuran nyaman.
- Combobox memakai fokus pada header pencarian, tanpa ring kotak bersarang; opsi aktif combobox/select memakai muted dengan teks foreground. Opsi desktop minimum 36px dan label/hint bertingkat; opsi sentuh tetap mengikuti target 44px.
- Tombol/link di sel aksi tabel memakai `table-actions`: bentuk terlihat 32px, teks 12px, border halus tanpa shadow, dengan area klik/fokus minimal 44px. Hover tetap memakai accent.
- Area filter Pelanggan, Transaksi, Admin pengguna dan Analisis memakai panel bersama yang awalnya terbuka, dengan tombol Sembunyikan/Tampilkan filter dan ringkasan konteks. Melipat panel mempertahankan nilai/draft dan URL, menutup popup di dalamnya, serta mengeluarkan field tersembunyi dari urutan Tab. Keadaan lipat tidak disimpan antar reload.
- Baris tabel data dan list/kartu mobile penggantinya memakai `striped-row`: baris pertama surface (`--card`), kedua muted biru-abu (`--muted`), berulang dan dimulai ulang pada setiap hasil filter/halaman. Token mengikuti tema terang/gelap; hover memakai accent. Header, empty state, timeline, komentar, dan form tidak ikut pola; warna status dan fokus tetap dipertahankan.
- Status memakai tint pucat dengan teks gelap; warna bukan satu-satunya pembeda.
- Badge tahap memakai satu komponen bersama: Lead slate, Prospect sky, Hot Prospect amber, SPK violet, DO indigo, Delivery emerald, dan Lost rose. Tema gelap memakai tint gelap dengan teks terang; nama tahap selalu ditampilkan dan pasangan teks/latar harus memenuhi 4,5:1.
- Lost pada tema gelap memakai burgundy redup: latar `#30252c`, border `#60434d`, teks `#dfb7c2`; saturasi latar/border rendah agar tidak menyala di tabel gelap, dengan kontras teks sekitar 8,19:1. Palet Lost tema terang tetap.
- Satu tombol primary per layar. Shadow hanya pada dialog/sheet yang mengambang.
- Ikon berupa SVG outline konsisten; tidak memakai emoji.

## Interaksi dan aksesibilitas

### Dashboard analitik

- Setelah KPI dan catatan periode, dashboard memakai grid 2:1 mulai 1280px: kinerja tim berdampingan dengan distribusi pipeline, lalu ranking Sales dengan kontributor forecast. Di bawah 1280px panel bertumpuk; Sales memakai kinerja personal tanpa panel lintas tim.
- Realisasi dan forecast memakai dua batang sejajar, biru solid dan biru muda, pada skala bersama per panel. Forecast sudah mencakup realisasi. Target ditandai garis dengan angka terlihat sesuai hak akses; nilai di atas target tidak dipotong. Target belum ditetapkan dan forecast tidak tersedia mempunyai label tersendiri.
- Ranking awal menampilkan lima Sales menurut realisasi, forecast, lalu nama; tombol 44px membuka seluruh Sales. Semua angka lama tetap tersedia dalam disclosure rincian yang dapat dibuka dengan keyboard. Distribusi tujuh tahap tidak dilabeli sebagai conversion funnel.
- Kontributor forecast menampilkan perbandingan nilai rupiah berbobot. Prioritas tindak lanjut menampilkan jumlah item yang sedang terlihat; peringatan stagnan berada di dekat daftar. Hak akses serta arti periode tetap mengikuti PRD dan server.

### Pola umum

- Target sentuh minimum 44×44px.
- Focus ring biru terlihat dan tidak tertutup sticky navigation.
- Semua dialog dapat ditutup dengan Escape dan mengembalikan focus ke pemicu.
- Filter dan posisi daftar dipertahankan ketika detail ditutup.
- `prefers-reduced-motion` menghapus perpindahan non-esensial.
- Tidak ada horizontal page scroll pada 390px, 768px, atau 1440px.

## Larangan

Tidak memakai gradient, glass, glow, emoji, sidebar gelap pada canvas terang, ikon dalam kotak berwarna untuk KPI, atau data yang tampak nyata tanpa label “Data contoh”.
