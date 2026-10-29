# Fase 1 — Access, Organization, and Admin Implementation Plan

> Eksekusi native mengikuti `PRD.md`, `roadmap.md`, `DESIGN.md`, dan arah navigasi yang telah disetujui. Requirement tetap hidup hanya di PRD. Setiap task memakai siklus Pest RED → GREEN → suite penuh sebelum commit.

**Tujuan:** menyelesaikan fondasi akses AINA: akun aman, dealer dan tim dengan riwayat penempatan, undangan sekali pakai, pengelolaan Admin, pembatasan data server-side, audit dasar, serta shell responsif yang siap dipakai Fase 2.

**Arsitektur:** Laravel tetap menjadi sumber autentikasi, otorisasi, validasi, dan lifecycle organisasi. `users` terhubung ke satu dealer; Supervisor dan Sales ditempatkan melalui riwayat membership tim, bukan memilih scope dari client. React/Inertia memakai controller dan form request yang sama dengan policy server; halaman Admin tidak menjadi lapisan keamanan.

**Stack:** Laravel 13, Fortify, Inertia 3, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, PostgreSQL, dan Pest 5 yang sudah terpasang.

## Batas global

- Tidak memasang package baru.
- Tidak menjalankan migration/seeder pada database development tanpa izin eksplisit.
- Credential production tidak dibuat melalui migration, seeder, fixture, source, atau nilai default.
- Seeder contoh hanya berjalan pada `local`/`testing`.
- Semua akses ditegakkan server-side; menu bukan pengamanan.
- Waktu disimpan UTC dan ditampilkan dalam `Asia/Jakarta`.
- Kontras WCAG 2.2 AA, target sentuh minimal 44×44px, tanpa horizontal page scroll pada 390px, 768px, dan 1440px.

## Fokus review

- Token undangan mentah tidak pernah disimpan dan token kedaluwarsa, terpakai, atau dicabut tidak dapat mengaktifkan akun.
- Menonaktifkan user memutus akses berikutnya tanpa menghapus user atau atribusi audit.
- Supervisor tidak dapat membaca/mengubah tim lain; Sales tidak menentukan sendiri dealer/tim dari request.
- Perubahan penempatan menutup membership lama dan mempertahankan pelaku serta waktu.
- Branch Manager tetap read-only dan Admin tidak memperoleh aksi penjualan.

---

## Task 1 — Tutup temuan fondasi

**Hasil:** clean clone dapat disiapkan; akun tidak dapat dihapus permanen; logout mobile tersedia; touch target dan tanggal dashboard benar.

- [x] Tambahkan regression test untuk larangan self-delete, error akun nonaktif pada field `username`, dan props aman.
- [x] Track `.env.example` yang hanya berisi nilai dummy aman; abaikan `graphify-out/`.
- [x] Hapus route/UI self-service delete dan pertahankan alur reset password.
- [x] Tambahkan logout pada sheet mobile, minimum target sentuh 44px, dan tanggal dinamis `id-ID`/`Asia/Jakarta`.
- [x] Jalankan Pest fokus, suite backend, frontend check, type-check, dan build.

## Task 2 — Dealer, tim, dan riwayat penempatan

**Hasil:** satu dealer memiliki banyak tim dan penempatan Supervisor/Sales mempunyai riwayat efektif.

- [ ] Tulis feature test migration/model untuk `Dealer`, `Team`, `TeamMembership`, status aktif, dan histori membership.
- [ ] Tambahkan migration, model, factory, relasi, cast, dan scope membership aktif.
- [ ] Perbarui development seeder agar membuat satu dealer, tiga tim, tiga Supervisor, dan delapan Sales per tim tanpa credential production.
- [ ] Jalankan Pest fokus dan suite backend.

## Task 3 — Policy dan organizational scope

**Hasil:** request langsung dibatasi oleh dealer, tim, role, dan membership aktif.

