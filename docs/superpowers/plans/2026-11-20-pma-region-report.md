# PMA Kab/Kota dan Laporan FOA/PMA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pisahkan FOA (kecamatan) dan PMA (kab/kota) dan tambah laporan Mapping Area yang menampilkan porsi FOA dan porsi PMA.

**Architecture:** Daftar PMA disimpan per dealer di tabel `dealer_pma_regions`, cermin dari `dealer_foa_districts`. Saat DO, status `is_pma` ikut dikunci di `area_snapshot`, sama seperti `is_foa`. `TransactionReports::mappingArea` menghitung kelompok, baris kecamatan, baris kab/kota, dan seri bulanan dari snapshot. Halaman `analytics/mapping-area` merender empat kartu yang masing-masing memakai `ChartExportMenu`.

**Tech Stack:** Laravel 12 + Inertia React (TSX), PostgreSQL, Pest, Node test runner (`tests/Frontend`), browser suite `tests/Browser`.

**Spec:** `docs/superpowers/specs/2026-11-20-pma-region-report-design.md`

## Global Constraints

- Kerjakan di branch `feat/pma-region-report`, kirim lewat PR. Commit memakai Conventional Commits **tanpa** trailer `Co-Authored-By: Claude`. Stage file dengan path persis, karena checkout ini dipakai bersama sesi lain.
- Identifier `foa` yang sudah ada **tidak** di-rename: `dealer_foa_districts`, `is_foa`, `dealer.foa_updated`, route `area-foa`.
- Default PMA per dealer: `['32.73', '32.04', '32.17', '32.77', '32.14', '32.03', '32.13']`.
- Kode kab/kota baru: `32.14` Kabupaten Purwakarta, `32.03` Kabupaten Cianjur, `32.13` Kabupaten Subang.
- Migration lama dan `database/data/bandung-raya.json` tidak diubah.
- `region_code = 'other'` (Kota Lain) selalu `is_pma = false` dan `is_foa = false`.
- Kelompok: `is_foa` → FOA. Selain itu, `is_pma` → PMA di luar FOA. Selain itu → luar PMA. Porsi PMA = FOA + PMA di luar FOA.
- Teks UI memakai istilah "FOA" untuk kecamatan dan "PMA" untuk kab/kota. Menu tetap bernama "Area & PMA".
- Sebelum menjalankan `tests/Browser`, hentikan `public/hot` (lihat memory "Browser suite and shared checkout").
- Frontend: `npm run check`, `npm run types:check`, dan `npm run test:frontend` harus lulus. Selector di `tests/Browser` diperbarui bersama perubahan UI.

## Review Focus

1. **Admin mencabut kab/kota dari PMA setelah ada DO.** DO lama tetap terhitung PMA karena memakai snapshot. Di kartu kab/kota, baris itu pindah ke kelompok luar PMA karena daftar diambil dari pengaturan saat ini. *(Task 3, test `keeps snapshot PMA after the list changes`)*
2. **Kecamatan FOA berada di kab/kota yang bukan PMA.** DO dari sana masuk FOA dan ikut dihitung di Porsi PMA. *(Task 3, test `counts FOA first even outside PMA regions`)*
3. **Rentang tanpa DO.** Semua angka 0 dan tidak ada pembagian dengan nol. `months` tetap berisi satu entri per bulan. Kecamatan FOA dan kab/kota PMA tetap tampil dengan angka 0. *(Task 3, test `returns zero rows for an empty range`)*
4. **DO lama tanpa snapshot.** Dihitung sebagai `unverified` dan tidak masuk kelompok mana pun. *(Task 3, test `ignores legacy DO without snapshot`)*
5. **Pelanggan atau transaksi memilih kecamatan baru.** Contohnya Purwakarta `32.14.01`. Validasi area harus menerimanya, dan DO membuat snapshot dengan `is_pma = true`. *(Task 2, test `snapshots PMA for a new Purwakarta district`)*

---

### Task 1: Master wilayah Purwakarta, Cianjur, Subang

