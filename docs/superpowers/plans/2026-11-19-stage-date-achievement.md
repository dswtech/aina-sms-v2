# Capaian per Tahap Berdasarkan Tanggal Tahap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setiap tahap transaksi punya tanggal sah yang dipakai bersama oleh filter daftar Transaksi, tabel Capaian per tahap (Analisis dan Beranda Supervisor), dan Analisis mode Pencapaian.

**Architecture:** Aturan tanggal sah tinggal di satu tempat. `StageHistory::scopeEffectiveFor()` menangani tiga syarat: bukan koreksi, DO terealisasi, dan tidak gugur. `DealTransaction::scopeReachedStage()` membungkusnya dan menambahkan fallback untuk transaksi lama tanpa riwayat. Daftar Transaksi, service baru `StageAchievements`, dan `AnalyticsController` (mode Pencapaian) hanya memakai scope ini, jadi angka dan daftar cocok dengan sendirinya. Tidak ada kolom atau migrasi baru.

**Tech Stack:** Laravel 12, Inertia + React, Pest, SQLite (test) / PostgreSQL (produksi), `vp check` untuk frontend.

**Spec:** `docs/superpowers/specs/2026-11-19-stage-date-achievement-design.md`

## Global Constraints

- Tanggal sah = baris `stage_histories` dengan `reverses_stage_history_id` null; untuk DO juga wajib `realizedDo`; dan tidak gugur. Baris tahap terbuka S gugur bila ada baris non-koreksi lain pada transaksi yang sama yang dibuat **sesudahnya** dan `to_stage`-nya punya `openRank` lebih kecil dari `openRank(S)`. DO, Delivery, dan Lost tidak pernah gugur.
- Gugur berlaku surut. Tidak ada pengecualian per bulan.
- Transaksi tanpa riwayat tahap sama sekali dihitung sebagai satu kejadian: `current_stage` pada `created_at`.
- Satu transaksi dihitung satu kali per tahap per periode. Tahap yang dilompati tidak diisi.
- Batas hari dan bulan mengikuti Asia/Jakarta: awal inklusif, akhir eksklusif.
- Grafik Pipeline Dashboard (`stageCounts`), forecast, dan mode Akuisisi Analisis **tidak berubah**.
- Teks UI dalam bahasa Indonesia. Label filter baru: "Rentang tanggal tahap". Judul tabel: "Capaian per tahap". Menu: "Capaian Sales".
- Kerjakan di branch `feat/stage-date-achievement` dari `main`, lewat worktree, karena checkout ini dipakai bersama sesi lain. Stage hanya path yang persis. Jangan stage `.claude/`, `.superpowers/`, `skills-lock.json`.
- Conventional Commits. Jalankan tes yang relevan sebelum setiap commit (`php artisan test --compact --filter=...`; frontend `pnpm run check` dan `pnpm run types:check`).
- Jangan menjalankan migration, seeder, atau write lain ke database non-test.

## Review Focus

- Dua baris riwayat dengan `created_at` sama persis (impor, atau klik beruntun dalam detik yang sama): urutannya ditentukan oleh `id`, jadi mundur yang tercatat belakangan tetap menggugurkan baris sebelumnya.
- Transaksi lama tanpa riwayat tetapi `current_stage = spk`: muncul di filter "SPK" pada tanggal `created_at`, dan tidak muncul di filter "Lead".
- DO dibatalkan lalu DO ulang: hanya DO ulang yang terhitung, dan SPK sebelumnya tetap sah.
- Rentang tanggal dikosongkan dengan tahap terpilih: tampil semua transaksi yang pernah mencapai tahap itu secara sah, tanpa error karena batas null.
- Sales tanpa capaian sama sekali di periode tetap tampil sebagai baris nol untuk Supervisor-nya, karena tujuannya mendorong Sales.

Tes untuk setiap poin ini ditambahkan di task pemiliknya (Task 1, 3).

---

### Task 1: Scope tanggal tahap sah

**Files:**
- Modify: `app/Models/StageHistory.php`
- Modify: `app/Models/DealTransaction.php`
- Test: `tests/Feature/Pipeline/StageDateEffectiveTest.php` (baru)

**Interfaces:**
- Produces:
  - `StageHistory::scopeEffectiveFor(Builder $query, PipelineStage $stage): void`. Membatasi ke `to_stage = $stage` yang sah (tiga syarat di Global Constraints).
  - `DealTransaction::scopeReachedStage(Builder $query, ?PipelineStage $stage, ?CarbonInterface $start, ?CarbonInterface $end): void`. Transaksi yang punya tanggal sah tahap `$stage` dalam `[$start, $end)`. `$stage` null berarti tahap apa pun (termasuk Lost). Batas null berarti tanpa batas. Fallback: transaksi tanpa `stageHistories` sama sekali cocok bila `current_stage` sesuai dan `created_at` ada dalam rentang.

