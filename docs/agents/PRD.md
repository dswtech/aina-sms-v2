# PRD — Sistem Pengelolaan Sales Dealer

| Item | Keterangan |
|---|---|
| Dokumen | PRD — Sistem Pengelolaan Sales Dealer |
| Versi | v1.0 (Draft untuk review) |
| Tanggal | 28 Oktober 2026 |
| Disusun oleh | Product Owner dan Product Engineering |
| Audiens | Product Owner, operasional dealer, engineering, dan QA |
| Status | Menunggu persetujuan — lihat Bagian 14 |

| Item | Keterangan |
|---|---|
| Nama kerja | DealDrive Supervisor |
| Cakupan | Fondasi dan MVP inti |
| Requirement | 63 aktif |
| Prasyarat | Tidak ada aplikasi sebelumnya di repository |
| Aturan ID | ID asli dipertahankan dan tidak boleh digunakan ulang |

---

## 1. Ringkasan Eksekutif

Produk ini adalah web app internal dealer mobil untuk menyatukan pekerjaan Admin, Branch Manager, Supervisor, dan Sales dalam mengelola calon pelanggan serta proses penjualan. Nilai utamanya adalah memberi visibilitas yang sama kepada pihak yang tepat tanpa mengandalkan rekap spreadsheet atau permintaan pembaruan melalui chat satu per satu.

Sales mencatat lead dan memperbarui perkembangannya. Supervisor melihat pipeline tim, menemukan lead yang stagnan, memberi coaching pada transaksi yang memerlukan arahan, dan memantau target. Branch Manager membaca kinerja serta forecast lintas tim. Admin mengelola akun dan struktur organisasi.

MVP juga menyediakan weighted sales forecasting. Forecast bukan janji penjualan, melainkan perkiraan berbobot yang membantu Supervisor dan Branch Manager melihat risiko kekurangan target lebih awal.

## 2. Latar Belakang & Permasalahan

Supervisor saat ini perlu meminta pembaruan melalui chat atau telepon untuk mengetahui posisi setiap calon pelanggan. Informasi lead, hasil follow-up, status SPK, dan alasan lost mudah tersebar pada percakapan pribadi atau file yang berbeda. Akibatnya, lead dapat terlupakan, coaching tidak terdokumentasi, dan laporan untuk Branch Manager membutuhkan penggabungan manual.

Target hanya menunjukkan apa yang ingin dicapai, sedangkan realisasi baru menjelaskan apa yang sudah terjadi. Tanpa forecast, Supervisor mengetahui risiko kekurangan target terlalu terlambat. Sistem yang dibangun harus menunjukkan pekerjaan yang perlu ditindaklanjuti hari ini sekaligus perkiraan hasil akhir periode.

UI referensi yang diperiksa membuktikan pola filter, tabel transaksi, status, pagination, dan floating detail sesuai dengan pekerjaan ini. Namun tampilan mobile referensi menyempitkan tabel dan dialog. Produk baru mengambil pola interaksinya tanpa membawa kelemahan responsif tersebut.

## 3. Tujuan & Batasan

### 3.1 Tujuan

| Sasaran | Ukuran keberhasilan |
|---|---|
| Memberi visibilitas pipeline tim | Supervisor dapat melihat seluruh lead tim beserta tahap dan aktivitas terakhir dari satu layar. |
| Mencegah lead terlupakan | Lead tanpa aktivitas lebih dari tiga hari ditandai dan dapat difilter. |
| Mempercepat pembaruan lapangan | Sales dapat memperbarui satu lead dalam waktu maksimal 60 detik pada ponsel. |
| Mendokumentasikan coaching | Arahan dan balasan terkait transaksi tersimpan dalam timeline yang dapat diaudit. |
| Memberi peringatan target lebih awal | Dashboard menampilkan target, realisasi, forecast, dan gap per Sales serta tim. |
| Mengurangi pekerjaan rekap | Branch Manager dapat membaca kinerja lintas tim tanpa meminta rekap manual dari setiap Supervisor. |

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
| Realisasi | Delivery yang sudah selesai pada periode tersebut. |
| Forecast | Perkiraan hasil akhir dari realisasi ditambah nilai berbobot transaksi aktif. |
| Conversation | Timeline komentar Sales/Supervisor dan aktivitas sistem pada satu transaksi. |
| Coaching | Arahan Supervisor yang terkait dengan keadaan nyata sebuah transaksi. |

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
| 4 | Sales/Supervisor | Mendorong transaksi melalui Prospect, Hot Prospect, SPK, dan DO. | Riwayat tahap tersimpan tanpa menimpa kejadian sebelumnya. |
| 5 | Sales/Supervisor | Menyelesaikan sebagai Delivery atau Lost. | Transaksi keluar dari pipeline aktif; Lost menyimpan alasan. |

### 6.3 Forecast dan tindak lanjut

