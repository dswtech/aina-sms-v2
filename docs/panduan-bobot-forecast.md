# Panduan Bobot Forecast Penjualan

**Untuk:** Sales, Supervisor (SPV), Branch Manager (BM), dan pengelola aplikasi  
**Tanggal:** 5 November 2026  
**Status:** Panduan penjelasan. Seluruh angka simulasi merupakan data contoh, bukan data pelanggan atau hasil penjualan dealer.

> Bobot dalam dokumen ini mengikuti baseline development aplikasi pada tanggal di atas. Bobot tersebut **belum disetujui untuk production**. Dokumen ini tidak menetapkan atau mengubah bobot resmi dealer.

## 1. Untuk apa bobot forecast?

Bobot forecast membantu memperkirakan berapa transaksi aktif yang kemungkinan menjadi Delivery dalam bulan yang dipilih. Perkiraan ini membantu SPV dan BM melihat risiko kekurangan target sebelum akhir bulan, lalu menentukan prioritas follow-up dan coaching.

Transaksi pada tahap yang berbeda mempunyai tingkat kesiapan yang berbeda. Lead yang baru masuk diberi kontribusi perkiraan lebih kecil daripada transaksi yang sudah mencapai SPK atau DO.

Contoh: bobot **Hot Prospect 50%** membuat satu transaksi pada tahap itu menyumbang **0,5 unit** ke forecast. Angka tersebut adalah asumsi peluang untuk perhitungan, bukan janji bahwa pelanggan tertentu akan membeli.

## 2. Bedakan target, realisasi, forecast, dan gap

| Istilah | Arti |
|---|---|
| Target | Sasaran penjualan yang ingin dicapai pada suatu periode. |
| Realisasi | Delivery yang sudah tercatat pada periode tersebut. |
| Peluang berbobot | Jumlah kontribusi perkiraan dari transaksi aktif yang direncanakan closing pada periode tersebut. |
| Forecast | Perkiraan hasil akhir: realisasi ditambah peluang berbobot. |
| Gap ke forecast | Target dikurangi forecast. Positif berarti masih ada perkiraan kekurangan; negatif berarti forecast melampaui target. |

**Rumus unit:**

```text
Peluang berbobot = jumlah seluruh bobot transaksi aktif yang memenuhi periode
Forecast        = realisasi + peluang berbobot
Gap ke forecast = target − forecast
```

Jika transaksi dikelompokkan per tahap, kontribusi setiap tahap adalah **jumlah transaksi × bobot tahap**.

## 3. Bobot sementara dalam aplikasi

| Tahap | Bobot development | Kontribusi satu transaksi aktif |
|---|---:|---:|
| Lead | 10% | 0,10 unit |
| Prospect | 25% | 0,25 unit |
| Hot Prospect | 50% | 0,50 unit |
| SPK | 75% | 0,75 unit |
| DO | 90% | 0,90 unit |

Delivery dihitung sebagai realisasi. Delivery dan Lost tidak ikut dihitung lagi sebagai peluang aktif, sehingga realisasi tidak dihitung dua kali.

## 4. Simulasi satu bulan: target 25 unit

Misalkan target bulan ini **25 unit** dan sudah ada **8 Delivery**. Seluruh transaksi aktif dalam tabel berikut mempunyai estimasi closing pada bulan yang sama.

| Tahap | Jumlah transaksi aktif | Perhitungan | Kontribusi forecast |
|---|---:|---|---:|
| Lead | 20 | 20 × 10% | 2 unit |
| Prospect | 10 | 10 × 25% | 2,5 unit |
| Hot Prospect | 6 | 6 × 50% | 3 unit |
| SPK | 4 | 4 × 75% | 3 unit |
| DO | 2 | 2 × 90% | 1,8 unit |
| **Total** | **42** | | **12,3 unit** |

Hasilnya:

```text
Forecast        = 8 + 12,3 = 20,3 unit
Gap ke forecast = 25 − 20,3 = 4,7 unit
```

Pipeline saat ini diperkirakan menghasilkan sekitar **20 unit**, dengan risiko kekurangan sekitar **5 unit** dari target. Angka 20,3 adalah hasil perhitungan perkiraan; jumlah kendaraan yang benar-benar Delivery tetap utuh.

Informasi ini membantu SPV menentukan transaksi yang perlu didorong, memeriksa hambatan closing, serta mencari tambahan peluang. Hasil akhir tetap bergantung pada perkembangan nyata transaksi.

## 5. Simulasi pengaruh perubahan bobot

