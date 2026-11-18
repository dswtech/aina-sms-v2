# Rilis Log untuk Pengguna

Setiap rilis menghasilkan dua tulisan dari bahan yang sama:

| Untuk | Di mana | Isi |
|---|---|---|
| Dev | Catatan GitHub Release | Teknis: nomor PR, migration, perubahan infrastruktur. Format seperti v1.2.3. |
| Pengguna | Entri baru di paling atas `config/releases.php`, ikut dalam PR rilis | Bahasa awam: apa yang berubah bagi mereka. |

## Menulis entri

Tambahkan satu entri di paling atas `config/releases.php`:

- `version`: tanpa awalan "v" (`1.4.0`), harus lebih besar dari entri di bawahnya.
- `date`: `YYYY-MM-DD`.
- `notify`: `true` bila ada perubahan yang dirasakan pengguna; `false` bila tidak.
- `summary`: satu atau dua kalimat untuk notifikasi (wajib bila `notify` true).
- `items`: poin perubahan dalam bahasa sehari-hari. Tanpa nomor PR, "migration", atau "PR"; tes menolaknya.

Rilis murni infrastruktur tetap punya entri supaya versi di aplikasi benar: `notify` false dan satu poin "Perapian di balik layar, tidak ada perubahan tampilan."

## Setelah deploy

`deploy/vps/deploy.sh` menjalankan `php artisan release:announce` sesudah `current` dialihkan. Perintah ini membuat satu notifikasi di lonceng untuk setiap pengguna aktif (semua role), dilewati bila `notify` false, dan aman dijalankan ulang untuk versi yang sama. Kegagalannya hanya mencetak peringatan dan tidak menggagalkan deploy. Tidak ada migration dan tidak ada email.

Versi aplikasi di menu pengguna dan halaman `/rilis` selalu mengikuti entri teratas.
