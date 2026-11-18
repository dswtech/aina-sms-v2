# Desain: Rilis Log, Notifikasi Rilis, dan Versi Aplikasi

Tanggal: 18 November 2026 · Status: menunggu persetujuan pemilik · Ukuran: perubahan kecil-menengah (satu fitur, tanpa migration)

## Maksud

Pemilik ingin setiap pengguna tahu apa yang berubah di setiap rilis, dalam bahasa awam, dan tahu versi aplikasi yang sedang dipakai. Catatan rilis GitHub (teknis, nomor PR, migration) tetap menjadi arsip dev dan tidak diubah.

## Tujuan

- Semua pengguna aktif (Sales, Supervisor, Branch Manager, Admin) mendapat notifikasi di lonceng saat rilis baru berjalan di production.
- Halaman `/rilis` menampilkan seluruh riwayat rilis, terbaru di atas, dalam bahasa awam.
- Versi aplikasi sekarang tampil kecil di UI dan membuka `/rilis`.
- Dev tidak kehilangan informasi teknis: catatan GitHub Release tetap ditulis seperti biasa (format v1.2.3).

## Bukan tujuan

- Tidak ada email, hanya notifikasi in-app.
- Tidak ada form Admin atau tabel database untuk mengedit rilis.
- Riwayat v1.0.0 sampai v1.3.0 tidak diisi ulang; daftar mulai dari rilis berikutnya.
- Tidak memanggil GitHub API saat runtime.

## Anti-tujuan (dianggap gagal walau secara teknis jalan)

- Notifikasi ganda untuk versi yang sama (misalnya karena deploy ulang).
- Versi yang tampil berbeda dari versi yang sebenarnya berjalan.
- Bahasa teknis (nomor PR, "migration", "in-app") bocor ke tampilan pengguna.
- Deploy gagal hanya karena pengumuman gagal.

## Batasan

- `deploy.sh` tidak menjalankan migration (ADR 006), jadi fitur ini tidak boleh membutuhkan migration baru. Tabel `notifications` sudah ada.
- Notifikasi yang ada sekarang hanya untuk Sales dan Supervisor serta dibatasi daftar tipe dan akses deal (`VisibleCoachingNotifications`). Tipe baru harus lolos untuk semua role tanpa melonggarkan aturan tipe lama.
- Riwayat notifikasi 3 hari (hari Jakarta). Setelah itu isinya hanya ada di `/rilis`.
- Commit mengikuti Conventional Commits dan pekerjaan lewat PR (AGENTS.md).

## Pendekatan yang dipertimbangkan

- **A. Perintah artisan dijalankan `deploy.sh` (dipilih pemilik).** Notifikasi dibuat sesudah versi baru benar-benar aktif; aman dijalankan ulang.
- B. Notifikasi dibuat saat pengguna pertama membuka aplikasi sesudah versi berubah. Ditolak: pengecekan di setiap request, dan pengguna baru ikut menerima rilis lama.
- C. Banner "ada versi baru" tanpa lonceng. Ditolak: tidak sesuai permintaan notifikasi.

Penyimpanan: file changelog di repo, bukan tabel database atau catatan GitHub. Alasannya, penulisnya Claude saat PR rilis, isinya ikut direview, dan tidak perlu migration. Catatan GitHub ditolak sebagai sumber karena bahasanya teknis dan aplikasi tidak boleh bergantung pada GitHub saat runtime.

## Desain

**Sumber versi.** `config/releases.php` mengembalikan daftar entri, terbaru di atas. Tiap entri: `version` (`1.3.0`, tanpa "v"), `date`, `notify` (bool), `summary` (1–2 kalimat untuk notifikasi), `items` (poin bahasa awam). Versi aplikasi sekarang adalah entri pertama. Memakai config supaya tidak perlu parser dan ikut `php artisan optimize`.

**Rilis murni infrastruktur.** Tetap punya entri supaya versi yang tampil selalu benar, dengan `notify => false` dan satu poin generik ("Perapian di balik layar, tidak ada perubahan tampilan"). Entri ini muncul di `/rilis` tetapi tidak mengirim notifikasi. (Keputusan saya, mengubah ucapan sebelumnya bahwa rilis infrastruktur "tidak muncul"; alasannya agar versi tidak tertinggal.)

**Notifikasi.** Kelas `ReleaseAnnounced` (kanal `database`) dengan data `kind: release`, `title: "Versi baru: v1.3.0"`, `message` dari `summary`, `url: /rilis`, `version`. Ditambahkan ke daftar tipe terlihat. Pengecekan role dilonggarkan khusus tipe ini sehingga Admin dan Branch Manager hanya melihat notifikasi rilis. Tipe ini tidak punya pengecekan akses deal.

**Perintah `release:announce`.** Membaca entri teratas; keluar tanpa melakukan apa pun bila `notify` false. Mengirim ke semua pengguna aktif yang belum punya notifikasi `ReleaseAnnounced` untuk versi itu (idempoten, per pengguna). Memakai chunk untuk daftar pengguna.

**`deploy.sh`.** Menjalankan `php artisan release:announce` setelah `current` dialihkan dan queue di-restart. Kegagalannya hanya mencetak peringatan dan tidak menggagalkan deploy.

**Halaman `/rilis`.** Route bernama `releases.index`, dapat diakses semua pengguna yang login, di luar batas role. Menampilkan versi sekarang di judul dan daftar entri (versi, tanggal Indonesia, poin). Gaya mengikuti halaman notifikasi yang ada.

**Versi di UI.** Bagikan `appVersion` lewat `HandleInertiaRequests::share`. Tampilkan sebagai teks kecil "v1.3.0" di kaki navigasi, berupa tautan ke `/rilis`. Tempat tepatnya dipilih builder sesuai layout yang ada (sidebar dan header mobile).

**Proses rilis (runbook).** Setiap rilis menghasilkan dua tulisan dari bahan yang sama: catatan GitHub (dev, format v1.2.3) dan entri changelog bahasa awam yang ikut dalam PR rilis. Langkah ini ditambahkan ke runbook di `docs/operations` dan didaftarkan bila ada dokumen agent baru.

## Pengujian

- Entri valid: versi semver, urut menurun tanpa duplikat, `items` tidak kosong, `summary` terisi bila `notify` true.
- `release:announce` mengirim ke keempat role; dijalankan dua kali tidak menggandakan; tidak mengirim saat `notify` false; mengabaikan pengguna nonaktif.
- Lonceng dan `/notifications` menampilkan notifikasi rilis untuk Admin dan Branch Manager, dan aturan Sales/Supervisor tidak berubah.
- `/rilis` dapat dibuka semua role; versi di UI sama dengan entri teratas.
- Per memory proyek: pakai `vp check`, dan perbarui `tests/Browser` bila selector UI berubah.

## Diserahkan kepada builder

- Peletakan persis teks versi dan gaya halaman `/rilis`.
- Cara mengecek idempotensi di database (kolom `data` bertipe JSON; tes memakai driver yang berbeda dari production).
- Apakah rute `/notifications` dan komponen lonceng perlu penyesuaian agar Admin dan Branch Manager dapat melihatnya.
- Entri awal: entri pertama yang valid dibuat bersama rilis pertama sesudah fitur ini (sebelum itu, `appVersion` jatuh ke nilai bawaan yang jelas, misalnya entri awal `1.3.0` tanpa notifikasi).
