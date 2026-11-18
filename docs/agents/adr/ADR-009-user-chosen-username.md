# ADR 009 — Username pilihan pengguna, satu kali ganti

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 18 November 2026 |
| Mengubah | Sebagian [ADR 007](ADR-007-generated-usernames.md): username awal tetap dibuat otomatis, tetapi pemilik akun boleh menggantinya sendiri satu kali |

## Keputusan

Username otomatis sulit diingat, jadi setiap pengguna aktif boleh memilih username-nya sendiri satu kali dari halaman Profil (IAM-08).

- `users.username_changed_at` (nullable) menandai kesempatan yang sudah dipakai. Akun lama bernilai null, jadi semuanya punya satu kali ganti. Setelah terisi, server menolak perubahan berikutnya dan halaman Profil menampilkan username sebagai teks.
- Bentuk sama dengan username otomatis: diawali huruf, 6–12 huruf kecil atau digit, tanpa kata terlarang (`UsernameGenerator::BANNED`). Input dinormalisasi (`trim`, huruf kecil) karena login memakai huruf kecil.
- Keunikan diperiksa lewat `UsernameReservations::taken()`. Unique index `users.username` menjadi pengaman terakhir; bila dua akun memilih nama yang sama bersamaan, yang kalah mendapat error field `username`.
- Nama lama ditahan selamanya di `username_reservations` (`UsernameReservations::hold()`), supaya pengguna lain tidak bisa mengambilnya dan CSV impor lama (`sales_username`) tidak diam-diam masuk ke Sales yang salah.
- Nama baru ikut ditahan di `username_reservations` dalam transaksi yang sama, supaya undangan yang dibuat bersamaan tidak bisa memilih nama itu.
- Perubahan berjalan dalam satu transaksi dengan kunci baris pengguna dan dicatat di audit log (`user.username_changed`, nama lama dan baru).
- Endpoint: `PATCH settings/profile/username` (`profile.username.update`).

## Batas

- Tidak ada jalur Admin untuk memperbaiki salah ketik atau mengganti username pengguna lain; bila perlu, dibuat terpisah.
- Tidak ada alias login: nama lama tidak bisa dipakai masuk.
- CSV lama yang memakai nama lama tidak otomatis ikut berganti; nama itu tidak akan menunjuk ke orang lain, tetapi tidak lagi cocok dengan akun yang bersangkutan.
- Nama lama ditahan tanpa batas waktu dan tidak punya jalur pelepasan.
- Migrasi menambah satu kolom nullable; production memerlukan backup dan `migrate` oleh operator sebelum rilis (ADR 006).
