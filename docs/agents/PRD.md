# PRD — Sistem Pengelolaan Sales Dealer

| Item | Keterangan |
|---|---|
| Dokumen | PRD — Sistem Pengelolaan Sales Dealer |
| Versi | v1.0 |
| Tanggal | 28 Oktober 2026 |
| Disetujui | 30 Oktober 2026 |
| Disusun oleh | Product Owner dan Product Engineering |
| Audiens | Product Owner, operasional dealer, engineering, dan QA |
| Status | Disetujui sebagai baseline produk |

| Item | Keterangan |
|---|---|
| Nama kerja | DealDrive Supervisor |
| Cakupan | Fondasi dan MVP inti |
| Requirement | 80 aktif |
| Prasyarat | Tidak ada aplikasi sebelumnya di repository |
| Aturan ID | ID asli dipertahankan dan tidak boleh digunakan ulang |

---

## 1. Ringkasan Eksekutif

Produk ini adalah web app internal dealer mobil untuk menyatukan pekerjaan Admin, Branch Manager, Supervisor, dan Sales dalam mengelola hubungan pelanggan serta proses penjualan. Nilai utamanya adalah memberi visibilitas yang sama kepada pihak yang tepat tanpa mengandalkan rekap spreadsheet atau permintaan pembaruan melalui chat satu per satu.

Sales mempunyai “Buku Pelanggan Saya” sebagai phonebook kerja: bukan hanya daftar nomor, tetapi tempat melihat riwayat hubungan, transaksi, kontak terakhir, dan tindak lanjut berikutnya. Sales mencatat lead dan memperbarui perkembangannya. Supervisor melihat pipeline tim, menemukan lead yang stagnan, memberi coaching pada transaksi yang memerlukan arahan, dan memantau target. Branch Manager membaca kinerja serta forecast lintas tim. Admin mengelola akun dan struktur organisasi.

MVP juga menyediakan weighted sales forecasting serta Analisis Sumber dan Model. Forecast bukan janji penjualan, melainkan perkiraan berbobot yang membantu Supervisor dan Branch Manager melihat risiko kekurangan target lebih awal. Analisis membantu dealer memahami asal lead dan model kendaraan yang menghasilkan kemajuan penjualan.

## 2. Latar Belakang & Permasalahan

Supervisor saat ini perlu meminta pembaruan melalui chat atau telepon untuk mengetahui posisi setiap calon pelanggan. Informasi lead, hasil follow-up, status SPK, dan alasan lost mudah tersebar pada percakapan pribadi atau file yang berbeda. Akibatnya, lead dapat terlupakan, coaching tidak terdokumentasi, dan laporan untuk Branch Manager membutuhkan penggabungan manual.

Target hanya menunjukkan apa yang ingin dicapai, sedangkan realisasi baru menjelaskan apa yang sudah terjadi. Tanpa forecast, Supervisor mengetahui risiko kekurangan target terlalu terlambat. Sistem yang dibangun harus menunjukkan pekerjaan yang perlu ditindaklanjuti hari ini sekaligus perkiraan hasil akhir periode.

UI referensi yang diperiksa membuktikan pola filter, tabel transaksi, status, pagination, dan floating detail sesuai dengan pekerjaan ini. Namun tampilan mobile referensi menyempitkan tabel dan dialog. Produk baru mengambil pola interaksinya tanpa membawa kelemahan responsif tersebut.

## 3. Tujuan & Batasan

### 3.1 Tujuan

| Sasaran | Ukuran keberhasilan |
|---|---|
| Memberi visibilitas pipeline tim | Supervisor dapat melihat seluruh lead tim beserta tahap dan aktivitas terakhir dari satu layar. |
| Membantu Sales mengelola relasi pelanggan | Sales dapat mengetahui siapa yang harus dihubungi, percakapan terakhir, dan langkah berikutnya dari Buku Pelanggan Saya. |
| Mencegah lead terlupakan | Lead tanpa aktivitas lebih dari tiga hari ditandai dan dapat difilter. |
| Mempercepat pembaruan lapangan | Sales dapat memperbarui satu lead dalam waktu maksimal 60 detik pada ponsel. |
| Mendokumentasikan coaching | Arahan dan balasan terkait transaksi tersimpan dalam timeline yang dapat diaudit. |
| Memberi peringatan target lebih awal | Dashboard menampilkan target, realisasi, forecast, dan gap per Sales serta tim. |
| Mengurangi pekerjaan rekap | Branch Manager dapat membaca kinerja lintas tim tanpa meminta rekap manual dari setiap Supervisor. |
| Menjelaskan pola penjualan | Supervisor dan Branch Manager dapat membandingkan sumber lead dan model kendaraan berdasarkan periode yang sama. |

### 3.2 Batasan

| Batasan | Keterangan |
|---|---|
| Satu dealer | MVP menangani satu dealer dengan banyak tim; multi-cabang/grup dealer belum termasuk. |
| Web app online | MVP bukan aplikasi native, bukan PWA, dan tidak menyediakan offline sync. |
| Forecast berbobot | MVP tidak menggunakan AI dan belum belajar otomatis dari data historis. |
| Coaching berbasis teks | Lampiran gambar dan dokumen belum didukung pada conversation MVP. |
| Belum menggantikan DMS | Stok kendaraan, akuntansi, pembayaran, dan master kendaraan lengkap bukan cakupan MVP. |
| Modul operasional lanjutan | Leasing, document tracker, delivery calendar, dan laporan otomatis lengkap masuk fase berikutnya. |
| Tidak ada registrasi publik | Akun dibuat melalui undangan Admin untuk menjaga keanggotaan dealer. |

## 4. Pengguna & Peran

Hierarki organisasi: `Admin → Branch Manager → Supervisor → Sales`.

| Peran | Cakupan | Larangan kritis |
|---|---|---|
| Admin | Mengelola akun, role, tim, penempatan pengguna, dan konfigurasi dealer; membaca conversation untuk audit. | Tidak boleh melihat atau menyimpan password pengguna dalam bentuk terbaca. |
| Branch Manager | Membaca dashboard, forecast, dan laporan seluruh tim dalam dealer. | Tidak boleh mengubah lead, pipeline, target operasional, atau membaca conversation coaching. |
| Supervisor | Mengelola target, pembagian lead, pipeline, dan coaching pada tim yang ditugaskan. | Tidak boleh membaca atau mengubah data tim Supervisor lain. |
| Sales | Membuat dan memperbarui lead/transaksi yang ditugaskan kepadanya; membaca dan membalas coaching terkait. | Tidak boleh melihat data Sales lain kecuali transaksi resmi ditugaskan kepadanya. |

Kewenangan selalu ditentukan server dari user yang login dan hubungan organisasinya. Client tidak boleh menentukan cakupan akses dengan mengirim dealer atau team ID yang tidak diverifikasi.

## 5. Konsep Utama

| Konsep | Penjelasan |
|---|---|
| Lead | Calon pelanggan yang baru tercatat. |
| Transaksi | Rekam perjalanan satu peluang penjualan milik pelanggan, kendaraan yang diminati, Sales penanggung jawab, dan tahap saat ini. |
| Pipeline stage | Lead, Prospect, Hot Prospect, SPK, DO, Delivery, atau Lost. |
| Aktivitas | Tindakan bermakna pada transaksi, misalnya follow-up, perubahan tahap, penugasan, atau komentar. |
| Stagnant | Transaksi aktif tanpa aktivitas lebih dari tiga hari kalender. |
| Target | Hasil penjualan yang ingin dicapai pada periode tertentu. |
| Realisasi | Transaksi dengan kejadian DO yang sah pada periode tersebut. |
| Forecast | Perkiraan hasil akhir dari realisasi ditambah nilai berbobot transaksi aktif. |
| Conversation | Timeline komentar Sales/Supervisor dan aktivitas sistem pada satu transaksi. |
| Coaching | Arahan Supervisor yang terkait dengan keadaan nyata sebuah transaksi. |
| Customer | Identitas orang atau badan yang menjadi pusat hubungan pelanggan dan dapat mempunyai lebih dari satu transaksi. |
| Buku Pelanggan Saya | Daftar pelanggan yang sedang ditugaskan kepada seorang Sales, dilengkapi riwayat, kontak terakhir, dan tindak lanjut berikutnya. |
| Customer assignment | Penugasan pengelolaan hubungan pelanggan kepada Sales; data tetap merupakan aset dealer dan bukan milik pribadi Sales. |
| Next follow-up | Waktu dan rencana tindakan berikutnya untuk menjaga pelanggan tidak terlupakan. |

