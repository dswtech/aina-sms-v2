# Riwayat Pencapaian Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Laporan pencapaian target multi-bulan untuk Supervisor dan Branch Manager, serta pengingat target yang tidak mengganggu untuk Supervisor.

**Architecture:** Service `TargetHistory` membaca target, alokasi, dan kejadian DO untuk seluruh rentang dalam jumlah query tetap, lalu mengelompokkannya di PHP. Service `TargetReminder` mengisi shared prop Inertia. Kartu pengingat mencatat penutupan di `localStorage`. Tanpa migration dan tanpa package baru.

**Tech Stack:** Laravel, Inertia, React, TypeScript, Pest, node:test, Playwright (`tests/Browser`).

**Spec:** [2026-11-24-target-history-report-design.md](../specs/2026-11-24-target-history-report-design.md)

## Global Constraints

- Mulai dari `origin/main` terbaru (minimal `0b86dee`) di branch `feat/target-history`, dalam worktree. Stage file dengan path persis: `.claude/` dan `skills-lock.json` bukan bagian pekerjaan ini.
- Conventional Commits, tanpa trailer `Co-Authored-By`. Test relevan lulus sebelum setiap commit.
- Tidak ada migration, package baru, atau write ke database non-test.
- Bulan berjalan dan hari ini memakai Asia/Jakarta. Rentang maksimal `ReportingPeriod::MAX_MONTHS` (24).
- ORG-06: Admin dan Sales tidak menerima angka, gap, atau persentase target management.
- Target `null` tampil "Belum diisi", tidak pernah 0%. Target 0 memberi persentase `null`.
- Target sentuh minimal 44px dan kontrol punya nama aksesibel (UIX-05).
- Format angka di UI memakai locale `id-ID`.

## Review Focus

1. Transaksi yang DO-nya dibatalkan lalu DO lagi dihitung sekali per bulan, hanya dari kejadian yang belum dibatalkan (Task 2).
2. DO pada 30 November 17.00 UTC masuk bulan Desember Jakarta (Task 2).
3. Sales yang pindah tim: alokasi dan realisasi lama tetap di tim asal (Task 2).
4. Dua Supervisor di satu browser: penutupan oleh satu orang tidak menyembunyikan pengingat orang lain (Task 5).
5. `localStorage` diblokir browser: kartu tetap bisa ditutup dan halaman tidak crash (Task 5).

---

### Task 1: Tim tidak dihitung kurang sebelum dibuat

**Files:**
- Modify: `app/Services/TeamPerformance.php` (perhitungan `$missingTeamTargets` dan `$targetUnits`)
- Test: `tests/Feature/TeamPerformanceTest.php`

**Interfaces:**
- Produces: aturan `requiredTeams` = tim aktif dengan `created_at < ReportingPeriod::$end`. Dipakai ulang di Task 2.

- [ ] **Step 1: Tulis test gagal** `it('does not require a target from a team created after the period')`: `travelTo` 2026-11-24; tim A `created_at` 2026-06-01 dengan `TeamTarget` 2026-09-01 senilai 10; tim B `created_at` 2026-10-05 tanpa target; aktor Branch Manager.
  - `/team-performance?period=2026-09`: `dashboard.teamTargetsMissing` = 0, `dashboard.targetUnits` = 10.
  - `?period=2026-10` (tambahkan target A 2026-10-01): `teamTargetsMissing` = 1, `targetUnits` = null.
  - `?period=2026-05`: `teamTargetsMissing` = 0, `targetUnits` = null (bukan 0).
- [ ] **Step 2:** `php artisan test --filter="created after the period"` → FAIL.
- [ ] **Step 3: Implementasi.** `$missingTeamTargets` memakai `requiredTeams`. Dalam syarat `$targetUnits`, ganti `$teams->where('is_active', true)->isNotEmpty()` dengan `$requiredTeams->isNotEmpty()`.
- [ ] **Step 4:** `php artisan test tests/Feature/TeamPerformanceTest.php tests/Feature/TargetAllocationTest.php tests/Feature/DashboardMetricsTest.php tests/Feature/ReportingReconciliationTest.php tests/Feature/G09ReportingVerificationTest.php` → PASS. Test lama yang periodenya mendahului pembuatan tim factory diberi `created_at` eksplisit; assertion-nya tidak dilonggarkan.
- [ ] **Step 5: Commit** `fix(targets): skip teams created after the period in dealer completeness`

### Task 2: Service `TargetHistory`

**Files:**
- Create: `app/Services/TargetHistory.php`
- Test: `tests/Feature/Reports/TargetHistoryTest.php`

