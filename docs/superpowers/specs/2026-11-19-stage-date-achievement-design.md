# Desain: capaian per tahap berdasarkan tanggal tahap

Status: disetujui pemilik, 19 November 2026.

## Maksud

Supervisor ingin melihat capaian setiap Sales di setiap tahap dalam satu periode, lalu memakai angka itu untuk mendorong Sales-nya. Contohnya, Sales A pada November mencatat 12 Lead, 8 Prospect, 3 SPK, dan 2 DO.

Satu transaksi punya tanggal untuk setiap tahap yang dilewatinya. Transaksi yang masuk Lead tgl 5 lalu DO tgl 10 dihitung di kolom Lead (tgl 5) dan di kolom DO (tgl 10). Transaksi itu juga muncul ketika daftar Transaksi difilter "Lead, tgl 5".

Saat ini ada dua kekurangan:
- Daftar Transaksi memfilter tanggal dengan `progress_at`, yaitu tanggal perpindahan tahap terakhir. Filter tahapnya memakai `current_stage`, yaitu posisi transaksi saat ini.
- Kinerja Tim (`TeamPerformance::metrics`) menghitung Lead sampai SPK dari posisi saat ini. DO dan Delivery sudah dihitung dari tanggal kejadiannya.

## Tujuan

- Tabel **Capaian per tahap** berisi satu baris per Sales, kolom Lead, Prospect, Hot Prospect, SPK, DO, dan Delivery, plus baris Total. Tabel ini muncul di dua tempat:
  - **Sub-halaman baru Analisis > Capaian Sales**, dengan filter rentang bulan seperti halaman Analisis lain.
  - **Beranda Supervisor**, untuk periode Beranda, ditaruh selebar penuh di bawah grafik yang sudah ada dan di atas Prioritas tindak lanjut. Pemilik memilih mockup A pada 19 November.
- Kartu **Prioritas tindak lanjut** di Beranda (`PriorityLists`) dibuat ringkas. Tetap tiga kolom, tetapi setiap item jadi satu baris: tautan model, badge tahap, dan nama Sales. Sebelumnya setiap item tiga baris dengan padding besar. Perubahan ini berlaku untuk semua role yang melihat kartu ini.
- Daftar Transaksi memakai **satu filter tanggal: tanggal tahap**. Filter ini menggantikan "Rentang progress".
- Angka di tabel capaian dan isi daftar Transaksi selalu cocok, karena keduanya membaca aturan yang sama dari satu tempat.
- Analisis mode **Pencapaian** ikut aturan gugur, jadi angkanya sama dengan Kinerja Tim. Pemilik memutuskan ini pada 19 November. Bagian yang berubah adalah `AnalyticsController::buildAnalytics`: kolom `reached_*` dan penentuan transaksi mana yang masuk periode (`reportableAchievement`) memakai scope `effective()`. Mode Akuisisi tidak berubah. Angka Pencapaian bulan lalu bisa ikut turun.

## Bukan tujuan

- Rasio atau konversi (misalnya prospek per DO). Supervisor meminta angka capaian, bukan konversi.
- Mengubah grafik Pipeline di Dashboard (`stageCounts`) dan forecast. Keduanya tetap menunjukkan posisi transaksi saat ini.
- Kolom jumlah kemunduran per Sales.
- Angka di tabel capaian yang bisa diklik menuju daftar Transaksi.
- Kolom Lost di tabel capaian.

## Anti-tujuan

- Angka capaian tidak cocok dengan isi daftar Transaksi untuk filter yang sama.
- Kemunduran tahap terhitung sebagai capaian, sehingga Sales tampak lebih produktif dari kenyataannya.
- Riwayat tahap dihapus atau ditimpa. Ini melanggar PIP-01.

## Aturan tanggal tahap yang sah

Sumbernya adalah `stage_histories`. Satu baris riwayat dianggap **sah** kalau memenuhi semua syarat berikut:

1. Baris itu bukan baris koreksi (`reverses_stage_history_id` kosong).
2. Kalau tujuannya DO, baris itu harus DO yang terealisasi (scope `realizedDo`, artinya checklist lengkap dan tidak dibatalkan).
3. Baris itu **tidak gugur**. Baris H dengan tahap terbuka S (`openRank` tidak null) gugur kalau pada transaksi yang sama ada baris H2 yang dibuat setelah H, dengan H2 bukan koreksi, dan `openRank(H2.to_stage) < openRank(S)`. Artinya, sesudah H, transaksi pernah turun ke bawah tahap S. Pada praktiknya H2 selalu merupakan langkah mundur, karena hanya langkah mundur yang bisa mendarat di bawah tahap yang pernah dicapai. DO dan Delivery tidak bisa gugur dengan cara ini, karena tahap tertutup tidak bisa mundur.

Pemilik sudah memutuskan bahwa status gugur **berlaku surut**. Contohnya, SPK 28 Oktober lalu mundur ke Hot 3 November. Akibatnya, angka SPK Oktober ikut turun.

Contoh pemilik:

```
tgl 5   Lead           sah
tgl 7   Hot Prospect   gugur (mundur ke Prospect tgl 9)
tgl 9   Prospect       sah
tgl 15  Hot Prospect   sah
tgl 20  SPK            sah
```

Tanggal memakai hari kalender Asia/Jakarta. Batas awal inklusif dan batas akhir eksklusif, sama dengan filter yang sudah ada.

Tahap yang dilompati tidak diisi. Contohnya, transaksi yang langsung dari Lead ke SPK tidak dihitung di Prospect. Satu transaksi yang punya dua tanggal sah untuk tahap yang sama dalam satu periode dihitung **satu kali**.

## Pendekatan

- **A. Status gugur dihitung saat data dibaca (dipilih pemilik).** Satu query scope di `StageHistory`, misalnya `effective()`, menggabungkan syarat 1 sampai 3. Kinerja Tim dan daftar Transaksi memakai scope ini. Tidak ada kolom baru dan tidak perlu migrasi, dan data lama langsung ikut benar. Kekurangannya, subquery-nya lebih rumit, tapi volume data per dealer kecil.
- B. Status gugur dicatat saat tahap mundur, lewat kolom baru di `stage_histories`. Query-nya lebih sederhana, tapi butuh migrasi dan pengisian ulang data lama, dan kolom itu bisa melenceng diam-diam kalau ada bug. Tidak dipilih.
- C. Tabel terpisah berisi tanggal per tahap. Ini menyimpan data turunan ganda, padahal PRD melarangnya. Dibuang.

## Perilaku daftar Transaksi

- Label "Rentang progress" diganti menjadi "Rentang tanggal tahap". Default-nya tetap bulan berjalan sampai hari ini.
- **Tanpa tahap:** daftar menampilkan transaksi yang punya minimal satu tanggal tahap sah dalam rentang, termasuk Lost.
- **Dengan tahap X:** daftar menampilkan transaksi yang punya tanggal sah tahap X dalam rentang. Untuk DO berlaku aturan DO terealisasi, dan untuk Lost berlaku baris riwayat ke Lost.
- **Rentang dikosongkan:** daftar menampilkan transaksi yang pernah mencapai tahap X secara sah, kapan pun.
- Tab Aktif, Stagnan, dan Selesai tetap membaca posisi saat ini.
- Kolom "Tanggal Progress", urutan berdasarkan `progress_at`, dan ekspor CSV tetap seperti sekarang.

## Perilaku tabel Capaian per tahap

- Catatan: halaman Kinerja Tim (`/team-performance`) hanya untuk Branch Manager, jadi tidak dipakai untuk Supervisor.
- Atribusi, cakupan role, dan periode mengikuti baris per Sales yang sudah ada di `TeamPerformance` (`visibleInReportsTo`, dikelompokkan per `sales_id`). Hitungannya ditulis sekali, lalu dipakai Beranda dan Analisis > Capaian Sales.
- Kolom DO memakai `realized_in_period`, dan kolom Delivery memakai `delivered_in_period`, sama seperti sekarang. Kolom Lead sampai SPK memakai scope `effective()` dengan rentang periode.

## Dokumen yang ikut diperbarui

- PRD: CRM-06 (arti filter periode dan tahap di daftar Transaksi) dan DSH-02 (capaian per tahap per Sales), ANL-05 (Pencapaian memakai tanggal tahap sah), ditambah satu paragraf aturan tanggal tahap sah.
- `tests/Browser`: selector dan label filter tanggal di daftar Transaksi.

## Keputusan agent (boleh dikoreksi pemilik)

- **Siapa yang melihat tabel.** Analisis > Capaian Sales terbuka untuk role yang sudah bisa membuka Analisis: Supervisor, Branch Manager, dan Admin. Branch Manager sudah melihat kinerja per Sales di Kinerja Tim (DSH-02), jadi melihat angka per Sales di sini bukan akses baru. Tabel di Beranda hanya untuk Supervisor.

- **Cakupan halaman tetap seperti sekarang.** Daftar Transaksi memakai `visibleTo`, sedangkan Kinerja Tim memakai `visibleInReportsTo` (berdasarkan `team_id` transaksi). Janji "angka cocok" berlaku untuk Sales yang masih menjadi anggota tim Supervisor. Untuk Sales yang sudah pindah tim, cakupan kedua halaman memang sudah berbeda sejak sebelum fitur ini, dan perbedaan itu tidak diubah di sini.
- **Transaksi lama tanpa riwayat tahap sama sekali** dihitung sebagai satu kejadian: tahap saat ini, bertanggal `created_at`. Ini sesuai aturan progress data lama di PRD. Transaksi yang punya sebagian riwayat tidak diisi tahap yang hilang, dan diperlakukan sama seperti tahap yang dilompati.

## Diserahkan ke builder

- Bentuk SQL scope `effective()`, dengan syarat tetap jalan di SQLite (test) dan Postgres.
- Letak dan gaya tabel di halaman Kinerja Tim, mengikuti komponen tabel yang sudah ada.
