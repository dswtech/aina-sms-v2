# Desain: Modal Detail Transaksi Dua Panel

| Item | Keterangan |
|---|---|
| Tanggal | 9 November 2026 |
| Status | Menunggu persetujuan |
| Ukuran | Perubahan menengah: satu endpoint backend, satu modal frontend, tes |

## Tujuan dan alasan

Modal detail transaksi sekarang sempit, datar, dan tidak rapi. Supervisor tidak melihat Sales/Supervisor penanggung jawab atau lama transaksi di tahap sekarang. Timeline hanya memuat 20 entri terlama sehingga kejadian terbaru tidak terlihat. Komentar coaching ada di halaman lain (`/transactions/{id}/coaching`), jadi supervisor harus pindah halaman setelah membaca kondisi transaksi.

Tujuannya: supervisor membuka modal, paham kondisi transaksi, menelusuri pergerakan tahapnya, dan memberi coaching tanpa meninggalkan modal. Referensi bentuk: modal task ClickUp. Mockup yang disetujui pengguna: versi 4 pada sesi brainstorming 9 November 2026.

## Non-tujuan

- Mengubah halaman `/transactions/{id}/coaching`.
- Menjadikan detail sebagai route sendiri yang bisa dibagikan lewat link.
- Mengedit Sumber, Estimasi nilai, Estimasi closing, Telepon, atau Media sosial. Backend sekarang hanya mengizinkan ubah area, pembiayaan, dan keterangan.
- Tampilan gabungan tahap dan aktivitas berurut waktu (ikon "Semua" di rail). Belum diputuskan pengguna; dapat ditambah kemudian tanpa mengubah desain ini.

## Anti-tujuan

- Komentar atau tahap terpotong tanpa tanda.
- Modal tidak bisa dipakai di layar kecil.
- Tampilan properti yang ramai: tanpa garis kotak, judul huruf kapital, atau tombol "Ubah".

## Tata letak

### Header
Pelanggan dan kendaraan sebagai judul, lalu badge tahap, Sales, Supervisor, dan lama di tahap (berwarna peringatan). Tombol tutup di kanan.

### Panel kiri (fokus utama, di-scroll sendiri)
1. **Properti** bergaya ClickUp: baris ikon + label di kiri, nilai di kanan, tanpa judul grup. Memakai grid `auto-fit` (minimal sekitar 270px per kolom), jadi menjadi dua kolom bila panel kiri cukup lebar dan satu kolom bila sempit. Urutan: Area, Pembiayaan, Sumber, Estimasi nilai, Estimasi closing, Telepon, Media sosial.
2. **Keterangan**: teks langsung di bawah pemisah tipis, tanpa label, placeholder "Tambah keterangan…".
3. **Pergerakan tahap**: timeline vertikal berisi semua perpindahan tahap, terbaru di atas.

### Panel kanan (sempit secara bawaan)
- Lebar awal sekitar sepertiga modal. Pemisah antara kiri dan kanan bisa digeser dengan mouse dan keyboard (panah kiri/kanan), dengan batas minimum untuk kedua panel.
- Dapat dilipat lewat tombol `»` di atas rail. Saat terlipat, rail tetap terlihat; menekan ikon mode membukanya lagi.
- Mode dipilih lewat rail ikon vertikal di tepi kanan modal:
  - **Komentar** (bawaan): komentar coaching tampil seperti percakapan, terlama ke terbaru, dengan kolom tulis di bawah dan "muat sebelumnya" untuk yang lama. Tiap komentar menampilkan tahap saat dikirim.
  - **Aktivitas**: aktivitas pelanggan (telepon, WhatsApp, kunjungan, meeting, catatan), hanya baca, tanpa kolom tulis.
- Ikon rail memakai label aksesibel dan `aria-pressed`. Mode aktif ditandai dengan latar abu-abu.

### Tampilan properti
- Nilai yang bisa diedit tampil seperti teks biasa, lalu berlatar abu-abu saat di-hover untuk menandai bisa diklik. Nilai hanya baca tidak berubah saat di-hover.
- Pada akun tanpa izin ubah (`can_edit_metadata` salah), tidak ada nilai yang bisa diklik dan tidak ada perubahan saat hover.

### Layar kecil
Satu kolom, dipilih lewat rail ikon di tepi kanan dengan tiga pilihan: Detail (panel kiri), Komentar, dan Aktivitas. Tombol lipat dan pemisah tidak ada.

