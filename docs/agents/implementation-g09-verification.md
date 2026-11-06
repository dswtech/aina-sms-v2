# G09 — Verifikasi keamanan akses dan rekonsiliasi

## Kontrak dan batas

Rencana implementasi disetujui pengguna pada 5 November 2026. Baseline `main` adalah `dd93665` setelah PR #40; branch kerja `codex/g09-access-reporting-verification`. Requirement tetap pada [PRD](PRD.md), terutama IAM/ORG/CRM/PIP/CVS/DSH/FCT/ANL; [matriks UAT](uat-matrix.md#g09) memisahkan bukti teknis dari penerimaan manusia.

- Lengkapi assertion HTTP untuk reassignment Supervisor, pencabutan akses, coaching/non-deletion, kelompok follow-up Jakarta, serta rekonsiliasi dashboard dan Analisis.
- Perbaiki hanya pelanggaran aturan yang direproduksi tes. Tanpa endpoint, dependency, migration atau alur UI baru.
- Koreksi berwenang setelah Delivery tetap gap terbuka sesuai pilihan pengguna. Tes penolakan edit tahap biasa tidak membuktikan alur koreksi tersebut tersedia.
- Tanpa membaca `.env`, write database bisnis, pengiriman email atau migration non-test. SQLite in-memory, fixture sintetis dan fake antrean digunakan untuk verifikasi ini.

## Pekerjaan dan ledger

- [x] Audit tes G01–G08. `CoachingWorkflowTest` sudah menguji parent satu tingkat, akses menulis, snapshot, batas 299/300/301 detik, revisi, retry dan sanitasi email; `CustomerHistoryTest` menguji pembacaan revisi Admin dan scope histori. `StagnantConsistencyTest` menguji filter, count, badge dan prioritas dengan cutoff kalender Jakarta. `ReportingReconciliationTest` menguji batas bulan, Delivery unik dan atribusi historis. Tes tersebut dipertahankan.
- [x] Tambah regresi akses dan kelompok follow-up; jalankan sebelum perubahan produksi.
- [x] Perbaiki reassignment asal/penerima, scope tim nonaktif dan filter hari follow-up.
- [x] Tambah ledger laporan multi-Sales/tim/dealer, sumber/model, mode/periode, top-five dan sanitasi seluruh props halaman Branch Manager.
- [x] Jalankan pemeriksaan penuh, production build dan regresi browser relevan.
- [x] Review independen; tidak ada temuan actionable.
- [x] Perbarui bukti/matriks/memory; commit Conventional Commits dan satu PR tanpa merge.

### Hasil verifikasi