**Interfaces:**
- Consumes: `requiredTeams` (Task 1), `StageHistory::realizedDo()`, `StageHistory::dealTransaction()`, `DealTransaction::visibleInReportsTo($actor)`, `Team::visibleTo($actor)`, `TargetUnits`.
- Produces: `build(User $actor, string $from, string $to): array` dengan bentuk:

```
from, to: 'Y-m'; currentMonth: 'Y-m'
months: list<'Y-m'>                 // naik
averageMonths: list<'Y-m'>          // maks. 3, < currentMonth, terakhir di dalam rentang
dealer: Row|null                    // hanya Branch Manager
unassigned: Row|null                // hanya Branch Manager; target selalu null
teams: list<Row & { is_active: bool, sales: list<Row> }>   // urut nama
Row  = { id: string|int, name: string, cells: array<'Y-m', Cell>, average: Percents }
Cell = Percents & { target_units, benchmark_units, realization_units }
       // dealer: + teams_filled, teams_required
Percents = { achievement_percent, benchmark_achievement_percent }   // float 2 desimal | null
```

Aturan:
- Realisasi: `StageHistory::realizedDo()` dalam rentang, `whereHas('dealTransaction', visibleInReportsTo)`; bulan = `created_at` di Asia/Jakarta; unik per (transaksi, bulan); dikelompokkan menurut `team_id` dan `sales_id` transaksi. Pengelompokan bulan di PHP supaya SQLite dan PostgreSQL sama.
- Target tim = `TeamTarget.target_units`. Benchmark dan persentase mengikuti rumus `TeamPerformance`. Untuk baris Sales dan dealer, `benchmark_units` = null.
- Target Sales di tim T: alokasi pada rencana T. Jika tidak ada alokasi di tim mana pun bulan itu dan Sales bukan anggota aktif tim dengan rencana `version > 0`, pakai `sales_targets`, hanya di tim keanggotaan aktifnya.
- Baris Sales di tim T: anggota aktif T, penerima alokasi T dalam rentang, dan Sales dengan realisasi T dalam rentang.
- Tim nonaktif (hanya BM) tampil jika punya target atau realisasi dalam rentang.
- `teams_required` = `requiredTeams` bulan itu; `teams_filled` = bagian darinya yang punya target. Target dealer null jika keduanya berbeda, atau jika tidak ada target sama sekali; selain itu jumlah semua `TeamTarget` bulan itu. Realisasi dealer mencakup transaksi tanpa tim.
- Rata-rata = total realisasi ÷ total target pada `averageMonths` dengan target > 0.

- [ ] **Step 1: Tulis test gagal** (`travelTo` 2026-11-24):
  - `it('matches TeamPerformance for every month')` untuk SPV dua tim dan BM, rentang 2026-06..2026-11, dengan rencana terkelola, tim legacy, tim nonaktif bertarget, transaksi tanpa tim, Sales pindah tim, dan Sales keluar. Per bulan bandingkan dengan `app(TeamPerformance::class)->build($actor, $month)['dashboard']`: tiap `teams[].target_units|benchmark_units|realization_units|achievement_percent|benchmark_achievement_percent`, `targetUnits`, `realizationUnits`, dan `unassignedTeam.realization_units`. Untuk SPV, jumlah target dan realisasi per Sales lintas tim sama dengan `performance[]`.
  - `it('keeps a moved sales allocation and realization in the original team')`
  - `it('counts a cancelled and redone DO once')` → realisasi 1.
  - `it('buckets DO events by Jakarta month')`: DO 2026-10-31 16:59:59 UTC → `2026-10`; 17:00:00 UTC → `2026-11`.
  - `it('averages the last three completed months by total units')`: Agu 5/10, Sep tanpa target (realisasi 4), Okt 9/20, Nov 20/10 → `averageMonths` = `['2026-08','2026-09','2026-10']`, `average.achievement_percent` = 46.67.
  - `it('distinguishes unset from zero')`: tanpa target → `target_units` null dan persen null; target 0 → `target_units` 0 dan persen null.
  - `it('reports filled and required teams for the dealer')`: satu dari dua tim terisi → target null, `teams_filled` 1, `teams_required` 2.
  - `it('never exposes another dealer or another supervisor team')`
  - `it('runs a constant number of queries')`: hitung query untuk 1 bulan dan 24 bulan, jumlahnya sama.
