# Panduan Bobot Forecast Penjualan

**Untuk:** Sales, Supervisor (SPV), Branch Manager (BM), dan pengelola aplikasi  
**Tanggal:** 5 November 2026  
**Status:** Panduan penjelasan. Seluruh angka simulasi merupakan data contoh, bukan data pelanggan atau hasil penjualan dealer.

> Bobot dalam dokumen ini (10/25/50/75%) **disetujui Product Owner untuk production pada 13 November 2026**. Dokumen ini tidak mengubah bobot; perubahan bobot memerlukan persetujuan baru.

## 1. Untuk apa bobot forecast?

Bobot forecast membantu memperkirakan berapa transaksi aktif yang kemungkinan mencapai DO dalam bulan yang dipilih. Perkiraan ini membantu SPV dan BM melihat risiko kekurangan target sebelum akhir bulan, lalu menentukan prioritas follow-up dan coaching.

Transaksi pada tahap yang berbeda mempunyai tingkat kesiapan yang berbeda. Lead yang baru masuk diberi kontribusi perkiraan lebih kecil daripada transaksi yang sudah mencapai SPK.

Contoh: bobot **Hot Prospect 50%** membuat satu transaksi pada tahap itu menyumbang **0,5 unit** ke forecast. Angka tersebut adalah asumsi peluang untuk perhitungan, bukan janji bahwa pelanggan tertentu akan membeli.

## 2. Bedakan target, realisasi, forecast, dan gap

| Istilah | Arti |
|---|---|
| Target | Sasaran penjualan yang ingin dicapai pada suatu periode. |
| Realisasi | Transaksi dengan kejadian DO yang sah pada periode tersebut. |
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

DO dihitung sebagai realisasi. DO, Delivery, dan Lost berada di luar pipeline berbobot. Konfirmasi pengiriman pada tahap Delivery tetap memakai bulan realisasi DO.

## 4. Simulasi satu bulan: target 25 unit

Misalkan target bulan ini **25 unit** dan sudah ada **8 DO sah**. Seluruh transaksi aktif dalam tabel berikut mempunyai estimasi closing pada bulan yang sama.

| Tahap | Jumlah transaksi aktif | Perhitungan | Kontribusi forecast |
|---|---:|---|---:|
| Lead | 20 | 20 × 10% | 2 unit |
| Prospect | 10 | 10 × 25% | 2,5 unit |
| Hot Prospect | 6 | 6 × 50% | 3 unit |
| SPK | 4 | 4 × 75% | 3 unit |
| **Total** | **40** | | **10,5 unit** |

Hasilnya:

```text
Forecast        = 8 + 10,5 = 18,5 unit
Gap ke forecast = 25 − 18,5 = 6,5 unit
```

Forecast saat ini **18,5 unit**, dengan perkiraan kekurangan **6,5 unit** dari target. Realisasi tercatat tetap **8 unit**.

Informasi ini membantu SPV menentukan transaksi yang perlu didorong, memeriksa hambatan closing, serta mencari tambahan peluang. Hasil akhir tetap bergantung pada perkembangan nyata transaksi.

## 5. Simulasi pengaruh perubahan bobot

Gunakan data yang sama. Ubah hanya bobot enam transaksi Hot Prospect. Semua bobot lain dan delapan DO sah tetap.

| Bobot Hot Prospect | Kontribusi 6 Hot Prospect | Forecast akhir bulan | Gap ke target 25 unit |
|---|---:|---:|---:|
| 30% | 1,8 unit | 17,3 unit | 7,7 unit |
| 50% | 3 unit | 18,5 unit | 6,5 unit |
| 70% | 4,2 unit | 19,7 unit | 5,3 unit |

Jumlah pelanggan dan tahap transaksi tidak berubah, tetapi forecast berubah karena asumsi peluang berubah. Karena itu, bobot yang terlalu optimistis dapat memberi kesan bahwa target lebih aman daripada kondisi sebenarnya.

## 6. Bagaimana menetapkan bobot yang masuk akal?

Gunakan riwayat closing dealer sebagai dasar, dengan definisi tahap dan periode pengamatan yang konsisten.

Contoh pendekatan:

1. Ambil 100 transaksi yang tercatat sebagai Hot Prospect pada awal suatu bulan.
2. Periksa berapa dari kelompok yang sama mencapai DO sah dalam bulan tersebut.
3. Jika 50 transaksi mencapai DO sah, hasil pengamatan kelompok itu adalah 50%.
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