### Target, realisasi, dan forecast

| Istilah | Menjawab |
|---|---|
| Target | Berapa unit yang ingin dicapai? |
| Realisasi | Berapa unit yang sudah selesai? |
| Forecast | Berapa unit yang kemungkinan tercapai berdasarkan pipeline sekarang? |
| Gap | Berapa selisih yang masih harus dikejar? |

## 6. Alur Proses

### 6.1 Undangan dan penempatan pengguna

| # | Pelaku | Tindakan | Keadaan sesudahnya |
|---:|---|---|---|
| 1 | Admin | Membuat undangan dengan role dan penempatan organisasi. | Undangan aktif dan belum digunakan. |
| 2 | Sistem | Mengirim tautan undangan melalui email. | Penerima memperoleh tautan sekali pakai. |
| 3 | Pengguna | Membuka undangan dan menetapkan password. | Akun aktif dengan role dan cakupan yang sudah ditetapkan. |
| 4 | Admin | Mengubah tim atau menonaktifkan akun bila diperlukan. | Akses berikutnya mengikuti penempatan terbaru. |

Undangan kedaluwarsa atau sudah digunakan harus ditolak. Tidak ada registrasi mandiri.

### 6.2 Lead sampai hasil akhir

| # | Pelaku | Tindakan | Keadaan sesudahnya |
|---:|---|---|---|
| 1 | Sales/Supervisor | Mencatat lead atau mengimpor data yang valid. | Transaksi berada pada tahap Lead dan mempunyai Sales penanggung jawab. |
| 2 | Sales | Mencatat follow-up dan mengubah tahap sesuai hasil nyata. | Timeline dan aktivitas terakhir diperbarui. |
| 3 | Supervisor | Memantau transaksi serta memberi coaching. | Sales menerima notifikasi dan dapat membalas di transaksi yang sama. |
| 4 | Sales/Supervisor | Mendorong transaksi melalui Prospect, Hot Prospect, dan SPK. | Riwayat tahap tersimpan tanpa menimpa kejadian sebelumnya. |
| 5 | Sales/Supervisor | Mencatat DO setelah PO, DP, dan Unit dikonfirmasi, atau menutup peluang sebagai Lost. | Transaksi keluar dari pipeline aktif. DO masuk realisasi dan Lost menyimpan alasan. |
| 6 | Sales/Supervisor | Mengonfirmasi Delivery setelah kendaraan terkirim. | Waktu dan pelaku konfirmasi pengiriman tercatat. Bulan realisasi tetap mengikuti DO. |

### 6.3 Forecast dan tindak lanjut

| # | Pelaku | Tindakan | Keadaan sesudahnya |
|---:|---|---|---|
| 1 | Sistem | Mengambil realisasi, transaksi aktif, dan bobot tahap untuk periode terpilih. | Forecast dihitung dari sumber yang sama dengan dashboard. |
| 2 | Supervisor | Membaca gap dan transaksi berpeluang closing. | Supervisor menentukan prioritas follow-up dan coaching. |
| 3 | Branch Manager | Membaca forecast lintas tim. | Risiko pencapaian dapat dibahas sebelum akhir periode. |

### 6.4 Hubungan pelanggan dan peluang baru

| # | Pelaku | Tindakan | Keadaan sesudahnya |
|---:|---|---|---|
| 1 | Sales/Supervisor | Membuka atau mencari pelanggan sebelum membuat lead. | Sistem menampilkan kemungkinan data pelanggan yang sudah ada. |
| 2 | Sales | Membuka Buku Pelanggan Saya. | Sales melihat pelanggan yang ditugaskan, kontak terakhir, dan tindak lanjut berikutnya. |
| 3 | Sales | Menghubungi pelanggan melalui telepon/WhatsApp lalu mencatat hasilnya. | Aktivitas hubungan dan waktu kontak terakhir diperbarui. |
| 4 | Sales | Menjadwalkan follow-up atau membuat peluang baru untuk pelanggan lama. | Satu pelanggan dapat mempunyai beberapa transaksi tanpa menggandakan identitasnya. |
| 5 | Supervisor/Admin | Menugaskan ulang pelanggan bila terjadi perpindahan tanggung jawab. | Sales baru memperoleh akses dan riwayat penugasan lama tetap dapat diaudit. |

### 6.5 Jalur yang tidak berakhir normal

- Lead duplikat diperingatkan sebelum disimpan; pengguna dapat membatalkan atau melanjutkan bila memang pelanggan mempunyai transaksi berbeda.
- Perubahan tahap yang tidak diizinkan ditolak dan tidak membuat riwayat baru.
- Lost tanpa alasan ditolak.
- CSV dengan baris tidak valid tidak langsung disimpan; pengguna melihat preview dan kesalahan per baris.
- Komentar dari pengguna tanpa akses ditolak tanpa membocorkan keberadaan transaksi.
- Undangan kedaluwarsa, sudah digunakan, atau untuk akun nonaktif ditolak.
- Kegagalan email tidak membatalkan komentar yang sudah tersimpan; notifikasi email dapat dicoba ulang.

## 7. Kebutuhan Fungsional

### 7.1 Authentication & Identity (`IAM`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| IAM-01 | **Pengguna wajib login sebelum mengakses data dealer.** Semua route produk dilindungi server-side agar URL langsung tidak melewati autentikasi. | M |
| IAM-02 | **Admin dapat mengundang pengguna dengan role dan penempatan yang sudah ditentukan.** Penerima tidak memilih sendiri role atau timnya. | M |
| IAM-03 | **Tautan undangan hanya dapat digunakan satu kali dan memiliki masa berlaku.** Undangan yang tidak lagi sah harus ditolak tanpa mengaktifkan akun. | M |
| IAM-04 | **Admin dapat menonaktifkan akun tanpa menghapus riwayat pekerjaannya.** Data audit harus tetap menunjuk pelaku aslinya. | M |
| IAM-05 | **Setiap request data wajib melewati pemeriksaan role dan cakupan organisasi.** Menyembunyikan menu saja tidak dianggap sebagai pengamanan. | M |
| IAM-06 | **Password tidak pernah dapat dibaca kembali oleh Admin atau role lain.** Reset menggunakan alur token, bukan menampilkan password lama. | M |
| IAM-07 | **Registrasi publik tidak disediakan pada MVP.** Keanggotaan dealer hanya berasal dari undangan Admin. | W |
| IAM-08 | **Username akun baru dibuat otomatis dari nama lengkap saat undangan dibuat.** Hasilnya diawali huruf, 6–12 karakter huruf/digit, unik global, dan tidak memuat nama sistem atau brand; username akun lama tidak diubah. Keputusan teknis: [ADR 007](adr/ADR-007-generated-usernames.md). | M |