**Files:**
- Create: `database/data/pma-regions.json`
- Create: `database/migrations/2026_11_20_100000_add_pma_area_regions.php`
- Test: `tests/Feature/Pipeline/AreaMasterExtensionTest.php`

**Interfaces:**
- Produces: baris `area_regions` dan `area_districts` untuk `32.14`, `32.03`, `32.13`. Formatnya sama dengan `bandung-raya.json`: `{source, regions:[{code,name}], districts:[{code,name,region_code}]}`.

- [ ] **Step 1: Ambil data resmi.** Ambil dari `https://sig.bps.go.id/rest-bridging-dagri/getwilayah?level=kecamatan&parent=<kode>` untuk ketiga kode. Simpan di `pma-regions.json`, dengan `source` berisi `"BPS SIG kode Kemendagri, snapshot 2026-11-20"`. Nama kab/kota memakai format penuh, misalnya `"Kabupaten Purwakarta"`. Catat jumlah kecamatan per kab/kota di pesan commit.
- [ ] **Step 2: Tulis test yang gagal.**

```php
it('adds Purwakarta, Cianjur and Subang with their districts', function () {
    expect(DB::table('area_regions')->whereIn('code', ['32.14', '32.03', '32.13'])->pluck('name')->sort()->values()->all())
        ->toBe(['Kabupaten Cianjur', 'Kabupaten Purwakarta', 'Kabupaten Subang']);
    $json = json_decode(file_get_contents(database_path('data/pma-regions.json')), true);
    expect(DB::table('area_districts')->whereIn('region_code', ['32.14', '32.03', '32.13'])->count())->toBe(count($json['districts']));
});
```

- [ ] **Step 3: Jalankan test.** Perintah: `vendor/bin/pest tests/Feature/Pipeline/AreaMasterExtensionTest.php`. Hasil yang diharapkan: FAIL.
- [ ] **Step 4: Tulis migration.** Migration membaca `pma-regions.json`, lalu memanggil `insertOrIgnore` ke `area_regions` dan setelah itu ke `area_districts`. `down()` menghapus ketiga kab/kota hanya jika belum dipakai transaksi atau pelanggan, karena ada FK restrict yang akan menolak.
- [ ] **Step 5: Jalankan test lagi.** Hasil yang diharapkan: PASS. Jalankan juga `vendor/bin/pest tests/Feature/Admin/DealerSettingsTest.php`. Jika ada test yang menghitung "106 kecamatan", ubah angkanya ke total baru.
- [ ] **Step 6: Commit** dengan pesan `feat(area): add Purwakarta, Cianjur and Subang to the area master`.

### Task 2: Daftar PMA per dealer, pengaturan Admin, dan snapshot `is_pma`

**Files:**
- Create: `database/migrations/2026_11_20_110000_create_dealer_pma_regions.php`
- Modify: `app/Services/TransactionMasters.php` (tambah `initializePma`, `setPma`, dan konstanta `DEFAULT_PMA_REGIONS`)
- Modify: `app/Models/Dealer.php:22` (panggil `initializePma` di sebelah `initializeFoa`)
- Modify: `app/Services/TransactionSnapshots.php` (tambah `is_pma`)
- Modify: `app/Http/Controllers/DealerSettingsController.php` (prop `pma`, method `updatePma`)
- Modify: `routes/web.php:121` (route baru)
- Modify: `resources/js/pages/dealer-settings/index.tsx`
- Test: `tests/Feature/Admin/DealerSettingsTest.php`, `tests/Feature/Pipeline/TransactionFoundationTest.php`

**Interfaces:**
- Consumes: kode wilayah dari Task 1.
- Produces:
  - Tabel `dealer_pma_regions(dealer_id FK dealers restrict, region_code FK area_regions restrict, PK [dealer_id, region_code])`.
  - `TransactionMasters::DEFAULT_PMA_REGIONS: list<string>`.
  - `TransactionMasters::initializePma(int $dealerId): void`.
  - `TransactionMasters::setPma(User $actor, array $regions): void`, dengan audit `dealer.pma_updated` berisi `['regions' => before]` dan `['regions' => after]`.
  - Route `PATCH /dealer-settings/area-pma`, nama `dealer-settings.area-pma`, body `{regions: string[]}`.
  - Prop Inertia `pma: string[]`.
  - `area_snapshot.is_pma: bool`.

