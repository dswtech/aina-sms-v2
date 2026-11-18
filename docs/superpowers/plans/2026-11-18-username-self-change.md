# Ganti Username Sendiri (Satu Kali) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setiap pengguna aktif bisa memilih username-nya sendiri satu kali dari halaman Profil; nama lama ditahan selamanya.

**Architecture:** Kolom `users.username_changed_at` menandai kesempatan yang sudah dipakai. Endpoint baru `PATCH settings/profile/username` memvalidasi bentuk dan keunikan, lalu dalam satu transaksi (dengan kunci baris pengguna) menahan nama lama lewat `UsernameReservations::hold()`, menyimpan nama baru, dan mencatat `AuditRecorder`. Halaman Profil menampilkan input atau teks terkunci menurut prop `usernameLocked`.

**Tech Stack:** Laravel, Inertia + React (Wayfinder), PostgreSQL, PHPUnit/Pest, `vp check` untuk frontend.

**Spec:** `docs/superpowers/specs/2026-11-18-username-self-change-design.md`

## Global Constraints

- Bentuk username: diawali huruf, 6–12 karakter huruf kecil atau digit (`/^[a-z][a-z0-9]{5,11}$/`), unik global, tanpa kata terlarang (`UsernameGenerator::isBanned`).
- Input dinormalisasi: `trim` lalu huruf kecil, karena login memakai huruf kecil.
- Keunikan memakai `UsernameReservations::taken()` (akun, undangan menunggu, reservasi).
- Hanya sekali ganti per akun; akun lama (`username_changed_at` null) semuanya punya satu kali.
- Aksi audit: `user.username_changed`. Teks UI dan pesan error dalam bahasa Indonesia.
- Commit mengikuti Conventional Commits; kerjakan di branch `feat/username-self-change` dari `main`. Stage per path persis; jangan stage `docs/operations/vps-deployment.md`, `.claude/`, `skills-lock.json`.
- Jalankan tes yang relevan sebelum setiap commit (`php artisan test --compact --filter=...`).

## Review Focus

- Input `"  BudiSantoso "` (spasi dan huruf besar) diterima dan disimpan sebagai `budisantoso`.
- Nama yang memuat kata terlarang di tengah (`myaina123`) ditolak.
- Nama yang sama dengan username sekarang ditolak, bukan memakai kesempatan.
- Nama lama pengguna A tidak bisa dipilih pengguna B setelah A mengganti.
- Dua pengguna memilih nama yang sama bersamaan: yang kalah mendapat error field `username`, bukan HTTP 500.
- Permintaan kedua dari akun yang sudah mengganti ditolak di server walau form disembunyikan.

---

### Task 0: Branch kerja

- [ ] **Step 1:** Buat worktree atau branch `feat/username-self-change` dari `main` (`git worktree add ../aina-sms-username -b feat/username-self-change main`), lalu salin spec dan plan ini ke dalamnya.
- [ ] **Step 2:** Commit keduanya dengan `docs(auth): add username self-change design and plan` (stage per path persis).

### Task 1: Backend ganti username

**Files:**
- Create: `database/migrations/2026_11_18_000000_add_username_changed_at_to_users_table.php`
- Create: `app/Http/Requests/Settings/UsernameChangeRequest.php`
- Create: `tests/Feature/Settings/UsernameChangeTest.php`
- Modify: `app/Models/User.php` (cast `username_changed_at` => `datetime`, tambah `@property \Illuminate\Support\Carbon|null $username_changed_at`)
- Modify: `app/Http/Controllers/Settings/ProfileController.php` (prop `usernameLocked` di `edit`, method baru `updateUsername`)
- Modify: `routes/settings.php` (di grup `auth`+`active`)

**Interfaces:**
- Produces: route `profile.username.update` = `PATCH settings/profile/username`, body `username`; prop Inertia `usernameLocked: bool` pada `settings/profile`; `ProfileController::updateUsername(UsernameChangeRequest $request, UsernameReservations $reservations): RedirectResponse`.
- Consumes: `UsernameReservations::taken(string): bool`, `::hold(string): bool` (wajib di dalam transaksi), `UsernameGenerator::isBanned(string): bool`, `AuditRecorder::record(User $actor, string $action, User $subject, array $before, array $after)`.