### 7.2 Organization & Team (`ORG`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| ORG-01 | **Sistem menyimpan satu dealer dengan banyak tim.** Struktur ini cukup untuk MVP tanpa memperkenalkan multi-cabang yang belum diperlukan. | M |
| ORG-02 | **Admin dapat membuat, mengubah nama, dan menonaktifkan tim.** Tim nonaktif tidak menerima transaksi baru tetapi riwayatnya tetap tersedia. | M |
| ORG-03 | **Admin menempatkan Supervisor dan Sales ke tim.** Perubahan penempatan berlaku untuk akses berikutnya dan tidak mengubah penulis riwayat lama. | M |
| ORG-04 | **Branch Manager dapat membaca kinerja seluruh tim.** Hak ini read-only dan tidak memberi kemampuan mengubah transaksi. | M |
| ORG-05 | **Supervisor hanya mengelola tim yang ditugaskan.** Penugasan lintas tim harus dilakukan Admin. | M |
| ORG-06 | **Target bulanan mengikuti target management → markup SPV → benchmark tim → alokasi personal Sales.** Supervisor mencatat target management bagi timnya, menetapkan markup nonnegatif, dan membagi benchmark secara rata sebagai default target personal desimal. SPV dapat menyesuaikan alokasi naik/turun dengan total minimal 100% dari benchmark; hitungan UI langsung diperbarui dan server memvalidasi ulang saat simpan. Pembagian ulang memerlukan aksi eksplisit. Perubahan anggota tidak mengubah target tersimpan: Sales keluar mempertahankan alokasi historis dan Sales baru menerima alokasi manual tanpa mengurangi target anggota lama, dengan saran prorata hari kerja yang dapat disesuaikan masa adaptasi. Periode baru memakai anggota aktif sebagai dasar pembagian awal. Target belum diisi dibedakan dari nol; audit mencatat sebelum/sesudah, pelaku, dan waktu. Angka target management sebelum markup hanya boleh dibaca Supervisor dan Branch Manager; Admin dan Sales tidak menerima angka tersebut maupun gap, selisih, persentase pencapaian, atau metadata markup yang dapat mengungkapnya. Sales tetap menerima target personalnya. Admin mendukung administrasi; Branch Manager tetap hanya baca. | S |
| ORG-07 | **Admin dapat melihat status undangan dan akun.** Tampilan membedakan invited, active, dan inactive. | S |

### 7.3 Customer & Lead (`CRM`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| CRM-01 | **Sales dapat membuat lead dengan identitas dan kebutuhan minimum pelanggan.** Form utama memuat nama, nomor telepon, kendaraan yang diminati, estimasi bulan pembelian/closing, sumber, dan catatan. Lead baru buatan Sales otomatis menjadi tanggung jawab Sales tersebut; Supervisor/Admin wajib memilih Sales aktif dalam cakupan organisasinya. Pembuat tetap tercatat sebagai pelaku, bukan otomatis sebagai PIC. Konfirmasi pelanggan lama mempertahankan penugasan yang sudah ada; pelanggan tanpa Sales aktif memerlukan pembaruan penugasan sebelum peluang baru dibuat. | M |
| CRM-02 | **Sistem memperingatkan kemungkinan duplikat berdasarkan nomor telepon ternormalisasi sebelum data pelanggan atau transaksi baru disimpan.** Pengguna dapat membatalkan atau memilih identitas pelanggan yang sudah ada untuk membuat transaksi berbeda tanpa menggandakan identitas maupun mengubah penugasan. Kandidat hanya ditampilkan sesuai akses terkini; jika pelanggan berada di luar akses Sales, penyimpanan ditahan dengan arahan ke Supervisor/Admin untuk pemeriksaan dan penugasan tanpa membuka identitas pelanggan. Server memeriksa ulang akses dan kecocokan nomor saat konfirmasi. | S |
| CRM-03 | **Sales hanya dapat melihat dan memperbarui lead yang ditugaskan kepadanya.** Data Sales lain tidak ikut terkirim ke client. | M |
| CRM-04 | **Supervisor dapat melihat dan menugaskan ulang lead dalam timnya.** Riwayat penugasan lama tetap tersimpan untuk audit. | M |
| CRM-05 | **Admin dapat membaca data yang diperlukan untuk audit dan dukungan.** Akses tersebut tidak menghapus batas akses role operasional lain. | M |
| CRM-06 | **Lead dapat dicari dan difilter berdasarkan periode, tahap, Sales, sumber, dan status stagnan.** Filter harus mempertahankan konteks ketika detail ditutup. | M |
| CRM-07 | **Data kontak sensitif tidak muncul pada dashboard agregat Branch Manager.** Branch Manager melihat metrik, bukan daftar kontak pelanggan pada MVP. | S |
| CRM-08 | **Customer disimpan terpisah dari transaksi dan dapat mempunyai lebih dari satu transaksi.** Peluang repeat order atau kebutuhan baru tidak boleh membuat identitas pelanggan terduplikasi. | M |
| CRM-09 | **Sales mempunyai layar “Buku Pelanggan Saya” yang hanya memuat pelanggan yang ditugaskan kepadanya.** Daftar dapat dicari berdasarkan nama atau nomor telepon dan difilter berdasarkan kebutuhan tindak lanjut. | M |
| CRM-10 | **Setiap item Buku Pelanggan menampilkan informasi kerja minimum.** Informasi mencakup identitas kontak, status hubungan, transaksi aktif, kontak terakhir, dan tindak lanjut berikutnya. | M |
| CRM-11 | **Sales dapat melakukan aksi cepat dari profil pelanggan.** Aksi minimum adalah telepon, membuka percakapan WhatsApp melalui tautan perangkat, mencatat aktivitas, menjadwalkan follow-up, membuat transaksi baru, dan melihat riwayat. | M |
| CRM-12 | **Profil pelanggan menyatukan riwayat transaksi dan aktivitas hubungan yang boleh dibaca pengguna.** Conversation coaching tetap berada pada transaksi dan mengikuti batas akses coaching. | M |
| CRM-13 | **Data pelanggan merupakan aset dealer, sedangkan Sales menerima penugasan pengelolaan.** Penugasan ulang tidak menghapus riwayat Sales sebelumnya, aktivitas, atau transaksi. | M |
| CRM-14 | **Supervisor dapat melihat pelanggan timnya, Admin dapat mengelola penugasan dan audit, dan Branch Manager hanya menerima agregat.** Nomor telepon, alamat, dan catatan hubungan tidak dikirim kepada Branch Manager. | M |
| CRM-15 | **Sistem mencatat izin atau penolakan pelanggan untuk dihubungi pada kanal yang relevan.** MVP memakai satu status penolakan seluruh kontak ditambah kanal pilihan WhatsApp, telepon, keduanya, atau belum ditentukan. Penolakan menonaktifkan seluruh aksi kontak; jika tidak menolak, aksi mengikuti kanal pilihan. Pengguna yang berwenang memperbarui Customer dapat memperbarui status ini dengan audit. Nilai legacy tanpa penolakan/pilihan kanal bukan bukti persetujuan eksplisit. Sinkronisasi otomatis ke kontak pribadi, broadcast massal, dan ekspor phonebook tidak disediakan pada MVP. | S |

