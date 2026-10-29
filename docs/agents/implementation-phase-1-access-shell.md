# Fase 1 — Access Shell Implementation Plan

> Eksekusi native mengikuti `PRD.md`, `roadmap.md`, `DESIGN.md`, dan arah navigasi yang telah disetujui. Requirement tetap hidup hanya di PRD.

**Tujuan:** menyediakan fondasi role dan akun aktif, route bisnis yang dilindungi server, serta shell AINA yang responsif dan aksesibel.

**Arsitektur:** role disimpan sebagai enum pada user dan diperiksa middleware Laravel. React menerima role sebagai prop aman, lalu memilih konfigurasi navigasi yang sama untuk sidebar desktop dan bottom navigation mobile. Modul bisnis yang belum dibangun memakai satu halaman status yang jujur, bukan aksi palsu.

**Stack:** Laravel 13, Inertia 3, React 19, TypeScript, Tailwind CSS 4, shadcn/ui yang sudah terpasang.

## Batas global

- Tidak memasang package baru dan tidak menjalankan migration pada PostgreSQL development.
- Semua akses route ditegakkan server-side; menu bukan pengamanan.
- Kontras minimal WCAG AA, target sentuh minimal 44×44px, tanpa horizontal page scroll pada 390px, 768px, dan 1440px.
- Arah visual tetap neutral-blue, tanpa gradient, glass, emoji, atau dekorasi berlebih.

## Task 1 — Identitas akses

- [ ] Tulis feature test untuk default role, factory role, dan penolakan login akun nonaktif; jalankan sampai gagal.
- [ ] Tambahkan `UserRole`, kolom role/status pada migration awal, cast model, factory state, dan autentikasi akun aktif.
- [ ] Jalankan test fokus sampai lulus.

## Task 2 — Matriks route

- [ ] Tulis feature test matriks akses ke route Sales, Supervisor, Branch Manager, dan Admin; jalankan sampai gagal.
- [ ] Tambahkan middleware role dan route bernama sesuai menu kanonik.
- [ ] Jalankan test fokus sampai lulus dan pastikan akses langsung yang tidak sah menghasilkan 403.

## Task 3 — Shell responsif

- [ ] Tulis assertion Inertia untuk role prop dan halaman tujuan; jalankan sampai gagal.
- [ ] Implementasikan konfigurasi menu per role, sidebar desktop, header notifikasi, bottom navigation mobile, sheet “Lainnya”, dashboard role-aware, serta empty state modul berikutnya.
- [ ] Terapkan token warna, tipografi, whitespace, focus state, reduced motion, dan safe-area bawah.
- [ ] Jalankan PHP suite, frontend lint, type-check, build, detector mekanis, lalu inspeksi browser 390px, 768px, dan 1440px.

## Fokus review

- Akun nonaktif tidak boleh memperoleh sesi baru atau mempertahankan akses route bisnis.
- Branch Manager tidak pernah memperoleh route pelanggan/transaksi operasional.
- Role yang tidak dikenal tidak boleh menghasilkan menu atau akses permisif.
- Bottom navigation tidak menutup konten dan “Lainnya” tetap dapat digunakan dengan keyboard.
- Label pelanggan berubah sesuai role tanpa mengubah keamanan route.
