# Riwayat Notifikasi In-App (3 Hari) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supervisor dan Sales melihat riwayat notifikasi 3 hari (perubahan tahap, komentar coaching, transaksi stagnan) di halaman `/notifications` dan di lonceng.

**Architecture:** Perluas notifikasi database Laravel yang ada. Tiga kelas notifikasi baru; perubahan tahap dipicu dari `DealTransaction`, stagnan dari command harian; `VisibleCoachingNotifications` memberi daftar lonceng (belum dibaca) dan riwayat 3 hari dengan otorisasi saat dibaca; halaman Inertia baru menggantikan placeholder.

**Tech Stack:** Laravel + Pest, Inertia React (TypeScript), `vp check`, tes frontend `node --test`.

**Spec:** [2026-11-18-in-app-notification-history-design.md](../specs/2026-11-18-in-app-notification-history-design.md)

## Global Constraints

- Commit mengikuti Conventional Commits dan diakhiri `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Kerjakan di branch `feat/notification-history`, bukan `main`. Stage per path persis: working tree berisi perubahan lain (`docs/operations/vps-deployment.md`, `.claude/`, `skills-lock.json`) yang bukan bagian pekerjaan ini.
- Notifikasi baru hanya channel `database`, tanpa `email_status`, tanpa email. Isi hanya metadata: label tahap, jumlah, tautan. Tanpa nama pelanggan dan tanpa isi komentar.
- Riwayat 3 hari = `created_at >= startOfDay(Asia/Jakarta) - 3 hari`. Stagnan memakai `DealTransaction::stagnantCutoff()` dan scope `stagnant()` yang ada.
- Perilaku notifikasi komentar yang ada tidak berubah; `CoachingWorkflowTest` dan `TeamPerformanceTest` harus tetap lulus. `DealCommentController` tidak diubah.
- Hanya role Sales dan Supervisor yang mendapat notifikasi; Admin dan Branch Manager melihat halaman kosong.
- Jalankan tes PHP dengan `vendor/bin/pest <path>`, frontend dengan `npm run test:frontend`, `npm run check`, `npm run types:check`.

## Review Focus

1. Supervisor nonaktif atau keanggotaan tim sudah berakhir: tidak menerima apa pun, tidak ada error (Task 1).
2. Perpindahan tahap yang ditolak (`InvalidArgumentException`) tidak meninggalkan notifikasi (Task 2).
3. Hari pertama command berjalan di production: transaksi yang sudah lama stagnan tidak membanjiri notifikasi (Task 3).
4. Akses transaksi dicabut (Sales dipindah) setelah notifikasi dibuat: notifikasi hilang dari riwayat dan lonceng (Task 4).
5. Item tanpa `url` atau dengan `kind` tak dikenal (baris lama): tampil dengan label bawaan dan tidak error saat diklik (Task 5).

---

### Task 1: Penerima dan tiga kelas notifikasi

**Files:**
- Create: `app/Services/DealAudience.php`, `app/Notifications/DealStageChanged.php`, `app/Notifications/DealBecameStagnant.php`, `app/Notifications/StagnantDealsSummary.php`
- Modify: `app/Notifications/DealCommentCreated.php` (tambah `'kind' => 'comment'` pada `toDatabase`)
- Test: `tests/Feature/Notifications/NotificationClassesTest.php`

**Interfaces:**
- Produces: `DealAudience::supervisorsOf(DealTransaction $deal): Collection<int, User>`: Supervisor aktif, `dealer_id` sama, dengan keanggotaan Supervisor aktif (`ended_at` null) pada tim yang sama dengan keanggotaan Sales aktif milik `$deal->sales_id`. Kueri mengikuti `DealCommentController::store` baris 67–79; controller itu tidak diubah.
- Produces: `new DealStageChanged(int $transactionId, string $transactionPublicId, string $fromStage, string $toStage)`; `new DealBecameStagnant(int $transactionId, string $transactionPublicId, string $activityAt)`; `new StagnantDealsSummary(int $count)`. Semua `via()` mengembalikan `['database']`.
- Produces `toDatabase()` (kunci persis):
  - `DealStageChanged`: `kind='stage_changed'`, `title='Tahap transaksi berubah'`, `message="Transaksi pindah dari {label lama} ke {label baru}."` (label dari `PipelineStage::label()`), `url=route('transactions.coaching', $publicId, false)`, `deal_id`.
  - `DealBecameStagnant`: `kind='stagnant'`, `title='Transaksi menjadi stagnan'`, `message='Tidak ada aktivitas lebih dari 3 hari.'`, `url` sama, `deal_id`, `activity_at`.
  - `StagnantDealsSummary`: `kind='stagnant_summary'`, `title='Transaksi stagnan baru'`, `message="{n} transaksi baru menjadi stagnan."`, `url=route('transactions.index', ['tab' => 'stagnant'], false)`, `count`.

- [ ] **Step 0: Siapkan branch dan commit dokumen**

```bash
git switch -c feat/notification-history
git add docs/superpowers/specs/2026-11-18-in-app-notification-history-design.md docs/superpowers/plans/2026-11-18-in-app-notification-history.md docs/agents/README.md
git commit -m "docs(notifications): add notification history design and plan"
```

- [ ] **Step 1: Tulis tes gagal** (fixture: salin `beforeEach` dari `CoachingWorkflowTest`)
  - `it('returns only active supervisors of the sales team')`: `supervisorsOf($deal)->pluck('id')` sama persis dengan `[$supervisor->id]`; `$otherSupervisor` (tim lain), supervisor `is_active=false`, dan supervisor dengan `ended_at` terisi tidak muncul. Sales tanpa keanggotaan tim: koleksi kosong.
  - `it('builds metadata-only database payloads')`: untuk tiga kelas, `toDatabase($user)` punya kunci di atas; `json_encode` tidak memuat nama pelanggan fixture; `DealStageChanged('prospect','hot_prospect')->toDatabase(...)['message']` bernilai `'Transaksi pindah dari Prospect ke Hot Prospect.'`.
  - `it('marks new comment notifications with kind comment')`: `DealCommentCreated` payload `kind === 'comment'`.
- [ ] **Step 2: Jalankan** `vendor/bin/pest tests/Feature/Notifications/NotificationClassesTest.php`. Expected: FAIL (kelas belum ada).
- [ ] **Step 3: Implementasi** sesuai Interfaces. `DealAudience` memakai `TeamMembership`/`User` seperti controller komentar.
- [ ] **Step 4: Jalankan** tes yang sama dan `vendor/bin/pest tests/Feature/Customer/CoachingWorkflowTest.php`. Expected: PASS.
- [ ] **Step 5: Commit** `git add app/Services/DealAudience.php app/Notifications tests/Feature/Notifications` lalu `git commit -m "feat(notifications): add deal audience and stage/stagnant notification classes"`.

### Task 2: Pemicu perubahan tahap

**Files:**
- Modify: `app/Models/DealTransaction.php` (`transitionTo`, baris 281–289), `app/Http/Controllers/Customer/CustomerController.php` (`cancelDo`, setelah `stageHistories()->create` baris 548)
- Test: `tests/Feature/Notifications/StageChangeNotificationTest.php`

**Interfaces:**
- Consumes: Task 1 `DealAudience::supervisorsOf`, `DealStageChanged`.
- Produces: `DealTransaction::notifyStageChanged(PipelineStage $from, PipelineStage $to, User $actor): void`: mengirim `DealStageChanged` via `Notification::sendNow($recipients, ..., ['database'])` ke `supervisorsOf($this)` tanpa `$actor`. Dipanggil di dalam transaksi database, sesudah `StageHistory` dibuat, dari `transitionTo` dan `cancelDo` (Do → Spk). `CreateLeadTransaction` tidak memicu.

- [ ] **Step 1: Tulis tes gagal**
  - `it('notifies team supervisors when sales moves a stage')`: `$deal->transitionTo(HotProspect, $sales)`; `$supervisor->notifications()->sole()->data['kind']` `'stage_changed'`, pesan memuat `'Prospect'` dan `'Hot Prospect'`; `$sales`, `$otherSupervisor`, `$admin`, `$manager` tanpa notifikasi.
  - `it('does not notify the acting supervisor but notifies a second team supervisor')`.
  - `it('ignores inactive supervisors')`.
  - `it('creates no notification when the transition is rejected')`: transisi ke tahap sama atau mundur tanpa catatan melempar `InvalidArgumentException`; `DB::table('notifications')->count()` tetap 0.
  - `it('notifies on cancel DO')`: salin arrange tes batal DO yang ada (`grep -rn "cancel" tests/Feature`) dan assert satu notifikasi `Spk` untuk Supervisor.
  - `it('does not notify when a lead is created')`: panggil `CreateLeadTransaction` lewat jalur yang dipakai tesnya; 0 notifikasi.
- [ ] **Step 2: Jalankan** `vendor/bin/pest tests/Feature/Notifications/StageChangeNotificationTest.php`. Expected: FAIL.
- [ ] **Step 3: Implementasi** `notifyStageChanged` dan panggilannya. Di `transitionTo`, simpan `StageHistory` ke variabel, panggil notifikasi, lalu return.
- [ ] **Step 4: Jalankan** tes baru dan seluruh `vendor/bin/pest tests/Feature`. Expected: PASS. Bila tes lama gagal karena menghitung `notifications`, sesuaikan asersinya, bukan perilakunya.
- [ ] **Step 5: Commit** `git add app/Models/DealTransaction.php app/Http/Controllers/Customer/CustomerController.php tests/Feature` lalu `git commit -m "feat(notifications): notify supervisors when a sales stage changes"`.

### Task 3: Command deteksi stagnan

**Files:**
- Create: `app/Console/Commands/DetectStagnantDeals.php`
- Modify: `routes/console.php`
- Test: `tests/Feature/Notifications/DetectStagnantDealsTest.php`

**Interfaces:**
- Consumes: Task 1 `DealAudience`, `DealBecameStagnant`, `StagnantDealsSummary`.
- Produces: command `notifications:detect-stagnant`, handle mengembalikan `self::SUCCESS`; jadwal `Schedule::command('notifications:detect-stagnant')->dailyAt('00:05')->timezone('Asia/Jakarta')->withoutOverlapping()`.

Aturan (dari spec): ambil `DealTransaction::stagnant()` lalu saring di PHP yang `last_activity_at ?? created_at >= startOfDay(Jakarta hari ini) - 7 hari`. Transaksi menjadi stagnan pada `startOfDay(Jakarta, aktivitas) + 4 hari`; batas ini setara jendela riwayat 3 hari. Kunci dedup `"{deal_id}|{activity_at ISO}"`, dibandingkan dengan `DealBecameStagnant` yang dibuat 8 hari terakhir. Untuk tiap transaksi baru: `sendNow` `DealBecameStagnant` ke Sales pemilik (bila aktif). Setelah itu per Supervisor dari `supervisorsOf` yang punya transaksi baru, satu `StagnantDealsSummary(count)`; tanpa transaksi baru, tanpa ringkasan.

- [ ] **Step 1: Tulis tes gagal** (`$this->travelTo(...)` untuk waktu tetap; atur `last_activity_at` lewat `forceFill()->save()`)
  - `it('notifies sales per deal and supervisor with a summary')`: dua transaksi stagnan baru satu tim: Sales dapat 2 `DealBecameStagnant`; Supervisor dapat 1 `StagnantDealsSummary` dengan `count === 2`.
  - `it('skips deals that have been stagnant for longer than the history window')`: aktivitas 30 hari lalu: 0 notifikasi.
  - `it('skips closed and active deals')`: tahap Do/Delivery/Lost dan transaksi beraktivitas hari ini: 0 notifikasi.
  - `it('is idempotent')`: jalankan dua kali: jumlah baris tetap; ringkasan tidak ganda.
  - `it('notifies again after the deal is reactivated and stagnates again')`: ubah `last_activity_at`, majukan waktu, jalankan: notifikasi kedua dengan `activity_at` berbeda.
  - `it('respects the Jakarta day boundary')`: aktivitas 14 Nov 20:00 Jakarta: pada 17 Nov 23:59 Jakarta tidak ada notifikasi; pada 18 Nov 00:05 ada.
  - `it('skips inactive sales and sends no summary when nothing is new')`.
  - `it('registers the daily schedule')`: `Artisan::call('schedule:list')` outputnya memuat `notifications:detect-stagnant`.
- [ ] **Step 2: Jalankan** `vendor/bin/pest tests/Feature/Notifications/DetectStagnantDealsTest.php`. Expected: FAIL.
- [ ] **Step 3: Implementasi** command dan jadwal sesuai aturan di atas.
- [ ] **Step 4: Jalankan** tes yang sama. Expected: PASS.
- [ ] **Step 5: Commit** `git add app/Console/Commands/DetectStagnantDeals.php routes/console.php tests/Feature/Notifications` lalu `git commit -m "feat(notifications): detect newly stagnant deals daily"`.

### Task 4: Otorisasi baca, halaman, dan route

**Files:**
- Modify: `app/Services/VisibleCoachingNotifications.php`, `app/Http/Controllers/NotificationController.php`, `app/Http/Middleware/HandleInertiaRequests.php` (baris 40 dan 56–61), `routes/web.php` (baris 129–131)
- Test: `tests/Feature/Notifications/NotificationHistoryTest.php`

**Interfaces:**
- Consumes: kelas notifikasi Task 1.
- Produces di `VisibleCoachingNotifications` (nama kelas tidak diganti):
  - `forUser(User $actor): Collection<int, DatabaseNotification>`: belum dibaca, keempat tipe, terlihat oleh `$actor` (sekarang bukan hanya komentar).
  - `historyFor(User $actor): Collection<int, DatabaseNotification>`: terbaca dan belum dibaca, `created_at >= startOfDay(Jakarta) - 3 hari`, terbaru dulu, terlihat oleh `$actor`.
  - `present(DatabaseNotification $n): array`: `['id', 'data' (hanya title, message, url, comment_id, email_status, kind, count), 'created_at' (ISO), 'read_at' (ISO atau null)]`. `deal_id` sengaja tidak diekspos (perubahan kecil dari spec; tidak dibutuhkan frontend).
  - Visibilitas menurut `type` kolom, bukan `kind`: `DealCommentCreated` lewat `comment_id` (logika yang ada); `DealStageChanged` dan `DealBecameStagnant` lewat `deal_id` dan `DealTransaction::visibleTo($actor)` (satu kueri `whereIn`); `StagnantDealsSummary` selalu terlihat. Non-Sales/Supervisor: koleksi kosong.
- Produces: `NotificationController::index(Request $request, VisibleCoachingNotifications $notifications): Inertia\Response` merender `notifications/index` dengan props `history` (maksimum 200 hasil `present`), `truncated` (bool), `limit` (200). Route `Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index')` menggantikan `Route::inertia(...)`, tetap di grup auth yang sama.
- `HandleInertiaRequests::share`: `notifications` = `forUser->take(10)->map(present)`, `notificationsUnreadCount` = `forUser->count()`.

