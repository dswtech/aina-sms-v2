# Design System — AIna DealDrive

> Keputusan struktur kanonik berada di [`docs/design/aina-sms-navigation/direction-approved.md`](docs/design/aina-sms-navigation/direction-approved.md). Requirement produk tetap mengikuti PRD dan ADR.

## Karakter

Ruang kerja operasional yang tenang dan sigap. Informasi penting dibedakan melalui urutan, ukuran, dan satu warna aksen; bukan melalui dekorasi.

## Struktur

- Desktop: sidebar berlabel sekitar 228px dan lembar kerja putih; sidebar memakai surface abu sangat muda (`--sidebar`).
- Halaman data (Dashboard, Target, Transaksi, Pelanggan, Analisis, Admin pengguna dan tim) memakai batas konten 1536px (`max-w-screen-2xl`); form dan pengaturan tetap sempit (5xl/6xl).
- Tablet (768–1023px): sidebar dibuka sebagai rail ikon saat halaman dimuat (`app-shell.tsx`), tombol sidebar tetap dapat membukanya; navigasi dan konten mempertahankan urutan desktop. Di dashboard, daftar prioritas 2 kolom dan KPI 3 kolom mulai `md`. Link teks di baris data memakai target 44px pada pointer kasar (`pointer-coarse:min-h-11`).
- Mobile: empat tujuan utama termasuk “Lainnya”; detail transaksi menjadi full-screen sheet.
- Sales dan Supervisor memulai dari dashboard yang dibuka dengan Prioritas tindak lanjut, lalu KPI dan analitik. Branch Manager memulai dari KPI dan kinerja lintas tim.

## Token visual

