# Login sebagai (read-only) — design

Tanggal: 2026-11-24 · Ukuran: perubahan kecil (short design)

## Intent

Admin perlu melihat aplikasi persis seperti yang dilihat user tertentu untuk membantu mengecek masalah yang dilaporkan user ("data saya tidak muncul"). Hanya melihat, tidak bertindak atas nama user.

## Goals

- Admin klik "Login sebagai" di halaman Users dan melihat menu, data, dan layar persis seperti user tersebut.
- Fitur admin hilang selama sesi ini (bukan ditandai); banner tetap di atas yang tidak bisa ditutup: "Anda login sebagai {nama} ({role}) · Kembali ke Admin".
- Semua aksi tulis ditolak di server.

## Non-goals

- Bertindak atas nama user (simpan, ubah stage, komentar, follow-up).
- Export / unduhan data selama sesi.

## Anti-goals

- Audit atau data yang mencatat user sebagai pelaku padahal itu admin.
- Tampilan campuran admin+user yang tidak pernah dilihat user mana pun.

## Approaches

- **A. Tukar sesi + middleware read-only — dipilih.** Paling setia ke tampilan user karena memakai policy dan pengecekan role yang sama; read-only dijaga server.
- B. "Lihat sebagai" tanpa ganti login, setiap controller memakai aktor terpilih — ditolak: menyentuh semua controller/policy, celah yang terlewat sulit terlihat.
- C. Seperti A dengan package `lab404/laravel-impersonate` — ditolak: menambah dependency untuk ±20 baris; middleware read-only tetap ditulis sendiri.

## Keputusan pengguna

- Hanya lihat (read-only).
- Export CSV (`transactions.export`, `analytics.csv`) diblokir selama sesi.
- ORG-06: angka target management tetap tampil saat login sebagai Supervisor / Branch Manager. Ini pengecualian ORG-06 dan CVS-03 → perlu **ADR-011** baru dan pembaruan PRD (ORG-06, CVS-03, IAM-04 menyebut pengecualian login-sebagai read-only).

## Desain

- `POST admin/users/{user}/impersonate` (Admin saja): simpan `impersonator_id` di session, `Auth::login($target)`, regenerasi session, catat `AuditLog` (`action = impersonation.started`, actor = admin, subject = target).
- `POST impersonation/stop`: login kembali sebagai admin dari session, hapus kunci, catat `impersonation.stopped`, redirect ke halaman Users.
- Middleware read-only (web group): jika session punya `impersonator_id`, tolak semua request selain GET/HEAD kecuali `impersonation.stop` dan logout; tolak juga route export CSV. Respons: redirect back dengan pesan "Mode lihat saja".
- Logout saat sesi ini: akhiri sesi sepenuhnya (admin juga keluar).
- Inertia shared prop `auth.impersonator` (nama admin) → banner di layout utama + tombol "Kembali ke Admin". Sidebar/menu tidak diubah: sudah mengikuti role user.

## Keputusan saya (koreksi bila perlu)

- Tidak bisa login sebagai admin lain, akun nonaktif, atau user dealer lain; tombol tidak tampil dan server menolak (403).
- Tidak bisa memulai login-sebagai berantai dari dalam sesi login-sebagai.
- Tidak ada batas waktu sesi khusus; ikut session biasa.

## Sisa untuk builder

- Penempatan tombol di tabel Users dan gaya banner (ikuti komponen yang ada).
- Test: feature test start/stop/audit, penolakan target terlarang, blokir POST/PATCH/DELETE dan export; update selector `tests/Browser` bila UI Users berubah.