### 7.4 Sales Pipeline (`PIP`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| PIP-01 | **Transaksi mempunyai satu tahap aktif dan riwayat tahap yang tidak ditimpa.** Perubahan selalu mencatat tahap asal, tahap tujuan, pelaku, dan waktu. | M |
| PIP-02 | **Tahap MVP adalah Lead, Prospect, Hot Prospect, SPK, DO, Delivery, dan Lost.** Nama tahap menjadi bahasa bersama dashboard, filter, dan forecast. | M |
| PIP-03 | **Perubahan ke SPK memerlukan konfirmasi booking fee sesuai kebijakan operasional.** Sistem tidak boleh menyatakan SPK tanpa bukti kondisi minimum yang disepakati. | S |
| PIP-04 | **Perubahan ke Lost memerlukan alasan.** Alasan dipilih dari katalog dan dapat diberi catatan agar penyebab kehilangan dapat dievaluasi. | M |
| PIP-05 | **Transaksi aktif tanpa aktivitas lebih dari tiga hari ditandai stagnant.** Status ini dihitung dari aktivitas terakhir, bukan disimpan sebagai status manual. | M |
| PIP-06 | **Sales dan Supervisor dapat mencatat aktivitas follow-up tanpa mengubah tahap.** Aktivitas memperbarui waktu aktivitas terakhir dan muncul pada timeline. | M |
| PIP-07 | **DO menutup transaksi dari pipeline aktif dan mencatat realisasi.** Sales terkait atau Supervisor berwenang hanya dapat menetapkan DO dari SPK setelah mengonfirmasi PO, DP, dan Unit. Histori DO menyimpan ketiga konfirmasi, waktu, dan pelaku. Delivery hanya dapat dikonfirmasi dari DO oleh Sales terkait atau Supervisor berwenang setelah kendaraan terkirim. Sebelum Delivery, hanya Admin dealer dapat membatalkan DO dengan alasan wajib. Pembatalan mengembalikan transaksi ke SPK, menambahkan histori koreksi yang merujuk kejadian DO asli, dan mengeluarkan kejadian itu dari realisasi. DO berikutnya memerlukan checklist baru. Setelah Delivery, perubahan tahap dan pembatalan DO dikunci. | M |

### 7.5 Conversation & Coaching (`CVS`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| CVS-01 | **Setiap transaksi mempunyai timeline kronologis yang menggabungkan komentar dan aktivitas sistem.** Pengguna dapat memahami perjalanan tanpa berpindah tempat. | M |
| CVS-02 | **Sales terkait dan Supervisor terkait dapat menulis komentar.** Komentar selalu terkait satu transaksi dan tahap saat dikirim. | M |
| CVS-03 | **Admin dapat membaca conversation untuk audit.** Akses audit tidak memberi kemampuan menyamar sebagai penulis lain. | M |
| CVS-04 | **Branch Manager tidak dapat membaca isi conversation coaching.** Laporan tidak boleh membawa komentar atau cuplikannya. | M |
| CVS-05 | **Komentar dapat membalas satu komentar sebelumnya tanpa thread bertingkat.** Reply hanya memberi konteks dan timeline tetap kronologis. | S |
| CVS-06 | **Penulis dapat mengedit komentar selama lima menit.** Setelah batas waktu, koreksi dilakukan melalui komentar baru. | M |
| CVS-07 | **Setiap edit menyimpan versi sebelumnya, waktu, dan pelaku.** Audit revision tidak ditampilkan sebagai chat baru tetapi dapat diperiksa Admin. | M |
| CVS-08 | **Komentar tidak dapat dihapus permanen melalui aplikasi.** Kebutuhan moderasi di masa depan harus menggunakan penandaan yang tetap meninggalkan audit. | M |
| CVS-09 | **Komentar baru menghasilkan notifikasi in-app dan email kepada pihak conversation lainnya.** Email hanya memuat metadata aman dan tautan, bukan isi coaching. | M |
| CVS-10 | **Lampiran komentar tidak disediakan pada MVP.** Dokumen transaksi akan dikelola oleh modul dokumen pada fase berikutnya. | W |

### 7.6 CSV Import (`IMP`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| IMP-01 | **Admin atau Supervisor dapat mengunggah CSV sesuai template yang disediakan.** Supervisor hanya dapat mengimpor ke timnya. | M |
| IMP-02 | **Import menampilkan preview dan kesalahan per baris sebelum penyimpanan.** Pengguna harus mengetahui data mana yang akan masuk. | M |
| IMP-03 | **Baris tidak valid tidak disimpan secara diam-diam.** Pengguna dapat memperbaiki file dan mengulangi import tanpa menebak kegagalannya. | M |
| IMP-04 | **Import menyimpan ringkasan pelaku, waktu, file, jumlah diterima, dan jumlah ditolak.** Ringkasan diperlukan untuk audit dan penyelesaian masalah. | S |
| IMP-05 | **Template CSV dapat diunduh dari layar import.** Header dan contoh nilai harus menggunakan istilah yang sama dengan form manual. | C |

### 7.7 Dashboard & Reporting (`DSH`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| DSH-01 | **Dashboard Supervisor menampilkan target, realisasi, forecast, gap, dan jumlah transaksi per tahap untuk timnya.** Semua angka mengikuti periode yang sama. | M |
| DSH-02 | **Dashboard menampilkan kinerja per Sales tanpa membuka data tim lain.** Urutan dapat membantu coaching tetapi bukan satu-satunya ukuran evaluasi. | M |
| DSH-03 | **Dashboard menampilkan daftar tindakan yang membutuhkan perhatian.** Minimal mencakup stagnant lead, komentar belum dibaca, dan transaksi berpeluang closing. | M |
| DSH-04 | **Branch Manager melihat agregat seluruh tim dan dapat membandingkan tim.** Tampilan tidak membuka conversation atau kontak pelanggan. | M |
| DSH-05 | **Admin dapat memeriksa dashboard untuk dukungan dan audit.** Akses Admin tidak mengubah angka atau kepemilikan transaksi. | S |
| DSH-06 | **Ekspor dashboard lengkap dan distribusi laporan terjadwal ditunda ke fase berikutnya.** Ekspor agregat khusus menu Analisis tetap mengikuti ANL-08. | C |

### 7.8 Sales Forecasting (`FCT`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FCT-01 | **Forecast bulanan menghitung realisasi ditambah bobot transaksi aktif dengan estimasi bulan closing pada periode terpilih.** Estimasi bulan closing dapat diisi saat membuat lead/transaksi dan diperbarui Sales terkait atau Supervisor berwenang pada transaksi aktif. Estimasi kosong ditampilkan sebagai kekurangan data. DO, Delivery, dan Lost tidak masuk pipeline berbobot. Realisasi menghitung transaksi unik berdasarkan kejadian DO yang belum dibatalkan dalam bulan Asia/Jakarta. DO atau Delivery tanpa riwayat DO ditandai sebagai kekurangan data. Forecast bulan berjalan dan mendatang memakai pipeline terkini. Forecast dan gap forecast bulan lampau tidak tersedia karena snapshot historis belum disimpan. Rumus dan presisi konsisten di seluruh dashboard dan rincian. | M |
| FCT-02 | **Setiap tahap aktif mempunyai bobot peluang yang dikelola melalui konfigurasi server.** Bobot final diputuskan bersama operasional dealer sebelum forecast production diaktifkan. | M |
| FCT-03 | **Dashboard membedakan target, realisasi, dan forecast secara tegas.** Forecast tidak boleh disajikan seolah-olah hasil pasti. | M |
| FCT-04 | **Supervisor melihat forecast serta gap terhadap realisasi dan forecast per Sales serta tim.** Gap adalah target dikurangi realisasi/forecast dan boleh negatif ketika target terlampaui. Agregasi tim memakai tim yang tercatat pada transaksi, sedangkan alokasi Sales tersimpan mengikuti tim dan periode rencananya; perpindahan Sales tidak memindahkan histori transaksi atau target. Target management menjadi acuan utama tim; benchmark mempunyai pencapaian dan gap tersendiri, dan laporan menunjukkan total alokasi serta alokasi anggota aktif. Target legacy dipertahankan hingga ditinjau SPV tanpa pembagian ulang otomatis. Branch Manager melihat agregat dan perbandingan tim tersanitasi. Transaksi tanpa tim ditampilkan terpisah di agregat dealer. Kelengkapan target dealer tidak mensyaratkan target baru untuk tim nonaktif; target historis tim tersebut tetap tersedia. | S |
| FCT-05 | **Sistem menampilkan transaksi yang paling berkontribusi pada forecast.** Daftar membantu menentukan prioritas follow-up, bukan menjamin closing. | S |
| FCT-06 | **Pembelajaran bobot otomatis atau AI tidak disediakan pada MVP.** Pengembangan tersebut menunggu data historis yang cukup dan evaluasi model. | W |

