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
| [`uat-matrix.md`](uat-matrix.md) | Matriks UAT & gap | Memetakan 80 referensi requirement PRD ke assertion aktual, skenario empat role, batas bukti, backlog gap, serta gerbang operasional; hasil UAT belum dijalankan. |
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
