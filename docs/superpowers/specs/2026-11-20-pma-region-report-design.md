# Desain: PMA tingkat kab/kota dan laporan penjualan per PMA

Tanggal: 20 November 2026 · Status: menunggu persetujuan pemilik

## Maksud

Pemilik mengoreksi arti dua istilah wilayah:

- **FOA** (dealer) = kecamatan di Kabupaten Bandung Barat. Atasan menilai dealer dari **porsi DO yang berasal dari FOA** dibanding seluruh DO; makin mendekati 100% makin bagus.
- **PMA** (Primary Market Area) = kab/kota yang masih boleh digarap dealer: Kota Bandung, Kab. Bandung, Kab. Bandung Barat, Kota Cimahi, Kab. Purwakarta, Kab. Cianjur, Kab. Subang.

Penggantian istilah 17 November 2026 (FOA → PMA, lihat `docs/agents/memory.md`) memakai "PMA" untuk konsep yang sebenarnya FOA. Desain ini mengembalikan label itu ke FOA dan menambah PMA sebagai tingkat kab/kota di atasnya, lengkap dengan laporan penjualan per PMA.

## Tujuan

1. Label layar "Kecamatan PMA" / "Dalam PMA" kembali menjadi **FOA**.
2. Admin mengatur daftar kab/kota PMA per dealer, dengan audit, seperti FOA.
3. Master wilayah memuat Purwakarta, Cianjur dan Subang beserta seluruh kecamatannya.
4. Laporan Mapping Area membagi DO menjadi tiga kelompok dan menampilkan rincian per kab/kota.

## Bukan tujuan

- Target penjualan khusus FOA/PMA (pemilik memilih ukuran porsi DO, bukan capaian target).
- Mengubah identifier kode/data `foa` (`dealer_foa_districts`, `is_foa`, `dealer.foa_updated`, route `area-foa`). Itu sudah benar menurut arti baru.
- Menghapus Kab. Sumedang dari master; ia tetap ada dan dihitung luar PMA.

## Anti-tujuan

- Laporan bulan lalu berubah karena Admin mengubah daftar PMA hari ini.
- DO yang dulu tercatat sebagai FOA berpindah kelompok.

## Pendekatan yang dipertimbangkan

- **A. Daftar PMA diatur Admin, status PMA disimpan di snapshot DO (dipilih).** Tabel per dealer, centang kab/kota di halaman Area & PMA, `is_pma` disimpan saat DO seperti `is_foa`. Konsisten dengan FOA dan histori tidak tertulis ulang.
- **B. Daftar tetap di kode, dihitung saat laporan dibuka.** Lebih sedikit pekerjaan, tetapi perubahan daftar butuh rilis dan menulis ulang laporan lama. Ditolak.

## Desain

### Data

- **Master wilayah**: migration baru menambah kab/kota Kemendagri `32.14` Kabupaten Purwakarta, `32.03` Kabupaten Cianjur, `32.13` Kabupaten Subang beserta seluruh kecamatannya ke `area_regions`/`area_districts`. Sumber sama dengan master sekarang (BPS SIG kode Kemendagri). Data baru disimpan di file data tersendiri (mis. `database/data/pma-regions.json`) dan dimasukkan oleh migration baru dengan `insertOrIgnore`; `bandung-raya.json` dan migration lama tidak diubah (keputusan builder-check: aman untuk database baru maupun production). Salinan frontend `resources/js/lib/bandung-raya-districts.ts` ikut diperbarui. Catatan "106 kecamatan dari lima kabupaten/kota" di PRD/knowledge disesuaikan dengan jumlah baru.
- **Tabel `dealer_pma_regions`** (`dealer_id`, `region_code` → `area_regions.code`, primary key gabungan), cermin `dealer_foa_districts`. Migration mengisi tujuh kab/kota di atas untuk setiap dealer yang ada; `TransactionMasters` mendapat `initializePma()` untuk dealer baru, dipanggil di tempat yang sama dengan `initializeFoa()`.
- **Snapshot DO**: `TransactionSnapshots::capture` menambah `is_pma` = region DO ada di `dealer_pma_regions` dealer itu. `region_code = other` (Kota Lain) selalu `false`.
- **DO lama**: migration mengisi `area_snapshot.is_pma` sekali untuk snapshot yang sudah ada, dari `area_snapshot.region_code` terhadap daftar bawaan tujuh kab/kota. DO tanpa snapshot tetap "belum terverifikasi" seperti sekarang.

### Pengaturan Admin

Halaman Pengaturan Dealer → **Area & PMA** mendapat dua kartu:

```
[Kab/kota PMA]                     7 dipilih
  ☑ Kota Bandung   ☑ Kab. Bandung   ☑ Kab. Bandung Barat
  ☑ Kota Cimahi    ☑ Kab. Purwakarta ☑ Kab. Cianjur
  ☑ Kab. Subang    ☐ Kab. Sumedang          [Simpan PMA]

[Kecamatan FOA]                    16 dipilih
  (kartu kecamatan yang ada sekarang, label diganti FOA) [Simpan FOA]
```