- [ ] **Step 1: Tulis tes yang gagal** di `StageDateEffectiveTest.php`. Buat fixture transaksi dengan baris `stage_histories` yang `created_at`-nya diisi eksplisit (UTC = WIB − 7 jam). Tes:
  - `it('keeps the owner example: lead 5, hot 7 voided by prospect 9, hot 15, spk 20')`. Untuk November 2026, `reachedStage(Lead|Prospect|HotProspect|Spk, 1 Nov, 1 Des)` masing-masing cocok. `reachedStage(HotProspect, 7 Nov, 8 Nov)` tidak cocok. `reachedStage(HotProspect, 15 Nov, 16 Nov)` cocok.
  - `it('voids retroactively across months')`: SPK 28 Okt, lalu Hot 3 Nov. `reachedStage(Spk, 1 Okt, 1 Nov)` tidak cocok.
  - `it('drops everything above the backward target')`: Hot 15, SPK 20, lalu Prospect 25. Hot dan SPK tidak cocok, Lead dan Prospect cocok.
  - `it('counts only the redo after a cancelled DO and keeps SPK')`: SPK, DO (checklist lengkap), koreksi (baris dengan `reverses_stage_history_id` ke DO, `to_stage` SPK), lalu DO ulang. `reachedStage(Do)` dalam rentang DO pertama tidak cocok, dalam rentang DO ulang cocok. `reachedStage(Spk)` dalam rentang SPK asli cocok.
  - `it('does not fill skipped stages')`: Lead lalu SPK. `reachedStage(Prospect, null, null)` tidak cocok.
  - `it('orders same-second rows by id')`: Hot dan Prospect dengan `created_at` sama, Prospect ber-id lebih besar. Hot tidak cocok.
  - `it('falls back to current stage on created_at for deals without history')`: `current_stage = spk`, tanpa riwayat. Cocok dengan `reachedStage(Spk)` pada hari `created_at`, tidak cocok dengan `reachedStage(Lead)`.
  - `it('honours Jakarta day bounds')`: baris pada `2026-11-04 16:59:59` UTC masuk hari 4 Nov WIB, sedangkan `17:00:00` masuk 5 Nov.
  - `it('matches any stage when stage is null')`: transaksi dengan Lost pada rentang cocok dengan `reachedStage(null, ...)`.

- [ ] **Step 2: Jalankan dan pastikan gagal**
  Run: `php artisan test --compact --filter=StageDateEffectiveTest`
  Expected: FAIL (`Call to undefined method ... reachedStage`).

- [ ] **Step 3: Implementasikan kedua scope.** `effectiveFor`: `whereNull('reverses_stage_history_id')`, lalu `realizedDo()` bila `$stage === Do`. Kalau tidak, `where('to_stage', $stage)`. Bila `$stage->openRank() !== null`, tambahkan `whereNotExists` dengan alias `later` pada transaksi yang sama, `later.reverses_stage_history_id` null, `later.to_stage` ada dalam daftar tahap yang `openRank`-nya lebih kecil (dihitung di PHP dari `PipelineStage::cases()`), dan (`later.created_at > created_at` OR (`=` AND `later.id > id`)). Pola alias sama dengan `scopeNotReversed`. Kalau daftar tahap lebih rendah kosong (Lead), lewati `whereNotExists`. `reachedStage`: `where(fn => whereHas('stageHistories', effectiveFor + rentang created_at) OR (doesntHave('stageHistories') AND current_stage AND rentang created_at))`. Untuk `$stage` null, OR-kan `whereHas` per `PipelineStage::cases()`, termasuk Lost lewat `where('to_stage', Lost)` dengan `reverses` null.

