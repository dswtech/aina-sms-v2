# Memory — Handoff Agent

| Item | Keterangan |
|---|---|
| Dokumen | Keadaan proyek dan handoff agent |
| Versi | v1.19 |
| Diperbarui | 5 November 2026 |
| Status | Aktif |

Memory bukan sumber requirement. Bila isi memory bertentangan dengan PRD atau ADR, ikuti PRD/ADR dan perbaiki memory.

## Keadaan terverifikasi

- Branch `codex/team-target-allocation` berangkat dari `main`/`origin/main` `9a13d35` yang bersih. Alur target management, markup SPV, benchmark, alokasi desimal dan editor interaktif mengikuti [PRD](PRD.md) serta [ADR-004](adr/ADR-004-monthly-target-plans.md); kontrak/bukti ada pada [catatan implementasi](implementation-target-allocation.md) dan [E28](uat-matrix.md#e28). Target legacy dipertahankan; histori alokasi tidak dipindah saat Sales keluar/pindah. Seeder menambah contoh bulan berikutnya bila belum ada, tanpa mengadopsi target lama otomatis.
- Verifikasi fitur target: `composer ci:check` lulus termasuk tiga tes frontend dan Pest 216 tes (213 lulus, 3 skip, 1.675 assertions). Suite PostgreSQL test acak lulus (213 lulus, 3 skip, 1.674 assertions), database test dibersihkan. Production build dan regresi browser sintetis enam viewport/tema plus anggota/konflik lulus, nol write bisnis/error JavaScript. Review independen selesai setelah lima koreksi dengan regresi. Migration/seeder fitur baru belum diterapkan pada database bisnis; schema wajib tersedia sebelum versi aplikasi ini melayani laporan. UAT manusia, concurrency multikoneksi dan p95 tetap terbuka.


- PR [#31](https://github.com/dswtech/aina-sms-v2/pull/31) dikirim dengan commit implementasi `8504ac0`. Branch `codex/g03-reporting-reconciliation` berangkat dari `main` `9e13957` (PR #30 merged). Perbaikan G03 menyatukan periode Jakarta dan scope laporan, memulihkan ID drilldown, memperbaiki total target Sales per tim, serta menetapkan sesi koneksi PostgreSQL ke UTC dan query JSON kompatibel. Rincian, tes dan batas audit timestamp ada di [catatan G03](implementation-g03-reporting-reconciliation.md) dan [E27](uat-matrix.md#e27).
- Atas perintah pengguna, dua migration G01/G02 sudah diterapkan pada PostgreSQL development lokal dalam batch 6; schema tersedia dan jumlah record bisnis tetap. Setelah izin seeder terpisah, `DevelopmentReportingSeeder` melengkapi 6 target tim, 91 estimasi closing, 92 snapshot coaching dan 41 notifikasi demo tanpa email/reset/perubahan timestamp bisnis. Snapshot fixture yang sempat salah urutan telah dikoreksi berdasarkan timeline; data non-demo tidak diubah.
- Pengguna meminta seeder development diselaraskan ketika ada migration agar fungsi/tampilan terlihat. Aturan workflow kanonik dicatat di [rules](../../rules/README.md#data-demo-development-untuk-migration); local-only/idempotensi/preservasi manual dan izin write tetap berlaku. Seeder laporan dipanggil juga saat demo dasar sudah ada, tanpa membuat ulang akun atau dataset.
- Review independen selesai dan temuannya ditangani. `composer ci:check` lulus (205 tes, 202 lulus, 3 skip, 1534 assertions); suite PostgreSQL lulus (205 tes, 202 lulus, 3 skip, 1533 assertions), production build lulus. Preview props demo lokal tersanitasi lulus 18 kombinasi tiga layar/tiga viewport/dua tema tanpa overflow/error JavaScript atau mutasi browser. Suite PostgreSQL memakai database test khusus yang dibersihkan, bukan database bisnis. UAT/concurrency/p95 volume, bobot production dan Fase 6 tetap terbuka.

- PR [#30](https://github.com/dswtech/aina-sms-v2/pull/30) dikirim dengan commit implementasi `5592a1f`. Branch `codex/g02-team-performance-targets` berangkat dari `main`/PR #29 baseline `12c8176`. Target tim independen dan audit, estimasi closing, perbandingan tim/Sales, Delivery history/batas Jakarta, data tanpa tim, prioritas dan sanitasi notifikasi tersedia sesuai [PRD](PRD.md) dan [catatan G02](implementation-g02-team-performance.md). Supervisor menetapkan target tim untuk penggunaan saat ini; BM tetap read-only. Migration sudah diterapkan pada development lokal dalam pekerjaan G03; transaksi lama tidak di-backfill. G03/Fase 6 serta UAT tetap terbuka.
- Review independen menemukan pembulatan forecast, kelengkapan target tim nonaktif, kontributor yang sempat hilang dan label development halaman Target; semuanya ditangani. Regresi browser 21 kelompok lulus/0 gagal pada fixture sintetis, termasuk tiga viewport/dua tema dan mutasi diintersep. `composer ci:check` akhir lulus (186 tes, 183 lulus, 3 skip, 1269 assertions), production build dan lint browser lulus. Rincian pemeriksaan akhir ada pada [E26](uat-matrix.md#e26); ini bukan bukti UAT/PostgreSQL/performa production.

- PR #28 sudah merged pada baseline `dc2c1d8`. Branch `codex/compact-controls-filter-panels` merapikan kontrol bersama: tinggi 36px untuk desktop mouse tanpa sentuh, tetap 44px pada mobile/sentuh, surface/border seragam, fokus pencarian combobox menyatu dan opsi aktif muted. Target aksi tabel dan footer detail tetap nyaman. Panel filter Pelanggan, Transaksi, Admin pengguna dan Analisis dapat dilipat lewat keyboard tanpa menghapus nilai/draft atau mengubah URL. Aturan berada di [`../../DESIGN.md`](../../DESIGN.md); API, dependency dan database tidak berubah.
- Regresi kontrol/filter baru gagal sebelum implementasi lalu suite browser 18 kelompok lulus/0 gagal. Bukti terukur mencakup 390/768/1440, tinggi kontrol target Sales dan toggle password, keyboard/kontras combobox, serta filter empat halaman dalam dua tema (Pelanggan diuji pada tema aktif). `composer ci:check` lulus (171 tes, 168 lulus, 3 skip, 1065 assertions), build/lint browser lulus. Review independen dan detector desain tidak menemukan masalah. Bukti dan batas cakupan ada pada [laporan QA](accessibility-responsive-qa-2026-11-04.md). Tidak menjalankan write database bisnis, migration atau pengiriman email pada perubahan ini.
- PR #27 G01 sudah merged pada baseline `6795e9c`; branch `codex/quieter-lost-badge` dibuat dari baseline tersebut. Tindak lanjut screenshot pengguna meredupkan Lost pada tema gelap dan merapikan seluruh sel aksi tabel melalui aturan CSS bersama: bentuk terlihat 32px, teks 12px, target klik tetap minimal 44px. Cakupan tabel beraksi: Pelanggan, Transaksi, Admin pengguna/undangan, Analisis Sumber dan Model. Handler, mobile cards, schema dan API tidak berubah; aturan visual dicatat di [`../../DESIGN.md`](../../DESIGN.md).
- Verifikasi tindak lanjut tabel: tes saturasi badge dan ukuran aksi gagal sebelum perbaikan, lalu 17 kelompok regresi browser lulus/0 gagal. Pemeriksaan terarah tambahan pada tablet/desktop kedua tema serta screenshot tabel Transaksi/Admin/Analisis lulus; screenshot Lost/Pelanggan gelap, Transaksi gelap dan Admin terang diperiksa langsung. `composer ci:check` lulus (171 tes, 168 lulus, 3 skip, 1065 assertions), build/lint browser lulus dan `git diff --check` bersih. Review independen dan detector desain tidak menemukan masalah. Tidak ada write database bisnis atau pengiriman email pada pekerjaan visual ini.
- PR #26 matriks UAT sudah merged; branch `codex/g01-coaching-notifications` berangkat dari `main` `d4278c0`. Perbaikan G01 membatasi write coaching, reply satu tingkat, snapshot tahap immutable/legacy null, penyaringan baca per transaksi, notifikasi metadata in-app dan email dengan intent durable, pemulihan enqueue serta retry worker. Halaman coaching khusus mengikuti izin transaksi tanpa payload Customer setelah assignment Customer berubah. Rincian bukti berada di [E25/matriks](uat-matrix.md#e25) dan [runbook G01](../operations/coaching-notifications.md).
- Pengguna memilih Mailtrap Sandbox untuk development pada 5 November 2026; keputusan development tercatat pada PRD bagian 14 dan runbook. Credential hanya di `.env` lokal yang diabaikan Git; nilainya tidak dicatat di dokumentasi. STARTTLS/auth SMTP serta resolusi konfigurasi Laravel diverifikasi; satu template email sintetis dari Laravel tertangkap di Sandbox dan metadata/URL dikonfirmasi lewat Mailtrap CLI. Provider production tetap belum ditetapkan.
- Verifikasi G01: `composer ci:check` lulus (171 tes, 168 lulus, 3 skip, 1065 assertions), build dan lint browser lulus; regresi browser 17 kelompok lulus/0 gagal. Review independen dan perbaikan dua temuan selesai; screenshot Sales mobile/Admin desktop diperiksa. Tidak menjalankan migration pada DB development, worker/scheduler bisnis, PostgreSQL/concurrency production atau UAT manusia. Migration snapshot wajib diterapkan oleh operator pada target yang telah diotorisasi sebelum write komentar memakai versi baru; Fase 6 tetap belum selesai.
- PR #25 warna baris sudah merged ke `main` pada baseline `47ff7a9`; PR #24/footer juga sudah merged. Branch dokumentasi `codex/uat-matrix-gap-review` berangkat dari baseline tersebut dengan working tree bersih. Tidak ada perubahan fitur/API/database pada pekerjaan matriks UAT.
- [`uat-matrix.md`](uat-matrix.md) memetakan seluruh 80 referensi requirement ke assertion yang diperiksa, 20 skenario UAT empat role/lintas role dan lima gerbang operasional, serta 15 kelompok gap. Seluruh hasil UAT belum dijalankan. Inspeksi source menemukan capability parsial yang belum terungkap oleh suite lulus, termasuk dispatch coaching, batas Admin/reply, perbandingan/target tim, konsistensi periode/scope forecast, duplikat sebelum simpan, consent/riwayat lengkap dan responsivitas impor. Rincian, batas bukti, pemilik serta prioritas triase ada di matriks; ini bukan keputusan produk baru atau perbaikan implementasi.
- Verifikasi baseline `47ff7a9` pada pekerjaan dokumentasi: `composer ci:check` lulus, frontend lint/format, TypeScript, Pint, PHPStan; Pest 150 tes (147 lulus, 3 skip), 896 assertions. Tes menggunakan SQLite in-memory, bukan database bisnis. Tidak menjalankan ulang browser/build/UAT; bukti browser PR #25 tetap historis. Kesiapan seluruh requirement/Fase 6 belum dapat disimpulkan dari hasil suite ini.
- Validasi matriks lulus untuk 80 referensi unik sesuai PRD, 400 tautan/anchor, nama tes, skenario/gerbang/gap/bukti dan status belum dijalankan. Review independen selesai; kriteria delivery email dan batas waktu pengguna terlatih telah diselaraskan dengan PRD. Pemeriksaan lokal `git diff --check` bersih; tidak menambahkan validator/test aplikasi permanen.
- Branch `codex/striped-data-lists` berangkat dari `origin/main` `2cef671` (PR #24/footer sudah digabungkan). Tabel dan list/kartu mobile Pelanggan, Transaksi, dashboard, Analisis/drilldown, Admin pengguna/undangan, serta preview/riwayat impor memakai baris surface/muted selang-seling sesuai [`../../DESIGN.md`](../../DESIGN.md). Tidak ada perubahan API, database, atau dependency. `composer ci:check` lulus (147 lulus, 3 skip, 896 assertions), production build lulus, lint/format regresi browser lulus, dan regresi browser kini 16 kelompok lulus/0 gagal. Bukti dan batas fixture tercatat pada [laporan QA](accessibility-responsive-qa-2026-11-04.md).
- PRD v1.0 disetujui sebagai baseline produk pada 30 Oktober 2026.
- Skill proyek `aina-sms-workflow` ditetapkan di [`.agents/skills/aina-sms-workflow/SKILL.md`](../../.agents/skills/aina-sms-workflow/SKILL.md) sebagai patokan kerja agent.
- Fondasi aplikasi Laravel monolith dengan Inertia, React, TypeScript, Tailwind CSS, dan shadcn/ui telah tersedia di repository sesuai [`adr/ADR-001-laravel-inertia-monolith.md`](adr/ADR-001-laravel-inertia-monolith.md).
- Produk adalah responsive web app internal untuk satu dealer dengan banyak tim.
- Hierarki: Admin → Branch Manager → Supervisor → Sales.
- Branch Manager membaca dashboard, forecast, dan laporan tanpa mengubah transaksi atau membaca coaching.
- MVP mencakup autentikasi, tim, Buku Pelanggan, lead pipeline, conversation/coaching, impor CSV, dashboard, weighted forecasting, serta Analisis Sumber dan Model.
- UI referensi menggunakan filter rentang tanggal, tabel transaksi, status, pagination, serta dialog detail bertab.
- Implementasi referensi mempunyai kelemahan pada mobile; yang diambil adalah pola interaksi, bukan responsivitasnya.
- Dependency PHP dan frontend telah tersedia. Baseline `main` tersinkron ke `33a1757` setelah merge PR #23; working tree bersih sebelum branch perbaikan footer dibuat.
- Fondasi akses Fase 1 telah memakai autentikasi username, empat role server-side, status akun aktif, dan shell responsif; rencana implementasi berada di [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md).
- Fase 1 telah menyelesaikan dealer, tim, histori penempatan, scope organisasi, undangan sekali pakai, lifecycle Admin, dan audit aman. Gerbang PostgreSQL terisolasi, Pest, static analysis, frontend, build, serta browser tiga viewport telah lulus sesuai [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md).
- PostgreSQL development telah dikonfigurasi dan seeder akun development lokal telah dijalankan. Seeder dibatasi untuk environment local/testing dan credential tidak dicatat di dokumentasi.
- Implementasi Fase 0–5, CSV import, performance index, security hardening, halaman Transaksi, kontrol panel pengguna, combobox data, dan notifikasi floating telah digabungkan ke `main`.
- PR #21 telah menggabungkan seeder demo lokal lengkap: 72 pelanggan, 168 transaksi lintas seluruh tahap, aktivitas, follow-up, coaching beserta revisi, target, batch import, notifikasi, audit log, dan undangan.
- Seeder demo dijaga hanya untuk environment `local`, deterministik, dan tidak menggandakan data bila dijalankan kembali. Pagination pelanggan dan transaksi telah diverifikasi di browser.
- Verifikasi commit `c6ed3da`: frontend check, TypeScript, Pint, PHPStan, production build, serta Pest 150 tes (147 lulus, 3 skip) berhasil.
- PR #22 menggabungkan audit `playwright-cli`: 108 kombinasi halaman/viewport empat role pada 390/768/1440 tanpa horizontal page overflow pada keadaan awal yang diukur. Enam temuan P1 dan empat P2 beserta batas cakupannya tercatat di [laporan QA](accessibility-responsive-qa-2026-11-04.md).
- PR #23 menggabungkan perbaikan sepuluh temuan tersebut: keyboard menu, nama kontak, fokus detail/dialog lanjutan, kontras normal/hover, toggle password, combobox, target sentuh, label pencarian, error form, dan landmark. Regresi browser sintetis lulus 13 kelompok; pemeriksaan ulang 108 keadaan halaman nyata tidak menemukan page overflow, dan pengukuran kontrol halaman awal pada 390px tidak menemukan target di bawah 44px. Bukti dan keterbatasan berada pada bagian verifikasi lanjutan laporan; Fase 6 belum selesai.
- Permintaan pengguna untuk badge tahap berwarna diterapkan melalui StageBadge bersama pada Pelanggan, Transaksi, dashboard, dan Analisis. Palet dan pemakaian tercatat di [`../../DESIGN.md`](../../DESIGN.md); test memeriksa tujuh tahap pada dua tema dan mobile/desktop.
- Verifikasi branch perbaikan: `composer ci:check` lulus (147 lulus, 3 skip, 896 assertions), production build lulus, lint/format test browser lulus, regresi browser 13 lulus/0 gagal, serta `git diff --check` bersih. Test browser memakai fungsi CLI dengan fixture Inertia dan intercept mutasi; tidak masuk suite Pest/CI otomatis saat ini.
- Tindak lanjut screenshot pengguna pada branch `codex/perbaikan-footer-detail-pelanggan`: footer detail memakai grid dua kolom mobile/tiga kolom tablet-desktop, label dapat membungkus, dan hanya isi dialog yang scroll. Regresi geometri baru gagal pada 18 kombinasi baseline lalu lulus setelah perbaikan; suite browser kini 14 kelompok lulus. Matrix mencakup 390/768/1440 × teks Normal/Ekstra × tujuh/enam/lima aksi pada tinggi 844px. CI lokal lulus (147 lulus, 3 skip, 896 assertions), build lulus, dan review independen tidak menemukan temuan actionable. Tidak ada perubahan API, handler aksi, atau data bisnis.
- Verifikasi ulang baseline `caf2cf5`: `composer ci:check` lulus (150 tes, 147 lulus, 3 skip, 896 assertions) dan production build lulus. Pemeriksaan memakai pnpm 11.25.0 yang sudah tersedia; PHPStan/CI dan browser Playwright berjalan di luar sandbox setelah kendala akses lokal.
- QA tidak menjalankan seeder, migration, import, atau penyimpanan data bisnis. Sesi akun demo telah di-logout; artefak screenshot/hasil DOM lokal berada di luar repository. `.playwright-cli/` adalah metadata lokal yang diabaikan Git.

## Keputusan aktif

- Backend dan server utama: Laravel.
- Frontend: React + TypeScript melalui Inertia dalam repository yang sama.
- Database: PostgreSQL.
- UI: Tailwind CSS dan komponen shadcn/ui.
- Platform MVP: web app mobile-first, bukan native app dan bukan PWA.
- Detail transaksi: dialog adaptif pada desktop dan full-screen sheet/dialog pada mobile.
- Arah visual: neutral dengan blue accent.
- Forecast MVP: weighted pipeline tanpa AI.
- Conversation: timeline kronologis, reply sederhana, teks saja.
- Komentar dapat diedit oleh penulis selama lima menit; revisi lama tetap tersimpan dan komentar tidak dihapus permanen.
- Komentar baru memicu notifikasi in-app dan email. Email hanya memuat metadata aman dan tautan, bukan isi coaching.
- Customer dipisahkan dari transaksi; satu Customer dapat mempunyai beberapa peluang penjualan.
- “Buku Pelanggan Saya” menjadi phonebook kerja Sales dengan kontak terakhir, next follow-up, riwayat, dan aksi cepat.
- Data Customer merupakan aset dealer. Sales hanya menerima assignment; reassignment mempertahankan riwayat dan tidak ada bulk export atau sinkronisasi phonebook pribadi pada MVP.
- Menu Analisis menggunakan nama “Analisis”, bukan “Mapping”. Sumber dan Model masuk MVP; Area serta MSCP ditunda sampai data prasyarat tersedia.
- Roadmap kanonik pembangunan berada di [`roadmap.md`](roadmap.md), dimulai dari fondasi akses lalu Customer/pipeline sebelum coaching, forecast, dan analisis.
- Arah navigasi dan wireframe Fase 0 telah dipilih; keputusan kanonik berada di [`../design/aina-sms-navigation/direction-approved.md`](../design/aina-sms-navigation/direction-approved.md).
- Prototipe terpilih telah diperluas menjadi runtime lokal lengkap dengan hash route, data sesi, alur empat role, autentikasi, state, dan aksesibilitas; status verifikasi berada di [`../design/aina-sms-navigation/verification.md`](../design/aina-sms-navigation/verification.md).

## Keputusan terbuka

| Keputusan | Pemutus | Dampak bila belum diputuskan |
|---|---|---|
| Nama produk final | Product Owner | Branding dan judul aplikasi tetap memakai nama kerja. |
| Bobot forecast per tahap | Product Owner + operasional dealer | Forecast produksi belum dapat diaktifkan dengan nilai final. |
| Penyedia email | Product Owner + IT | Undangan dan email notifikasi belum dapat dikirim di production. |
| Lingkungan deployment | Product Owner + IT | Target konfigurasi dan runbook production belum dapat ditulis. |

## Langkah berikutnya

1. Review/delivery branch `codex/team-target-allocation`, lalu otorisasi migration dan seeder lokal baru bila diperlukan. PR #31 sudah merged pada `9a13d35`; PR #30/G02 sudah merged pada `9e13957`, migration lokal G01/G02 dan seeder laporan sudah diterapkan. Lanjutkan G04 (peringatan duplikat sebelum simpan), gerbang G13 (concurrency/performa volume) dan gap lain pada [matriks UAT](uat-matrix.md). Audit timestamp sebelum koneksi UTC memerlukan provenance; jangan menggeser data historis otomatis. Worker/scheduler bisnis tetap belum diaktifkan.
2. Tutup keputusan terbuka melalui pemutus pada PRD bagian 14; matriks hanya menunjuk keputusan tersebut, tidak menetapkan bobot forecast, bukti SPK, provider, hosting, nama atau retensi.
3. Setelah blocker ditutup, tetapkan peserta/lingkungan UAT terisolasi dan otorisasi pelaksanaannya. Jalankan skenario empat role, QA lanjutan, serta gerbang email/PostgreSQL/performa/backup/restore/monitoring; lanjutkan pilot/go-live sesuai roadmap. Semua hasil aktual UAT masih belum dijalankan.

## Larangan memory

- Jangan menaruh password, token, credential, `.env`, atau data pelanggan di sini.
- Jangan menyalin requirement lengkap dari PRD.
- Jangan mencatat keputusan baru tanpa memperbarui dokumen kanoniknya terlebih dahulu.
