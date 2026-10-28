# Knowledge — Domain Sales Dealer

| Item | Keterangan |
|---|---|
| Dokumen | Glosarium dan katalog domain |
| Versi | v1.0 |
| Tanggal | 28 Oktober 2026 |
| Audiens | Agent, product, engineering, dan QA |
| Status | Berlaku |
| Sumber kanonik kebutuhan | [`PRD.md`](PRD.md) |

Dokumen ini menjelaskan bahasa bersama. Aturan produk tetap berada di PRD.

## Peran

| Istilah | Arti |
|---|---|
| Admin | Pengelola akun, struktur dealer, role, tim, dan penempatan pengguna. |
| Branch Manager | Pimpinan cabang yang membaca kinerja, forecast, dan laporan lintas tim tanpa mengubah transaksi. |
| Supervisor | Pemimpin satu atau lebih tim sales yang mengatur target, pembagian lead, monitoring, dan coaching. |
| Sales | Anggota tim yang mencatat dan memperbarui lead/transaksi miliknya. |

Hierarki kewenangan: `Admin → Branch Manager → Supervisor → Sales`.

## Istilah penjualan

| Istilah | Arti |
|---|---|
| Lead | Calon pelanggan yang baru tercatat dan belum cukup terverifikasi untuk dinilai peluangnya. |
| Prospect | Lead yang sudah dihubungi dan sedang melalui follow-up awal. |
| Hot Prospect | Prospect dengan minat dan langkah berikutnya yang konkret, misalnya test drive atau pembahasan pembelian. |
| SPK | Surat Pemesanan Kendaraan; komitmen pemesanan yang memenuhi bukti dan ketentuan dealer. |
| DO | Tahap operasional setelah pemesanan siap diproses menuju penyerahan kendaraan. |
| Delivery | Kendaraan sudah diserahkan dan transaksi dinyatakan selesai. |
| Lost | Peluang penjualan berakhir tanpa transaksi dan wajib memiliki alasan yang dapat dievaluasi. |
| Stagnant lead | Lead yang tidak memiliki aktivitas dalam ambang waktu yang ditetapkan produk. |
| Pipeline | Urutan tahap yang menunjukkan perjalanan calon pelanggan menuju penjualan atau lost. |

## Customer dan Buku Pelanggan

| Istilah | Arti |
|---|---|
| Customer | Identitas orang atau badan yang dapat mempunyai nol, satu, atau beberapa transaksi sepanjang hubungannya dengan dealer. |
| Transaksi | Satu peluang penjualan untuk Customer tertentu; bukan salinan identitas Customer. |
| Buku Pelanggan Saya | Phonebook kerja berisi Customer yang sedang ditugaskan kepada Sales, dilengkapi konteks hubungan dan tindak lanjut. |
| Customer assignment | Penugasan pengelolaan Customer kepada Sales. Data tetap milik dealer dan riwayat penugasan tidak dihapus saat berpindah. |
| Kontak terakhir | Aktivitas komunikasi terakhir yang tercatat dan dapat dilihat pengguna sesuai kewenangannya. |
| Next follow-up | Waktu dan rencana tindakan berikutnya untuk Customer atau transaksi. |
| Contact preference | Pilihan kanal yang diizinkan atau ditolak Customer, termasuk opt-out. |
| Repeat order | Peluang transaksi baru dari Customer yang pernah membeli. |
| Referral | Calon pelanggan baru yang diperkenalkan oleh Customer lain; identitas kedua pihak tetap dicatat terpisah. |

Buku Pelanggan bukan sinkronisasi kontak pribadi. Nomor pelanggan tidak diekspor massal atau disalin otomatis ke phonebook perangkat pada MVP.

## Target dan forecasting

| Istilah | Arti |
|---|---|
| Target | Jumlah penjualan yang ingin dicapai pada periode tertentu. |
| Realisasi | Penjualan yang sudah benar-benar tercapai. |
| Forecast | Perkiraan hasil akhir berdasarkan transaksi aktif dan peluang tahapnya. |
| Weighted pipeline | Cara menghitung forecast dengan mengalikan setiap transaksi dengan bobot peluang tahapnya. |
| Gap | Selisih antara target dan forecast atau realisasi. |
| Conversion rate | Persentase lead yang berpindah menjadi SPK atau delivery sesuai ukuran yang dipilih. |

Bobot forecast belum ditetapkan. Nilai final harus diputuskan Product Owner bersama pihak operasional dealer dan kemudian dicatat di PRD.

## Conversation dan coaching

| Istilah | Arti |
|---|---|
| Conversation timeline | Urutan komentar dan aktivitas sistem di dalam satu transaksi. |
| Coaching comment | Arahan Supervisor kepada Sales yang terkait dengan transaksi tertentu. |
| System event | Catatan otomatis, misalnya perubahan tahap atau penugasan Sales. |
| Comment revision | Versi sebelumnya dari komentar yang diedit dalam jendela koreksi. |
| In-app notification | Pemberitahuan di dalam aplikasi yang mempunyai status belum dibaca atau sudah dibaca. |

Conversation coaching hanya dibaca oleh Sales terkait, Supervisor terkait, dan Admin untuk audit. Branch Manager tidak membaca isi coaching.

## Analisis penjualan

| Istilah | Arti |
|---|---|
| Analisis Sumber | Perbandingan jumlah, porsi, dan perjalanan transaksi berdasarkan asal lead. |
| Analisis Model | Perbandingan hasil pipeline berdasarkan model kendaraan. |
| Mode Akuisisi | Filter berdasarkan tanggal lead dibuat; cocok untuk membaca conversion satu kelompok lead. |
| Mode Pencapaian | Filter berdasarkan tanggal kejadian tahap; cocok untuk membaca jumlah event pada periode, bukan conversion antar-kohort. |
| Porsi | Persentase kontribusi suatu kategori terhadap total pada filter yang sama. |
| Drilldown | Daftar transaksi sumber yang membentuk satu angka analisis. |
| Area | Dimensi lokasi Customer yang memerlukan data lokasi terstruktur sebelum dianalisis. |
| MSCP | Market Share Credit Portion; analisis porsi pembiayaan yang baru tersedia setelah modul leasing mempunyai data yang sah. |

## Prinsip akses data

- Hak akses ditentukan server berdasarkan user yang login dan relasinya terhadap dealer, tim, serta transaksi.
- Client tidak menentukan sendiri dealer, tim, atau cakupan data yang boleh dibaca.
- Admin memiliki cakupan administrasi dealer, bukan hak untuk melihat password pengguna.
- Branch Manager membaca hasil dan laporan lintas tim, tetapi tidak mengubah lead atau conversation.
- Supervisor bekerja hanya pada tim yang ditugaskan.
- Sales bekerja hanya pada lead/transaksi miliknya atau yang resmi ditugaskan kepadanya.
