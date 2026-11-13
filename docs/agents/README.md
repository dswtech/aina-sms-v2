# Paket Dokumentasi Agent

| Item | Keterangan |
|---|---|
| Dokumen | Indeks dan paket serah terima dokumentasi agent |
| Versi | v1.0 |
| Tanggal | 28 Oktober 2026 |
| Status | Berlaku |

Dokumen dalam folder ini disusun untuk agent dan engineer yang tidak ikut dalam diskusi awal. Setiap keputusan kanonik hanya hidup di satu tempat.

## Manifest

| File | Jenis | Fungsi |
|---|---|---|
| [../superpowers/specs/2026-11-13-toyota-vehicle-catalog-design.md](../superpowers/specs/2026-11-13-toyota-vehicle-catalog-design.md) | Desain singkat | Katalog bawaan 20 model Toyota dengan harga perkiraan OTR Bandung 2026 untuk demo, production berjalan (migration) dan install baru (`app:invite-first-admin`); disetujui 13 November 2026. |
| [../superpowers/plans/2026-11-13-toyota-vehicle-catalog.md](../superpowers/plans/2026-11-13-toyota-vehicle-catalog.md) | Rencana | Dua task: katalog dan `initializeVehicles()` di `TransactionMasters` dengan seeder demo, lalu migration dan bootstrap dealer pertama; dijalankan 13 November 2026. |
| [../superpowers/specs/2026-11-09-transaction-detail-modal-design.md](../superpowers/specs/2026-11-09-transaction-detail-modal-design.md) | Desain singkat | Modal detail transaksi dua panel: detail, properti dan timeline tahap di kiri; properti diedit di tempat lewat popover; panel kanan sempit, bisa digeser/dilipat, berganti mode Komentar coaching/Aktivitas lewat rail ikon; mobile satu kolom; disetujui, diimplementasikan, dan merged lewat PR #82. |
| [../superpowers/plans/2026-11-09-transaction-detail-modal.md](../superpowers/plans/2026-11-09-transaction-detail-modal.md) | Rencana | Tujuh task: opsi timeline, payload dan endpoint feed, helper murni, ekstraksi bersama, properti yang diedit di tempat, modal dua panel, lalu tes browser dan dokumen; dijalankan 9 November 2026; merged lewat PR #82. |
| [../superpowers/specs/2026-11-09-wide-content-compact-controls-design.md](../superpowers/specs/2026-11-09-wide-content-compact-controls-design.md) | Desain singkat | Batas lebar konten halaman data 1536px dan kontrol 36px untuk mouse di lebar 1280px ke atas tanpa klausa `any-pointer`; disetujui. |
| [../superpowers/plans/2026-11-09-wide-content-compact-controls.md](../superpowers/plans/2026-11-09-wide-content-compact-controls.md) | Rencana | Tiga task: tes browser gagal dulu, ubah batas lebar sembilan halaman data dan media query kontrol, lalu dokumen dan verifikasi; dijalankan 9 November 2026, PR belum dibuka. |
| [../superpowers/plans/2026-11-08-transactions-financing-area-end-to-end.md](../superpowers/plans/2026-11-08-transactions-financing-area-end-to-end.md) | Rencana end-to-end | Kontrak backend, form/list Transaksi, pembiayaan, Mapping Area, urutan dependensi dan ownership sub-agent; Tahap 1 backend terverifikasi, UI/cutover Tahap 2–4 belum diimplementasikan. |
| [../superpowers/plans/2026-11-08-mapping-area-preview.md](../superpowers/plans/2026-11-08-mapping-area-preview.md) | Preview frontend | Mapping Area, master 106 kecamatan, FOA snapshot DO dan ekspor sintetis tanpa backend. |
| [../superpowers/plans/2026-11-08-financing-ui-preview.md](../superpowers/plans/2026-11-08-financing-ui-preview.md) | Preview frontend | Laporan pembiayaan, master leasing dan form transaksi dengan data sintetis serta batas tanpa backend. |
| [../superpowers/plans/2026-11-08-production-monitoring.md](../superpowers/plans/2026-11-08-production-monitoring.md) | Rencana | Monitor HTTPS production, retry terbatas, notifikasi Actions dan batas cakupan. |
| [adr/ADR-007-generated-usernames.md](adr/ADR-007-generated-usernames.md) | ADR | Username akun baru dibuat otomatis dari nama saat undangan dibuat, dengan generator murni dan tabel reservasi unik untuk mencegah race; akun lama tidak diubah. |
| [adr/ADR-006-versioned-production-releases.md](adr/ADR-006-versioned-production-releases.md) | ADR | Rilis production hanya dari GitHub Release stable bernomor dengan commit main dan CI terverifikasi. |
| [../superpowers/plans/2026-11-08-versioned-releases.md](../superpowers/plans/2026-11-08-versioned-releases.md) | Rencana | Pengujian dan penerapan workflow rilis bernomor serta penghentian auto-deploy main. |
| [../superpowers/plans/2026-11-07-production-release.md](../superpowers/plans/2026-11-07-production-release.md) | Rencana production | Guard bootstrap production, migrasi terotorisasi, undangan Admin, domain final dan ledger rilis. |
| [../operations/vercel-deployment.md](../operations/vercel-deployment.md) | Runbook deployment | Audit Vercel, Neon, Gmail SMTP, bootstrap Admin, worker, scheduler, monitoring dan gerbang rilis. |
| [adr/ADR-005-vercel-neon-pilot.md](adr/ADR-005-vercel-neon-pilot.md) | ADR | Pilihan deployment awal Vercel, Neon dan Gmail SMTP serta konsekuensi operasional. |
| [../operations/backup-restore.md](../operations/backup-restore.md) | Runbook dan bukti O03 | Prosedur backup, restore terisolasi, drill sintetis dan batas kesiapan operasional. |
| [`implementation-g13-postgres-pilot.md`](implementation-g13-postgres-pilot.md) | Bukti G13 | Profil pilot, suite PostgreSQL, concurrency impor, dan batas benchmark kapasitas. |
| [`implementation-g11-browser-verification.md`](implementation-g11-browser-verification.md) | Bukti G11 | Regresi browser dengan Laravel dan SQLite test, bukti awal X02/X03, serta status integrasi CI. |
| [`implementation-g10-import-export.md`](implementation-g10-import-export.md) | Rencana dan bukti G10 | Verifikasi impor, rollback, replay, akses dan rekonsiliasi ekspor CSV/PDF browser. |
| [`implementation-g09-verification.md`](implementation-g09-verification.md) | Rencana dan bukti historis G09 | Verifikasi akses, reassignment, coaching, follow-up Jakarta dan rekonsiliasi sebelum realisasi dipindahkan ke DO. |
| [`design-g06-g08-history-stagnant-import.md`](design-g06-g08-history-stagnant-import.md) | Rancangan G06–G08 | Rancangan disetujui untuk riwayat terpadu, audit revisi Admin, konsistensi hari kalender stagnan dan impor mobile dalam satu PR. |
| [`implementation-g06-g08.md`](implementation-g06-g08.md) | Rencana G06–G08 | Task, kontrak, verifikasi dan ledger implementasi satu PR. |
| [`../panduan-bobot-forecast.md`](../panduan-bobot-forecast.md) | Panduan pembaca | Penjelasan bobot forecast, simulasi unit/gap, pengaruh bobot dan cakupan role untuk dibaca ulang atau dibagikan. |
| [`../panduan-forecast-sederhana.md`](../panduan-forecast-sederhana.md) | Panduan pembaca | Penjelasan sederhana fungsi forecast, cara hitung dengan contoh, batasan dan hubungannya dengan menu Target. |
| [`implementation-g05-lead-contact-filters.md`](implementation-g05-lead-contact-filters.md) | Rencana dan bukti G05 | Form lead, penanggung jawab, filter transaksi dan preferensi/penolakan kontak. |
| [`implementation-dashboard-analytics.md`](implementation-dashboard-analytics.md) | Desain dan bukti | Dashboard analitik seimbang, batas role, chart tanpa dependency, serta verifikasi layout dan laporan. |
| [`implementation-g04-duplicate-confirmation.md`](implementation-g04-duplicate-confirmation.md) | Rencana dan bukti G04 | Konfirmasi duplikat sebelum write, pelanggan existing sesuai akses, serta revalidasi import. |
| [`adr/ADR-004-monthly-target-plans.md`](adr/ADR-004-monthly-target-plans.md) | ADR | Penyimpanan rencana target, presisi decimal, histori alokasi, transaksi atomik dan versi. |
| [`implementation-target-allocation.md`](implementation-target-allocation.md) | Rencana dan bukti | Implementasi target management, markup, benchmark serta editor alokasi Sales. |
| [`../../PRODUCT.md`](../../PRODUCT.md) | Konteks produk | Merangkum fakta produk untuk workflow desain tanpa menggantikan requirement kanonik di PRD. |
| [`../../DESIGN.md`](../../DESIGN.md) | Sistem desain | Mencatat keputusan visual terpilih dan aturan implementasi UI. |
| [`../../.agents/skills/aina-sms-workflow/SKILL.md`](../../.agents/skills/aina-sms-workflow/SKILL.md) | Skill proyek | Menetapkan preflight, routing skill, batas keselamatan, verifikasi, dan format handoff untuk semua agent. |
| [`PRD.md`](PRD.md) | PRD | Menetapkan apa yang dibangun, untuk siapa, batasan, requirement, dan ukuran keberhasilan. |
| [`knowledge.md`](knowledge.md) | Glosarium & katalog | Menjelaskan istilah domain, tahap pipeline, dan peta kewenangan tanpa menyalin requirement. |
| [`memory.md`](memory.md) | Runbook/handoff | Mencatat keadaan terverifikasi, keputusan aktif, keputusan terbuka, dan langkah berikutnya. |
| [`roadmap.md`](roadmap.md) | Roadmap | Menetapkan urutan pembangunan, dependensi, test wajib, dan gerbang keluar setiap fase. |
| [`uat-matrix.md`](uat-matrix.md) | Matriks UAT & gap | Memetakan 80 referensi requirement PRD ke assertion aktual, skenario empat role, batas bukti, backlog gap, serta gerbang operasional; hasil UAT per skenario belum dijalankan (UAT manual dilewati atas keputusan pemilik, lihat G15). |
| [`../operations/coaching-notifications.md`](../operations/coaching-notifications.md) | Runbook G01 | Mencatat otorisasi coaching, migration snapshot, intent/retry email, worker/scheduler, Mailtrap development dan batas bukti verifikasi. |
| [`accessibility-responsive-qa-2026-11-04.md`](accessibility-responsive-qa-2026-11-04.md) | Laporan QA | Mencatat audit Playwright empat role, tiga viewport, temuan aksesibilitas, bukti, batas cakupan, dan langkah regresi Fase 6. |
| [`implementation-phase-6-accessibility-fixes.md`](implementation-phase-6-accessibility-fixes.md) | Rencana perbaikan | Menetapkan perbaikan sepuluh temuan audit, test browser sintetis, dan verifikasi Fase 6. |
| [`implementation-g03-reporting-reconciliation.md`](implementation-g03-reporting-reconciliation.md) | Implementasi G03 | Mencatat rekonsiliasi laporan, verifikasi PostgreSQL, migration lokal G01/G02, seeder development, dan batas bukti. |
| [`implementation-g02-team-performance.md`](implementation-g02-team-performance.md) | Implementasi G02 | Mencatat rencana yang disetujui, kontrak target/closing, bukti tes, review, dan batas rollout database G02. |
| [`implementation-phase-1-access-shell.md`](implementation-phase-1-access-shell.md) | Rencana implementasi | Memecah fondasi role, matriks route, dan shell responsif Fase 1 menjadi siklus test-first. |
| [`implementation-phase-2-customer-slice.md`](implementation-phase-2-customer-slice.md) | Rencana implementasi | Merencanakan vertical slice Fase 2 (Customer, assignment, pipeline, aktivitas, follow-up, mobile). |
| [`ringkasan-untuk-supervisor.md`](ringkasan-untuk-supervisor.md) | Panduan | Menjelaskan produk dalam bahasa operasional yang mudah dipahami Supervisor. |
| [`adr/ADR-001-laravel-inertia-monolith.md`](adr/ADR-001-laravel-inertia-monolith.md) | ADR | Menetapkan satu aplikasi Laravel–Inertia dibandingkan SPA/API terpisah. |
| [`adr/ADR-002-postgresql.md`](adr/ADR-002-postgresql.md) | ADR | Menetapkan PostgreSQL sebagai database utama. |
| [`adr/ADR-003-responsive-web-platform.md`](adr/ADR-003-responsive-web-platform.md) | ADR | Menetapkan responsive web app tanpa native app, PWA, atau offline sync pada MVP. |

## Urutan pemeliharaan

1. Kebutuhan produk diubah di PRD.
2. Keputusan teknis mahal dibalik dicatat sebagai ADR baru.
3. Istilah baru ditambahkan ke knowledge tanpa menyalin requirement.
4. Memory diperbarui hanya untuk keadaan, bukti, dan handoff.
5. Manifest ini diperbarui setiap kali file agent ditambah atau dihapus.
