# Eksplorasi Arah Struktur

Dokumen ini mencatat eksplorasi struktur sebelum satu arah dipilih. Semua kandidat memakai kebutuhan, data fiktif, dan viewport yang sama. PRD dan ADR tetap menjadi sumber keputusan kanonik.

## Tujuh arah yang dibumikan pada pekerjaan AINA SMS

Urutan berikut menilai kecocokan terhadap pekerjaan operasional dealer, keterbacaan dalam sesi panjang, dan kecepatan penggunaan di lapangan.

1. **Operational Sidebar** — navigasi eksplisit, daftar padat, dan detail kontekstual. Paling kuat untuk perbedaan hak akses empat role dan pekerjaan desktop berkapasitas tinggi.
2. **Customer Hub** — daftar pelanggan menjadi pusat; transaksi, follow-up, dan riwayat mengikuti pelanggan terpilih. Kuat untuk kesinambungan relasi pelanggan.
3. **Stage Lanes** — pekerjaan dikelompokkan per tahap transaksi. Baik untuk pipeline, tetapi kurang baik untuk pelanggan dengan beberapa transaksi paralel.
4. **Coaching Desk** — percakapan dan tindak lanjut menjadi pusat kerja Supervisor. Baik untuk pembinaan, tetapi terlalu sempit sebagai shell lintas role.
5. **Customer Thread** — aktivitas kronologis menjadi struktur utama. Baik untuk konteks, tetapi pencarian dan perbandingan volume besar lebih lambat.
6. **Operational Ledger** — tabel ringkas dan status sebagai bahasa utama. Sangat efisien, tetapi kurang bersahabat untuk Sales yang dominan mobile.
7. **Today-First Workspace** — antrean tindakan hari ini menjadi halaman awal. Sangat kuat untuk Sales lapangan dan menjadi arah pembanding utama terhadap struktur berbasis entitas.

## Enam thumbnail eksplorasi

Enam kandidat visual-struktural disusun dari tiga sumber logika. Thumbnail ada di [`design-demos/thumbs.html`](design-demos/thumbs.html).

| Sumber | Kandidat | Yang diuji | Keputusan |
|---|---|---|---|
| Praktik sistem informasi | Operational Sidebar | Sidebar tetap, lembar kerja putih, dan kepadatan daftar | Dikembangkan penuh |
| Praktik desain fungsional | Today-First Workspace | Urutan waktu, tindakan berikutnya, dan mobile sebagai pusat | Dikembangkan penuh |
| Referensi produk | Customer Hub | Daftar-detail tiga wilayah dan konteks pelanggan | Dikembangkan penuh |
| Referensi produk | Coaching Desk | Inbox pembinaan dan detail transaksi berdampingan | Disimpan sebagai pola layar turunan |
| Eksperimen roulette | Liquid Layers | Kedalaman lapisan dan fokus modal | Ditolak: efek kaca tidak sesuai baseline neutral dan mengurangi kejelasan |
| Eksperimen roulette | Block-Print Sections | Blok bagian yang tegas dan ritme kolom | Ditolak sebagai shell; ritme bagian dipinjam untuk pengelompokan |

Referensi produk yang diperiksa adalah pola navigasi workspace dan record list pada [Attio](https://attio.com/help/reference/attio-101/introduction-to-navigating-attio), serta pola inbox tiga wilayah pada [Intercom](https://www.intercom.com/helpdesk/inbox). Referensi digunakan sebagai bukti pola interaksi, bukan untuk menyalin identitas visual.

## Uji penantang konsep

Konsep acak digunakan untuk memaksa perbandingan, bukan sebagai tema dekoratif.

| Penantang | Putusan | Donasi yang dipertahankan |
|---|---|---|
| Katalog doujin | Ditolak; kode visualnya terlalu editorial untuk pekerjaan operasional | Sel penuh yang tetap terbaca ketika dipadatkan |
| Peta orientasi | Kompetitif untuk menunjukkan kemajuan, tetapi medan visual terlalu ramai | Satu “leg aktif” yang menandai langkah berikutnya |
| Ubin metro tipografis | Kompetitif di mobile, tetapi terlalu keras untuk sesi panjang | Ubin hanya untuk tindakan nyata, bukan dekorasi |
| Peta kebun binatang | Ditolak; bentuk organik mengganggu pemindaian daftar | Konsistensi geometri antara struktur dan state |
| Folio botani | Ditolak; urutan halaman membantu riwayat tetapi metaforanya terlalu kuat | Skala elemen yang stabil sepanjang tahapan |
| Papan split-flap | Kompetitif untuk pemindaian antrean, tetapi estetika gelap tidak tepat | Kolom stabil, perubahan status jelas, dan prioritas mudah dipindai |

## Tiga arah yang dikembangkan

### 1. Operational Sidebar

- **Logika:** role dan entitas selalu terlihat; isi utama berubah tanpa kehilangan orientasi.
- **Home Sales:** ringkasan target, daftar tindak lanjut, dan peringatan transaksi.
- **Buku pelanggan:** tabel desktop berubah menjadi kartu mobile.
- **Detail transaksi:** dialog besar desktop dan sheet layar penuh mobile.
- **Kekuatan:** paling mudah dipelajari lintas role; cocok untuk volume tinggi.
- **Risiko:** mobile harus disiplin agar sidebar tidak berubah menjadi menu panjang.
- **Bentuk:** sidebar persisten + lembar kerja berbingkai.

### 2. Today-First Workspace

- **Logika:** “apa yang harus dilakukan berikutnya” mendahului struktur data.
- **Home Sales:** antrean Sekarang, Hari Ini, dan Nanti dengan quick action.
- **Buku pelanggan:** urutan berdasarkan kebutuhan tindak lanjut, bukan alfabet semata.
- **Detail transaksi:** langkah aktif dan next action menonjol.
- **Kekuatan:** paling dekat dengan ritme Sales lapangan.
- **Risiko:** pengguna administratif memerlukan jalur eksplisit menuju entitas dan laporan.
- **Bentuk:** open plane + action rail. Meminjam kolom stabil papan split-flap, “leg aktif” peta orientasi, dan disiplin ubin aksi metro.

### 3. Customer Hub

- **Logika:** pelanggan adalah jangkar; transaksi dan aktivitas dibuka di konteks yang sama.
- **Home Sales:** pelanggan prioritas dan ringkasan hubungan.
- **Buku pelanggan:** daftar dan profil berdampingan di desktop.
- **Detail transaksi:** transaksi aktif dibuka dari profil pelanggan.
- **Kekuatan:** mengurangi perpindahan konteks dan cocok untuk satu pelanggan dengan banyak transaksi.
- **Risiko:** layar sempit harus menampilkan satu wilayah per waktu dengan tombol kembali yang jelas.
- **Bentuk:** tiga wilayah pada desktop, satu wilayah per langkah pada mobile.

## Kriteria pemilihan

Pilih berdasarkan struktur yang paling cepat menjawab tiga pertanyaan:

1. Siapa yang perlu ditindaklanjuti sekarang?
2. Apa kondisi transaksi ini dan langkah berikutnya?
3. Di mana pengguna berada, dan bagaimana kembali tanpa kehilangan filter atau posisi daftar?

Setelah pilihan atau kombinasi disetujui, keputusan dicatat di `direction-approved.md`. Baru setelah itu prototipe diperluas ke seluruh layar dan state yang direncanakan.