| # | Pelaku | Tindakan | Keadaan sesudahnya |
|---:|---|---|---|
| 1 | Sistem | Mengambil realisasi, transaksi aktif, dan bobot tahap untuk periode terpilih. | Forecast dihitung dari sumber yang sama dengan dashboard. |
| 2 | Supervisor | Membaca gap dan transaksi berpeluang closing. | Supervisor menentukan prioritas follow-up dan coaching. |
| 3 | Branch Manager | Membaca forecast lintas tim. | Risiko pencapaian dapat dibahas sebelum akhir periode. |

### 6.4 Jalur yang tidak berakhir normal

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

### 7.2 Organization & Team (`ORG`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| ORG-01 | **Sistem menyimpan satu dealer dengan banyak tim.** Struktur ini cukup untuk MVP tanpa memperkenalkan multi-cabang yang belum diperlukan. | M |
| ORG-02 | **Admin dapat membuat, mengubah nama, dan menonaktifkan tim.** Tim nonaktif tidak menerima transaksi baru tetapi riwayatnya tetap tersedia. | M |
| ORG-03 | **Admin menempatkan Supervisor dan Sales ke tim.** Perubahan penempatan berlaku untuk akses berikutnya dan tidak mengubah penulis riwayat lama. | M |
| ORG-04 | **Branch Manager dapat membaca kinerja seluruh tim.** Hak ini read-only dan tidak memberi kemampuan mengubah transaksi. | M |
| ORG-05 | **Supervisor hanya mengelola tim yang ditugaskan.** Penugasan lintas tim harus dilakukan Admin. | M |
| ORG-06 | **Target dapat ditetapkan per periode untuk tim dan Sales.** Target yang berubah menyimpan siapa dan kapan perubahan dilakukan. | S |
| ORG-07 | **Admin dapat melihat status undangan dan akun.** Tampilan membedakan invited, active, dan inactive. | S |

### 7.3 Customer & Lead (`CRM`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| CRM-01 | **Sales dapat membuat lead dengan identitas dan kebutuhan minimum pelanggan.** Form utama memuat nama, nomor telepon, kendaraan yang diminati, estimasi pembelian, sumber, dan catatan. | M |
| CRM-02 | **Sistem memperingatkan kemungkinan duplikat berdasarkan nomor telepon.** Peringatan tidak otomatis memblokir transaksi berbeda milik pelanggan yang sama. | S |
| CRM-03 | **Sales hanya dapat melihat dan memperbarui lead yang ditugaskan kepadanya.** Data Sales lain tidak ikut terkirim ke client. | M |
| CRM-04 | **Supervisor dapat melihat dan menugaskan ulang lead dalam timnya.** Riwayat penugasan lama tetap tersimpan untuk audit. | M |
| CRM-05 | **Admin dapat membaca data yang diperlukan untuk audit dan dukungan.** Akses tersebut tidak menghapus batas akses role operasional lain. | M |
| CRM-06 | **Lead dapat dicari dan difilter berdasarkan periode, tahap, Sales, sumber, dan status stagnan.** Filter harus mempertahankan konteks ketika detail ditutup. | M |
| CRM-07 | **Data kontak sensitif tidak muncul pada dashboard agregat Branch Manager.** Branch Manager melihat metrik, bukan daftar kontak pelanggan pada MVP. | S |

### 7.4 Sales Pipeline (`PIP`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| PIP-01 | **Transaksi mempunyai satu tahap aktif dan riwayat tahap yang tidak ditimpa.** Perubahan selalu mencatat tahap asal, tahap tujuan, pelaku, dan waktu. | M |
| PIP-02 | **Tahap MVP adalah Lead, Prospect, Hot Prospect, SPK, DO, Delivery, dan Lost.** Nama tahap menjadi bahasa bersama dashboard, filter, dan forecast. | M |
| PIP-03 | **Perubahan ke SPK memerlukan konfirmasi booking fee sesuai kebijakan operasional.** Sistem tidak boleh menyatakan SPK tanpa bukti kondisi minimum yang disepakati. | S |
| PIP-04 | **Perubahan ke Lost memerlukan alasan.** Alasan dipilih dari katalog dan dapat diberi catatan agar penyebab kehilangan dapat dievaluasi. | M |
| PIP-05 | **Transaksi aktif tanpa aktivitas lebih dari tiga hari ditandai stagnant.** Status ini dihitung dari aktivitas terakhir, bukan disimpan sebagai status manual. | M |
| PIP-06 | **Sales dan Supervisor dapat mencatat aktivitas follow-up tanpa mengubah tahap.** Aktivitas memperbarui waktu aktivitas terakhir dan muncul pada timeline. | M |
| PIP-07 | **Delivery menutup transaksi dari pipeline aktif tanpa menghapus riwayat.** Koreksi setelah Delivery harus melalui tindakan berwenang yang tercatat. | M |

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
| DSH-06 | **Ekspor laporan PDF/CSV lengkap ditunda ke fase berikutnya.** MVP memprioritaskan kebenaran dashboard sebelum otomatisasi distribusi laporan. | C |