Gunakan data yang sama persis. Ubah hanya bobot enam transaksi Hot Prospect; semua bobot lain dan delapan Delivery tetap.

| Bobot Hot Prospect | Kontribusi 6 Hot Prospect | Forecast akhir bulan | Gap ke target 25 unit |
|---|---:|---:|---:|
| 30% | 1,8 unit | 19,1 unit | 5,9 unit |
| 50% | 3 unit | 20,3 unit | 4,7 unit |
| 70% | 4,2 unit | 21,5 unit | 3,5 unit |

Jumlah pelanggan dan tahap transaksi tidak berubah, tetapi forecast berubah karena asumsi peluang berubah. Karena itu, bobot yang terlalu optimistis dapat memberi kesan bahwa target lebih aman daripada kondisi sebenarnya.

## 6. Bagaimana menetapkan bobot yang masuk akal?

Gunakan riwayat closing dealer sebagai dasar, dengan definisi tahap dan periode pengamatan yang konsisten.

Contoh pendekatan:

1. Ambil 100 transaksi yang tercatat sebagai Hot Prospect pada awal suatu bulan.
2. Periksa berapa dari kelompok yang sama menjadi Delivery dalam bulan tersebut.
3. Jika 50 transaksi menjadi Delivery, hasil pengamatan kelompok itu adalah 50%.
4. Bandingkan beberapa bulan dan periksa kualitas datanya sebelum menjadikannya bobot operasional.

Perhitungan ini memerlukan riwayat tahap pada waktu pengamatan. Daftar tahap transaksi hari ini saja tidak cukup untuk merekonstruksi kelompok awal bulan. Jumlah sampel dan sisa waktu menuju akhir bulan juga perlu dipertimbangkan saat mengevaluasi bobot.

Jika data historis belum memadai, Product Owner bersama operasional dealer dapat menyepakati bobot awal berdasarkan pengalaman, mencatat dasar keputusannya, lalu mengevaluasinya setelah tersedia data penggunaan. Aplikasi MVP belum mempelajari atau mengubah bobot secara otomatis.

## 7. Apakah angka Sales berbeda dari SPV dan BM?

Rumus dan bobotnya sama. Cakupan transaksi dan acuan target mengikuti pengguna:

- **Sales:** forecast dari transaksi miliknya, dibandingkan dengan target personalnya.
- **SPV:** forecast tim yang menjadi cakupannya, beserta rincian per Sales.
- **BM:** forecast lintas tim dalam dealer, sesuai cakupan laporan yang diizinkan.

Untuk Sales yang sama, transaksi dan periode yang sama, rincian target personal, realisasi, dan forecast pada layar SPV/BM harus konsisten dengan layar Sales tersebut.

**Markup target tidak mengubah forecast.** Markup memengaruhi benchmark dan alokasi target. Karena acuan target dapat berbeda, persentase pencapaian dan gap juga dapat berbeda walaupun realisasi atau forecast yang dibandingkan sama.

Angka target management sebelum markup hanya boleh dibaca SPV dan BM. Contoh dalam dokumen ini seluruhnya bersifat simulasi.

## 8. Hal yang perlu diperhatikan saat membaca forecast

- Transaksi aktif hanya ikut jika estimasi bulan closing sesuai dengan bulan yang dipilih.
- Transaksi tanpa estimasi bulan closing belum masuk forecast; kelengkapan data perlu diperiksa.
- Perubahan tahap atau estimasi closing dapat mengubah forecast meskipun belum ada Delivery baru.
- Forecast bulan berjalan dan mendatang memakai kondisi pipeline terkini.
- Forecast bulan lampau belum tersedia dalam aplikasi karena snapshot historis belum disimpan.
- Pembaruan Sales yang terlambat dapat membuat perkiraan kurang mencerminkan keadaan lapangan.
- Bobot development perlu disepakati oleh Product Owner dan operasional sebelum forecast production diaktifkan.

## Rujukan proyek

- [PRD: Sales Forecasting](agents/PRD.md#78-sales-forecasting-fct) — sumber kebutuhan produk dan keputusan bobot.
- [Konfigurasi bobot](../config/forecast.php) — baseline development saat panduan dibuat.
- [Perhitungan laporan](../app/Services/TeamPerformance.php) — implementasi rumus forecast dan gap.

Panduan ini membantu pembaca memahami perhitungan. Bila konfigurasi atau kebutuhan produk berubah, panduan perlu diselaraskan dengan sumber rujukan tersebut.
