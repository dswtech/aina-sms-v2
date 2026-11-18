# Rilis Log, Notifikasi Rilis, dan Versi Aplikasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Semua pengguna mendapat notifikasi rilis berbahasa awam, ada halaman `/rilis`, dan versi aplikasi tampil di UI.

**Architecture:** Riwayat rilis hidup di `config/releases.php` (terbaru di atas), dibaca lewat helper `App\Support\Releases`. Perintah `release:announce`, dipanggil `deploy.sh`, membuat satu notifikasi `ReleaseAnnounced` per pengguna aktif dan aman diulang. Tipe notifikasi baru dilewatkan untuk semua role di `VisibleCoachingNotifications` tanpa melonggarkan tipe lama.

**Tech Stack:** Laravel (Pest), Inertia + React/TypeScript, Wayfinder, `vp check`, node:test untuk `tests/Frontend`.

**Spec:** `docs/superpowers/specs/2026-11-18-release-log-design.md`

## Global Constraints

- Tanpa migration baru; tabel `notifications` sudah ada (ADR 006: `deploy.sh` tidak menjalankan migration).
- Tanpa email; kanal notifikasi hanya `database`.
- `version` di config tanpa awalan "v" (`1.3.0`); tampilan memakai `v1.3.0`. `date` format `Y-m-d`.
- Teks pengguna berbahasa Indonesia awam; dilarang memuat nomor PR (`#123`), kata "migration" atau "PR".
- Notifikasi tampil 3 hari Jakarta seperti yang ada; aturan Sales/Supervisor tidak berubah.
- Commit Conventional Commits, kerja di branch `feat/release-log` dari `main`, lewat PR. Stage per path persis (checkout dipakai bersama sesi lain). Jalankan `vp check` sebelum commit; bila UI/selector berubah, perbarui `tests/Browser` (jeda `public/hot` saat menjalankan suite browser).
- `docs/operations/vps-deployment.md` punya perubahan lokal milik pengguna: jangan disentuh.

## Review Focus

- Entri `notify: true` dengan `summary` kosong → tes config gagal (Task 1).
- Teks entri bocor istilah teknis (`#126`, "migration") → tes config gagal (Task 1).
- Versi tidak urut atau ganda di config → tes config gagal (Task 1).
- Deploy ulang versi yang sama tidak menggandakan notifikasi; pengguna nonaktif dilewati (Task 4).
- Admin dan Branch Manager tidak boleh melihat notifikasi coaching, hanya rilis; Branch Manager harus bisa menandai terbaca (Task 3).
- Diterima, dicatat sebagai shortcut: pengguna yang dibuat sesudah rilis dan sebelum deploy ulang versi sama ikut menerima notifikasi itu.

---

### Task 1: Sumber riwayat rilis

**Files:**
- Create: `config/releases.php`, `app/Support/Releases.php`
- Test: `tests/Feature/Releases/ReleasesConfigTest.php`

**Interfaces:**
- Produces: `Releases::all(): list<array{version: string, date: string, notify: bool, summary: string, items: list<string>}>` (terbaru di atas) dan `Releases::current(): array` (entri pertama), keduanya dari `config('releases')`.