Simpan PMA lewat route baru (mis. `PATCH dealer-settings/area-pma`) dan `TransactionMasters::setPma` yang meniru `setFoa`: kunci dealer, validasi kode ada di `area_regions`, audit `dealer.pma_updated` dengan sebelum/sesudah. Hanya Admin, di grup route yang sama.

### Laporan Mapping Area

Aturan kelompok (dari snapshot): `is_foa` → FOA; selain itu `is_pma` → PMA di luar FOA; selain itu → luar PMA. FOA menang walau kecamatannya berada di kab/kota yang bukan PMA. Angka "Porsi PMA" **termasuk** FOA (FOA ⊂ PMA). Semua persentase dihitung dari seluruh DO sah pada rentang filter.

Tata letak (disetujui pemilik lewat mockup 20 Nov 2026). Di layar lebar, kartu tampil dua kolom; di HP, satu kolom dengan urutan sama. Diagram pie yang ada sekarang diganti.

```
[Total DO 120]  [Porsi FOA 65% · 78 DO, ditonjolkan]  [Porsi PMA 90% · 108 DO, termasuk FOA]

FOA · kecamatan KBB — ukuran penilaian dealer
┌ Porsi DO di FOA       [Unduh▾] ┐ ┌ DO per kecamatan FOA      [Unduh▾] ┐
│ donut FOA 65% / di luar FOA    │ │ 8 teratas dari kecamatan FOA       │
│ tren porsi FOA per bulan (bar) │ │ FOA tanpa DO tampil 0 (merah)      │
└────────────────────────────────┘ │ [Lihat semua N kecamatan]          │
                                   │ Kecamatan lain 42 (abu, paling bawah)│
                                   └────────────────────────────────────┘
PMA · kab/kota — wilayah yang masih digarap
┌ Porsi DO di PMA       [Unduh▾] ┐ ┌ DO per kab/kota           [Unduh▾] ┐
│ donut PMA 90% / luar PMA       │ │ kab/kota PMA dulu, lalu luar PMA   │
│ tren porsi PMA per bulan (bar) │ │ PMA tanpa DO tampil 0 (merah)      │
└────────────────────────────────┘ │ luar PMA dan Kota Lain abu-abu     │
                                   └────────────────────────────────────┘
```

Rincian:
- **Kecamatan lain** = semua DO yang bukan FOA, termasuk Kota Lain, sehingga total kartu kecamatan sama dengan donut FOA.
- **Daftar PMA yang ditampilkan**: semua kecamatan FOA dan semua kab/kota PMA milik dealer ikut tampil walau tanpa DO (angka 0 merah), karena menunjukkan wilayah yang belum tergarap. Daftar ini diambil dari pengaturan dealer **saat ini**; jumlah DO tetap dari snapshot. Kab/kota luar PMA hanya muncul jika punya DO.
- **Tren per bulan**: porsi FOA dan porsi PMA untuk tiap bulan dalam rentang filter.
- **Unduhan**: setiap kartu memakai `ChartExportMenu` yang sudah ada (PNG dan CSV). PNG kartu donut memuat donut dan trennya; CSV-nya memuat angka per bulan. CSV kecamatan memuat semua kecamatan FOA ditambah "Kecamatan lain". CSV menyertakan kelompok "PMA di luar FOA" agar angkanya bisa dicocokkan.
- Tabel rincian di bawah grafik yang ada sekarang dihapus karena isinya sama dengan CSV (keputusan builder; kembalikan jika pemilik meminta).
- `TransactionReports::mappingArea` mengembalikan total, `foa`, `pmaOutsideFoa`, `outsidePma`, `unverified`, baris kecamatan FOA (+ "Kecamatan lain"), baris kab/kota, dan seri bulanan. Preview sintetis `area-preview.ts` disesuaikan agar bentuknya sama. `chart-export-png.ts` dan catatan kakinya mengikuti kartu baru.

### Dokumen

PRD ANL-10 dan bagian 8, `knowledge.md` (entri PMA dan FOA dipisah), `memory.md` (catatan pembaruan 20 November yang mengoreksi catatan 17 November), serta manual pengguna yang menyebut PMA.

## Diserahkan ke builder

- Mengambil daftar kecamatan resmi tiga kabupaten baru dari sumber BPS yang sama dan mencatat tanggal snapshot di file data.
- Tata letak persis tabel kab/kota dan urutannya (saran: jumlah DO terbanyak dulu, Kota Lain terakhir).
- Nama route/komponen, selama mengikuti pola `area-foa`.
- Memperbarui selector di `tests/Browser` dan test Feature/Frontend yang menyebut label lama.
