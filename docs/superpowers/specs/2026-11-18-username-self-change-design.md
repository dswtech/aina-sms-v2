# Desain: pengguna mengganti username sendiri (satu kali)

Status: disetujui pemilik, 18 November 2026.

## Maksud

Username dibuat otomatis oleh sistem (IAM-08, ADR-007) dan sering sulit diingat. Pengguna ingin username yang mudah diingat, jadi setiap pengguna boleh memilih username-nya sendiri satu kali.

## Tujuan

- Pengguna aktif mengganti username miliknya dari halaman Profil.
- Setelah diganti, username terkunci.
- Nama lama tidak bisa diambil orang lain.

## Bukan tujuan

- Admin mengganti username pengguna lain. Salah ketik tidak punya jalur pemulihan di fitur ini; bila perlu, dibuat terpisah.
- Mengganti lebih dari sekali, atau dengan jeda waktu.
- Nama lama tetap bisa dipakai login (alias).
- Mengubah username yang sudah tertulis di file CSV lama.

## Anti-tujuan

- Nama lama dipakai orang lain, sehingga CSV impor lama (`sales_username`) diam-diam masuk ke Sales yang salah.
- Aturan bentuk dan kata terlarang dilewati lewat jalur ganti.

## Batasan

- Bentuk tetap seperti IAM-08: diawali huruf, 6–12 huruf atau digit, unik global, tanpa kata terlarang (`UsernameGenerator::BANNED`). Lebar kolom database 12.
- Keunikan diperiksa lewat `UsernameReservations::taken()` (akun, undangan menunggu, reservasi).
- Hanya berlaku untuk pengguna yang sedang login mengubah akunnya sendiri.

## Pendekatan

- **A. Kolom `users.username_changed_at`, nama lama ditahan di `username_reservations`, dicatat di `AuditLog` (dipilih pemilik).** Memakai komponen yang sudah ada, paling kecil. Kekurangan: nama lama ditahan selamanya, riwayat hanya di audit log.
- B. Tabel `username_changes`. Riwayat rapi, tetapi berlebihan untuk batas satu kali; cocok bila kelak ganti berulang.
- C. Alias login nama lama. Ditolak: satu akun dua nama login memperumit keunikan dan pembatasan percobaan login.

## Desain

1. Migrasi: `users.username_changed_at` nullable timestamp. Akun lama bernilai null, jadi semua punya satu kali ganti.
2. Halaman Profil menampilkan input username bila `username_changed_at` null, selain itu teks biasa dengan keterangan "sudah diganti". Tampilkan aturan bentuk dan peringatan bahwa penggantian hanya sekali.
3. Aksi ganti di `Settings\ProfileController` memakai form request sendiri. Validasi: bentuk, kata terlarang, nama baru berbeda dari yang lama, belum terpakai.
4. Di satu transaksi dengan kunci baris pengguna: tolak bila `username_changed_at` sudah terisi, tahan nama lama via `UsernameReservations::hold()`, simpan nama baru dan `username_changed_at`, catat lewat `AuditRecorder`. Unique index `users.username` menjadi pengaman terakhir saat dua orang memilih nama yang sama.
5. Dokumen: ADR baru (ADR-009) yang menggantikan sebagian ADR-007, pembaruan IAM-08 di PRD, entri di `docs/agents/README.md`.

## Diserahkan ke pelaksana

- Pencocokan huruf besar/kecil: login memakai huruf kecil, jadi nama baru dinormalisasi ke huruf kecil.
- Teks pesan error dan label UI (bahasa Indonesia, mengikuti halaman sekitar).
- Tes: fitur (berhasil, terkunci, bentrok, kata terlarang, nama lama tidak bisa diambil, balapan) dan tes Browser untuk halaman Profil.
