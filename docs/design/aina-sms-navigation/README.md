# AINA SMS — Struktur Navigasi dan Wireframe

Paket desain Fase 0 untuk nama kerja **DealDrive Supervisor**.

## Isi

- [`menu-structure.md`](menu-structure.md) — menu per role dan aturan navigasi.
- [`sitemap.md`](sitemap.md) — sitemap MVP dan matriks akses.
- [`design-spec.md`](design-spec.md) — isi, batasan, data sintetis, dan acceptance desain.
- [`directions.md`](directions.md) — enam kandidat dan tiga arah yang diprototipekan.
- [`direction-approved.md`](direction-approved.md) — kombinasi arah yang disetujui pengguna.
- [`verification.md`](verification.md) — hasil pemeriksaan browser dan interaksi checkpoint.
- [`design-demos/thumbs.html`](design-demos/thumbs.html) — papan enam kandidat.
- [`design-demos/dir-1.html`](design-demos/dir-1.html) — Operational Sidebar.
- [`design-demos/dir-2.html`](design-demos/dir-2.html) — Today-First Workspace.
- [`design-demos/dir-3.html`](design-demos/dir-3.html) — Customer Hub.
- [`design-demos/approved.html`](design-demos/approved.html) — prototipe terpilih yang diperluas.
- [`design-demos/approved-enhancements.css`](design-demos/approved-enhancements.css) — komponen form, state, dan layout tambahan.
- [`design-demos/approved-enhancements.js`](design-demos/approved-enhancements.js) — hash router, store sesi, otorisasi role, dan seluruh interaksi.
- [`design-demos/prototype-contract.test.js`](design-demos/prototype-contract.test.js) — pemeriksaan kontrak statis tanpa dependency.
- `design-demos/screenshots/` — render checkpoint arah; capture runtime final menunggu inspeksi browser yang dicatat di `verification.md`.

## Status

Arah kombinasi telah disetujui. Prototipe terpilih memakai Shell 1, Beranda Sales 2, serta Beranda role lain, Buku Pelanggan, dan Transaksi dari arah 1. Seluruh menu MVP kini mempunyai halaman dan alur mid-fi yang dapat digunakan dengan data sintetis dalam memori; reload mengembalikan kondisi awal.

## Sumber kebenaran

Artefak ini menerjemahkan PRD dan ADR menjadi arsitektur informasi serta wireframe. Artefak ini tidak menciptakan requirement produk baru. Jika ada konflik, ikuti `docs/agents/PRD.md` dan ADR yang berlaku.