Tema "Mira" (shadcn, PR #158). Token kanonik berada di `resources/css/app.css`; nilai di bawah adalah tema terang.

- Background dan surface: putih (`--background`, `--card`); sidebar `oklch(0.985 0 0)`.
- Ink: `oklch(0.145 0.008 326)`; secondary ink (`--muted-foreground`): `oklch(0.542 0.034 322.5)`.
- Muted surface dan hover (`--muted`, `--accent`): `oklch(0.96 0.003 325.6)`; border/input: `oklch(0.922 0.005 325.62)`.
- Accent/action (`--primary`) dipilih pengguna lewat menu akun (`use-color.tsx`): Oranye default (`#c2410c` terang, `#fb923c` gelap), atau Biru, Hijau, Ungu, Merah, Teal. Komponen tidak boleh menulis warna aksen langsung; selalu turunkan dari `--primary`/`--accent`.
- Forecast (`--forecast`, `bg-forecast`): campuran 50% `--primary` dengan `--card`, sehingga mengikuti aksen dan tema.
- Negative (`--destructive`): `oklch(0.577 0.245 27.325)`.
- Font: Inter Variable; scale utama 12/14/16/24px.
- Radius: 8px untuk kontrol, 12px untuk panel, 14px untuk dialog.

## Komponen

- Navigasi aktif memakai perubahan surface dan warna teks, tanpa sidebar gelap.
- KPI berada dalam satu strip terbagi, tanpa ikon atau sparkline.
- Tabel desktop berubah menjadi kartu/list mobile dengan field penting tetap tersedia.
- Input, dropdown, combobox, selector tanggal/bulan dan tombol standar memakai tinggi 36px pada viewport minimal 1280px dengan pointer utama mouse (`hover: hover` dan `pointer: fine`). Mobile, tablet, dan perangkat dengan pointer utama jari tetap minimal 44px. Input memakai surface background, border token input tanpa shadow normal; ring fokus dan error tetap terlihat. Tombol ikon/header dan footer detail pelanggan yang membungkus label mempertahankan ukuran nyaman.
- Combobox memakai fokus pada header pencarian, tanpa ring kotak bersarang; opsi aktif combobox/select memakai muted dengan teks foreground. Opsi desktop minimum 36px dan label/hint bertingkat; opsi sentuh tetap mengikuti target 44px.
- Tombol/link di sel aksi tabel memakai `table-actions`: bentuk terlihat 32px, teks 12px, border halus tanpa shadow, dengan area klik/fokus minimal 44px. Hover tetap memakai accent.
- Area filter Pelanggan, Transaksi, Admin pengguna dan Analisis memakai panel bersama yang awalnya terbuka, dengan tombol Sembunyikan/Tampilkan filter dan ringkasan konteks. Melipat panel mempertahankan nilai/draft dan URL, menutup popup di dalamnya, serta mengeluarkan field tersembunyi dari urutan Tab. Di bawah 768px panel Transaksi awalnya terlipat bila halaman dibuka dengan filter tahap dari tautan, sehingga hasil tampil lebih dulu. Keadaan lipat tidak disimpan antar reload.
- Baris tabel data dan list/kartu mobile penggantinya memakai `striped-row`: baris pertama surface (`--card`), kedua muted (`--muted`), berulang dan dimulai ulang pada setiap hasil filter/halaman. Token mengikuti tema terang/gelap; hover memakai accent. Header, empty state, timeline, komentar, dan form tidak ikut pola; warna status dan fokus tetap dipertahankan.
- Status memakai tint pucat dengan teks gelap; warna bukan satu-satunya pembeda.
- Badge tahap memakai satu komponen bersama: Lead slate, Prospect sky, Hot Prospect amber, SPK violet, DO indigo, dan Lost rose. Tema gelap memakai tint gelap dengan teks terang; nama tahap selalu ditampilkan dan pasangan teks/latar harus memenuhi 4,5:1.
- Lost pada tema gelap memakai burgundy redup: latar `#30252c`, border `#60434d`, teks `#dfb7c2`; saturasi latar/border rendah agar tidak menyala di tabel gelap, dengan kontras teks sekitar 8,19:1. Palet Lost tema terang tetap.
- Satu tombol primary per layar. Shadow hanya pada dialog/sheet yang mengambang.
- Ikon berupa SVG outline konsisten; tidak memakai emoji.

## Interaksi dan aksesibilitas

### Dashboard analitik

- Untuk Supervisor dan Sales, Prioritas tindak lanjut berada tepat di bawah header, sebelum KPI. Di bawah 768px setiap daftar menampilkan 3 item (4 bila hanya satu tersisa) dengan tombol "Tampilkan N lagi"; jumlah di judul mengikuti item yang terlihat, dan daftar stagnan yang punya "Lihat semua" tidak memakai tombol kedua. Setiap item menyebut pelanggan dan kendaraan, lalu baris kedua berisi Sales (disembunyikan bagi Sales sendiri), aktivitas terakhir untuk item stagnan, atau penulis dan cuplikan untuk komentar. Judul item memakai warna teks; aksen hanya saat hover/fokus.
- Pada bulan berjalan, tile target menampilkan "Seharusnya s.d. hari ini: N" dan tile realisasi/forecast menampilkan "N% dari target" (DSH-07). Batang kinerja memberi tanda pace pendek `bg-muted-foreground` di samping tanda target `bg-foreground`; legenda dan baris "Target … · seharusnya s.d. hari ini …" menyebutnya dengan teks. Tim diurutkan dari proyeksi capaian terendah, sama seperti "Paling tertinggal" pada ranking Sales; tim nonaktif di akhir. Admin tidak menerima target tim (ORG-06), jadi urutannya menurut nama.
- Status laju (`monthPace` di `resources/js/lib/dashboard-charts.ts`) dinilai dari proyeksi capaian: (realisasi + laju saat ini × sisa hari kerja) / target. "Sesuai laju" `default` (primary) bila ≥100%, "Sedikit tertinggal" `outline` bila 70–<100%, "Tertinggal" `destructive` di bawah 70% atau belum ada realisasi, "Target tercapai"/"Periode selesai" `secondary`. Badge selalu teks + warna dari token Mira, minimal `text-xs`. Tile KPI tidak memuat badge laju; badge dan kalimat laju semua role (kecuali Admin) berada bersama di catatan pertama di bawah strip KPI ("[Tertinggal] Laju bulan ini: …"), diikuti baris aksi tersendiri: "Kelola target" bila target kosong untuk Supervisor, atau "N SPK siap DO" untuk Sales yang tertinggal. Panel "Kinerja saya" Sales hanya memuat badge agar kalimatnya tidak terulang. Setiap baris "Kinerja saya"/"Kinerja per Sales"/"Kinerja per tim" punya badge di samping nama dan kalimat laju rata kiri tepat di bawahnya; baris yang "Tertinggal" atau "Sedikit tertinggal" menautkan "N SPK siap DO" (`/transactions?tab=active&stage=spk`, ditambah `sales_id` untuk Supervisor/Admin) hanya bila `open_spk_count` lebih dari 0 dan Sales masih anggota aktif; BM tidak menerima jumlah maupun link. Aksi SPK selalu di baris sendiri (44px pada layar sentuh) dan diikuti "N tanpa estimasi closing bulan ini" bila ada SPK di luar forecast bulan itu (estimasi kosong atau bulan lain). Baris panel hanya memuat "Proyeksi N%" dan "N unit lagi dalam N hari kerja"; angka per hari hanya di ringkasan. Kalimat ringkasan diawali "Proyeksi N%" (tebal, warna foreground, dibulatkan ke bawah, menjelaskan urutan di dalam satu tingkat badge), lalu "Butuh N/hari" (tebal), lalu "(±N/minggu)" hanya bila sisa ≥10 hari kerja, "saat ini N/hari", dan "N unit lagi dalam N hari kerja". Angka butuh dibulatkan ke atas ke unit utuh (satu desimal hanya di bawah 1/hari); "seharusnya s.d. hari ini" tetap satu desimal sesuai DSH-07. Laju saat ini = realisasi DO / hari kerja berjalan; laju dibutuhkan = sisa unit / sisa hari kerja termasuk hari ini (Senin–Sabtu WIB). Forecast tidak pernah menjadi dasar laju. Forecast tampil dengan presisi yang sama di tile, batang, dan tabel rincian (FCT-01); bobot seperempat seperti 1,25 tidak dibulatkan. "Cara membaca angka" menjelaskan ambang proyeksi 100% dan 70%. Di bawah 768px tile "Gap ke forecast" disembunyikan sehingga strip KPI menjadi 2×2. Target tercapai tampil "9 dari 8 unit (+1)", bulan lampau "6 dari 8 unit (kurang 2)", tanpa target hanya teks "Target belum ditetapkan". Ranking Sales punya pilihan urut "Realisasi tertinggi" / "Paling tertinggal" (proyeksi capaian terendah dulu); Supervisor dan BM mulai dari "Paling tertinggal", Sales dan Admin dari realisasi. Label target per cakupan: "Target Sales", "Target tim" (Supervisor dan legenda panel tim), "Target cabang" (BM). Kartu pengingat target berada di alur halaman pada dashboard di semua lebar (agar tidak menutupi angka); di halaman lain kartu pojok mulai 768px.
- KPI memakai grid 2 kolom di ponsel dan 5 kolom mulai `lg`. Gap negatif ditulis sebagai angka positif dengan keterangan "Target terlampaui". Peringatan data tetap terlihat; definisi masuk disclosure "Cara membaca angka".
- Panel yang hanya berisi satu baris tidak menampilkan peringkat atau hitungan; Sales melihat "Kinerja saya". "Transaksi tanpa tim" hanya tampil bila ada nilai. Ranking menampilkan nama tim bila berisi lebih dari satu tim.
- Setelah KPI dan catatan periode, dashboard memakai dua kolom independen 2:1 mulai 1280px: kiri kinerja tim lalu ranking Sales (Sales: "Kinerja saya"), kanan distribusi pipeline lalu kontributor forecast. Supervisor dengan satu tim tidak melihat panel tim karena angkanya sama dengan KPI; benchmark tim ada di halaman Target. Di bawah 1280px panel bertumpuk mengikuti urutan itu. Kontributor tidak menampilkan nama Sales bagi Sales itu sendiri.
- Realisasi dan forecast memakai dua batang sejajar, `bg-primary` solid dan `bg-forecast` lebih muda, pada skala bersama per panel; label Realisasi/Forecast selalu tertulis sehingga warna bukan satu-satunya pembeda. Forecast sudah mencakup realisasi. Target ditandai garis dengan angka terlihat sesuai hak akses; nilai di atas target tidak dipotong. Target belum ditetapkan dan forecast tidak tersedia mempunyai label tersendiri.
- Ranking awal menampilkan lima Sales menurut realisasi, forecast, lalu nama; tombol 44px membuka seluruh Sales. Semua angka lama tetap tersedia dalam disclosure rincian yang dapat dibuka dengan keyboard. Distribusi enam tahap tidak dilabeli sebagai conversion funnel.
- Kontributor forecast menampilkan perbandingan nilai rupiah berbobot. Judul daftar stagnan menampilkan "N dari total" bila total lebih besar dari item yang terlihat. Hak akses serta arti periode tetap mengikuti PRD dan server.

### Pola umum

- Target sentuh minimum 44×44px.
- Focus ring (`--ring`) terlihat dan tidak tertutup sticky navigation.
- Semua dialog dapat ditutup dengan Escape dan mengembalikan focus ke pemicu.
- Filter dan posisi daftar dipertahankan ketika detail ditutup.
- `prefers-reduced-motion` menghapus perpindahan non-esensial.
- Tidak ada horizontal page scroll pada 390px, 768px, atau 1440px.

## Larangan

Tidak memakai gradient, glass, glow, emoji, sidebar gelap pada canvas terang, ikon dalam kotak berwarna untuk KPI, atau data yang tampak nyata tanpa label “Data contoh”.
