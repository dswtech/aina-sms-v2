# Struktur Menu Berbasis Role

## Prinsip navigasi

- Desktop menggunakan sidebar berlabel agar tujuan tetap eksplisit.
- Mobile menampilkan maksimal empat tujuan primer; tujuan lain berada dalam sheet **Lainnya**.
- Notifikasi dapat dibuka dari header dan memiliki halaman khusus.
- Profil dan keluar akun berada dalam menu akun.
- Coaching, riwayat tahap, dan audit hanya muncul di detail transaksi, bukan sebagai menu utama.
- Role selector hanya tersedia pada prototipe untuk review dan tidak menjadi UI produksi.

## Sales

| Prioritas | Menu | Tujuan |
|---:|---|---|
| 1 | Beranda | Tindakan hari ini, follow-up terlambat, arahan belum dibaca, dan ringkasan target pribadi. |
| 2 | Buku Pelanggan Saya | Pelanggan yang ditugaskan, kontak terakhir, next follow-up, dan aksi cepat. |
| 3 | Transaksi | Pipeline pribadi, pencarian, filter, dan pembaruan tahap. |
| 4 | Notifikasi | Coaching, assignment, dan perubahan penting yang belum dibaca. |
| 5 | Profil | Identitas akun dan reset password. |

Mobile primer: **Beranda · Pelanggan · Transaksi · Lainnya**.

## Supervisor

| Prioritas | Menu | Tujuan |
|---:|---|---|
| 1 | Beranda | Target, realisasi, forecast, gap, dan tindakan yang membutuhkan perhatian. |
| 2 | Pelanggan Tim | Pelanggan dalam cakupan tim dan reassignment yang berwenang. |
| 3 | Transaksi | Pipeline tim, stagnant lead, dan coaching dalam detail transaksi. |
| 4 | Target | Target tim dan Sales beserta audit perubahan. |
| 5 | Analisis | Sumber dan Model untuk cakupan tim. |
| 6 | Import Data | Template, upload, preview, validasi, dan ringkasan batch CSV. |
| 7 | Notifikasi | Coaching, aktivitas, dan perubahan assignment. |
| 8 | Profil | Identitas akun dan reset password. |

Mobile primer: **Beranda · Pelanggan · Transaksi · Lainnya**. Target, Analisis, Import Data, dan Notifikasi berada di Lainnya.

## Branch Manager

| Prioritas | Menu | Tujuan |
|---:|---|---|
| 1 | Beranda | Agregat dealer: target, realisasi, forecast, gap, dan risiko. |
| 2 | Kinerja Tim | Perbandingan antar-tim tanpa data kontak pelanggan. |
| 3 | Analisis | Sumber dan Model dengan drilldown tersanitasi. |
| 4 | Notifikasi | Pemberitahuan agregat yang relevan. |
| 5 | Profil | Identitas akun dan reset password. |

Mobile primer: **Beranda · Kinerja · Analisis · Lainnya**. Branch Manager tidak memiliki menu pelanggan, transaksi operasional, target edit, atau coaching.

## Admin

| Prioritas | Menu | Tujuan |
|---:|---|---|
| 1 | Beranda | Status akun, undangan, struktur tim, dan dukungan operasional. |
| 2 | Pelanggan | Audit dan pengelolaan assignment pelanggan. |
| 3 | Transaksi | Dukungan dan audit transaksi; conversation hanya read-only untuk audit. |
| 4 | Pengguna & Undangan | Undangan, status akun, role, dan aktivasi/nonaktif akun. |
| 5 | Tim & Penempatan | Tim, Supervisor, Sales, dan riwayat membership. |
| 6 | Analisis | Sumber dan Model dalam cakupan dealer. |
| 7 | Import Data | Import CSV dan audit batch. |
| 8 | Pengaturan Dealer | Konfigurasi publik/non-rahasia yang disediakan server. |
| 9 | Notifikasi | Kejadian administrasi dan kegagalan proses yang relevan. |
| 10 | Profil | Identitas akun dan reset password. |

Mobile primer: **Beranda · Pengguna · Tim · Lainnya**.

## Aturan akses yang harus tampak pada UI

- Menu hanya mencerminkan izin; keamanan tetap ditegakkan server-side.
- Branch Manager tidak melihat nomor telepon, alamat, catatan hubungan, atau conversation coaching.
- Sales hanya melihat pelanggan dan transaksi yang ditugaskan kepadanya.
- Supervisor hanya melihat tim yang ditugaskan.
- Admin tidak pernah melihat password pengguna dalam bentuk terbaca.
