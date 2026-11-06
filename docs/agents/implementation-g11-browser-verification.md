# G11 — Verifikasi browser terhadap server

Baseline `8c67ea6` (PR #42), branch `codex/g11-browser-verification`. Acuan [G11](uat-matrix.md#g11), [X02](uat-matrix.md#x02), dan [X03](uat-matrix.md#x03).

Jalankan `pnpm run build` lalu `pwsh -NoProfile -File tests/Browser/run-isolated.ps1` dengan PHP, PowerShell, Chrome, dan Playwright CLI yang tersedia lokal. Launcher membuat SQLite kosong di direktori temp, memverifikasi koneksi Laravel sebelum migrasi, memulai server loopback dengan port tersendiri, dan membersihkan sesi browser, proses PHP serta file database setelah selesai. Akun Sales dibuat dari factory test.

Pada Chrome dengan Playwright CLI 0.1.22, Sales berhasil login dan membuat lead melalui `POST /customers` (302). Tes memutus koneksi sebelum percobaan pertama, memeriksa pesan dan draft, menyambungkan kembali, lalu memastikan lead tampil setelah reload. Permintaan browser mengikuti jalur aplikasi normal. Daftar tanpa overflow dan fokus kembali setelah dialog dibuka dengan Enter dan ditutup dengan Escape pada 390×844, 768×360 dengan forced colors, dan 1440×900. Lint script browser, sintaks PHP, dan `composer ci:check` lulus. Pest 357 lulus dan tiga skip dengan 3.378 assertions. Tujuh tes frontend lulus.

Workflow GitHub Actions memasang `@playwright/cli@0.1.22` di direktori sementara runner setelah build dan pemeriksaan utama. Launcher memakai Chrome dan PowerShell bawaan Ubuntu 24.04, serta `pdo_sqlite` yang disiapkan oleh workflow. Eksekusi pada runner GitHub menunggu PR G11.

G11 masih terbuka untuk state kegagalan, loading dan stale lintas blok, pengukuran posisi filter, zoom browser, pembaca layar nyata, serta waktu tugas dan UAT manusia. Bukti awal di atas hanya mencakup alur Sales yang diuji.
