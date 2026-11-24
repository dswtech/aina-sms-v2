# ADR 011 — Admin dapat "login sebagai" pengguna, hanya lihat

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 24 November 2026 |
| Mengubah | IAM-04, ORG-06, dan CVS-03: pengecualian untuk sesi "login sebagai" yang hanya lihat (IAM-09) |

## Konteks

Saat pengguna melaporkan masalah ("data saya tidak muncul"), Admin tidak dapat melihat layar pengguna tersebut. Menu, data, dan angka setiap role dibentuk oleh policy dan cakupan organisasi di server. Menebak tampilan dari sisi Admin lambat dan sering salah.

## Keputusan

- Admin dapat memulai "login sebagai" dari halaman Pengguna. Server mengganti pengguna yang login menjadi target dan menyimpan `impersonator_id` di session. Dengan begitu, semua halaman memakai policy dan cakupan milik target, bukan versi tiruannya.
- Target harus berada di dealer yang sama, aktif, bukan Admin, dan bukan Admin itu sendiri. Sesi "login sebagai" tidak dapat dimulai dari dalam sesi lain.
- Sesi ini hanya untuk melihat. Middleware `EnforceImpersonationReadOnly` menolak semua request selain GET/HEAD, kecuali "Kembali ke Admin" dan logout. Export CSV Transaksi dan Analytics juga ditolak. Route tulis baru otomatis ikut tertolak, karena yang didaftar adalah pengecualian, bukan larangan.
- Fitur Admin tidak tampil selama sesi. Banner tetap di atas halaman menampilkan nama dan role target, serta tombol "Kembali ke Admin".
- Audit `impersonation.started` dan `impersonation.stopped` mencatat Admin sebagai pelaku dan target sebagai subjek. Karena sesi ini tidak dapat menulis, tidak ada data lain yang tercatat atas nama target.
- Angka target management (ORG-06) tetap tampil saat Admin melihat sebagai Supervisor atau Branch Manager. Tampilan yang setia dianggap lebih penting untuk dukungan.
- Bila Admin dinonaktifkan atau kehilangan role Admin selama sesi, "Kembali ke Admin" mengeluarkannya sepenuhnya. Logout di tengah sesi juga mengakhiri sesi Admin.

## Alternatif yang ditolak

- **"Lihat sebagai" tanpa mengganti login.** Setiap controller dan policy harus memakai aktor pilihan. Satu tempat yang terlewat akan menampilkan tampilan Admin, dan kesalahan itu sulit terlihat.
- **Package `lab404/laravel-impersonate`.** Package ini menambah dependency untuk sekitar 20 baris kode, sedangkan middleware read-only tetap harus ditulis sendiri.
- **Menandai fitur Admin alih-alih menyembunyikannya.** Tampilannya menjadi campuran yang tidak pernah dilihat pengguna mana pun.

## Konsekuensi

- Admin dapat membaca angka target management melalui sesi ini. Kerahasiaan ORG-06 terhadap Admin kini bergantung pada audit `impersonation.started`.
- Admin tidak dapat memperbaiki data atas nama pengguna. Perbaikan tetap dilakukan lewat fitur Admin biasa atau oleh pengguna sendiri.
- GET yang mengubah data akan lolos dari middleware. Route semacam itu tidak boleh dibuat. Saat ADR ini ditulis, satu-satunya GET seperti itu adalah export, dan keduanya sudah ditolak.