### 7.8 Sales Forecasting (`FCT`)

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FCT-01 | **Forecast menghitung realisasi ditambah nilai berbobot dari transaksi aktif pada periode.** Rumus dan waktu perhitungan harus konsisten di seluruh dashboard. | M |
| FCT-02 | **Setiap tahap aktif mempunyai bobot peluang yang dikelola melalui konfigurasi server.** Bobot final diputuskan bersama operasional dealer sebelum forecast production diaktifkan. | M |
| FCT-03 | **Dashboard membedakan target, realisasi, dan forecast secara tegas.** Forecast tidak boleh disajikan seolah-olah hasil pasti. | M |
| FCT-04 | **Supervisor melihat forecast dan gap per Sales serta tim.** Branch Manager melihat agregat dan perbandingan tim. | S |
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

## 8. Gambaran Model Data

| Entitas | Peran | Catatan |
|---|---|---|
| Dealer | Batas organisasi utama | Satu dealer pada MVP. |
| User | Identitas login | Password hanya disimpan dalam bentuk hash. |
| Team | Kelompok Supervisor dan Sales | Dapat dinonaktifkan tanpa menghapus riwayat. |
| Team membership | Penempatan user ke tim dan peran | Periode keanggotaan menjaga riwayat perpindahan. |
| Invitation | Undangan aktivasi akun | Token disimpan aman, sekali pakai, dan kedaluwarsa. |
| Customer | Identitas pelanggan | Nomor telepon dinormalisasi untuk peringatan duplikat. |
| Sale/Lead | Peluang penjualan | Menyimpan tahap aktif, pemilik, sumber, dan kendaraan yang diminati. |
| Stage history | Riwayat perpindahan pipeline | Append-only untuk kejadian tahap. |
| Activity | Follow-up dan system event | Menjadi dasar aktivitas terakhir dan stagnant. |
| Comment | Pesan coaching pada transaksi | Tidak dihapus permanen. |
| Comment revision | Versi lama komentar | Menyimpan isi sebelum edit dan waktu perubahan. |
| Notification | Status notifikasi in-app | Email delivery dicatat terpisah dari status baca. |
| Target | Target per periode dan penerima | Penerima berupa tim atau Sales. |
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

| Fase | Cakupan minimum | Gerbang keluar |
|---|---|---|
| 1 — Fondasi akses | Aplikasi, login, undangan, role, dealer, tim, dan penempatan pengguna. | Seluruh matriks akses role lulus feature test; tidak ada registrasi publik atau secret di client. |
| 2 — CRM dan pipeline | Lead CRUD, filter, penugasan, riwayat tahap, activity, stagnant, dan dialog adaptif. | Alur Lead sampai Delivery/Lost lulus; akses lintas tim ditolak; viewport 390/768/1440 lulus pemeriksaan. |
| 3 — Coaching dan notifikasi | Conversation timeline, reply, edit lima menit, audit revision, in-app notification, dan email metadata. | Test akses, edit boundary, revision, non-deletion, queue retry, dan email tanpa isi coaching lulus. |
| 4 — Dashboard dan forecast | Target, realisasi, weighted forecast, gap, tindakan prioritas, serta dashboard Branch Manager. | Angka dashboard direkonsiliasi dengan data sumber; bobot forecast disetujui; target performa dashboard tercapai. |
| 5 — Operasional lanjutan | Leasing, dokumen, delivery calendar, ekspor laporan, dan pembelajaran bobot historis. | Memerlukan PRD/ADR tambahan; bukan bagian acceptance MVP. |

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

Baseline penggunaan dikumpulkan setelah dua minggu pertama; target yang bergantung baseline dinilai pada akhir bulan pertama.

## 14. Keputusan Terbuka

| No | Pertanyaan | Pemutus | Yang tertahan | Prioritas |
|---:|---|---|---|---|
| 1 | Apa nama produk final? | Product Owner | Branding, title, logo, dan alamat deployment. | S |
| 2 | Berapa bobot peluang untuk Lead, Prospect, Hot Prospect, SPK, dan DO? | Product Owner + operasional dealer | Aktivasi forecast production dan acceptance rekonsiliasi. | M |
| 3 | Penyedia email apa yang digunakan? | Product Owner + IT | Pengiriman undangan dan email notifikasi di production. | M |
| 4 | Di mana aplikasi production akan dijalankan? | Product Owner + IT | Runbook deployment, sizing, backup, dan target observability. | M |
| 5 | Bukti booking fee apa yang cukup untuk masuk SPK? | Product Owner + operasional dealer | Validasi final transisi ke SPK. | M |
| 6 | Berapa lama data pelanggan dan audit disimpan? | Product Owner + legal/operasional | Kebijakan retensi, archive, dan penghapusan. | S |

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
