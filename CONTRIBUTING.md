# Panduan Kontribusi

Kontribusi harus mengikuti aturan repository di [`AGENTS.md`](AGENTS.md) dan [`rules/README.md`](rules/README.md).

## Git workflow

- Gunakan branch selain branch default untuk setiap perubahan dan ajukan perubahan melalui pull request.
- Jangan commit atau push langsung ke `main` atau branch default, kecuali pengguna secara eksplisit meminta direct commit atau direct push untuk tugas yang sedang dikerjakan. Permintaan umum seperti “commit perubahan” tidak termasuk izin tersebut.
- Tulis semua commit dengan format Conventional Commits: `<type>(<optional-scope>): <description>`.
- Jalankan automated test yang relevan sebelum membuat commit. Jangan membuat commit jika test gagal; laporkan kegagalannya. Jika automated test tidak tersedia, nyatakan hal tersebut dengan jelas sebelum commit.
- Pengecualian direct-to-main hanya menghapus kewajiban pull request; aturan Conventional Commits dan pengujian tetap berlaku.

## Pemeriksaan sebelum pull request

Jalankan pemeriksaan yang relevan dengan perubahan:

```powershell
composer test
pnpm run check
pnpm run types:check
pnpm run build
```

Workflow GitHub Actions menjalankan `composer ci:check` pada setiap pull request. Pastikan pemeriksaan lokal yang relevan lulus sebelum mengajukan perubahan.
