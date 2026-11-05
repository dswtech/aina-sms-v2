# Implementasi rencana target bulanan

Spesifikasi produk ada di [PRD](PRD.md); keputusan penyimpanan ada di [ADR-004](adr/ADR-004-monthly-target-plans.md). Rencana ini disetujui melalui diskusi pengguna pada 5 November 2026.

## Urutan pekerjaan

1. Tulis dan jalankan feature test gagal untuk markup, alokasi desimal, batas 100%, audit, versi, organisasi, legacy, serta perubahan anggota.
2. Tambahkan schema alokasi terikat tim/bulan dan endpoint atomik `POST /target-plans`; lindungi endpoint lama.
3. Rekonsiliasi target management, benchmark, alokasi tersimpan, alokasi aktif, serta target personal pada laporan.
4. Ganti form individual dengan editor satu tim/bulan dan hitungan langsung; tambahkan pembagian rata eksplisit dan saran prorata Sales baru.
5. Lengkapi demo bulan berikutnya tanpa mengubah record lama/manual; perbarui dokumentasi dan verifikasi keseluruhan.

## Kontrak

Request menyertakan `team_id` UUID publik, `period` YYYY-MM, `version`, `target_units`, `markup_percent`, dan `allocations` berisi `user_id` serta `target_units`. Angka menerima format decimal bertitik pada wire, maksimal empat desimal. UI menerima koma lalu menormalisasinya. Benchmark dari client diabaikan; server menghitung sendiri.

Target management maksimal 10.000 unit, markup 0–1.000%, dan alokasi personal maksimal 110.000 unit. Target nol sah; persen dengan pembagi nol ditampilkan sebagai dash. Target nilai rupiah lama tidak diubah oleh editor ini.

Data baca `targetPlans` hanya dikirim ke Admin/Supervisor. Setiap rencana berisi versi, status legacy, anggota aktif/keluar, alokasi tersimpan, serta jumlah hari kerja untuk saran prorata. BM hanya menerima agregat; Sales hanya target personal sesuai cakupannya.

## Keputusan pelaksanaan

- Pembagian rata awal otomatis hanya berlaku pada draft baru tanpa penyesuaian. Perubahan markup pada rencana tersimpan mempertahankan alokasi.
- Bagi rata setelah ada anggota keluar membagi sisa benchmark setelah alokasi anggota keluar dipertahankan. Aksi ini memerlukan konfirmasi bila mengganti penyesuaian personal.
- Saran prorata memakai benchmark dibagi jumlah penerima alokasi tersimpan, dikalikan sisa hari Senin–Jumat pada bulan tersebut sejak hari ini atau tanggal masuk yang lebih akhir. Hari libur tidak dihitung; SPV tetap menentukan target final.
- Seeder menambah contoh rencana pada bulan berikutnya saja jika record belum ada. Data legacy dan record yang diubah pengguna tidak diadopsi otomatis.
- Branch fitur digunakan pada checkout bersih yang tersedia. Tidak membuat worktree tambahan atau memasang dependency.

## Bukti dan batas

Review menemukan dan mengoreksi gap benchmark yang tidak ter-render, bypass endpoint legacy untuk anggota baru, dan pembacaan keanggotaan sebelum lock. Masing-masing mempunyai regresi gagal sebelum perbaikan. Uji PostgreSQL juga menangkap representasi integer dari kolom decimal; accessor menormalisasi nilai tanpa menghilangkan pecahan. Bukti final dicatat setelah pemeriksaan ulang; migration/seeder development belum dijalankan. Tes browser memakai data sintetis dan intersepsi request mutasi, bukan write ke database bisnis.


## Verifikasi final

- Baseline branch `codex/team-target-allocation`: `main`/`origin/main` `9a13d35`, awalnya bersih dan tidak divergent.
- Test-first: tujuh feature test awal gagal karena route/perilaku belum ada; tes seeder gagal sebelum contoh rencana baru ditambahkan. Regresi review untuk gap benchmark, newcomer legacy, interleaving penempatan, fallback legacy, dan presisi gap gagal sebelum masing-masing koreksi.
- `composer ci:check` lulus: lint/format frontend, TypeScript, tiga tes aritmetika frontend, Pint, PHPStan, dan Pest 216 tes (213 lulus, 3 skip; 1.675 assertions).
- Suite PostgreSQL lulus pada database test acak baru: 216 tes (213 lulus, 3 skip; 1.674 assertions). Database test dibersihkan. Test interleaving penempatan deterministik; ini bukan benchmark concurrency banyak koneksi.
- Production build lulus. `tests/Browser/target-plan.js` lulus enam kombinasi 390/768/1440 × terang/gelap, ditambah anggota keluar/baru dan konflik versi. Tujuh request simpan diintersep, nol write bisnis, nol error JavaScript. Memeriksa pembagian 120/7, edit manual, markup, validasi simpan, koma, gap benchmark, target sentuh mobile dan overflow. Screenshot desktop terang/mobile gelap diperiksa langsung.
- Review independen selesai; lima temuan konkret telah diperbaiki dan diperiksa ulang tanpa temuan baru.
- Migration dan seeder baru belum dijalankan pada development/production. Semua pembacaan laporan versi ini memerlukan schema baru, sehingga deployment harus menerapkan migration sebelum trafik aplikasi baru dilayani. Seeder lokal opsional memerlukan otorisasi terpisah. UAT manusia dan pengukuran p95 tetap belum dijalankan.