### 7.9 User Experience (`UIX`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| UIX-01 | **Seluruh fungsi utama dapat digunakan pada lebar 390px tanpa horizontal page scroll.** Mobile adalah antarmuka kerja utama Sales di lapangan. | M |
| UIX-02 | **Tabel desktop berubah menjadi list dua baris atau kartu pada mobile.** Field penting dipindahkan, bukan dihilangkan. | M |
| UIX-03 | **Detail transaksi tampil sebagai dialog besar pada desktop dan full-screen dialog/sheet pada mobile.** Pengguna kembali ke daftar dengan filter dan posisi sebelumnya. | M |
| UIX-04 | **Filter mobile tidak mendorong daftar keluar dari layar pertama.** Filter lanjutan dapat dibuka melalui sheet. | S |
| UIX-05 | **Setiap target sentuh minimal 44px dan mempunyai nama aksesibel.** Aksi icon-only tetap dapat dipahami pembaca layar. | M |
| UIX-06 | **Loading, empty, error, dan stale state tersedia untuk setiap blok data utama.** Kegagalan satu blok tidak mengosongkan seluruh halaman. | M |
| UIX-07 | **PWA dan offline sync tidak disediakan pada MVP.** Kehilangan koneksi harus ditampilkan, bukan menyimpan perubahan lokal tersembunyi. | W |
| UIX-08 | **Aplikasi native Android/iOS tidak dibangun pada MVP.** Satu web app responsif menjadi basis kode tunggal. | W |

### 7.10 Analisis Penjualan (`ANL`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| ANL-01 | **MVP menyediakan menu Analisis dengan tampilan Sumber dan Model.** Menu menggunakan filter periode yang konsisten dengan dashboard. | M |
| ANL-02 | **Analisis Sumber menampilkan jumlah dan porsi transaksi menurut sumber lead serta perjalanan tahapnya.** Pengguna dapat melihat sumber yang menghasilkan lead dan kemajuan penjualan. | M |
| ANL-03 | **Analisis Model menampilkan jumlah dan porsi transaksi menurut model kendaraan.** Tahap SPK, DO, dan Delivery dapat dibandingkan untuk periode terpilih. | M |
| ANL-04 | **Analisis menampilkan jumlah, porsi, dan conversion rate dengan penyebut yang dijelaskan.** Angka harus dapat direkonsiliasi ke transaksi sumber. | M |
| ANL-05 | **Filter tanggal mempunyai mode Akuisisi dan Pencapaian.** Bulan mengikuti Asia/Jakarta dengan batas awal inklusif dan akhir eksklusif. Akuisisi memakai tanggal pembuatan lead dan menghitung conversion dari proporsi transaksi dengan DO yang sah. Pencapaian menghitung transaksi unik yang mempunyai kejadian tahap pada periode tanpa conversion lintas-kohort. Realisasi DO mode Pencapaian dan dashboard memakai kejadian serta cakupan laporan yang sama. Kolom Delivery mencatat konfirmasi pengiriman. | M |
| ANL-06 | **Pengguna dapat membuka drilldown berupa daftar transaksi yang sudah membawa filter analisis.** Menutup detail mempertahankan periode, mode tanggal, dan dimensi yang dipilih. | S |
| ANL-07 | **Cakupan Analisis mengikuti role dan atribusi tim transaksi yang sama dengan dashboard.** Perpindahan Sales tidak memindahkan angka histori transaksi ke tim barunya. Supervisor melihat tim aktif yang ditugaskan kepadanya, Admin melihat dealer, dan Branch Manager melihat drilldown tersanitasi tanpa nomor telepon, alamat, catatan hubungan, atau coaching. Izin laporan tidak memperluas izin operasional atau coaching. | M |
| ANL-08 | **Analisis dapat diekspor sebagai CSV dan PDF agregat.** Ekspor tidak memuat kontak pelanggan atau isi coaching. | S |
| ANL-09 | **Analisis Area dan pembiayaan memakai data terstruktur sesuai kontrak tambahan bagian 8.** Cutover laporan mengikuti gerbang integrasi backend dan UI; MSCP ditutup: porsi per leasing pada laporan pembiayaan sudah memenuhi kebutuhan (keputusan pemilik, 9 November 2026). | W |
| ANL-10 | **Mapping Area mengharuskan area transaksi lengkap sebelum DO.** Kecamatan harus sesuai kabupaten/kotanya; pilihan khusus Kota Lain mewajibkan nama kota dan tidak meminta kecamatan. Laporan DO hanya memuat kecamatan FOA dan Area lain, tanpa kategori kecamatan belum diisi. Rincian master, validasi dan snapshot mengikuti kontrak tambahan bagian 8; preview sintetis tidak menjadi sumber data laporan nyata. | M |

## 8. Gambaran Model Data

### Kontrak tambahan Transaksi, pembiayaan dan area (disetujui 8 November 2026)

Ketentuan berikut memperinci CRM-01/02/06/08, PIP-01/07 dan ANL-09/10 untuk implementasi end-to-end yang disetujui:

- Pelanggan baru boleh mempunyai satu `social_media_account` teks opsional maksimal 255 karakter. Identitas, akun medsos dan assignment pelanggan lama dipertahankan. Catatan umum transaksi terpisah dari catatan hubungan pelanggan dan coaching; tidak ada penyalinan otomatis.
- Sumber Digital Ad wajib kanal `facebook,instagram,tiktok,website,other`; sumber lain mengosongkan kanal. Input manual dan impor memakai aturan bersama, atomik dengan identitas, assignment, Lead, histori awal dan audit. Kolom CSV baru opsional; Digital Ad baru tetap wajib kanal.
- Progress hanya mengikuti histori perubahan tahap, termasuk pembatalan DO. Lead baru memakai waktu dibuat. Data lama memakai histori tahap terbaru atau waktu dibuat bila tanpa histori; aktivitas, coaching dan edit metadata tidak mengubah progress.
- Area transaksi KTP/STNK terpisah dari alamat profil, boleh kosong seluruhnya sebelum DO; wilayah parsial ditolak. Kecamatan harus cocok parent. `region_code=other` mewajibkan nama Kota Lain dan mengosongkan kecamatan, selalu non-FOA.
- Master resmi 106 kecamatan dari lima kabupaten/kota mempunyai kode/nama immutable. FOA per dealer hanya dikelola Admin dengan audit, awal kosong. Master leasing per dealer diawali MayBank, Mandiri Utama Finance, ACC, TAF, Mandiri Tunas Finance, BCA Finance, Niaga Finance dan Adira Finance; Admin mengatur aktif/pantauan dengan audit tanpa hard-delete referensi.
- Pembiayaan `null|cash|credit`; cash/belum ditentukan mengosongkan leasing. Kredit boleh belum memilih leasing. Pilihan `leasing_id=other` wajib nama bebas `other_name`; pilihan master memakai ID integer leasing aktif dealer. Pembiayaan lengkap tidak menjadi syarat tambahan DO.
- DO wajib area lengkap dan membuat snapshot area/pembiayaan atomik setelah row lock. Snapshot menyimpan kode/nama wilayah, status FOA, jenis pembiayaan, identitas/nama leasing dan status pantauan saat DO. Perubahan master tidak menulis ulang histori. Area/pembiayaan terkunci pada DO/Delivery, dibuka kembali setelah pembatalan ke SPK; DO ulang membuat snapshot baru, Delivery tidak menambah realisasi.
- Laporan pembiayaan Prospek memakai kejadian pertama masuk Prospect dalam rentang, sekali per transaksi, dengan pembiayaan terkini. DO memakai kejadian sah beserta snapshot. Leasing non-pantauan/nama bebas masuk Kredit Lain (kedua terakhir), Leasing belum dipilih terakhir. Mapping Area hanya DO sah dengan kecamatan FOA dan Area lain; tidak ada kategori area kosong. Scope dan sanitasi Branch Manager mengikuti laporan existing. MSCP dipenuhi oleh porsi per leasing pada laporan ini; tidak ada konsep MSCP terpisah.
- Master kendaraan ringkas per dealer (bukan master DMS lengkap): jenis kendaraan dan model di bawahnya, dengan kisaran harga opsional sebagai petunjuk. Hanya Admin yang mengelola, dengan audit; nama unik per dealer tanpa membedakan huruf besar/kecil, harga maksimum tidak boleh di bawah minimum, dan yang sudah dipakai hanya dinonaktifkan. Kendaraan opsional pada Lead, Prospect dan Hot Prospect, wajib terisi dari master aktif saat transaksi masuk SPK (bisa dipilih pada langkah pindah tahap) dan tidak boleh dikosongkan setelahnya. Transaksi menyimpan nama sebagai salinan teks sehingga histori, impor CSV dan Analisis Model tidak berubah; perubahan master tidak menulis ulang transaksi lama. Impor CSV belum memakai master.