- [ ] Tulis matriks feature test Admin, Branch Manager, Supervisor lintas tim, Sales, user nonaktif, dan membership berakhir.
- [ ] Implementasikan policy serta query scope untuk user, team, membership, dan invitation.
- [ ] Pastikan client tidak dapat memperluas scope melalui `dealer_id`, `team_id`, atau user ID request.
- [ ] Jalankan seluruh negative authorization suite.

## Task 4 — Undangan dan aktivasi akun

**Hasil:** Admin dapat membuat undangan dengan role/penempatan tetap; penerima menetapkan password sendiri melalui token sekali pakai.

- [ ] Tulis feature test create, delivery, valid activation, token hash, expiry, already-used, revoked, invalid role/team, dan inactive target.
- [ ] Tambahkan `Invitation`, migration, factory, form request, controller, policy, notification, dan route aktivasi publik bertoken.
- [ ] Buat halaman aktivasi dan state invalid/kedaluwarsa/terpakai tanpa registrasi publik.
- [ ] Pastikan acceptance membuat user/membership dalam satu transaksi dan tidak menyimpan password pada invitation/audit.
- [ ] Jalankan Pest fokus, mail assertions, type-check, dan build.

## Task 5 — Admin Pengguna & Undangan

**Hasil:** Admin melihat status invited/active/inactive dan mengelola lifecycle tanpa hard delete.

- [ ] Tulis feature test daftar terscope, invite, resend, revoke, deactivate, reactivate, dan larangan actor non-Admin.
- [ ] Implementasikan controller/form request/action dan audit untuk lifecycle user/invitation.
- [ ] Ganti placeholder `/users` dengan halaman responsif berisi daftar, filter status, dialog undangan, dan aksi yang beralasan saat disabled.
- [ ] Jalankan Pest fokus, frontend check, type-check, dan build.

## Task 6 — Admin Tim & Penempatan

**Hasil:** Admin membuat/rename/nonaktif tim serta memindahkan Supervisor/Sales dengan histori utuh.

- [ ] Tulis feature test create/rename/deactivate team, assignment, reassignment, membership close, inactive-team rejection, dan scope dealer.
- [ ] Implementasikan controller/form request/action dan audit organisasi.
- [ ] Ganti placeholder `/teams` dengan halaman responsif tim dan penempatan.
- [ ] Jalankan Pest fokus, frontend check, type-check, dan build.

## Task 7 — Audit dasar dan shared props aman

**Hasil:** perubahan akun/undangan/tim/penempatan dapat ditelusuri tanpa secret atau password.

- [ ] Tulis feature test actor, action, subject, before/after aman, timestamp, dan redaction field sensitif.
- [ ] Tambahkan `AuditLog` serta recorder kecil tanpa package baru; gunakan pada aksi Admin Fase 1.
- [ ] Batasi shared Inertia auth props pada allowlist aman.
- [ ] Jalankan test audit dan pemeriksaan tidak ada secret di props/bundle.

## Task 8 — PostgreSQL, browser, dan gerbang Fase 1

**Hasil:** seluruh matriks akses lulus pada PostgreSQL test terisolasi dan UI shell diverifikasi pada tiga viewport.

- [ ] Sediakan konfigurasi PostgreSQL test terisolasi tanpa menunjuk database development.
- [ ] Jalankan migration dan Pest pada database test PostgreSQL setelah izin database diperoleh.
- [ ] Jalankan Pint, PHPStan, Pest, frontend check, TypeScript, production build, dan detector Impeccable sekali.
- [ ] Periksa login, activation, Admin users/teams, logout, focus, overflow, dan console pada 390px, 768px, dan 1440px.
- [ ] Perbarui `memory.md` hanya dengan status dan tautan kanonik setelah bukti gerbang lengkap.

## Gerbang keluar

- Seluruh route produk terlindungi autentikasi dan policy/query scope server.
- Undangan sekali pakai dan lifecycle akun lulus skenario positif/negatif.
- Dealer, tim, dan penempatan mempunyai histori dan audit.
- Tidak ada registrasi publik, hard-delete user, secret di client, atau credential production eksplisit.
- Backend, PostgreSQL integration, frontend, aksesibilitas dasar, dan tiga viewport lulus.