## Pengeditan di tempat

Tanpa tombol "Ubah" dan tanpa bar Simpan. Setiap perubahan tersimpan sendiri.

- **Area**: klik membuka popover dengan kolom cari. Langkah 1 memilih Wilayah, langkah 2 memilih Kecamatan di wilayah itu (ada tombol kembali). Tersimpan saat Kecamatan dipilih; wilayah saja tidak pernah disimpan.
- **Pembiayaan**: popover dengan kolom cari. Pilih Cash (langsung tersimpan) atau Kredit lalu pilih Leasing (tersimpan saat Leasing dipilih).
- **Keterangan**: langsung diedit di teks, tersimpan saat fokus keluar bila isinya berubah. Tinggi menyesuaikan isi.
- Setelah tersimpan muncul tanda "Tersimpan" singkat. Popover menutup dengan Escape atau klik di luar.
- Di layar kecil popover boleh tampil sebagai lembar bawah (bottom sheet); bentuk persisnya diserahkan kepada pembangun.

## Pendekatan

- **A. Pakai ulang `history` lalu pisah di klien.** Terpotong 20 entri dan terlama dulu, jadi tahap atau komentar bisa hilang. Ditolak.
- **B. `show()` mengirim daftar terpisah (dipilih).** Timeline tahap lengkap, komentar dan aktivitas masing-masing berpaginasi sendiri. Memakai ulang `TransactionTimeline` dengan filter jenis.
- **C. Route sendiri untuk detail.** Perubahan routing dan tes terlalu besar untuk kebutuhan ini. Ditunda.

## Data yang harus disediakan backend

Dari `TransactionController::show` (atau endpoint terkait):
- Header: nama pelanggan, kendaraan, tahap (label), Sales, daftar Supervisor, lama di tahap.
- Properti: telepon, media sosial, sumber (dan kanal), area, pembiayaan, estimasi nilai, estimasi closing, keterangan, `can_edit_metadata`.
- Semua perpindahan tahap (tanpa paginasi; jumlahnya kecil), terbaru di atas.
- Komentar berpaginasi dengan `can_comment`; aktivitas berpaginasi dan dimuat saat mode Aktivitas pertama dibuka.

## Keputusan yang saya ambil sendiri (koreksi bila perlu)

- Peran dan izin tidak berubah: Branch Manager tetap tanpa riwayat, mode baca tanpa kolom tulis bila `can_comment` salah, revisi komentar tetap hanya untuk Admin.
- Kirim, balas, dan edit komentar memakai endpoint yang sudah ada, lalu modal memuat ulang daftar komentar.
- Lama di tahap dihitung dari perpindahan tahap terakhir dalam hari kalender Jakarta, sama dengan aturan stagnan yang sudah ada.
- Modal selalu dibuka di mode Komentar; mode terakhir dan lebar panel tidak diingat.
- Aktivitas diurutkan terlama ke terbaru seperti komentar.
- Setiap penyimpanan hanya mengirim bagian yang berubah (area, pembiayaan, atau keterangan) ke endpoint PATCH yang sudah ada. Server menggabungnya dengan nilai lama dan tetap memvalidasi pasangan wilayah–kecamatan dan tipe–leasing. Ini sama dengan perilaku form edit sekarang, yang juga tidak memvalidasi ulang leasing lama yang sudah nonaktif.
- "Kota Lain" (nama kota bebas) dan "Kredit Lain" (nama leasing bebas) tetap bisa dipilih seperti di form sekarang: pilihan itu membuka langkah berikutnya berupa kolom teks dengan tombol Simpan.
- Opsi "Belum diisi" (Area) dan "Belum ditentukan" (Pembiayaan) tetap ada sebagai cara mengosongkan nilai.
- Timeline tahap memuat paling banyak 100 perpindahan (jauh di atas jumlah wajar satu transaksi).
- Halaman komentar dan aktivitas berikutnya diambil lewat endpoint baru `GET /transactions/{id}/feed?kind=comments|activities&page=N`.
- Rail tidak memakai lencana jumlah.

## Diserahkan kepada pembangun

Bentuk respons JSON persisnya, penamaan komponen, memecah `index.tsx` menjadi komponen modal sendiri, komponen popover pilihan (kolom cari, dua langkah), bentuk popover di layar kecil, penanganan galat simpan (nilai kembali ke semula dan pesan galat), pembaruan tes browser di `tests/Browser`, dan pendaftaran dokumen ini di manifest.