- [ ] **Step 1: Tulis test yang gagal di `DealerSettingsTest.php`.**
  - `seeds the default PMA regions for a new dealer`: dealer baru dibuat dengan factory, lalu `dealer_pma_regions` miliknya berisi persis `DEFAULT_PMA_REGIONS`.
  - `stores the dealer PMA selection with audit and replaces it wholesale`: meniru test FOA yang sudah ada. Admin mengirim PATCH `['regions' => ['32.73', '32.11']]`, lalu tabel berisi tepat dua baris itu. Audit `dealer.pma_updated` tercatat. Kode `'99.99'` ditolak dengan error validasi `regions.0`.
  - Tambahkan `/dealer-settings/area-pma` ke test `rejects master writes from non-Admin roles`.
- [ ] **Step 2: Tulis test yang gagal di `TransactionFoundationTest.php`.**
  - `snapshots PMA for a new Purwakarta district`: buat DO dengan `region_code 32.14`, `district_code` = kecamatan pertama `32.14` dari master. Hasilnya `area_snapshot['is_pma'] === true` dan `is_foa === false`.
  - DO dengan Kota Lain menghasilkan `is_pma === false`.
  - DO dengan Sumedang `32.11` menghasilkan `is_pma === false`.
- [ ] **Step 3: Jalankan kedua file test.** Hasil yang diharapkan: FAIL.
- [ ] **Step 4: Tulis migration.**
  - Buat tabel `dealer_pma_regions`, lalu isi `DEFAULT_PMA_REGIONS` untuk setiap dealer yang ada. Pakai daftar literal di migration, jangan panggil konstanta kelas, supaya migration tetap stabil walau kelasnya berubah.
  - Backfill: `stage_histories` dengan `area_snapshot` tidak null diproses `chunkById`. Set `is_pma = region_code ∈ daftar bawaan`. Snapshot yang sudah punya `is_pma` dilewati.
- [ ] **Step 5: Implementasi `initializePma` dan `setPma`.** Polanya sama persis dengan `initializeFoa` dan `setFoa`: lock dealer, validasi `Rule::exists('area_regions','code')`, `distinct`, hapus lalu insert ulang, kemudian audit. `region_code 'other'` ditolak karena tidak ada di `area_regions`.
- [ ] **Step 6: Tambah `is_pma` di `TransactionSnapshots::capture`.** Rumusnya `$deal->region_code !== 'other' && exists(dealer_pma_regions where dealer_id, region_code)`.
- [ ] **Step 7: Controller, route, dan halaman.**
  - `updatePma` meniru `updateFoa`, dengan validasi `['regions' => ['present', 'array']]`.
  - `dealer-settings/index.tsx`:
    - Tambah kartu **"Kab/kota PMA"** di atas kartu kecamatan. Isinya checkbox per `regions`, penghitung "N dipilih", dan tombol **"Simpan PMA"**.
    - Ganti judul kartu kecamatan menjadi **"Kecamatan FOA"** dan tombolnya menjadi **"Simpan FOA"**.
    - Ganti deskripsinya: "Tandai kecamatan FOA dealer. Bawaan sementara: seluruh Kabupaten Bandung Barat".
    - Regenerate file Wayfinder `resources/js/actions` dan `resources/js/routes` dengan cara yang dipakai repo ini.
- [ ] **Step 8: Jalankan test.** Perintah: `vendor/bin/pest tests/Feature/Admin tests/Feature/Pipeline`, `npm run check`, `npm run types:check`. Hasil yang diharapkan: PASS.
- [ ] **Step 9: Commit** dengan pesan `feat(area): let Admin manage PMA regions and snapshot PMA at DO`.

### Task 3: Data laporan Mapping Area

**Files:**
- Modify: `app/Services/TransactionReports.php` (`mappingArea`)
- Test: `tests/Feature/Reports/FinancingAndAreaReportTest.php` (ganti test `maps DO by snapshot FOA…`)

