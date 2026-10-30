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
| [`../../PRODUCT.md`](../../PRODUCT.md) | Konteks produk | Merangkum fakta produk untuk workflow desain tanpa menggantikan requirement kanonik di PRD. |
| [`../../DESIGN.md`](../../DESIGN.md) | Sistem desain | Mencatat keputusan visual terpilih dan aturan implementasi UI. |
| [`../../.agents/skills/aina-sms-workflow/SKILL.md`](../../.agents/skills/aina-sms-workflow/SKILL.md) | Skill proyek | Menetapkan preflight, routing skill, batas keselamatan, verifikasi, dan format handoff untuk semua agent. |
| [`PRD.md`](PRD.md) | PRD | Menetapkan apa yang dibangun, untuk siapa, batasan, requirement, dan ukuran keberhasilan. |
| [`knowledge.md`](knowledge.md) | Glosarium & katalog | Menjelaskan istilah domain, tahap pipeline, dan peta kewenangan tanpa menyalin requirement. |
| [`memory.md`](memory.md) | Runbook/handoff | Mencatat keadaan terverifikasi, keputusan aktif, keputusan terbuka, dan langkah berikutnya. |
| [`roadmap.md`](roadmap.md) | Roadmap | Menetapkan urutan pembangunan, dependensi, test wajib, dan gerbang keluar setiap fase. |
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
