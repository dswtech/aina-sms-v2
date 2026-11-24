# Riwayat Pencapaian Target dan Pengingat Target — Desain

Tanggal: 24 November 2026

## Maksud dan alasan

Supervisor (SPV) dan Branch Manager (BM) perlu **mengevaluasi kinerja** dan **menyusun target bulan depan**. Untuk itu mereka harus bisa melihat target vs realisasi beberapa bulan sekaligus. Saat ini target sudah tersimpan per bulan beserta revisinya (`team_targets`, `team_target_allocations`, `sales_targets`, dan tabel `*_revisions`), tetapi laporannya hanya menampilkan satu periode (`TeamPerformance::build($actor, $period)`).

Selain itu, target yang lupa diisi membuat dashboard menampilkan "belum diisi" tanpa persen pencapaian dan tanpa pace. Pemilik menginginkan pengingat yang **tidak mengganggu operasional**.

Catatan yang sudah diverifikasi: target yang diisi terlambat **tidak** mengubah hasil bulan itu. Realisasi dihitung dari riwayat stage DO dalam periode, dan target dicari berdasarkan `period`, bukan tanggal pengisian.

## Tujuan

1. Halaman **Laporan Pencapaian Target** untuk beberapa bulan:
   - SPV: per Sales di timnya, ditambah total tim.
   - BM: per tim, ditambah total dealer, dengan rincian per Sales jika satu tim dibuka.
2. **Popup pengingat** untuk SPV (timnya sendiri), muncul jika:
   - target tim bulan berjalan belum diisi, atau
   - target tim sudah ada tetapi ada Sales aktif di tim itu yang belum menerima alokasi.

## Non-goal

- Tidak ada tabel atau snapshot baru untuk "history". Data per bulan yang ada sekarang sudah menjadi riwayatnya.
- Laporan tidak dibuat untuk Sales dan Admin.
- Branch Manager dan Admin tidak menerima popup. BM melihat penanda "belum diisi" per tim di laporan; Admin tetap melihat jumlahnya di Beranda. Admin tidak punya layar pengisian target (keputusan pemilik, 24 November 2026).
- Tidak ada pengingat lewat email, WA, atau push.
- Tidak ada pengecualian libur nasional (lihat Keputusan Terbuka 7).

## Anti-goal (gagal walaupun "jalan")

- Popup menutupi halaman, menghalangi klik, atau muncul berulang dalam satu hari di perangkat yang sama.
- Pengecekan pengingat membuat setiap halaman terasa lambat.
- Angka di laporan berbeda dari angka di halaman Target atau Kinerja Tim untuk bulan yang sama.
- Laporan membocorkan angka target management, gap, persentase, atau markup kepada role yang dilarang oleh ORG-06.
- Bulan tanpa target ditampilkan sebagai 0%.

## Batasan

- ORG-06 (batas akses angka target management) dan FCT-04 (agregasi tim mengikuti tim pada transaksi, alokasi mengikuti tim dan periode rencana) tetap berlaku.
- Zona waktu Asia/Jakarta untuk menentukan "bulan berjalan" dan "hari ini".
- Target sentuh minimal 44px dan elemen punya nama aksesibel (UIX-05).
- Selector browser test di `tests/Browser` ikut diperbarui jika UI berubah.

## Pendekatan yang dipertimbangkan (cara popup mengingat "sudah ditutup hari ini")

| | Cara | Kelebihan | Kekurangan |
|---|---|---|---|
| **A (dipilih)** | Server mengirim status pengingat sebagai shared prop. Penutupan dicatat di `localStorage` per tanggal. | Kecil, tanpa tabel baru. Pola yang sama sudah dipakai untuk tema dan ukuran font. | Di perangkat atau browser lain popup muncul sekali lagi. |
| B | Penutupan disimpan di database per user per hari. | Konsisten di semua perangkat. | Butuh tabel dan endpoint baru, hanya demi popup sekali sehari. |
| C | Masuk ke menu notifikasi yang sudah ada. | Paling tidak mengganggu. | Mudah terlewat, padahal pemilik meminta popup. |

Pemilik memilih **A**.

Untuk laporan hanya ada satu cara yang masuk akal: satu service yang menghitung N bulan sekaligus dengan aturan realisasi yang sama seperti `TeamPerformance`. `build()` tidak dipanggil berulang per bulan, karena itu berarti N kali seluruh query dan halaman menjadi lambat.

## Desain yang sudah diputuskan

### Laporan Pencapaian Target