**Interfaces:**
- Consumes: `area_snapshot.is_foa`, `area_snapshot.is_pma`, `dealer_foa_districts`, `dealer_pma_regions`.
- Produces: prop `report` dengan bentuk berikut. Prop lama `rows` dan `other` dihapus.

```php
[
  'from' => string, 'to' => string,
  'total' => int, 'foa' => int, 'pmaOutsideFoa' => int, 'outsidePma' => int, 'unverified' => int,
  // semua kecamatan FOA dealer saat ini (termasuk 0), urut count desc lalu nama; lalu ['id'=>'other','name'=>'Kecamatan lain'] terakhir
  'districts' => list<array{id: string, name: string, regionName: string, count: int}>,
  // kab/kota PMA saat ini (termasuk 0) urut count desc lalu nama; lalu non-PMA dengan count > 0; lalu ['id'=>'other','name'=>'Kota Lain'] jika count > 0
  'regions' => list<array{id: string, name: string, isPma: bool, count: int}>,
  // satu entri per bulan Asia/Jakarta dalam rentang, termasuk bulan kosong; pma = foa + pmaOutsideFoa
  'months' => list<array{month: string /* Y-m */, total: int, foa: int, pma: int}>,
]
```

- `districts` dikelompokkan menurut `district_code` snapshot. DO yang `is_foa=false` masuk `other`. DO dengan `is_foa=true` yang kecamatannya sudah dicabut dari FOA tetap tampil sebagai baris sendiri, karena histori tidak diwarnai ulang.
- `regions` dikelompokkan menurut `region_code` snapshot. `isPma` diambil dari daftar dealer **saat ini**. Nama kab/kota diambil dari `region_name` snapshot, atau dari master untuk baris yang count-nya 0.

- [ ] **Step 1: Tulis test yang gagal.** Pakai helper `rDeal`, `rMove`, dan `DO_OK` yang sudah ada.
  - `maps DO into FOA, PMA outside FOA and outside PMA`:
    - Data: FOA diatur ke `['32.73.05']`, PMA memakai bawaan. DO dibuat untuk Andir ×2, `32.73.03`, Sumedang (kecamatan pertama `32.11`), dan Kota Lain Jakarta.
    - Harapan: `total 5`, `foa 2`, `pmaOutsideFoa 1`, `outsidePma 2`, `districts.0` Andir count 2, baris `districts` terakhir `id other` count 3, `regions.0.id '32.73'` count 3 dengan `isPma true`, ada baris `32.11` dengan `isPma false` count 1, baris terakhir `regions` adalah `other` count 1.
  - `keeps snapshot PMA after the list changes`: setelah DO di `32.77`, panggil `setPma([])`. `pmaOutsideFoa` tetap 1, dan baris `32.77` sekarang `isPma false`.
  - `counts FOA first even outside PMA regions`: FOA diisi satu kecamatan Sumedang, lalu buat DO di sana. Hasilnya `foa 1`, `pmaOutsideFoa 0`, `outsidePma 0`, dan `months.0.pma 1`.
  - `returns zero rows for an empty range`: rentang `2026-01` s.d. `2026-03`. Hasilnya `total 0`, `months` panjang 3 dengan semua angka 0, setiap kab/kota PMA ada dengan count 0, dan `districts` berakhir dengan `other` count 0.
  - `ignores legacy DO without snapshot`: set `area_snapshot` ke null langsung di DB. Hasilnya `unverified 1` dan `total 0`.
  - `splits months in Asia/Jakarta`: DO pada `2026-10-31 18:00:00` UTC jatuh di bulan `2026-11`.
- [ ] **Step 2: Jalankan test.** Perintah: `vendor/bin/pest tests/Feature/Reports/FinancingAndAreaReportTest.php`. Hasil yang diharapkan: FAIL.
- [ ] **Step 3: Implementasi `mappingArea`.** Satu query `realizedDo(...)->get(['area_snapshot', 'created_at'])`, lalu diagregasi di PHP. Batas `ReportingPeriod::MAX_MONTHS` yang sudah ada tetap berlaku.
- [ ] **Step 4: Jalankan test lagi.** Hasil yang diharapkan: PASS. Jalankan juga `vendor/bin/pest tests/Feature/AnalyticsTest.php`, lalu perbaiki assertion yang masih memakai `rows` atau `other`.
- [ ] **Step 5: Commit** dengan pesan `feat(reports): split mapping area into FOA and PMA with monthly share`.