- [ ] **Step 2:** `php artisan test tests/Feature/Reports/TargetHistoryTest.php` → FAIL (class tidak ada).
- [ ] **Step 3:** Implementasi `build()` sesuai aturan di atas.
- [ ] **Step 4:** perintah Step 2 → PASS; `composer types:check` → tanpa error.
- [ ] **Step 5: Commit** `feat(targets): build multi-month target attainment`

### Task 3: Route dan halaman laporan

**Files:**
- Modify: `app/Http/Controllers/ReportController.php`, `routes/web.php`, `resources/js/lib/navigation.ts`
- Create: `resources/js/pages/analytics/target-history.tsx`
- Test: `tests/Feature/Reports/TargetHistoryTest.php`, `tests/Frontend/navigation.test.mjs`

**Interfaces:**
- Consumes: `TargetHistory::build()`.
- Produces: `GET /analytics/target-history` bernama `analytics.target-history`, props `report` = hasil `build()`.

- [ ] **Step 1: Tulis test gagal**
  - SPV dan BM `assertOk` dengan komponen `analytics/target-history`; Admin dan Sales `assertForbidden`.
  - Tanpa query pada 2026-11-24: `report.from` = `2026-06`, `report.to` = `2026-11`.
  - Error sesi: `?from=2026-11&to=2026-10` pada `to`; `?from=2024-01&to=2026-11` pada `to`; `?from=bad` pada `from`.
  - Navigasi: SPV dan BM punya anak Analisis `{ title: 'Riwayat Target', href: '/analytics/target-history' }`; Admin tidak.
- [ ] **Step 2:** `php artisan test tests/Feature/Reports/TargetHistoryTest.php` dan `pnpm run test:frontend` → FAIL.
- [ ] **Step 3: Backend.** Route di grup tersendiri `role:supervisor,branch_manager`. `ReportController::targetHistory(Request, TargetHistory): Response`. `range()` mendapat parameter `int $monthsBack = 0` untuk default `from`; pemanggil lama tidak berubah.
- [ ] **Step 4: Navigasi.** Varian `shared.analyticsWithTargetHistory` untuk SPV dan BM; `shared.analytics` tetap untuk Admin.
- [ ] **Step 5: Halaman.** Ikuti susunan `analytics/stage-achievement.tsx` (`FilterPanel`, `MonthRangeFields`).
  - Judul "Riwayat Pencapaian Target". Satu tabel: kolom nama lengket di kiri, satu kolom per bulan, kolom akhir "Rata-rata" dengan label bulan dari `averageMonths`.
  - Sel: `realisasi/target` dan persen; baris tim menambah "Benchmark n · p%". Target null: "Belum diisi" dan realisasinya. Bulan berjalan berlabel "berjalan". Sel dealer tidak lengkap: "x dari y tim terisi".
  - Baris Sales dibuka lewat tombol tim ber-`aria-expanded`; terbuka sejak awal untuk SPV, tertutup untuk BM.
  - Tabel berada dalam wadah `overflow-x-auto` yang bisa difokus dan bernama; halaman tidak boleh scroll horizontal pada lebar 390px. Tanpa tim: "Belum ada tim untuk ditampilkan."
- [ ] **Step 6:** perintah Step 2, `pnpm run check`, `pnpm run types:check` → PASS.
- [ ] **Step 7: Commit** `feat(targets): add target attainment history report`

### Task 4: Service dan shared prop pengingat

**Files:**
- Create: `app/Services/TargetReminder.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`, `resources/js/types/global.d.ts`
- Test: `tests/Feature/TargetReminderTest.php`

**Interfaces:**
- Produces: `TargetReminder::forUser(?User $user): ?array` dan shared prop `targetReminder` (closure):
  `{ today: 'Y-m-d', period: 'Y-m', teams: list<{ id: string, name: string, reason: 'missing_target'|'unallocated_sales', unallocated_count: int }> } | null`. Null jika tidak ada masalah. Tidak memuat angka target.

- [ ] **Step 1: Tulis test gagal** (`travelTo` 2026-11-01 00:30 Asia/Jakarta, yaitu 31 Oktober UTC; `period` = `2026-11`):
  - tanpa target tim → `missing_target`, juga saat hanya ada `sales_targets`.
  - rencana `version` 1, satu dari dua Sales aktif tanpa alokasi → `unallocated_sales`, `unallocated_count` 1.
  - target `version` 0: tanpa `sales_targets` → `unallocated_sales`; semua Sales aktif punya → null.
  - rencana lengkap → null; Sales nonaktif atau sudah keluar tidak dihitung.
  - target bulan lain tidak dihitung; tim yang tidak ia pegang dan tim nonaktif tidak muncul.
  - SPV dua tim, satu lengkap → hanya tim yang bermasalah.
  - Sales, BM, Admin, dan tamu → null; Admin yang "login sebagai" SPV → prop null.
  - menyimpan rencana lewat `POST /target-plans`, lalu halaman berikutnya → null.