- [ ] **Step 1: Tulis tes gagal** di `UsernameChangeTest` (kelas PHPUnit, gaya `ProfileUpdateTest`, `RefreshDatabase`):
  - `test_user_can_change_username_once`: user dengan `username => 'oldname1'`; PATCH `profile.username.update` dengan `'  BudiSantoso '`; assert redirect `profile.edit`, `$user->refresh()->username === 'budisantoso'`, `username_changed_at` tidak null, `DB::table('username_reservations')->where('username','oldname1')->exists()`, dan satu `AuditLog` dengan `action === 'user.username_changed'` dan `metadata.before.username === 'oldname1'`, `metadata.after.username === 'budisantoso'`.
  - `test_second_change_is_rejected`: user dengan `username_changed_at => now()`; PATCH `'another1'`; `assertSessionHasErrors('username')`; username tidak berubah.
  - `test_invalid_usernames_are_rejected` (data provider): `'abcde'`, `'abcdefghijklm'`, `'1abcdef'`, `'abc_def1'`, `'myaina123'`; tiap kasus `assertSessionHasErrors('username')`.
  - `test_current_username_is_rejected`: PATCH nama yang sama dengan username sekarang; error, `username_changed_at` tetap null.
  - `test_taken_names_are_rejected`: tiga kasus — dipakai user lain, ada di `username_reservations`, dipakai undangan menunggu (`Invitation::factory()`); semuanya error.
  - `test_old_name_cannot_be_taken_by_another_user`: A mengganti dari `oldname1`; B PATCH `oldname1`; B mendapat error.
  - `test_unique_index_race_returns_validation_error`: `partialMock(UsernameReservations::class)` dengan `taken` selalu `false`; user lain sudah memakai `racename1`; PATCH `racename1` → `assertSessionHasErrors('username')`, bukan 500, `username_changed_at` null.
  - `test_profile_page_reports_username_lock`: `assertInertia(fn ($page) => $page->where('usernameLocked', false))` untuk akun baru dan `true` setelah `username_changed_at` terisi.
- [ ] **Step 2:** Jalankan `php artisan test --compact --filter=UsernameChangeTest`; harapan: semua gagal (route/kolom belum ada).
- [ ] **Step 3: Migrasi** menambah `username_changed_at` timestamp nullable di `users`; tambah cast dan `@property` di `User`.
- [ ] **Step 4: `UsernameChangeRequest`**: `prepareForValidation` menormalkan `username` (`trim`, `Str::lower`); `rules()` memakai `required`, `string`, `regex:/^[a-z][a-z0-9]{5,11}$/`, plus closure yang menolak nilai sama dengan `$this->user()->username`, `UsernameGenerator::isBanned`, atau `app(UsernameReservations::class)->taken()`. Pesan error Indonesia, menyebut aturan bentuk. `authorize()` mengembalikan `$this->user()->username_changed_at === null`; kegagalan otorisasi harus muncul sebagai error field `username` (pakai `failedAuthorization` atau cek di `rules`/`after`) supaya Inertia menampilkannya, bukan 403.
- [ ] **Step 5: `ProfileController`**: `edit` menambah `'usernameLocked' => $request->user()->username_changed_at !== null`. `updateUsername` menjalankan `DB::transaction` dengan `User::lockForUpdate()` pada baris pengguna, mengecek ulang `username_changed_at` dan `taken()` setelah kunci, memanggil `hold($lama)`, menyimpan `username` dan `username_changed_at = now()`, lalu `AuditRecorder::record($user, 'user.username_changed', $user, ['username' => $lama], ['username' => $baru])`. Tangkap `UniqueConstraintViolationException` di luar transaksi dan ubah menjadi `ValidationException::withMessages(['username' => ...])`. Sukses: toast `Username diganti.` dan `to_route('profile.edit')`, mengikuti `update`.
- [ ] **Step 6: Route** `Route::patch('settings/profile/username', [ProfileController::class, 'updateUsername'])->name('profile.username.update');` di grup `auth`+`active` pada `routes/settings.php`.
- [ ] **Step 7:** Jalankan `php artisan test --compact --filter="UsernameChangeTest|ProfileUpdateTest|UsernameReservationTest"`; harapan: semua lulus.
- [ ] **Step 8: Commit**: `git add` per path persis, `feat(auth): let users change their username once`.