- [ ] **Step 1: Buat branch** `git switch -c feat/release-log main`. Commit dokumen spec dan plan ini bersama task ini (stage per path).
- [ ] **Step 2: Tulis tes** `ReleasesConfigTest.php` dengan satu `it` per aturan, memakai `Releases::all()`: versi cocok `/^\d+\.\d+\.\d+$/`; `date` cocok `/^\d{4}-\d{2}-\d{2}$/`; urutan benar-benar menurun dengan `version_compare(...) === 1` antar-entri berurutan (menolak urutan salah dan duplikat); `items` tidak kosong dan tiap item string tidak kosong; `summary` tidak kosong bila `notify` true; tidak ada `summary`/`items` yang cocok `/#\d+|migration|\bPR\b/i`; `Releases::current()['version']` sama dengan `Releases::all()[0]['version']`.
- [ ] **Step 3: Jalankan** `php artisan test --compact tests/Feature/Releases/ReleasesConfigTest.php` → gagal (kelas belum ada).
- [ ] **Step 4: Implementasi** `Releases` (kelas final dengan dua metode statis di atas) dan `config/releases.php` berisi satu entri awal: `version '1.3.0'`, `date '2026-11-18'`, `notify false`, `summary ''`, `items`: "Username bisa kamu ganti sendiri, satu kali, dari halaman Profil. Username lama tidak bisa dipakai orang lain." / "Riwayat notifikasi 3 hari terakhir ada di menu Notifikasi." / "Password baru minimal 8 karakter dan harus ada angka serta simbol. Pesan kesalahan sekarang berbahasa Indonesia."
- [ ] **Step 5: Jalankan tes** yang sama → lulus.
- [ ] **Step 6: Commit** `feat(releases): add release history config and helper`

### Task 2: Halaman `/rilis` dan versi di UI

**Files:**
- Create: `app/Http/Controllers/ReleaseLogController.php`, `resources/js/pages/releases/index.tsx`, `resources/js/lib/releases.ts`
- Modify: `routes/web.php` (di dalam grup `auth, active, verified`, tanpa middleware role, dekat `notifications.index`), `app/Http/Middleware/HandleInertiaRequests.php`, `resources/js/types/global.d.ts`, `resources/js/components/user-menu-content.tsx`, `tests/Feature/Access/RoleRouteAccessTest.php`
- Test: `tests/Feature/Releases/ReleaseLogPageTest.php`, `tests/Frontend/releases.test.mjs`

**Interfaces:**
- Consumes: `Releases::all()`, `Releases::current()` (Task 1).
- Produces: route `releases.index` (`GET /rilis`); shared Inertia prop `appVersion: string`; `formatReleaseDate(date: string): string` di `resources/js/lib/releases.ts`.

- [ ] **Step 1: Tulis tes feature.** `ReleaseLogPageTest.php`: dataset empat role; tiap role `get(route('releases.index'))` → `assertOk`, komponen `releases/index`, prop `releases` berjumlah `count(Releases::all())` dan elemen pertama memuat `version`, `date`, `items` (tanpa `notify` dan `summary`), prop `appVersion` sama `Releases::current()['version']`. Tamu diarahkan ke `route('login')`. Tambahkan `'/rilis'` ke daftar `allowed` keempat role di `RoleRouteAccessTest.php`.
- [ ] **Step 2: Tulis tes frontend** `releases.test.mjs`: `formatReleaseDate('2026-11-18') === '18 November 2026'` dan `formatReleaseDate('2026-01-05') === '5 Januari 2026'`.
- [ ] **Step 3: Jalankan keduanya** → gagal.
- [ ] **Step 4: Implementasi.** `ReleaseLogController` invokable `__invoke(): Response` merender `releases/index` dengan `releases` (peta dari `Releases::all()` ke `version`, `date`, `items`). `formatReleaseDate` memakai `Intl.DateTimeFormat('id-ID', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'})` pada `new Date(date + 'T00:00:00Z')`. Bagikan `'appVersion' => Releases::current()['version']` di `share()` dan tipenya di `global.d.ts`. Halaman mengikuti gaya `pages/notifications/index.tsx`: judul "Riwayat Rilis", teks "Versi sekarang: v{appVersion}", daftar per versi (`v{version} · {tanggal}` dan poin). Di `user-menu-content.tsx` tambahkan satu item tautan ke `releases.index` berlabel `Rilis log · v{appVersion}` (menu ini dipakai header desktop dan mobile). Jalankan `php artisan wayfinder:generate` bila `@/routes/releases` belum ada.
- [ ] **Step 5: Jalankan tes** `php artisan test --compact tests/Feature/Releases tests/Feature/Access` dan `node --test tests/Frontend/releases.test.mjs` → lulus; `vp check` bersih; perbarui `tests/Browser` bila selector menu pengguna berubah.
- [ ] **Step 6: Commit** `feat(releases): add release log page and app version in user menu`