### Kontrak tambahan profil pelanggan dan detail kredit (10 November 2026)

Ketentuan berikut memperinci CRM-01/08/14 dan PIP-01 untuk data pelanggan yang diwajibkan bertahap, serta pembiayaan kredit:

- Profil Customer memuat nama, telepon, gender (`L`/`P`), alamat, kecamatan, pekerjaan, akun media sosial, email dan tanggal lahir. Media sosial, email dan tanggal lahir selalu opsional. Nama dan telepon wajib sejak Lead; gender wajib saat Lead dibuat (form dan impor CSV, kolom `gender`).
- Kewajiban per tahap tujuan: alamat dan gender wajib untuk Prospect, Hot Prospect dan SPK; kecamatan dan pekerjaan wajib untuk SPK. Tahap Lost, DO dan Delivery tidak menambah kewajiban (DO hanya dari SPK). Pemindahan tahap bebas arah sehingga Lead dapat langsung ke SPK dan tetap terkena kedua kelompok kewajiban.
- Kekurangan data diisi di dialog pindah tahap (blok `customer`); dialog hanya menampilkan isian yang belum terisi, dan data tersimpan atomik bersama perubahan tahap. Isian kosong tidak pernah menimpa data tersimpan. Customer lama tidak di-backfill; ia ditagih saat naik tahap. Customer existing yang dipakai ulang oleh Lead baru tidak diubah.
- Kecamatan Customer memakai master 106 kecamatan; pilihan Kota Lain mewajibkan nama kota dan tanpa kecamatan. Ini terpisah dari area transaksi KTP/STNK. Pekerjaan memakai daftar tetap `farmer`, `employee`, `civil-servant`, `teacher`, `entrepreneur`, `others` (label Indonesia: Petani, Karyawan, PNS, Guru, Wiraswasta, Lainnya). Field baru hanya lewat route Customer/Transaksi sehingga tetap tertutup bagi Branch Manager (CRM-14).
- Pembiayaan Kredit wajib tenor (12, 24, 36, 48 atau 60 bulan) dan jenis asuransi (`tlo`, `all_risk`, `combination`: TLO, All Risk, Kombinasi) sejak Kredit dipilih; Cash atau belum ditentukan mengosongkan keduanya. Kewajiban hanya berlaku saat blok pembiayaan dikirim (buat, impor, ubah pembiayaan); mengubah properti lain pada transaksi kredit lama tanpa tenor tidak ditolak. Impor CSV memakai kolom `tenor_months` dan `insurance_type` yang wajib bila `financing_type=credit`.

- Kecamatan Customer tidak menggantikan area transaksi KTP/STNK dan tidak masuk laporan Area. Ia hanya menjadi nilai awal: area transaksi yang masih kosong terisi dari kecamatan Customer saat transaksi dibuat untuk Customer existing atau saat pindah tahap; area yang sudah terisi tidak pernah ditimpa dan tetap dapat diubah.

### Kontrak modal detail sebagai ruang kerja (10 November 2026)

Modal Detail pada halaman Transaksi menjadi satu tempat kerja per transaksi dan pelanggannya:

- Ubah tahap, Konfirmasi Delivery dan Batalkan DO dikerjakan di modal (mode Tahap pada panel kanan); halaman Transaksi tidak lagi memiliki dialog tahap sendiri, dan Buku Pelanggan membuka modal yang sama untuk Ubah Tahap (dialog tahap duplikatnya dihapus). Aturan tahap, gerbang profil dan otorisasi tidak berubah.
- Isian yang baru wajib di tahap tertentu (gender, alamat, pekerjaan, kecamatan, kendaraan, tenor/asuransi) tampil dan dapat diedit di modal sejak tahap awal, dengan penanda "wajib di <tahap>" selagi kosong. Profil pelanggan disimpan lewat `PATCH /customers/{customer}/profile` dengan aturan yang sama seperti blok `customer` pada pindah tahap: nilai kosong tidak pernah menimpa data tersimpan. Telepon juga dapat dikoreksi dari modal: wajib, divalidasi dan disimpan dinormalkan (E.164), dan ditolak bila sudah dipakai pelanggan lain pada dealer yang sama tanpa menyebut nama pelanggan itu.
- Panel kiri modal dikelompokkan menjadi kartu Pelanggan (di atas) dan kartu Transaksi (termasuk Keterangan) yang berdampingan dengan Pergerakan tahap; pada panel yang sempit (tablet, ponsel) semuanya menumpuk satu kolom dan label berada di atas nilai. Nilai panjang (area, pembiayaan, alamat) membungkus dan tidak dipotong; tenor dan asuransi tampil pada baris kedua pembiayaan.
- Fitur detail Buku Pelanggan tersedia di modal: catat aktivitas, jadwalkan follow-up, preferensi kontak, ganti PIC Sales (Admin, dan Supervisor untuk Sales timnya), riwayat pelanggan, serta tombol Telepon dan WhatsApp di header yang mengikuti kanal pilihan dan penolakan kontak. Branch Manager tetap tanpa komentar, riwayat dan penulisan data pelanggan.

Laporan/master/form operasional dan cutover preview mengikuti gerbang rencana end-to-end. Data preview tidak dianggap data dealer atau aktivasi laporan nyata.

| Entitas | Peran | Catatan |
|---|---|---|
| Dealer | Batas organisasi utama | Satu dealer pada MVP. |
| User | Identitas login | Password hanya disimpan dalam bentuk hash. |
| Team | Kelompok Supervisor dan Sales | Dapat dinonaktifkan tanpa menghapus riwayat. |
| Team membership | Penempatan user ke tim dan peran | Periode keanggotaan menjaga riwayat perpindahan. |
| Invitation | Undangan aktivasi akun | Token disimpan aman, sekali pakai, dan kedaluwarsa. |
| Customer | Identitas pelanggan | Nomor telepon dinormalisasi untuk peringatan duplikat. |
| Customer assignment history | Riwayat Sales penanggung jawab pelanggan | Menjaga jejak perpindahan tanpa menjadikan data sebagai milik pribadi Sales. |
| Sale/Lead | Peluang penjualan | Menyimpan tahap aktif, pemilik, sumber, dan kendaraan yang diminati. |
| Stage history | Riwayat perpindahan pipeline | Append-only untuk kejadian tahap. |
| Activity | Follow-up dan system event | Menjadi dasar aktivitas terakhir dan stagnant. |
| Follow-up plan | Rencana tindakan berikutnya | Mencakup waktu, kanal, status, dan hubungan ke customer/transaksi bila ada. |
| Contact preference | Izin atau penolakan kanal komunikasi | Mencegah tindak lanjut yang bertentangan dengan preferensi pelanggan. |
| Comment | Pesan coaching pada transaksi | Tidak dihapus permanen. |
| Comment revision | Versi lama komentar | Menyimpan isi sebelum edit dan waktu perubahan. |
| Notification | Status notifikasi in-app | Email delivery dicatat terpisah dari status baca. |
| Target | Rencana target tim per bulan dan alokasi personal | Memuat target management, markup, benchmark, versi, serta alokasi Sales yang mempertahankan tim/periode asal. |
| Forecast weight | Bobot peluang per tahap | Konfigurasi server dengan riwayat efektif. |
| Import batch | Audit satu proses CSV | Menyimpan ringkasan dan hasil validasi. |

