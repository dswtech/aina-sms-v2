# G02 — Target dan Kinerja Tim Supervisor

Tanggal: 5 November 2026. Branch: `codex/g02-team-performance-targets`, baseline `12c8176`.
Sumber aturan: [PRD](PRD.md), terutama bagian Organization, Forecast, dan Dashboard; [ADR](adr/ADR-001-laravel-inertia-monolith.md). Rencana disetujui pengguna di chat sebelum implementasi.

## Rencana dan kontrak

1. Target tim tersendiri (unik tim/periode) beserta revisi nilai/pelaku/waktu. Target Sales tetap terpisah; tidak ada fallback. Supervisor mengatur tim yang dipimpinnya dan Sales aktif dalam tim; Admin tetap mendukung, Branch Manager hanya baca.
2. `POST /targets` tetap memakai `user_id`; `POST /team-targets` memakai public UUID `team_id`, periode `YYYY-MM`, `target_units` dan `target_value` opsional. Pembaruan mengunci parent stabil dalam transaksi agar pembuatan pertama tidak beradu. `created_by_id` tidak ditimpa ketika target diperbarui.
3. `expected_closing_month` nullable: form `YYYY-MM`, penyimpanan awal bulan. Input pada kedua alur pembuatan dan `PATCH /transactions/{public_id}/closing-month` pada transaksi aktif. Migration tidak melakukan backfill.
4. Dashboard, Target, dan Kinerja Tim memakai satu perhitungan serta validasi periode. Batas bulan Jakarta dikonversi UTC dengan interval awal inklusif/akhir eksklusif. Delivery unik berdasarkan history, bukan `updated_at`. Forecast bulan lampau `null`; transaksi tanpa estimasi dan Delivery tanpa history diberi indikator.
5. Atribusi transaksi memakai `team_id` tersimpan; target Sales mengikuti membership aktif. Mantan anggota tetap tampil untuk rekonsiliasi transaksi, dengan target kosong di scope tim lamanya. Data tanpa tim tetap terlihat terpisah pada agregat dealer.
6. Stagnant memakai kondisi pipeline sekarang (>3 hari), komentar belum dibaca milik actor dan diotorisasi ulang, serta peluang closing pada periode terpilih. Tiap daftar menampilkan maksimal lima item. Kontributor nilai forecast tetap tersedia tersanitasi, termasuk untuk Branch Manager.

## Catatan keputusan implementasi

- Target agregat menjadi belum lengkap bila tim aktif belum mempunyai target. Tim nonaktif tetap tampil berlabel dan tidak diwajibkan menerima target baru; target yang pernah disimpan tetap dijumlahkan.
- Forecast unit dan gap mempertahankan dua desimal agar bobot 0,25 merekonsiliasi rincian dan total. Nilai uang berbobot memakai dua desimal.
- Pipeline per tahap diberi keterangan sebagai tahap saat ini yang memiliki estimasi closing atau kejadian tahap pada periode terpilih; bukan snapshot tahap historis. Delivery dihitung berdasarkan kejadian Delivery pada periode.
- Penyaringan notifikasi coaching dipakai juga pada shared props agar tautan metadata transaksi yang aksesnya dicabut tidak muncul kembali di floating notification.
- Tidak menambah dependency, snapshot historis, hak write Branch Manager, atau migrasi database bisnis.

## Ledger verifikasi

- Baseline backend: 171 tes, 168 lulus, 3 skip, 1065 assertions.
- RED awal: delapan tes G02 gagal pada endpoint/props yang belum ada dan rumus lama. GREEN inti kemudian lulus.
- Review independen menemukan drift pembulatan 0,25 dan tim nonaktif yang mengosongkan target dealer; tes regresi masing-masing direproduksi gagal lalu lulus sesudah perbaikan.
- Regresi tambahan memeriksa penciptaan lead/transaksi, estimasi kosong/invalid, audit update target Sales, scope dealer, data tanpa tim, serta sanitasi Branch Manager.
- Verifikasi akhir `composer ci:check` lulus: 186 tes, 183 lulus, 3 skip, 1269 assertions; frontend format/lint, TypeScript, Pint, dan PHPStan lulus. Production build lulus. pnpm 11.25.0 memakai cache lokal yang sudah tersedia, tanpa pemasangan package.
- Regresi browser penuh lulus 21 kelompok/0 gagal (12 mutasi diintersep); tiga kelompok G02 diulang dan lulus melalui menu tema aktual. Cakupan baru mencakup Dashboard/Target/Kinerja Tim × 390/768/1440 × terang/gelap, error form keyboard, estimasi closing diubah/dikosongkan tanpa mutasi tahap. Screenshot terang desktop dan gelap mobile diperiksa langsung. Artefak lokal di `.playwright-cli/` diabaikan Git.
- Tes rollback migration sempat gagal karena index kolom masih ada; `down()` kini menghapus index dahulu, dan regresi SQLite terisolasi lulus. Tidak menjalankan rollback database bisnis.
- Review independen diselesaikan; perbaikan mencakup presisi, kelengkapan tim nonaktif, pemulihan kontributor tersanitasi untuk BM dan label development di halaman Target. Tidak ada temuan review actionable yang ditunda.
- Hasil UAT manusia, PostgreSQL/concurrency dan performa volume belum dijalankan.

## Rollout dan batas bukti

Migration baru menambah `team_targets`, `team_target_revisions`, dan kolom nullable `expected_closing_month`. Operator harus mengotorisasi target environment dan menerapkan migration sebelum membuka halaman versi baru. Jangan menjalankan migration non-test atau backfill otomatis. Transaksi lama tetap tanpa estimasi dan ditampilkan sebagai data belum lengkap.

Tes otomatis memakai SQLite in-memory dan mail array; browser memakai fixture Inertia sintetis serta mutasi diintersep. Ini tidak membuktikan PostgreSQL/concurrency, p95 pada 100.000 transaksi, SLA email, backup/restore atau penerimaan pengguna. Bobot production belum disetujui. G03 dan Fase 6 belum dinyatakan selesai.