- Route `GET analytics/target-history` dengan middleware `role:supervisor,branch_manager`. Tautannya ada di menu Analisis kedua role tersebut, tidak di menu Admin.
- Rentang default: **6 bulan terakhir, termasuk bulan berjalan**. Rentang bisa diubah dengan komponen `MonthRangeFields` yang sudah ada.
- Setiap sel bulan berisi target unit, realisasi unit, dan % pencapaian. Bulan berjalan diberi label "berjalan".
- Kolom tambahan **rata-rata % 3 bulan penuh terakhir**, tanpa bulan berjalan. Bulan tanpa target tidak ikut dihitung.
- Target belum diisi tampil sebagai "belum diisi", tidak sama dengan nol.
- Cakupan data:
  - SPV: tim yang ia pegang. Baris per Sales mengikuti alokasi tersimpan pada tim dan periode itu. Sales yang sudah keluar tetap tampil di bulan historisnya.
  - BM: semua tim dalam dealer, termasuk tim nonaktif untuk bulan yang punya target. Ada baris total dealer dan baris terpisah untuk transaksi tanpa tim (FCT-04).
- Target tim memakai target management sebagai acuan utama dan benchmark ditampilkan berdampingan, sama seperti laporan satu periode. Baris per Sales memakai alokasi personal.

### Pengingat target

- Shared prop baru di `HandleInertiaRequests::share()`, misalnya `targetReminder`. Prop ini hanya dihitung untuk SPV dan bernilai `null` untuk role lain, juga saat Admin memakai "login sebagai" (ADR 011, hanya baca).
- Isi prop: daftar tim aktif yang bermasalah pada bulan berjalan, masing-masing dengan alasan `missing_target` atau `unallocated_sales` (beserta jumlah Sales yang belum dialokasikan).
  - Tim yang dihitung: tim aktif yang sedang ia pegang sebagai Supervisor.
- Pengecekan cukup beberapa query kecil (`team_targets` periode berjalan dan anggota aktif dibandingkan `team_target_allocations`), tanpa memanggil `TeamPerformance`.
- UI berupa kartu kecil non-modal: di pojok kanan bawah pada layar lebar, dan di dalam alur halaman (tidak menimpa konten) pada layar HP. Bisa ditutup dengan tombol berlabel aksesibel. Tombol "Isi target" menuju `targets.plans`. Kartu tidak tampil di halaman itu.
- Saat ditutup, `localStorage` menyimpan tanggal hari ini (Asia/Jakarta, dikirim server) per pengguna. Popup tidak muncul lagi di hari yang sama. Akses `localStorage` dibungkus `try/catch`; jika gagal, popup tetap bisa ditutup untuk sesi itu.
- Popup hilang sendiri begitu masalahnya selesai, karena prop berikutnya bernilai kosong.

### Keputusan setelah review (direvisi 24 November 2026 setelah dicek ke kode)

1. **Acuan angka.** Total tim, total dealer, dan transaksi tanpa tim harus identik dengan `TeamPerformance::build($actor, bulan)` untuk setiap bulan. `build()` tidak menyimpan tim asal per Sales untuk bulan lampau, jadi baris Sales didefinisikan per **(tim, Sales, bulan)**: target dari alokasi pada rencana tim itu, realisasi dari transaksi dengan `team_id` tim itu. Untuk SPV, jumlah baris seorang Sales di semua timnya harus sama dengan baris Sales itu di `build()`.
2. **Total dealer saat ada tim tanpa target:** "belum diisi" dengan keterangan "x dari y tim terisi". Tim **tidak** dihitung kurang untuk bulan sebelum ia dibuat (keputusan pemilik). Aturan ini diubah di `TeamPerformance`, sehingga dashboard bulan lampau ikut berubah.
3. **Target legacy** (`version = 0`): target tim dianggap terisi. Sales dianggap sudah dibagi hanya jika punya `sales_targets` di bulan itu. Tim yang hanya punya `sales_targets` tanpa target tim tetap `missing_target`. Ini aturan yang sama dengan `teamTargetsMissing` dan `sales_targets_missing` di dashboard. Versi awal keputusan ini (legacy tidak pernah memicu pengingat) dibatalkan: ia bertentangan dengan permintaan pemilik agar target yang belum dibagi ikut diingatkan.
4. **Cakupan SPV per tim:** seluruh riwayat tim aktif yang **sedang** ia pegang (`Team::visibleTo`, sudah dicek), termasuk bulan sebelum ia memegangnya.
5. **Rata-rata** dihitung sebagai total realisasi ÷ total target, dari tiga bulan selesai terakhir di dalam rentang yang dipilih, hanya bulan yang targetnya terisi. Dihitung terpisah untuk target management dan benchmark.

## Diserahkan ke builder

- Nama route, komponen, dan service. Letak item navigasi.
- Struktur query service multi-bulan, asalkan memenuhi acuan angka di atas. Wajib ada test rekonsiliasi.
- Tampilan detail tabel di layar HP (scroll horizontal atau kartu).
- Pembaruan PRD: requirement baru untuk laporan multi-bulan dan pengingat, di bagian yang sesuai (DSH atau ORG). Catatan di `docs/agents/memory.md`.