### Task 4: Halaman laporan dan unduhan PNG/CSV

**Files:**
- Modify: `resources/js/components/mapping-area/report.tsx` (tulis ulang isi setelah `FilterPanel`)
- Modify: `resources/js/lib/chart-export.ts`
- Modify: `resources/js/lib/chart-export-png.ts`
- Modify: `resources/js/pages/analytics/mapping-area.tsx:21` (subjudul)
- Test: `tests/Frontend/chart-export.test.mjs`

**Interfaces:**
- Consumes: bentuk `report` dari Task 3. `AreaReportData` di `report.tsx` diganti mengikuti bentuk itu.
- Produces:
  - `ChartExportKind` diperluas menjadi `'financing' | 'leasing' | 'area-foa' | 'area-foa-districts' | 'area-pma' | 'area-pma-regions'`. `'area'` dihapus.
  - Baris ekspor mendapat field opsional `base?: number`, yang menjadi `total_acuan` dan dasar persentase untuk baris itu. Default-nya `chart.total`.
  - `makeAreaChartExports(meta: ChartExportMeta, report: AreaReportData): Record<'foa' | 'foaDistricts' | 'pma' | 'pmaRegions', ChartExportData>`, menggantikan `makeAreaChartExport`.
  - Slug `chartFilename`: `porsi-foa`, `do-kecamatan-foa`, `porsi-pma`, `do-kab-kota`.

Isi ekspor:

| kind | title | rows |
|---|---|---|
| `area-foa` | `Porsi DO di FOA` | `FOA`, `Di luar FOA`, `PMA di luar FOA`, lalu satu baris per bulan `FOA <Y-m>` dengan `base` = total bulan itu |
| `area-foa-districts` | `DO per kecamatan FOA` | semua `districts` (termasuk `Kecamatan lain`) |
| `area-pma` | `Porsi DO di PMA` | `Dalam PMA`, `Luar PMA`, `PMA di luar FOA`, lalu `PMA <Y-m>` per bulan dengan `base` |
| `area-pma-regions` | `DO per kab/kota` | semua `regions` |

- [ ] **Step 1: Tulis test yang gagal di `chart-export.test.mjs`.**
  - `makeAreaChartExports` dengan report contoh (total 120, foa 78, pmaOutsideFoa 30, outsidePma 12, dua bulan) menghasilkan:
    - `foa.rows[0]` dengan `{label:'FOA', count:78, percentage:65}`,
    - baris bulanan dengan `percentage` dihitung dari `base`,
    - `chartFilename(foa,'csv')` bernilai `porsi-foa-realisasi-do-<from>_<to>.csv`,
    - `chartCsv` untuk baris bulanan dengan `total_acuan` = `base`.
  - Report dengan total 0 tidak menghasilkan `NaN`.
- [ ] **Step 2: Jalankan test.** Perintah: `npm run test:frontend`. Hasil yang diharapkan: FAIL.
- [ ] **Step 3: Implementasi di `chart-export.ts`.** Kerjakan `makeAreaChartExports`, slug baru, dan dukungan `base` di `chartCsv`. Untuk `chartRowColor`, area dipetakan sebagai berikut:
  - FOA dan baris kecamatan FOA: `#1769e0`,
  - PMA: `#0f766e`,
  - `other`, `Di luar FOA`, `Luar PMA`, dan kab/kota non-PMA: `#526175`.
- [ ] **Step 4: Implementasi di `chart-export-png.ts`.**
  - `area-foa` dan `area-pma` memakai jalur donut yang sudah ada dengan dua irisan: baris pertama dan kedua.
  - Di bawah legenda, tampilkan satu baris teks per bulan, misalnya `Agu 2026 · 61%`.
  - Dua kind daftar memakai jalur bar mendatar yang sudah dipakai `leasing`.
  - Catatan kaki diganti: "Persentase dihitung dari seluruh DO sah. FOA = kecamatan FOA dealer; PMA = kab/kota PMA, termasuk FOA. Status mengikuti snapshot saat DO."