- [ ] **Step 4: Jalankan dan pastikan lulus**
  Run: `php artisan test --compact --filter=StageDateEffectiveTest`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/Models/StageHistory.php app/Models/DealTransaction.php tests/Feature/Pipeline/StageDateEffectiveTest.php docs/superpowers/specs/2026-11-19-stage-date-achievement-design.md docs/superpowers/plans/2026-11-19-stage-date-achievement.md
  git commit -m "feat(pipeline): add effective stage date scopes"
  ```

### Task 2: Filter daftar Transaksi memakai tanggal tahap

**Files:**
- Modify: `app/Http/Controllers/TransactionController.php:128-160` (`filtered()`)
- Modify: `resources/js/pages/transactions/index.tsx:418` (label)
- Modify: `tests/Feature/TransactionFiltersTest.php`
- Modify: `tests/Browser/*` yang memakai label "Rentang progress" (cari dengan `grep -rn "Rentang progress" tests/Browser`)
- Modify: `docs/agents/PRD.md` (CRM-06, plus paragraf aturan tanggal tahap sah di kontrak tambahan bagian Transaksi)

**Interfaces:**
- Consumes: `DealTransaction::scopeReachedStage` (Task 1).

- [ ] **Step 1: Tulis tes yang gagal** di `TransactionFiltersTest.php`:
  - `it('lists a DO deal under its lead date')`: riwayat Lead 5 Nov, …, DO 10 Nov (realized). `GET /transactions?stage=lead&date_from=2026-11-05&date_to=2026-11-05` mengembalikan transaksi itu. `stage=do` dengan tanggal yang sama tidak mengembalikannya.
  - `it('hides a voided stage date from the list')`: Hot 7, lalu Prospect 9. `stage=hot_prospect&date_from=2026-11-07&date_to=2026-11-07` kosong.
  - `it('lists any deal with a stage date in range when stage is empty')`.
  - `it('lists every deal that ever reached a stage when the range is empty')`: `stage=spk&date_from=&date_to=`.
  - Tes lama `filters progress dates inclusively...` harus tetap lulus tanpa diubah, lewat fallback tanpa riwayat. Kalau gagal, perbaiki implementasi, bukan tesnya.

- [ ] **Step 2: Jalankan dan pastikan gagal**
  Run: `php artisan test --compact --filter=TransactionFiltersTest`
  Expected: FAIL pada tes baru.

- [ ] **Step 3: Ubah `filtered()`.** Hapus dua `where('progress_at', ...)` dan `where('current_stage', $stage)`. Ganti dengan satu `$query->reachedStage($stageEnum, $start, $end)`, di mana `$start` dan `$end` adalah batas hari Jakarta dalam UTC (cara hitungnya sama dengan sekarang) atau null. Panggil scope ini bila salah satu dari tahap, `date_from`, atau `date_to` terisi. Tab, urutan `progress_at`, kolom, dan CSV tidak diubah. Ganti label menjadi "Rentang tanggal tahap".

- [ ] **Step 4: Jalankan dan pastikan lulus**
  Run: `php artisan test --compact --filter="TransactionFiltersTest|TransactionListContractTest|TransactionPageTest"`, lalu `pnpm run check`
  Expected: PASS.

- [ ] **Step 5: Perbarui PRD CRM-06 dan selector Browser test, lalu commit**
  ```bash
  git add app/Http/Controllers/TransactionController.php resources/js/pages/transactions/index.tsx tests/Feature/TransactionFiltersTest.php docs/agents/PRD.md <file tests/Browser yang diubah>
  git commit -m "feat(transactions): filter the list by effective stage dates"
  ```

### Task 3: Service capaian per tahap per Sales

**Files:**
- Create: `app/Services/StageAchievements.php`
- Test: `tests/Feature/StageAchievementsTest.php` (baru)

**Interfaces:**
- Consumes: `DealTransaction::scopeReachedStage`, `DealTransaction::scopeVisibleInReportsTo`, `ReportingPeriod`.
- Produces: `StageAchievements::bySales(User $actor, ReportingPeriod $window): array{stages: list<string>, rows: list<array{id:int, name:string, counts: array<string,int>}>, totals: array<string,int>}`. Isi `stages` = `['lead','prospect','hot_prospect','spk','do','delivery']`, sesuai urutan kolom.

- [ ] **Step 1: Tulis tes yang gagal:**
  - `it('counts each deal once per stage it effectively reached in the period')`: contoh pemilik ditambah satu DO. Hasilnya Lead 1, Prospect 1, Hot 1, SPK 1, DO 1, Delivery 0 untuk Sales itu, dan `totals` sama.
  - `it('shows active team Sales with zero counts to their Supervisor')`.
  - `it('scopes rows like the team report')`: Supervisor tim lain tidak melihat Sales ini, sedangkan Branch Manager dan Admin dealer melihatnya.
  - `it('matches the transaction list for the same filter')`: untuk setiap tahap, `counts[stage]` = jumlah baris `GET /transactions?stage=…&sales_id=…&date_from=…&date_to=…` sebagai Supervisor.

- [ ] **Step 2: Jalankan dan pastikan gagal**
  Run: `php artisan test --compact --filter=StageAchievementsTest`
  Expected: FAIL (class tidak ada).

- [ ] **Step 3: Implementasikan `bySales`.** Per tahap, jalankan satu query: `DealTransaction::visibleInReportsTo($actor)->reachedStage($stage, $window->start, $window->end)`, dikelompokkan per `sales_id` dengan `count`. Baris berisi Sales aktif dalam cakupan (Supervisor: anggota aktif tim yang ia supervisi; Branch Manager dan Admin: semua Sales aktif dealer, sama dengan aturan `$usersQuery` di `TeamPerformance::build`), ditambah `sales_id` mana pun yang punya hitungan. Urutkan berdasarkan nama.

- [ ] **Step 4: Jalankan dan pastikan lulus**
  Run: `php artisan test --compact --filter=StageAchievementsTest`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/Services/StageAchievements.php tests/Feature/StageAchievementsTest.php
  git commit -m "feat(reports): compute stage achievements per Sales"
  ```

### Task 4: Halaman Analisis > Capaian Sales

**Files:**
- Modify: `routes/web.php:92-96` (grup `role:supervisor,branch_manager,admin`)
- Modify: `app/Http/Controllers/ReportController.php`
- Create: `resources/js/components/stage-achievement-table.tsx`
- Create: `resources/js/pages/analytics/stage-achievement.tsx`
- Modify: `resources/js/lib/navigation.ts:76-78` (anak menu Analisis)
- Test: `tests/Feature/Reports/StageAchievementPageTest.php` (baru)
- Modify: `docs/agents/PRD.md` (DSH-02: capaian per tahap per Sales; sebut halaman ini)

**Interfaces:**
- Consumes: `StageAchievements::bySales` (Task 3), `ReportController::range()`.
- Produces: komponen `StageAchievementTable({ data }: { data: StageAchievementData })` dengan `StageAchievementData = { stages: string[]; rows: { id: number; name: string; counts: Record<string, number> }[]; totals: Record<string, number> }`. Dipakai lagi oleh Task 6.

- [ ] **Step 1: Tulis tes yang gagal:** `GET /analytics/stage-achievement?from=2026-11&to=2026-11` sebagai Supervisor merender `analytics/stage-achievement` dengan prop `report.rows`, `report.totals`, `report.from`, dan `report.to`. Sales mendapat 403. Rentang tidak valid ditolak (pola yang sama dengan `limits analytics and report ranges to 24 months` di `AnalyticsTest`).

- [ ] **Step 2: Jalankan dan pastikan gagal**
  Run: `php artisan test --compact --filter=StageAchievementPageTest`
  Expected: FAIL (404).

- [ ] **Step 3: Implementasikan.** Route `analytics/stage-achievement` dengan nama `analytics.stage-achievement`. Method `stageAchievement()` di `ReportController` meniru `mappingArea()`: `range()`, lalu `bySales($actor, new ReportingPeriod($from, $to))`, ditambah `from` dan `to`. Halaman mengikuti pola `pages/analytics/mapping-area.tsx`, dengan `FilterPanel` + `MonthRangeFields` dan judul "Capaian Sales". Tabel: kolom Sales, Lead, Prospect, Hot Prospect, SPK, DO, Delivery, plus baris Total. Label tahap memakai `stageLabel()` dari `components/team-performance`. Tambahkan menu `{ title: 'Capaian Sales', href: '/analytics/stage-achievement' }`.

- [ ] **Step 4: Jalankan dan pastikan lulus**
  Run: `php artisan test --compact --filter=StageAchievementPageTest`, lalu `pnpm run check && pnpm run types:check`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add routes/web.php app/Http/Controllers/ReportController.php resources/js/components/stage-achievement-table.tsx resources/js/pages/analytics/stage-achievement.tsx resources/js/lib/navigation.ts tests/Feature/Reports/StageAchievementPageTest.php docs/agents/PRD.md
  git commit -m "feat(analytics): add Capaian Sales stage achievement page"
  ```

### Task 5: Analisis mode Pencapaian ikut aturan gugur

**Files:**
- Modify: `app/Http/Controllers/AnalyticsController.php:95-123` (`buildAnalytics`)
- Modify: `tests/Feature/AnalyticsTest.php`
- Modify: `docs/agents/PRD.md` (ANL-05)

**Interfaces:**
- Consumes: `StageHistory::scopeEffectiveFor`, `DealTransaction::scopeReachedStage` (Task 1).

- [ ] **Step 1: Tulis tes yang gagal** `it('drops voided stage dates in achievement mode')`: transaksi dengan SPK 20 Nov lalu mundur ke Hot 25 Nov. Mode `achievement` pada November menghitung SPK = 0. Mode `acquisition` tidak berubah dari perilaku sekarang (tes lama tetap lulus).

- [ ] **Step 2: Jalankan dan pastikan gagal**
  Run: `php artisan test --compact --filter=AnalyticsTest`
  Expected: FAIL pada tes baru.

- [ ] **Step 3: Ubah hanya cabang `$achievement`.** `reached_*` memakai `effectiveFor($stage)` + `$inPeriod`. Penentuan transaksi masuk periode memakai `reachedStage(null, $start, $end)`, menggantikan `whereHas(reportableAchievement)`. Cabang Akuisisi tetap seperti sekarang.

- [ ] **Step 4: Jalankan dan pastikan lulus**
  Run: `php artisan test --compact --filter="AnalyticsTest|ReportingReconciliationTest|G09ReportingVerificationTest|DashboardMetricsTest"`
  Expected: PASS. Kalau tes rekonsiliasi lama gagal karena memang mengandaikan perilaku tanpa gugur, laporkan sebelum mengubahnya.

- [ ] **Step 5: Commit**
  ```bash
  git add app/Http/Controllers/AnalyticsController.php tests/Feature/AnalyticsTest.php docs/agents/PRD.md
  git commit -m "feat(analytics): apply voided stage dates to achievement mode"
  ```

### Task 6: Beranda Supervisor: tabel capaian dan Prioritas ringkas

**Files:**
- Modify: `app/Services/TeamPerformance.php:150-160` (tambah prop `stageAchievement`, hanya bila `$actor->role === UserRole::Supervisor`; selain itu `null`)
- Modify: `resources/js/components/team-performance.tsx` (tipe `ReportingProps['dashboard']`; `PriorityLists` jadi satu baris per item)
- Modify: `resources/js/pages/dashboard.tsx:186-208` (render `StageAchievementTable` selebar penuh di atas "Prioritas tindak lanjut")
- Modify: `tests/Feature/DashboardTest.php`
- Modify: `tests/Browser/dashboard-layout.js`, `tests/Browser/accessibility.js` bila selector-nya bergantung pada markup lama

**Interfaces:**
- Consumes: `StageAchievements::bySales` dengan `new ReportingPeriod($period)`; `StageAchievementTable` (Task 4).

- [ ] **Step 1: Tulis tes yang gagal:** Dashboard Supervisor punya `dashboard.stageAchievement.rows`. Dashboard Sales, Branch Manager, dan Admin punya `dashboard.stageAchievement` null.

- [ ] **Step 2: Jalankan dan pastikan gagal**
  Run: `php artisan test --compact --filter=DashboardTest`
  Expected: FAIL.

- [ ] **Step 3: Implementasikan.** Tabel ditaruh di dalam `<section aria-label="Capaian per tahap">` dengan judul "Capaian per tahap · <periode>". Item `PriorityLists` dijadikan satu baris flex: tautan model (`flex-1 truncate`), `StageBadge`, lalu nama Sales (`text-xs text-muted-foreground`). Ganti `p-5` dengan `px-4 py-2`. Tautan tetap mempertahankan target sentuh `min-h-11` (aksesibilitas). Mockup acuan: pilihan A di `.superpowers/brainstorm/*/content/beranda-layout.html`.

- [ ] **Step 4: Jalankan dan pastikan lulus**
  Run: `php artisan test --compact --filter="DashboardTest|TeamPerformanceTest"`, lalu `pnpm run check && pnpm run types:check`. Setelah itu jalankan Browser test `dashboard-layout.js` dan `accessibility.js`. Ikuti catatan proyek: hentikan `public/hot` selama Browser test.
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add app/Services/TeamPerformance.php resources/js/components/team-performance.tsx resources/js/pages/dashboard.tsx tests/Feature/DashboardTest.php <file tests/Browser yang diubah>
  git commit -m "feat(dashboard): show stage achievements and compact priority lists for Supervisors"
  ```

### Task 7: Verifikasi penuh dan handoff

**Files:**
- Modify: `docs/agents/memory.md` (keadaan terverifikasi + tautan ke spec dan PRD)

- [ ] **Step 1: Jalankan seluruh pemeriksaan**
  Run: `composer test`, lalu `pnpm run test:frontend`
  Expected: semua PASS.

- [ ] **Step 2: Perbarui `memory.md` dan commit**
  ```bash
  git add docs/agents/memory.md
  git commit -m "docs(memory): record stage date achievement rollout"
  ```
