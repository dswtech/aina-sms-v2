# Login sebagai (read-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin dapat "login sebagai" user lain di dealer yang sama untuk melihat aplikasi persis seperti user itu, tanpa bisa mengubah atau mengekspor data.

**Architecture:** Tukar sesi: `Auth::login($target)` dengan `impersonator_id` disimpan di session. Satu middleware di grup `web` menolak semua request non-GET/HEAD (kecuali stop + logout) dan dua route export CSV selama sesi ini. Banner di layout membaca shared prop `auth.impersonator`.

**Tech Stack:** Laravel + Inertia React, Pest, `vp check`, Wayfinder routes.

**Spec:** `docs/superpowers/specs/2026-11-24-login-sebagai-design.md`

## Global Constraints

- Kerjakan di branch `feat/login-sebagai`, kirim lewat PR; Conventional Commits; tanpa trailer Co-Authored-By Claude.
- Session key: `impersonator_id` (int, id admin).
- Audit action: `impersonation.started`, `impersonation.stopped` via `AuditRecorder::record($admin, ..., $target)`.
- Banner copy: `Anda login sebagai {nama} ({role}) · Kembali ke Admin` — mode lihat saja.
- Pesan blokir (toast warning): `Mode lihat saja: perubahan tidak disimpan.`
- Route export yang diblokir: `transactions.export`, `analytics.csv`.
- Target terlarang: admin, akun nonaktif, dealer lain, diri sendiri. Tidak ada login-sebagai berantai.
- Angka target management tetap tampil (pengecualian ORG-06 lewat ADR-011).

## Review Focus

1. Admin dinonaktifkan / role diubah saat sedang login-sebagai → `stop` tidak boleh memulihkan login admin itu; keluar total ke `/login`. (Task 1 test)
2. `POST /impersonation/stop` tanpa `impersonator_id` di session (double-click, tab kedua) → redirect ke dashboard tanpa error, tidak ada audit. (Task 1 test)
3. Route tulis baru di masa depan → otomatis terblokir karena middleware default-deny untuk non-GET, bukan daftar blokir. (Task 2 test pakai PATCH settings/profile, route di luar grup admin)
4. Logout saat login-sebagai → session invalid, admin juga keluar; request berikutnya ke `/dashboard` redirect ke login. (Task 2 test)
5. `PATCH notifications/{id}/read` saat membuka notifikasi user → ditolak, notifikasi user tetap belum terbaca. (Task 2 test)

---

### Task 1: Mulai/berhenti login-sebagai + audit + shared prop

**Files:**
- Create: `app/Http/Controllers/Admin/ImpersonationController.php`
- Modify: `app/Policies/UserPolicy.php` (tambah `impersonate`)
- Modify: `routes/web.php` (start di grup `role:admin` ±baris 107; stop di grup `auth` tanpa `role`/`active`/`verified`)
- Modify: `app/Http/Middleware/HandleInertiaRequests.php` (`auth.impersonator`)
- Modify: `app/Http/Controllers/Admin/UserController.php` (field baris `can_impersonate`)
- Test: `tests/Feature/Admin/ImpersonationTest.php`

**Interfaces:**
- Produces: route `POST users/{user}/impersonate` name `users.impersonate`; route `POST impersonation/stop` name `impersonation.stop`; session key `impersonator_id`; shared prop `auth.impersonator: {name: string} | null`; user row prop `can_impersonate: bool`; `UserPolicy::impersonate(User $actor, User $target): bool`.

