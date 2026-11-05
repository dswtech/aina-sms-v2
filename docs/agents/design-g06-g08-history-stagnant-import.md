# Rancangan G06–G08

Tanggal: 5 November 2026. Status: disetujui pengguna pada 5 November 2026.

## Tujuan dan sumber keputusan

Menutup gap teknis G06–G08 dalam satu branch dan satu PR. Requirement tetap hanya di [PRD](PRD.md), terutama bagian Customer, Pipeline, Conversation, Import dan UX. [Matriks UAT](uat-matrix.md#g06) menjadi daftar gap dan bukti; rancangan ini tidak menyatakan UAT sudah lulus. Arsitektur mengikuti ADR-001 sampai ADR-003.

## Pendekatan

Pengguna memilih satu PR dibanding tiga PR terpisah. Implementasi dilakukan berurutan G06, G07, G08 dengan test terarah pada setiap bagian, lalu verifikasi gabungan. Memakai Laravel/Inertia, policy, model, dan komponen yang tersedia. Tidak membangun event store baru atau menyalin histori ke tabel tambahan karena sumber kejadian sudah tersedia. Tidak memerlukan dependency baru atau migration berdasarkan inspeksi awal.

## G06: riwayat pelanggan dan transaksi

- Daftar pelanggan tetap ringkas. Detail pelanggan memuat daftar seluruh transaksi yang boleh dibaca pengguna, termasuk transaksi closed, dan riwayat aktivitas hubungan secara bertahap melalui pagination, bukan pemotongan diam-diam pada sepuluh item.
- Default transaksi tetap transaksi aktif terbaru, atau closed terbaru jika tidak ada yang aktif. Pengguna dapat memilih transaksi lama; setiap aksi tahap atau komentar harus menunjuk transaksi terpilih dan diperiksa ulang oleh server. Menutup detail mempertahankan filter, pagination dan posisi daftar pelanggan.
- Riwayat hubungan menampilkan aktivitas Customer yang tidak terkait transaksi serta aktivitas terkait transaksi yang masih boleh dibaca. Riwayat transaksi menggabungkan perubahan tahap, aktivitas terkait dan komentar/reply menurut waktu kejadian secara menaik, dengan pemecah seri stabil berdasarkan jenis dan ID. Reply tetap muncul pada waktu kirimnya dengan konteks komentar induk, bukan memindahkan urutan kejadian.
- Histori tahap tidak digandakan jika aktivitas sistem hanya merupakan representasi dari kejadian tahap yang sama. Implementer harus memeriksa provenance yang tersimpan; jangan menggabungkan dua kejadian berbeda hanya karena teks atau waktunya serupa.
- Halaman coaching melalui tautan notifikasi memakai kontrak timeline yang sama. Akses transaksi tanpa akses Customer tidak boleh membuka identitas atau aktivitas hubungan Customer.
- Admin dapat membuka revisi komentar: isi sebelumnya, pelaku edit, dan waktu edit. Revisi tampil sebagai inspeksi audit di komentar terkait, bukan event chat baru. Payload revisi hanya dimuat untuk Admin yang berhak membaca transaksi. Sales/Supervisor tidak menerima isi revisi. Admin tetap tidak dapat menulis atau mengedit komentar.
- Setiap jalur baca memeriksa dealer, role, status aktif dan cakupan transaksi. Branch Manager tidak menerima coaching, revisi atau kontak. Reassignment tidak membuka histori transaksi yang berada di luar akses terkini. Pagination tidak boleh melewati pemeriksaan ini.
- Tidak mengubah kontrak notifikasi, batas edit lima menit, penugasan atau mekanisme penyimpanan histori yang sudah ada.

## G07: stagnan seragam

Usulan interpretasi hari kalender PRD: ambil tanggal aktivitas terakhir dalam Asia/Jakarta, fallback ke created_at bila null. Transaksi aktif stagnan jika selisih tanggal dari hari ini lebih dari tiga. Pada 5 November: tanggal 2 November belum stagnan, tanggal 1 November stagnan. Cutoff query adalah awal tanggal 2 November Jakarta, dibandingkan secara ketat `<` setelah dikonversi ke zona penyimpanan. Tepat cutoff tidak stagnan. Delivery dan Lost selalu tidak stagnan.

Accessor dan query memakai cutoff serta fallback yang sama. Terapkan pada daftar/count/filter Customer, Transaksi, dashboard dan prioritas tim atau pemakai lain yang ditemukan. Aktivitas baru menghapus indikator melalui timestamp yang sudah diperbarui oleh alur aktivitas. Tidak melakukan backfill timestamp atau write database bisnis.

## G08: impor mobile

Pada mobile, preview menjadi daftar/kartu berlabel yang memuat seluruh informasi tabel: nomor baris, nama, telepon, model, Sales, status valid/ditolak dan semua pesan error. Riwayat batch menjadi daftar/kartu dengan nama file, status, total, diterima, ditolak, pelaku dan waktu. Nilai panjang membungkus tanpa scroll horizontal. Desktop tetap tabel, tablet mengikuti breakpoint pola aplikasi yang tersedia.

Gunakan token warna, striped rows, komponen dan aturan fokus/target sentuh yang sudah ada di DESIGN.md. Tombol preview/import, status disabled, loading, error dan empty tetap berfungsi. Tidak mengubah parser, preview/commit server, scope atau kebijakan duplikat. Browser QA menggunakan fixture sintetis dan intercept write.

## Verifikasi dan kriteria selesai

- Test gagal lebih dahulu untuk riwayat dua transaksi, lebih dari sepuluh aktivitas, urutan campuran dan timestamp sama, reply, audit revisi beserta pelaku/waktu, pagination serta larangan akses setelah reassignment/lintas tim/dealer/role.
- Test stagnan mencakup null fallback, tepat cutoff, sebelum/sesudah cutoff, perbedaan tanggal UTC/Jakarta, closed, dan kesamaan accessor/filter/count/dashboard.
- Test browser impor mencakup preview valid/tidak valid, seluruh field/error, filename panjang, empty/error/loading, tombol disabled serta 390/768/1440 dan dua tema. Timeline/pemilih transaksi/audit diuji keyboard dan responsif dengan data sintetis.
- Jalankan suite otomatis lengkap yang tersedia, static analysis, frontend checks, production build dan regresi browser relevan. Catat kegagalan dan batas bukti. Jangan commit jika test gagal.
- Perbarui matriks UAT serta memory hanya berdasarkan hasil aktual, sertakan link dokumen dan batas UAT manusia/PostgreSQL/performa yang belum dijalankan. Kirim satu PR dengan Conventional Commits setelah verifikasi.

## Pilihan implementer dan batas

Implementer menentukan pemecahan komponen/presenter kecil yang dapat dipakai bersama, route baca terotorisasi, ukuran halaman histori dan breakpoint dengan mengikuti pola source saat ini. Tidak menambah fitur ekspor, retention, pencarian histori, atau redesign keseluruhan. Jika kebutuhan schema/dependency ternyata muncul, laporkan sebelum memperluas pekerjaan. Tidak membaca .env atau menjalankan migration/seeder/database write non-test. Database test in-memory terisolasi sudah dikonfigurasi; PostgreSQL tidak diklaim terverifikasi tanpa run aktual.