- [ ] **Step 1: Tulis tes gagal**
  - `it('lists three days of read and unread notifications for sales')`: buat tiga jenis notifikasi untuk Sales, satu sudah `read_at`; halaman `component('notifications/index')`, `has('history', 4)`, urutan terbaru dulu, item terbaca `read_at` terisi.
  - `it('excludes notifications older than the three day window')`: `created_at` tepat `startOfDay(Jakarta)->subDays(3)` termasuk; satu detik sebelumnya tidak.
  - `it('hides deal notifications after access is revoked')` (Review Focus 4): setelah `$customer`/transaksi dipindah ke Sales lain, `stage_changed` dan `stagnant` hilang dari `history` dan dari prop `notifications`; ringkasan tetap tampil.
  - `it('shows supervisor kinds and an empty list for admin and branch manager')`; tamu diarahkan ke `login`.
  - `it('caps history at 200 and flags truncation')`: 201 baris: `has('history', 200)`, `where('truncated', true)`.
  - `it('lists legacy comment notifications without kind')` dan `TeamPerformanceTest` baris 187–201 tetap lulus.
  - `it('shares unread new kinds with the bell and marks them read')`: `PATCH notifications.read` mengisi `read_at`; pengguna lain mendapat 403.
- [ ] **Step 2: Jalankan** `vendor/bin/pest tests/Feature/Notifications/NotificationHistoryTest.php`. Expected: FAIL.
- [ ] **Step 3: Implementasi** service, controller, middleware, dan route sesuai Interfaces.
- [ ] **Step 4: Jalankan** `vendor/bin/pest tests/Feature`. Expected: PASS.
- [ ] **Step 5: Commit** `git add app routes tests/Feature` lalu `git commit -m "feat(notifications): add three-day notification history endpoint"`.