### Task 3: Notifikasi rilis untuk semua role

**Files:**
- Create: `app/Notifications/ReleaseAnnounced.php`
- Modify: `app/Services/VisibleCoachingNotifications.php`, `routes/web.php` (pindahkan `notifications.read` dari grup `role:sales,supervisor,admin` ke grup `auth` luar; `markRead` sudah memeriksa kepemilikan), `resources/js/lib/notifications.ts`, `tests/Frontend/notifications.test.mjs`
- Test: `tests/Feature/Notifications/ReleaseNotificationTest.php`

**Interfaces:**
- Consumes: route `releases.index` (Task 2).
- Produces: `new ReleaseAnnounced(string $version, string $summary)` dengan data `kind 'release'`, `title "Versi baru: v{$version}"`, `message $summary`, `url route('releases.index', [], false)`, `version`; `kindLabel('release') === 'Rilis'`.

- [ ] **Step 1: Tulis tes** `ReleaseNotificationTest.php` (buat pengguna lewat factory `sales/supervisor/branchManager/admin`, kirim dengan `$user->notify(new ReleaseAnnounced('1.3.1', 'Ringkasan'))`, tanpa memakai helper `historyNote` dari file lain): (a) tiap role melihat `history` berisi 1 notifikasi `data.kind 'release'`, `data.url '/rilis'`, serta `notificationsUnreadCount 1` dan `notifications` berisi 1; (b) Admin yang punya `StagnantDealsSummary` plus `ReleaseAnnounced` hanya melihat 1 di `history`; (c) Branch Manager `patch(route('notifications.read', $id))` → `assertRedirect` dan `read_at` terisi, sedangkan pengguna lain mendapat `assertForbidden`. Di `notifications.test.mjs` tambahkan `assert.equal(kindLabel('release'), 'Rilis')`.
- [ ] **Step 2: Jalankan** `php artisan test --compact tests/Feature/Notifications` dan `node --test tests/Frontend/notifications.test.mjs` → tes baru gagal.
- [ ] **Step 3: Implementasi.** `ReleaseAnnounced` mengikuti `StagnantDealsSummary` (`via` hanya `database`). Di `VisibleCoachingNotifications` tambahkan tipe ke `TYPES`; ganti `receivesNotifications` yang membuang semua hasil menjadi metode yang mengembalikan daftar tipe per role (semua `TYPES` untuk Sales/Supervisor, hanya `ReleaseAnnounced::class` untuk lainnya) dan pakai di `forUser` dan `historyFor`. Cabang `default => true` di `visible()` sudah meloloskan tipe baru. Perbarui komentar kelas. Tambahkan `case 'release': return 'Rilis'` di `kindLabel`.
- [ ] **Step 4: Jalankan** seluruh `tests/Feature/Notifications` (termasuk `NotificationHistoryTest`, harus tetap lulus: Admin/Manager tetap kosong untuk tipe coaching) dan tes frontend → lulus; `vp check` bersih.
- [ ] **Step 5: Commit** `feat(notifications): announce releases to every role`

### Task 4: Perintah `release:announce` dan hook deploy

**Files:**
- Create: `app/Console/Commands/AnnounceRelease.php`
- Modify: `deploy/vps/deploy.sh`
- Test: `tests/Feature/Notifications/AnnounceReleaseCommandTest.php`

**Interfaces:**
- Consumes: `Releases::current()` (Task 1), `ReleaseAnnounced` (Task 3).
- Produces: `php artisan release:announce` (signature `release:announce`) selalu keluar dengan `SUCCESS` bila entri valid.