### Task 2: Antarmuka Profil

**Files:**
- Modify: `resources/js/pages/settings/profile.tsx`
- Modify: file tes di `tests/Browser/` yang menyentuh halaman Profil (cari dengan `grep -rl "update-profile-button\|settings/profile" tests/Browser`)

**Interfaces:**
- Consumes: prop `usernameLocked: boolean`, `ProfileController.updateUsername.form()` (dihasilkan Wayfinder), `auth.user.username`.

- [ ] **Step 1: Tulis/ubah tes Browser**: akun belum mengganti melihat input `username` dan tombol `data-test="update-username-button"`; setelah mengganti, input hilang dan username tampil sebagai teks dengan keterangan "sudah diganti". Jalankan; harapan: gagal. (Hentikan `public/hot` selama suite Browser, lihat memory proyek.)
- [ ] **Step 2: Implementasi di `profile.tsx`**: tambahkan `usernameLocked` pada props. Di bawah form nama/email, bagian baru dengan `Heading variant="small"` "Username". Bila terkunci: teks username dan keterangan "Username sudah pernah diganti dan tidak bisa diubah lagi." Bila belum: `<Form {...ProfileController.updateUsername.form()}>` dengan `Input name="username"` (`defaultValue` username sekarang, `maxLength={12}`, `autoCapitalize="none"`, `autoComplete="off"`), `InputError` memakai pola `aria-invalid`/`aria-describedby` seperti field `name`, teks bantuan aturan bentuk dan peringatan "hanya bisa diganti satu kali", serta tombol `data-test="update-username-button"`.
- [ ] **Step 3:** Jalankan `vp check`; harapan: bersih. Jalankan tes Browser yang diubah; harapan: lulus.
- [ ] **Step 4: Commit**: `feat(auth): add username section to profile settings`.

### Task 3: Dokumentasi keputusan

**Files:**
- Create: `docs/agents/adr/ADR-009-user-chosen-username.md`
- Modify: `docs/agents/PRD.md` (baris IAM-08)
- Modify: `docs/agents/README.md` (daftarkan ADR-009)
- Modify: `docs/agents/memory.md` (entri pembaruan 18 November 2026)

- [ ] **Step 1:** Tulis ADR-009 (format seperti ADR-007): status dipilih pemilik 18 November 2026; mengubah sebagian ADR-007; keputusan satu kali ganti, nama lama ditahan selamanya di `username_reservations`, bentuk dan kata terlarang tetap; batas: tidak ada jalur Admin untuk salah ketik, tidak ada alias login, CSV lama dengan nama lama tidak otomatis ikut.
- [ ] **Step 2:** Ubah IAM-08 di PRD: username awal dibuat otomatis, pengguna boleh mengganti satu kali; tautkan ADR-009. Jangan salin requirement ke dokumen lain (aturan sumber kebenaran).
- [ ] **Step 3:** Daftarkan ADR-009 di tabel manifest README dan tambah entri singkat di `memory.md` yang menunjuk ADR-009.
- [ ] **Step 4: Commit**: `docs(auth): record user-chosen username decision (ADR-009)`.

---

## Self-review

- Cakupan spec: kolom + penahanan nama lama + audit (Task 1), UI terkunci/terbuka (Task 2), ADR/PRD/README (Task 3), normalisasi huruf kecil dan balapan (Task 1 tes). Tidak ada jalur Admin, sesuai bukan-tujuan.
- Konsistensi nama: `profile.username.update`, `usernameLocked`, `username_changed_at`, `user.username_changed`, `updateUsername`, `UsernameChangeRequest` dipakai sama di semua task.
- Risiko diketahui: `UniqueConstraintViolationException` pada PostgreSQL membatalkan transaksi, jadi ditangkap di luar `DB::transaction`.