### Task 5: Halaman riwayat dan lonceng

**Files:**
- Create: `resources/js/lib/notifications.ts`, `resources/js/lib/open-notification.ts`, `resources/js/pages/notifications/index.tsx`, `tests/Frontend/notifications.test.mjs`
- Modify: `resources/js/types/notifications.ts`, `resources/js/components/notification-menu.tsx`, `resources/js/pages/module-status.tsx` (hapus entri dan kunci `notifications`)

**Interfaces:**
- Produces `lib/notifications.ts` (murni, tanpa impor `@/` atau Inertia agar bisa dites Node): `formatRelativeTime(value: string | null, now?: number): string` (logika dipindah dari `notification-menu.tsx`, `now` default `Date.now()`), `kindLabel(kind: unknown): string` (`stage_changed` 'Perubahan tahap', `stagnant` dan `stagnant_summary` 'Stagnan', lainnya 'Komentar coaching').
- Produces `lib/open-notification.ts`: `openNotification(notification: AppNotification): void` (patch `notificationsRead(id)` lalu `router.visit(url)` hanya bila `data.url` ada; logika dari `notification-menu.tsx`).
- `AppNotification` bertambah `read_at: string | null` dan `data.kind?: string`, `data.count?: number`.
- Halaman: kontainer dan kelas mengikuti `module-status.tsx`; props `{ history: AppNotification[]; truncated: boolean; limit: number }`; judul "Notifikasi" dengan keterangan "Riwayat 3 hari terakhir"; tiap item tombol (judul, pesan, `kindLabel`, `formatRelativeTime`, penanda "Belum dibaca" teks aksesibel); keadaan kosong seperti lonceng; bila `truncated`, keterangan "Menampilkan {limit} terbaru."