- [ ] **Step 1: Tulis tes** (set `config(['releases' => [[...]]])` dengan versi `9.9.9`, `notify true`, `summary` terisi, `items` terisi; buat satu user aktif tiap role dan satu nonaktif): (a) `artisan('release:announce')` → tiap user aktif punya tepat 1 `ReleaseAnnounced` berdata `version '9.9.9'`, user nonaktif 0; (b) dijalankan dua kali tetap 1 per user; (c) `notify false` → 0 notifikasi; (d) setelah config diganti ke versi `9.9.10` di atas `9.9.9`, jalankan lagi → tiap user aktif punya 2.
- [ ] **Step 2: Jalankan** `php artisan test --compact tests/Feature/Notifications/AnnounceReleaseCommandTest.php` → gagal.
- [ ] **Step 3: Implementasi** `AnnounceRelease::handle(): int`. Kembali lebih awal bila `notify` false. Iterasi `User` aktif dengan `chunkById(200)`. Lewati pengguna yang sudah punya `ReleaseAnnounced` dengan `data['version']` sama; cek di PHP atas baris tipe itu milik chunk (periksa tipe kolom `data` di migration `create_notifications_table`; jangan memakai query JSON). Kirim dengan `Notification::sendNow($user, new ReleaseAnnounced(...), ['database'])` seperti `DetectStagnantDeals`. Tambahkan komentar `shortcut:` tentang pengguna baru yang ikut menerima pada deploy ulang versi sama.
- [ ] **Step 4: Hook deploy.** Di `deploy.sh`, sesudah baris `systemctl restart aina-queue aina-scheduler`, tambahkan `php artisan release:announce || echo "warning: release:announce failed; deploy continues" >&2`. Bila `tests/Frontend/release-deployment.test.mjs` memeriksa isi `deploy.sh`, tambahkan asersi bahwa baris itu ada setelah restart dan tidak membuat skrip gagal.
- [ ] **Step 5: Jalankan** tes command, tes frontend deploy, dan `php artisan test --compact tests/Feature/Notifications` → lulus; `vp check` bersih.
- [ ] **Step 6: Commit** `feat(releases): announce new versions from the deploy script`

### Task 5: Dokumentasi dan proses rilis

**Files:**
- Create: `docs/operations/release-log.md`
- Modify: `docs/agents/PRD.md`, `docs/agents/memory.md`

- [ ] **Step 1: Runbook** `release-log.md` (Bahasa Indonesia, singkat): tiap rilis menghasilkan dua tulisan dari bahan yang sama, catatan GitHub (dev, format v1.2.3) dan satu entri baru di paling atas `config/releases.php` yang ikut PR rilis; aturan bahasa awam; rilis murni infrastruktur memakai `notify false` dan satu poin generik "Perapian di balik layar, tidak ada perubahan tampilan."; `release:announce` dijalankan `deploy.sh` dan aman diulang; tidak ada migration. Jangan mengubah `vps-deployment.md`.
- [ ] **Step 2: PRD.** Tambahkan satu requirement di bagian notifikasi (ID bebas berikutnya pada keluarga yang dipakai CVS-11 s.d. CVS-13, prioritas M): "Semua pengguna menerima notifikasi in-app saat versi baru dirilis dan dapat membuka halaman Riwayat Rilis; versi aplikasi tampil di menu pengguna." Perbarui `memory.md` dengan satu baris keadaan yang menunjuk requirement itu dan `docs/operations/release-log.md`.
- [ ] **Step 3: Verifikasi akhir.** `php artisan test --compact`, `vp check`, dan `pnpm`/`vp` tes frontend sesuai skrip proyek → semuanya lulus.
- [ ] **Step 4: Commit** `docs(releases): document release log process and requirement`; buka PR dari `feat/release-log`.
- [ ] **Step 5 (setelah PR digabung, di luar PR):** simpan memory bahwa setiap rilis menambah entri di `config/releases.php` dalam PR rilis.