- [ ] **Step 2:** `php artisan test tests/Feature/TargetReminderTest.php` → FAIL.
- [ ] **Step 3:** Implementasi. Role bukan SPV keluar sebelum query apa pun. Tim = `Team::visibleTo($user)` yang cocok dengan keanggotaan aktif ber-role Supervisor. Maksimal 5 query untuk SPV berapa pun jumlah timnya. Middleware mengirim null jika session punya `impersonator_id`.
- [ ] **Step 4:** perintah Step 2 dan `composer types:check` → PASS.
- [ ] **Step 5: Commit** `feat(targets): share the missing target reminder`

### Task 5: Kartu pengingat

**Files:**
- Create: `resources/js/lib/target-reminder.ts`, `resources/js/components/target-reminder.tsx`
- Modify: `resources/js/layouts/app/app-sidebar-layout.tsx`
- Test: `tests/Frontend/target-reminder.test.mjs`, `tests/Browser/target-reminder.js`

**Interfaces:**
- Consumes: prop `targetReminder` (Task 4), `auth.user.public_id`.
- Produces: `isDismissed(storage, userId: string, today: string): boolean`, `dismiss(storage, userId: string, today: string): void`, keduanya menangkap error; `reminderMessage(teams): string`. Kunci `target-reminder-dismissed:{public_id}`, isi `today`.

- [ ] **Step 1: Tulis test gagal (Frontend):** setelah `dismiss` hari ini → `true`; besok → `false`; pengguna lain → `false`; storage yang melempar error → `isDismissed` `false` dan `dismiss` tidak melempar. `reminderMessage`: `missing_target` → "Target Tim A bulan ini belum diisi."; `unallocated_sales` → "2 Sales di Tim A belum mendapat target bulan ini."; dua tim → kedua kalimat dipisah spasi.
- [ ] **Step 2:** `pnpm run test:frontend` → FAIL.
- [ ] **Step 3: Implementasi.** Kartu `role="status"`, tanpa overlay dan tanpa memindahkan fokus. Di bawah `md` berada dalam alur halaman sebelum `children`; mulai `md` `fixed` kanan bawah dengan z-index di bawah dialog dan toast. Tombol ikon `aria-label="Tutup pengingat target"` dan tautan "Isi target" ke `/targets/plans`; tautan juga mencatat penutupan. Tidak dirender pada `/targets/plans`. Penutupan juga disimpan dalam state modul, sehingga berlaku selama sesi saat storage gagal.
- [ ] **Step 4: Test browser** mengikuti pola `tests/Browser/target-role-metrics.js`: kartu tampil untuk SPV; tombol di halaman tetap bisa diklik saat kartu tampil; ditutup lalu pindah halaman dan reload → tidak tampil; lebar 390px → kartu tidak menimpa konten atau navigasi bawah; BM → tidak tampil. Jalankan lewat `tests/Browser/run-isolated.ps1` dengan `public/hot` dipindah sementara dan dikembalikan setelahnya.
- [ ] **Step 5:** `pnpm run test:frontend`, `pnpm run check`, `pnpm run types:check`, test browser → PASS.
- [ ] **Step 6: Commit** `feat(targets): remind supervisors about missing targets`

### Task 6: Dokumen dan verifikasi akhir

**Files:**
- Modify: `docs/agents/PRD.md`, `docs/agents/README.md`, `docs/agents/memory.md`, `tests/Browser/accessibility.js`
- Commit: spec dan rencana ini

- [ ] **Step 1: PRD.** Tambah DSH-08 (laporan riwayat target SPV/BM, default 6 bulan, rata-rata 3 bulan selesai), DSH-09 (pengingat SPV, sekali per hari per perangkat, tidak memblokir), dan kalimat tim baru di FCT-04. Cek dulu ID tersebut belum terpakai.
- [ ] **Step 2:** Daftarkan spec dan rencana di manifest `README.md`; catat keadaan terverifikasi di `memory.md`.
- [ ] **Step 3:** Tambah `/analytics/target-history` ke audit `accessibility.js` untuk SPV dan BM.
- [ ] **Step 4:** `composer ci:check` → PASS; `pnpm run build` → sukses; seluruh suite browser → PASS. Laporkan test yang tidak bisa dijalankan apa adanya.
- [ ] **Step 5: Commit** `docs(targets): record target history and reminder`, lalu PR.