- [ ] **Step 1: Tulis tes gagal** `tests/Frontend/notifications.test.mjs` (impor gaya `navigation.test.mjs`): `formatRelativeTime(null)` `''`; tanggal tak valid `''`; 30 detik lalu `'Baru saja'`; 2 jam lalu mengandung `'2 jam'`; `kindLabel('stagnant_summary')` `'Stagnan'`; `kindLabel(undefined)` dan `kindLabel('aneh')` `'Komentar coaching'` (Review Focus 5).
- [ ] **Step 2: Jalankan** `npm run test:frontend`. Expected: FAIL (modul belum ada).
- [ ] **Step 3: Implementasi** dua berkas lib, pindahkan logika dari lonceng, buat halaman, perbarui tipe, hapus entri placeholder. Tampilkan item tanpa `url` tanpa error dan tanpa navigasi.
- [ ] **Step 4: Jalankan** `npm run test:frontend`, `npm run check`, `npm run types:check`. Expected: PASS.
- [ ] **Step 5: Verifikasi di browser** sebagai Sales dan Supervisor (seeder demo): `/notifications` menampilkan item, klik menandai terbaca lalu membuka transaksi; lonceng tetap bekerja. Baca dulu `frontend-checks-vp-and-browser-tests.md` dan `browser-suite-and-shared-checkout.md` di memory untuk aturan menjalankan tes browser, lalu jalankan `tests/Browser/accessibility.js`.
- [ ] **Step 6: Commit** `git add resources/js tests/Frontend` lalu `git commit -m "feat(notifications): add notification history page"`.

