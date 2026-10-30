# Petunjuk Wajib untuk Agent

Dokumen ini adalah pintu masuk untuk semua agent yang bekerja di repository ini.

## Urutan baca sebelum eksekusi

Sebelum merencanakan, menjalankan perintah, mengubah file, atau menyarankan perubahan teknis:

1. Baca seluruh aturan di [`rules/README.md`](rules/README.md).
2. Baca indeks dokumentasi di [`docs/agents/README.md`](docs/agents/README.md).
3. Baca [`docs/agents/PRD.md`](docs/agents/PRD.md) untuk kebutuhan produk.
4. Baca ADR yang relevan di [`docs/agents/adr`](docs/agents/adr).
5. Baca [`docs/agents/knowledge.md`](docs/agents/knowledge.md) untuk istilah dan batas domain.
6. Baca [`docs/agents/memory.md`](docs/agents/memory.md) untuk keadaan dan keputusan terbaru.

Jangan bekerja hanya dari memory. PRD dan ADR adalah sumber keputusan kanonik.

## Aturan sumber kebenaran

- Satu requirement ID hanya boleh hidup di PRD.
- `knowledge.md` menjelaskan istilah, bukan menyalin requirement.
- `memory.md` mencatat keadaan dan menunjuk dokumen kanonik, bukan menciptakan keputusan baru.
- ADR lama tidak ditulis ulang ketika keputusan berubah; buat ADR baru yang menggantikannya.
- Jangan menyimpan credential, token, password, isi `.env`, atau data pribadi pelanggan dalam dokumentasi.

## Manifest dokumen agent

Semua file khusus agent wajib terdaftar di [`docs/agents/README.md`](docs/agents/README.md). File yang tidak terdaftar dianggap yatim dan harus didaftarkan atau dihapus.

## Git workflow

- Semua commit wajib mengikuti Conventional Commits dengan format `<type>(<optional-scope>): <description>`.
- Jalankan automated test yang relevan sebelum membuat commit. Jika test gagal, jangan membuat commit dan laporkan kegagalannya.
- Jika repository tidak memiliki automated test, nyatakan hal tersebut dengan jelas sebelum membuat commit.
- Secara default, kerjakan perubahan di branch selain default branch dan kirimkan melalui pull request.
- Jangan commit atau push langsung ke `main` atau default branch repository, kecuali pengguna secara eksplisit meminta direct commit atau direct push ke branch tersebut untuk tugas yang sedang dikerjakan.
- Permintaan umum seperti “commit perubahan” bukan izin untuk commit atau push langsung ke default branch.
- Pengecualian direct-to-main hanya menghapus kewajiban menggunakan pull request. Conventional Commits dan kewajiban menjalankan test tetap berlaku.