Nilai berikut tidak mempunyai tabel sumber tersendiri: status stagnant, conversion rate, forecast, dan gap. Semuanya dihitung dari data kanonik agar tidak tersimpan dalam versi yang saling berbeda.

## 9. Aturan Bisnis Kritis

| Aturan | Yang terjadi bila tidak ditegakkan | Penegakan | Rujukan |
|---|---|---|---|
| Data tidak boleh bocor antar-tim atau antar-Sales. | Data pelanggan dan strategi penjualan terlihat pihak yang tidak berhak; kebocoran tidak dapat ditarik kembali. | Policy/query scope server dan feature test akses. | IAM-05, CRM-03, ORG-05 |
| Branch Manager tidak membaca coaching. | Percakapan arahan yang sensitif tersebar ke tingkat yang tidak disepakati. | Policy server, Inertia prop filtering, dan feature test. | CVS-04 |
| Riwayat tahap tidak boleh hilang ketika tahap berubah. | Audit perjalanan transaksi dan dasar evaluasi tidak dapat dipulihkan. | Transaksi database, foreign key, dan service test. | PIP-01 |
| Lost wajib mempunyai alasan. | Penyebab kehilangan tidak dapat dianalisis setelah peluang ditutup. | Validasi aplikasi dan constraint status/alasan pada desain database. | PIP-04 |
| Revisi komentar wajib mempertahankan versi sebelumnya. | Arahan kerja dapat diubah tanpa jejak dan menimbulkan sengketa yang tidak dapat dibuktikan. | Transaksi aplikasi, revision table, dan feature test. | CVS-06, CVS-07 |
| Isi coaching tidak boleh masuk email. | Informasi internal tersebar ke inbox di luar kontrol akses aplikasi. | Template email tanpa body komentar dan test render email. | CVS-09 |
| Password dan secret tidak boleh dikirim ke client. | Credential dapat disalin dari browser atau bundle dan tidak dapat dianggap rahasia lagi. | Konfigurasi server, serializer allowlist, dan security test. | IAM-06 |
| Customer adalah aset dealer, bukan phonebook pribadi Sales. | Data dapat dibawa keluar, hilang saat Sales pindah, atau digunakan tanpa pengawasan. | Assignment history, policy server, larangan bulk export/sinkronisasi pribadi, dan audit. | CRM-13, CRM-14, CRM-15 |
| Branch Manager hanya menerima data pelanggan tersanitasi. | Kontak dan catatan hubungan tersebar ke role yang hanya memerlukan agregat. | Query projection/allowlist, export agregat, dan feature test negatif. | CRM-07, CRM-14, ANL-07, ANL-08 |

Aturan jendela edit komentar lima menit hanya dapat ditegakkan lapisan aplikasi karena bergantung pada waktu, pelaku, dan intent operasi. Database tetap menjaga revision record ketika edit yang sah dilakukan.

## 10. Integrasi

| Modul/Sistem | Arah ketergantungan | Yang dipertukarkan |
|---|---|---|
| Penyedia email | Aplikasi bergantung pada penyedia | Undangan dan metadata notifikasi; tidak ada isi coaching. |
| CSV pengguna | Pengguna memasok file ke aplikasi | Lead sesuai template, setelah preview dan validasi. |
| Browser | Client bergantung pada server Laravel | Halaman Inertia dan aksi terautentikasi pada origin yang sama. |
| Sistem dealer lama | Tidak berlaku pada MVP | Integrasi API belum disepakati; CSV menjadi jalur data awal. |

## 11. Kebutuhan Non-Fungsional

| Area | Target |
|---|---|
| Responsive | Acceptance test pada viewport 390px, 768px, dan 1440px; tidak ada horizontal page scroll pada alur utama. |
| Touch | Target interaktif minimal 44×44px pada mobile. |
| Kecepatan input | Pembaruan tahap atau aktivitas lead dapat diselesaikan maksimal 60 detik oleh pengguna terlatih. |
| Respons aplikasi | p95 navigasi Inertia dan operasi CRUD utama di bawah 2 detik pada beban MVP setelah server menerima request, di luar waktu pengiriman email. |
| Dashboard | p95 pemuatan dashboard periode bulanan di bawah 3 detik pada volume sampai 100.000 transaksi dealer. |
| Notifikasi | 95% email yang diterima penyedia antrean dikirim atau tercatat gagal dalam 5 menit. |
| Keamanan akses | 100% route data bisnis mempunyai autentikasi dan pemeriksaan kewenangan server-side. |
| Secret | 0 secret atau server environment value pada JavaScript bundle, Inertia props, log aplikasi, dan repository. |
| Aksesibilitas | Alur utama dapat digunakan dengan keyboard; label, focus state, dan kontras memenuhi WCAG 2.2 AA. |
| Ketersediaan | Target availability production 99,5% per bulan, tidak termasuk maintenance terjadwal. |
| Audit waktu | Semua timestamp bisnis disimpan dalam UTC dan ditampilkan dalam zona waktu Asia/Jakarta. |
| Pengujian | Setiap aturan bisnis non-trivial mempunyai unit atau feature test sebelum dianggap selesai. |

Angka di atas adalah target acceptance produk v1.0 dan harus dievaluasi kembali setelah data volume serta lingkungan deployment ditetapkan.

## 12. Tahapan Rilis

Urutan detail, dependensi, dan checklist gerbang fase berada di [`roadmap.md`](roadmap.md). Tahap berikut tidak dimulai penuh sebelum gerbang kritis tahap sebelumnya lulus.

| Fase | Cakupan minimum | Gerbang keluar |
|---|---|---|
| 0 — Persiapan produk | Persetujuan PRD, alur per role, model data, matriks akses, wireframe utama, keputusan package, dan backlog. | Keputusan penghambat dicatat; rencana test tersedia; package belum dipasang tanpa persetujuan. |
| 1 — Fondasi akses | Bootstrap aplikasi, login, undangan, role, dealer, tim, penempatan pengguna, shell responsif, dan fondasi audit/test. | Seluruh matriks akses role lulus feature test; tidak ada registrasi publik atau secret di client. |
| 2 — Buku Pelanggan dan pipeline | Customer master, Buku Pelanggan Saya, aksi cepat, follow-up, lead/transaksi, penugasan, riwayat tahap, activity, stagnant, dan dialog adaptif. | Customer–transaksi tidak terduplikasi; alur Lead sampai Delivery/Lost lulus; akses lintas tim ditolak; viewport utama lulus. |
| 3 — Pekerjaan harian dan coaching | Prioritas follow-up, conversation timeline, reply, edit lima menit, audit revision, in-app notification, dan email metadata. | Test akses, edit boundary, revision, non-deletion, queue retry, dan email tanpa isi coaching lulus. |
| 4 — Target, dashboard, dan forecast | Target, realisasi, weighted forecast, gap, tindakan prioritas, serta dashboard Branch Manager. | Angka dashboard direkonsiliasi dengan data sumber; bobot forecast disetujui; target performa dashboard tercapai. |
| 5 — Analisis dan laporan | Analisis Sumber dan Model, mode tanggal Akuisisi/Pencapaian, drilldown, serta ekspor agregat CSV/PDF. | Metrik dan drilldown merekonsiliasi data sumber; sanitasi Branch Manager dan ekspor lulus test. |
| 6 — Import, hardening, dan pilot | CSV import, keamanan, aksesibilitas, performa, rekonsiliasi data, pelatihan, dan pilot pengguna. | UAT per role lulus, temuan kritis ditutup, runbook operasional siap, dan keputusan go-live diberikan. |
| 7 — Pasca-MVP | Analisis Area, dokumen, delivery calendar, laporan terjadwal, dan pembelajaran bobot historis. | Memerlukan kebutuhan dan acceptance tambahan; bukan bagian acceptance MVP awal. |