### Task 6: Dokumen

**Files:**
- Modify: `docs/agents/PRD.md` (bagian 7.5, setelah CVS-10), `docs/agents/memory.md`, `docs/agents/README.md`, `docs/superpowers/specs/2026-11-18-in-app-notification-history-design.md`

- [ ] **Step 1: Tambah CVS-11 sampai CVS-13 di PRD** (prioritas M, format baris seperti CVS-09): CVS-11 riwayat notifikasi in-app 3 hari untuk Sales dan Supervisor; CVS-12 Supervisor menerima notifikasi perubahan tahap transaksi Sales timnya; CVS-13 Sales menerima notifikasi per transaksi dan Supervisor ringkasan jumlah saat transaksi menjadi stagnan.
- [ ] **Step 2: Perbarui spec** (status "disetujui dan diimplementasikan"; ganti "ditambah `kind`, `deal_id`, `count`" menjadi `kind` dan `count`), baris README untuk spec dan rencana ini (status), dan satu entri `memory.md` yang menunjuk ke PRD tanpa menyalin kebutuhan.
- [ ] **Step 3: Verifikasi akhir:** `vendor/bin/pest`, `npm run check`, `npm run types:check`, `npm run test:frontend`. Expected: semua lulus. Laporkan hasil apa adanya, termasuk yang tidak dijalankan.
- [ ] **Step 4: Commit** `git add docs` (path persis) lalu `git commit -m "docs(notifications): record notification history requirements"`. Buka pull request dari `feat/notification-history` ke `main`.