- [ ] **Step 5: Implementasi `report.tsx` sesuai tata letak di spec.**
  - Ringkasan berisi Total DO, Porsi FOA (ditonjolkan dengan meter), dan Porsi PMA ("termasuk FOA").
  - Bagian berjudul **"FOA · kecamatan KBB"** dan **"PMA · kab/kota"**, masing-masing dengan grid `lg:grid-cols-2`.
  - Kartu donut berisi donut SVG dan bar tren bulanan.
  - Kartu kecamatan menampilkan 8 baris teratas dengan tombol **"Lihat semua N kecamatan"** (toggle lokal). Baris `Kecamatan lain` selalu terakhir dan berwarna abu-abu. Baris FOA dengan count 0 memakai `text-destructive`.
  - Kartu kab/kota menampilkan PMA lalu non-PMA. Baris PMA dengan count 0 memakai `text-destructive`, dan baris non-PMA berwarna abu-abu.
  - Setiap kartu punya `<ChartExportMenu chart={exports.x} />`.
  - Tabel rincian yang lama dihapus.
  - Teks `unverified` dan state kosong yang lama dipertahankan.
  - Ganti subjudul halaman menjadi "Penjualan DO berdasarkan FOA dan PMA."
- [ ] **Step 6: Jalankan pemeriksaan.** Perintah: `npm run check`, `npm run types:check`, `npm run test:frontend`. Hasil yang diharapkan: PASS.
- [ ] **Step 7: Perbarui `tests/Browser`.**
  - `exports-real.js:118-150`: menu menjadi keempat judul di atas. Total CSV dicocokkan dengan `report.total` untuk `porsi-foa` dan `do-kecamatan-foa`.
  - `acceptance-flow.js` dan `transactions-financing-roles.js`: ganti selector label "PMA" untuk kecamatan menjadi "FOA".
  - Hentikan `public/hot`, lalu jalankan `tests/Browser/run-isolated.ps1` untuk ketiga file itu. Hasil yang diharapkan: PASS.
- [ ] **Step 8: Commit** dengan pesan `feat(reports): FOA and PMA cards with PNG and CSV export`.

### Task 5: Dokumen dan istilah

**Files:**
- Modify: `docs/agents/PRD.md` (ANL-10 dan bagian 8, baris sekitar 298 dan 310–314)
- Modify: `docs/agents/knowledge.md:97` (pisahkan entri PMA dan FOA)
- Modify: `docs/agents/memory.md` (bagian baru "Pembaruan 20 November 2026 — FOA kecamatan, PMA kab/kota" yang mengoreksi catatan 17 November tanpa menghapusnya)
- Modify: manual pengguna yang menyebut PMA atau Mapping Area (cari dengan `rg -n "PMA|Mapping Area" docs`)
- Modify: `docs/agents/README.md` jika ada file agent baru

- [ ] **Step 1: Perbarui PRD.** Ganti "106 kecamatan dari lima kabupaten/kota" dengan jumlah baru dari Task 1, lalu masukkan aturan kelompok dari Global Constraints.
- [ ] **Step 2: Periksa sisa label lama.** Jalankan `rg -n "Kecamatan PMA|Dalam PMA|non-PMA" resources docs tests`. Hasil yang diharapkan: tidak ada sisa yang bermakna kecamatan.
- [ ] **Step 3: Commit** dengan pesan `docs(area): separate FOA districts from PMA regions`.

## Catatan untuk builder

- `resources/js/lib/area-preview.ts` dan `bandung-raya-districts.ts` hanya dipakai oleh `tests/Frontend/area-preview.test.mjs` dan tidak dipakai UI. Biarkan keduanya, walaupun spec menyebutnya, karena tidak ada pengguna yang melihat. Jangan sampai test itu ikut rusak.
- Entri release log, versi, dan ADR tidak termasuk rencana ini. Ikuti alur rilis yang biasa setelah PR digabung.