## 13. Ukuran Keberhasilan

| Ukuran | Kriteria |
|---|---|
| Kelengkapan pipeline | Minimal 90% lead aktif memiliki aktivitas dalam tujuh hari terakhir setelah satu bulan penggunaan. |
| Lead stagnan | Jumlah lead aktif yang tidak tersentuh lebih dari tiga hari menurun dibanding baseline dua minggu pertama. |
| Kecepatan pembaruan | Median pembaruan lead oleh Sales di bawah 60 detik pada uji penggunaan. |
| Adopsi coaching | Minimal 80% transaksi yang ditandai membutuhkan perhatian memperoleh komentar atau aktivitas lanjutan dalam dua hari kerja. |
| Ketepatan laporan | Target, realisasi, forecast, dan jumlah per tahap merekonsiliasi 100% dengan transaksi sumber untuk periode yang sama. |
| Pengurangan rekap manual | Branch Manager dapat memperoleh tampilan kinerja lintas tim tanpa meminta spreadsheet terpisah dari Supervisor. |
| Keamanan | Tidak ada akses lintas role/tim pada seluruh skenario negatif dalam test suite dan audit pra-rilis. |
| Kedisiplinan follow-up | Minimal 90% pelanggan aktif mempunyai next follow-up atau hasil kontak yang tercatat. |
| Pemanfaatan Buku Pelanggan | Sales dapat menemukan pelanggan, memahami kontak terakhir, dan memulai tindakan berikutnya dalam maksimal 30 detik pada uji penggunaan. |
| Ketepatan Analisis | Jumlah per Sumber dan Model serta drilldown merekonsiliasi 100% dengan transaksi sumber pada periode dan mode tanggal yang sama. |

Baseline penggunaan dikumpulkan setelah dua minggu pertama; target yang bergantung baseline dinilai pada akhir bulan pertama.

## 14. Keputusan Terbuka

| No | Pertanyaan | Pemutus | Yang tertahan | Prioritas |
|---:|---|---|---|---|
| 1 | Apa nama produk final? | Product Owner | Branding, title, logo, dan alamat deployment. Ditutup 13 November 2026: nama produk final **AIna DealDrive**, dipilih Product Owner. Penerapan ke branding, title, logo dan alamat deployment dikerjakan terpisah. | S |
| 2 | Berapa bobot peluang untuk Lead, Prospect, Hot Prospect, dan SPK? | Product Owner + operasional dealer | Aktivasi forecast production dan acceptance rekonsiliasi. Ditutup 13 November 2026: pemilik, sebagai Product Owner sekaligus perwakilan operasional dealer, menyetujui bobot baseline Lead 10%, Prospect 25%, Hot Prospect 50%, SPK 75%; `config/forecast.php` approved=true. | M |
| 3 | Penyedia email apa yang digunakan? | Product Owner + IT | Development memakai Mailtrap Sandbox, dipilih pengguna 5 November 2026. Pada 7 November 2026 pengguna mula-mula memilih Gmail pribadi, lalu mengganti pengiriman awal ke Brevo SMTP. Undangan preview tercatat Delivered; credential production diisi pemilik secara langsung. Konfigurasi dan gerbang aktual mengikuti runbook deployment; kapasitas provider dievaluasi pada pilot. | M |
| 4 | Di mana aplikasi production akan dijalankan? | Product Owner + IT | Pada 7 November 2026 pengguna memilih Vercel untuk deployment awal dan Neon Free baru sebagai PostgreSQL. Implementasi dan batas kesiapan mengikuti ADR 005 serta runbook Vercel. | M |
| 5 | Bukti booking fee apa yang cukup untuk masuk SPK? | Product Owner + operasional dealer | Validasi final transisi ke SPK. Ditutup 13 November 2026: konfirmasi eksplisit bahwa booking fee sudah diterima, dengan pelaku dan waktu tercatat, sudah cukup. Nominal atau nomor kuitansi tidak diwajibkan; perilaku saat ini menjadi aturan final. | M |
| 6 | Berapa lama data pelanggan dan audit disimpan? | Product Owner + legal/operasional | Kebijakan retensi, archive, dan penghapusan. Ditutup sementara 13 November 2026: data pelanggan dan audit disimpan tanpa batas waktu; tidak ada archive atau penghapusan otomatis. Kebijakan ditinjau ulang setelah satu tahun pemakaian production. | S |

Keputusan teknis yang mahal dibalik harus ditutup melalui ADR baru. Keputusan produk tetap ditutup di bagian ini dengan tanggal dan alasan, tanpa menghapus pertanyaannya.

## 15. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Sales tidak memperbarui data | Dashboard dan forecast tampak presisi tetapi memakai pipeline yang usang. | Tampilkan aktivitas terakhir, stagnant alert, dan freshness; ukur adopsi pembaruan. |
| Bobot forecast dianggap janji | Manajemen mengambil keputusan dari angka yang belum terkalibrasi. | Label forecast sebagai perkiraan, tampilkan komponen pembentuk, dan review bobot berkala. |
| Coaching bocor ke laporan/email | Informasi internal tersebar di luar konteks transaksi. | Policy server, email metadata-only, dan test negatif untuk Branch Manager. |
| CSV buruk memasukkan data salah | Pipeline tercemar dalam jumlah besar dan sulit dikoreksi. | Preview, validasi per baris, audit batch, dan tidak menyimpan kegagalan diam-diam. |
| UI desktop dipaksakan ke mobile | Sales tidak menggunakan aplikasi di lapangan. | Komposisi mobile khusus, dialog full-screen, list pengganti tabel, dan test 390px. |
| Hak akses hanya disembunyikan di UI | URL/request langsung membuka data yang tidak berhak. | Policy dan query scope server pada setiap operasi serta test lintas role. |
| Environment client membawa secret | Credential masuk bundle publik. | Tidak memakai client env; konfigurasi aman dikirim server melalui allowlist. |
| Email provider gagal | Undangan atau coaching terlambat diketahui. | Queue dengan retry, status kegagalan, notifikasi in-app tetap menjadi sumber utama. |
| Requirement bercabang antar dokumen | Developer mengikuti aturan lama atau berbeda. | Satu ID satu tempat, manifest dokumen, dan link ke sumber kanonik. |
| Buku Pelanggan dianggap milik pribadi Sales | Data dibawa keluar atau hilang ketika tanggung jawab berpindah. | Tetapkan data sebagai aset dealer, simpan assignment history, batasi ekspor, dan audit akses. |
| Data pelanggan diduplikasi untuk setiap transaksi | Riwayat hubungan terpecah dan tindak lanjut menjadi membingungkan. | Pisahkan Customer dari transaksi, normalisasi nomor telepon, dan tampilkan kandidat duplikat. |
| Tindak lanjut mengabaikan izin pelanggan | Pelanggan terganggu dan dealer menanggung risiko reputasi/kepatuhan. | Simpan preferensi kanal/opt-out, tampilkan peringatan, dan jangan menyediakan broadcast massal pada MVP. |
| Conversion mode Pencapaian menyesatkan | Tahap dari kohort berbeda dibandingkan seolah-olah berasal dari lead yang sama. | Tampilkan conversion hanya pada mode Akuisisi; mode Pencapaian fokus pada jumlah dan porsi event. |