- [ ] **Step 1: Write the failing tests** di `tests/Feature/Admin/ImpersonationTest.php` (pola `beforeEach` seperti `DealerSettingsTest`):
  - `it('lets Admin view the app as a sales user and audits it')`: POST `/users/{sales public_id}/impersonate` → redirect `/dashboard`; `auth()->id()` = sales id; `session('impersonator_id')` = admin id; `AuditLog::where('action','impersonation.started')->where('actor_id',$admin->id)->where('subject_public_id',$sales->public_id)->exists()` true; GET `/dashboard` Inertia `auth.user.role` = `sales`, `auth.impersonator.name` = admin name.
  - `it('returns to Admin on stop and audits it')`: setelah start, POST `/impersonation/stop` → redirect `/users`; `auth()->id()` = admin id; `session()->missing('impersonator_id')`; audit `impersonation.stopped` ada.
  - `it('refuses forbidden targets')`: admin lain, user `is_active=false`, user dealer lain, diri sendiri → masing-masing `assertForbidden()`, user login tetap admin.
  - `it('logs out fully when the admin is no longer an active admin')`: start, lalu `$admin->update(['is_active'=>false])`, POST stop → redirect `/login`, `assertGuest()`. Ulangi dengan `role => sales`.
  - `it('ignores stop without an impersonation session')`: sebagai sales biasa POST stop → redirect `/dashboard`, tidak ada audit `impersonation.stopped`.
  - `it('marks impersonable rows on the users page')`: GET `/users` → baris sales `can_impersonate` true; baris admin sendiri, admin lain, nonaktif false.

- [ ] **Step 2: Run** `php artisan test tests/Feature/Admin/ImpersonationTest.php` → FAIL (route tidak ada).

- [ ] **Step 3: Implement**
  - `UserPolicy::impersonate`: actor admin, `sameDealer`, `! $actor->is($target)`, `$target->role !== UserRole::Admin`, `$target->is_active`. (`before()` sudah menolak actor nonaktif.)
  - `ImpersonationController::store(Request $request, User $user): RedirectResponse`: `authorize('impersonate', $user)`; abort 403 bila session sudah punya `impersonator_id`; audit started; `Auth::login($user)`; `session()->regenerate()`; `session()->put('impersonator_id', $admin->id)`; redirect `route('dashboard')`.
  - `ImpersonationController::destroy(Request $request): RedirectResponse`: tanpa key → redirect dashboard. Ambil `User::find(pull('impersonator_id'))`; bila null / nonaktif / bukan admin → `Auth::logout()`, invalidate + regenerateToken, redirect `route('login')`. Selain itu audit stopped (actor admin, subject user saat ini), `Auth::login($admin)`, regenerate, redirect `route('users.index')`.
  - `HandleInertiaRequests`: `'impersonator' => $request->session()->has('impersonator_id') ? ['name' => User::find(...)?->name] : null` di dalam `auth`.
  - `UserController::index` map: `'can_impersonate' => $actor->can('impersonate', $user)`.

- [ ] **Step 4: Run** test yang sama → PASS; lalu `php artisan test tests/Feature/Admin` → PASS.

- [ ] **Step 5: Commit** `feat(admin): let Admin log in as a user` (file di atas saja, stage by exact path).

### Task 2: Middleware read-only

**Files:**
- Create: `app/Http/Middleware/EnforceImpersonationReadOnly.php`
- Modify: `bootstrap/app.php` (append ke `web` setelah `HandleInertiaRequests`)
- Test: `tests/Feature/Admin/ImpersonationTest.php` (tambah)

**Interfaces:**
- Consumes: session key `impersonator_id`, route names `impersonation.stop`, `logout` (Fortify), `transactions.export`, `analytics.csv`.

- [ ] **Step 1: Write the failing tests** (helper `startImpersonating($admin, $target)` di file test):
  - `it('blocks writes while viewing as a user')`: sebagai sales via impersonate, PATCH `/settings/profile` `['name'=>'X']` → redirect back; nama sales tidak berubah; respons punya flash toast `['type'=>'warning','message'=>'Mode lihat saja: perubahan tidak disimpan.']`.
  - `it('keeps notifications unread while viewing as a user')`: notifikasi milik sales, PATCH `/notifications/{id}/read` → `read_at` tetap null.
  - `it('blocks CSV exports while viewing as a user')`: impersonate sales lalu GET `/transactions/export.csv`; impersonate supervisor lalu GET `/analytics/export.csv` → keduanya redirect, bukan `text/csv`.
  - `it('still allows reading pages and stopping')`: GET `/dashboard` OK; POST `/impersonation/stop` OK.
  - `it('logs everyone out on logout while viewing as a user')`: POST `/logout` → `assertGuest()`; GET `/dashboard` redirect `/login`.
  - `it('does not affect normal users')`: sales tanpa impersonate PATCH `/settings/profile` berhasil.