- Baseline Pest: 283 tes, 280 lulus/3 skip, 2.440 assertions. Ini hasil run baru; angka historis pada memory tetap historis.
- RED: setelah memperbaiki dua kesalahan fixture (URL komentar memakai ID route dan payload tahap memakai `to_stage`), 22 skenario awal menghasilkan lima kegagalan: asal reassignment di luar tim, penerima bukan Sales, coaching tim nonaktif, dan dua batas tanggal follow-up UTC/Jakarta.
- GREEN: 22 skenario tersebut lulus setelah perbaikan. Regresi lanjutan menemukan daftar pilihan Sales masih terkirim dari tim nonaktif; kedua halaman Customer/Transaksi kini memakai scope tim aktif yang sama.
- Ruling: reassignment Supervisor mensyaratkan assignment asal berada dalam tim yang masih berizin, sekalipun Supervisor merupakan pembuat Customer; hak baca karena pembuat bukan izin mengambil pelanggan tim lain. Admin tetap dapat menangani assignment lintas tim dalam dealer. Salah keputusan ini akan membatasi pekerjaan Supervisor yang seharusnya ditangani Admin menurut batas dalam PRD.
- Ruling: histori tim nonaktif tetap dapat diperiksa Admin; scope operasional Supervisor tidak memakai membership pada tim nonaktif. Kepemilikan transaksi tetap terpisah dari assignment Customer dan atribusi laporan tetap mengikuti tim transaksi, sesuai tes yang dipertahankan.
- Bukti baru yang langsung lulus: non-deletion/revisi, penolakan edit Delivery biasa, pencabutan akses setelah perpindahan, ledger laporan dan sanitasi Branch Manager. Tidak mengklaim tes tersebut memperbaiki bug produksi.
- Run terarah terbaru: 28 skenario tambahan lulus, 373 assertions. Ledger menghitung forecast 4 unit (1 Delivery + 3 pipeline berbobot), nilai 1.710, target 10, gap realisasi 9 dan gap forecast 6. Lima kontributor bernilai 600/450/300/250/100. Porsi sumber/model Pencapaian 57,1%/42,9%; Akuisisi 50%/50%; kejadian tahap berulang tidak menggandakan transaksi.
- `composer ci:check` lulus: tujuh tes frontend; Pest 311 tes (308 lulus/3 skip), 2.814 assertions; lint/format frontend, TypeScript, Pint dan PHPStan tanpa error. Production build lulus. Warning optional fontaine tetap historis, tanpa pemasangan package.
- Eksekusi awal Pint diblokir sandbox filesystem dan Corepack mencoba jaringan karena cache tidak terbaca; tidak ada package dipasang. Pemeriksaan akhir memakai tool lokal yang sudah ada di luar sandbox dengan `COREPACK_ENABLE_NETWORK=0`.
- Browser fixture/intercept: lead/contact/filter enam kombinasi (32 write diintersep), histori enam kombinasi plus izin/retry/draft (tiga submit diintersep), dashboard 28 pemeriksaan dan metrik role 42 pemeriksaan. Semua lulus; nol write bisnis dan nol pageerror. Respons network/HTTP gagal pada tes memang disimulasikan. Artefak screenshot/log lokal berada di `.playwright-cli/` yang diabaikan Git.
- Review independen seluruh diff terhadap `dd93665` tidak menemukan temuan actionable. Tidak ada minor yang ditunda dari review ini. `git diff --check` lulus.
- Ruling: gunakan branch khusus pada checkout bersih yang ada sesuai rencana pengguna, tanpa worktree baru atau instalasi dependency. Tidak ada perubahan pengguna yang ditimpa.
- Validasi dokumentasi: 80 referensi requirement unik tetap lengkap dan seluruh tautan lokal pada dokumen yang berubah resolve. Server QA loopback 8019 dan kedua sesi browser tugas sudah dihentikan.
- Delivery: commit implementasi `3aa9ab9`, [PR #41](https://github.com/dswtech/aina-sms-v2/pull/41), base `main`. Branch fitur didorong tanpa merge. Konektor GitHub create PR ditolak 403 izin integrasi; PR berhasil dibuat melalui GitHub CLI yang tersedia.

## Batas penerimaan

Hasil teknis G09 tidak menutup koreksi Delivery, UAT manusia, server-save browser E2E, PostgreSQL/concurrency, benchmark p95, kesiapan operasional atau go-live. Gerbang G11/G13/G14/G15 tetap terpisah. Browser memeriksa konsumsi payload sintetis oleh asset produksi; assertion HTTP memakai database test dan menjadi bukti penegakan backend. Tidak ada perubahan kontrak publik atau tipe frontend.

## Verifikasi DO dan Delivery di aina.test

Pada 7 November 2026, Chrome menguji hasil merge PR #59 (`926838b`) pada lebar 390 px. Dua transaksi sintetis baru dibuat melalui aplikasi dengan akun demo Sales. Admin dealer menjalankan pembatalan dan Branch Manager merekonsiliasi Dashboard serta Analisis Pencapaian untuk periode November 2026.

| Skenario | Bukti aktual |
|---|---|
| Checklist SPK → DO | Checklist kosong atau tanpa Unit menonaktifkan Simpan. Setelah PO, DP, dan Unit dicentang, tahap DO tersimpan. Realisasi naik dari 44 ke 45 dan jumlah Delivery tetap 30. |
| Batalkan dan catat ulang DO | Pembatalan Admin dengan alasan mengembalikan tahap ke SPK dan realisasi ke 44. Histori mempertahankan DO asli dan mencatat pembatalan yang merujuk ke DO tersebut. Saat dicatat ulang, ketiga konfirmasi mulai kosong. Setelah pencatatan ulang dan DO pada transaksi kedua, realisasi menjadi 46. |
| Konfirmasi Delivery | Transaksi kedua berubah menjadi Delivery. Realisasi tetap 46 dan jumlah Delivery naik dari 30 ke 31. Total DO pada Analisis Sumber dan Model cocok dengan Dashboard pada setiap pemeriksaan. |

Kedua transaksi sintetis tetap tersedia pada database development, satu berstatus DO dan satu berstatus Delivery. Tidak ada reset atau seeding. Percobaan awal terhenti pada 502 di halaman Pelanggan. Log Nginx menunjukkan header respons melebihi buffer FastCGI. Buffer pada virtual host lokal `aina.test` diselaraskan menjadi 32 KiB dan konfigurasi lulus pemeriksaan sebelum reload.

Verifikasi browser memakai periode berjalan. Kasus pembatalan dan pencatatan ulang lintas bulan Jakarta serta pemisahan tanggal DO dan Delivery diuji pada fixture otomatis terisolasi. Pemeriksaan terarah pipeline, rekonsiliasi dan ekspor lulus 35 tes dengan 420 assertions. Penerimaan pengguna tetap dicatat terpisah pada UAT manusia.
