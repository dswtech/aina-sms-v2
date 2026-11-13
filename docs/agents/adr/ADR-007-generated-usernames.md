# ADR 007 — Username otomatis dengan reservasi

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 13 November 2026 |
| Mengubah | Pembuatan username di undangan Admin (sebelumnya potongan nama deterministik dengan sufiks angka) |

## Keputusan

Username akun baru (IAM-08) dibuat saat Admin membuat undangan, karena username sudah tampil di email undangan, halaman aktivasi, dan daftar Admin sebelum akun aktif. Password tetap ditetapkan sendiri oleh penerima saat aktivasi (aturan credential production).

- `App\Support\UsernameGenerator` adalah unit murni. Ia menerima `Rand` (`intN`) dan fungsi `exists`, lalu tidak membaca database. Nama dinormalisasi ke huruf `a–z` tanpa transliterasi, urutan kata diacak (Fisher–Yates), dan awalan acak (minimal 2 huruf) dari dua kata pertama digabung. Percobaan kedua dan seterusnya menambah 2 digit di belakang. Kandidat di bawah 6 karakter diberi digit sampai 6, dan hasilnya dipotong ke 12 karakter (lebar kolom). Kandidat yang memuat kata terlarang dibuang. Setelah 50 percobaan generator melempar `UsernameExhausted`.
- Tabel `username_reservations` (unik pada `username`) menahan nama selama undangan belum diterima atau dicabut, termasuk ketika sudah kedaluwarsa, karena undangan kedaluwarsa masih bisa dikirim ulang. `UsernameReservations::reserve()` menahan nama dengan `insertOrIgnore` (`INSERT … ON CONFLICT DO NOTHING`) di transaksi yang sama dengan baris undangan. Kalau nama sudah dipegang transaksi lain, kandidat itu ditolak dan generator diulang, maksimal 5 putaran. Saat undangan diterima, dicabut, atau timnya dinonaktifkan, reservasi dilepas di transaksi yang sama.
- `exists` memeriksa `users.username`, undangan yang belum diterima atau dicabut (undangan lama tidak punya reservasi dan tidak dimigrasi datanya), dan reservasi.
- Keunikan berlaku global, sama dengan unique index `users.username`.
- Untuk form Inertia, `UsernameExhausted` tampil sebagai error field `name`, karena Inertia memakai HTTP 409 untuk reload versi aset. Request lain mendapat 409.
- `app:invite-first-admin` tetap menerima `--username` manual. Aturan bentuk, kata terlarang, dan reservasi baru diperiksa ketika undangan benar-benar akan dibuat, supaya pemanggilan ulang setelah bootstrap tetap berakhir dengan penolakan "Admin sudah ada".

## Batas

Username akun lama dan undangan lama tidak diganti, dan tidak ada migrasi data. Tidak ada transliterasi, jadi "Ñoño" menjadi "oo". Login demo pada `DevelopmentUserSeeder` tetap memakai pola lama yang deterministik. Tabel baru membuat `app:prepare-production` menolak berjalan pada skema yang sudah berisi, sehingga production memerlukan backup dan `migrate` oleh operator sebelum versi ini dirilis (ADR 006).