- [ ] **Step 2: Run** `php artisan test --filter=Impersonation` → test baru FAIL.

- [ ] **Step 3: Implement** `EnforceImpersonationReadOnly::handle(Request $request, Closure $next): Response`: lolos bila tidak ada `impersonator_id`; lolos bila route name `impersonation.stop`/`logout`; tolak bila `! $request->isMethodSafe()` atau route name di daftar export: `Inertia::flash('toast', [...])` lalu `back()`.

- [ ] **Step 4: Run** `php artisan test --filter=Impersonation` → PASS; lalu `composer test` → PASS.

- [ ] **Step 5: Commit** `feat(admin): keep log-in-as sessions read-only`.

### Task 3: Tombol di halaman Users + banner

**Files:**
- Create: `resources/js/components/impersonation-banner.tsx`
- Modify: `resources/js/layouts/app/app-sidebar-layout.tsx` (banner di atas `AppSidebarHeader`), `resources/js/layouts/app/app-header-layout.tsx` (sama)
- Modify: `resources/js/types/auth.ts` (`Auth.impersonator: { name: string } | null`)
- Modify: `resources/js/pages/admin/users/index.tsx` (`UserRow.can_impersonate`; tombol di `UserActions`)
- Modify bila selector berubah: `tests/Browser/*.js` yang menyentuh halaman Users

**Interfaces:**
- Consumes: `users.impersonate`, `impersonation.stop`, `auth.impersonator`, `can_impersonate` (Task 1).

- [ ] **Step 1: Implement** tombol `Login sebagai` (Button outline sm, `<Form action={`/users/${user.id}/impersonate`} method="post">`) hanya bila `user.can_impersonate`. `ImpersonationBanner` membaca `usePage().props.auth`, render null bila `impersonator` null; selain itu bar penuh lebar warna peringatan, `role="status"`, teks `Anda login sebagai {auth.user.name} ({label role}) · mode lihat saja` dan tombol `Kembali ke Admin` (`<Form action="/impersonation/stop" method="post">`). Label role pakai map label role yang sudah dipakai halaman Users.
- [ ] **Step 2: Run** `pnpm run check` dan `pnpm run test:frontend` → lulus.
- [ ] **Step 3: Verify manual** di `aina.test` (setelah `pnpm run build`): login admin → Users → Login sebagai Sales → menu admin hilang, banner tampil, coba simpan profil → toast warning → Kembali ke Admin → kembali ke Users. Ulangi sebagai Supervisor: target management terlihat. Lebar 375px: banner tidak membuat scroll horizontal.
- [ ] **Step 4: Run** browser suite yang menyentuh Users (pause `public/hot` dulu) → lulus.
- [ ] **Step 5: Commit** `feat(ui): add log-in-as button and banner`.

### Task 4: ADR-011 dan PRD

**Files:**
- Create: `docs/agents/adr/ADR-011-read-only-impersonation.md`
- Modify: `docs/agents/PRD.md` (ORG-06, CVS-03, IAM-04 — tambah satu kalimat pengecualian; tambah requirement baru `IAM-xx` berikutnya yang tersedia untuk login-sebagai read-only)
- Modify: `docs/agents/README.md` (daftar ADR-011), `docs/agents/memory.md` (keadaan terbaru)
- Include: `docs/superpowers/specs/2026-11-24-login-sebagai-design.md`, plan ini

- [ ] **Step 1: Write** ADR-011 mengikuti format ADR-010: konteks (bantu cek masalah user), keputusan (tukar sesi read-only, export diblokir, target management tetap tampil, audit started/stopped dengan admin sebagai actor), alternatif B/C ditolak, konsekuensi (sebagian mengubah ORG-06 dan CVS-03).
- [ ] **Step 2: Update** PRD dan manifest; pastikan tidak ada requirement ID ganda (`grep -n "IAM-" docs/agents/PRD.md`).
- [ ] **Step 3: Commit** `docs(adr): record read-only log-in-as (ADR 011)`.
