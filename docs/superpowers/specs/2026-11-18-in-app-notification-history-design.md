# Riwayat Notifikasi In-App (3 Hari) — Desain

Status: menunggu persetujuan pengguna, 18 November 2026.

## Maksud

Supervisor dan Sales perlu satu tempat untuk melihat apa yang terjadi pada transaksi mereka dalam 3 hari terakhir, termasuk yang sudah dibaca. Sekarang lonceng hanya menampilkan 10 notifikasi coaching yang belum dibaca, dan halaman `/notifications` masih placeholder ([module-status.tsx](../../../resources/js/pages/module-status.tsx)).

## Yang dibutuhkan

| Jenis | Supervisor | Sales |
|---|---|---|
| Perubahan tahap transaksi milik Sales di timnya | ya | tidak |
| Komentar coaching | balasan dari Sales | komentar dari Supervisor |
| Transaksi menjadi stagnan | satu ringkasan harian berisi jumlah | satu notifikasi per transaksi |

Halaman `/notifications` menampilkan semua notifikasi pengguna (sudah dan belum dibaca) dari 3 hari terakhir, terbaru di atas. Klik satu item menandainya dibaca lalu membuka transaksinya (perilaku lonceng yang sudah ada).

## Tujuan, bukan tujuan, anti-tujuan

- **Tujuan:** riwayat 3 hari yang dapat dibuka dari lonceng; tiga jenis notifikasi di atas hadir untuk dua role.
- **Bukan tujuan:** email untuk jenis baru, push/realtime, "tandai semua dibaca", preferensi notifikasi, notifikasi untuk Admin atau Branch Manager, notifikasi pembuatan lead baru, penghapusan notifikasi lama.
- **Anti-tujuan:** notifikasi yang membocorkan transaksi di luar hak akses penerima, atau memuat isi coaching dan nama pelanggan. Notifikasi ganda untuk transaksi stagnan yang sama.

## Pendekatan yang dipertimbangkan

1. **Perluas notifikasi database yang ada (dipilih pengguna).** Dua kelas notifikasi baru, pemicu dari titik perubahan tahap dan dari command terjadwal; halaman membaca tabel `notifications`. Paling kecil dan memakai ulang lonceng, status baca, serta pola otorisasi yang ada.
2. Riwayat dirakit saat dibuka dari `stage_histories`, `deal_comments` dan hitungan stagnan. Tidak ada tulisan baru, tetapi status baca perlu tabel sendiri, lonceng tidak terpakai, dan transaksi yang stagnan lalu aktif lagi lalu stagnan lagi kehilangan jejak.
3. Tabel event sendiri. Terlalu besar untuk kebutuhan ini.

## Desain (pendekatan 1)

**Notifikasi baru** (`app/Notifications`, hanya channel `database`, tanpa `email_status`):
- `DealStageChanged`: data `kind=stage_changed`, `title`, `message` ("Transaksi pindah dari {tahap lama} ke {tahap baru}."), `url` (tautan transaksi), `deal_id`. Tanpa nama pelanggan.
- `DealBecameStagnant`: data `kind=stagnant`, `deal_id`, `activity_at` (nilai `last_activity_at ?? created_at` saat terdeteksi), `title`, `message`, `url`. Dikirim ke Sales pemilik transaksi.
- Ringkasan Supervisor memakai kelas yang sama atau kelas kedua `StagnantSummary` (pilihan pembangun) dengan `kind=stagnant_summary`, `count`, `url` ke Transaksi tab Stagnan. Hanya angka dan tautan.
- Komentar lama (`DealCommentCreated`) diberi `kind=comment` pada data baru. Baris lama tanpa `kind` diperlakukan sebagai komentar.

**Pemicu perubahan tahap.** Panggil dari `DealTransaction::transitionTo` (setelah `StageHistory` dibuat, di dalam transaksi database seperti komentar) dan dari `CustomerController::cancelDo` (DO dibatalkan, Do → Spk). Penerima: Supervisor aktif yang memegang tim Sales pemilik transaksi (logika penerima komentar di `DealCommentController::store` baris 67–79, aktor tidak menerima notifikasinya sendiri). Pembuatan lead (`CreateLeadTransaction`) tidak memicu. Notifikasi hanya untuk perubahan oleh pengguna selain Supervisor penerima.

**Pemicu stagnan.** Command baru `notifications:detect-stagnant`, dijadwalkan harian pukul 00:05 Asia/Jakarta di [routes/console.php](../../../routes/console.php) (service `aina-scheduler` sudah berjalan di production). Command:
1. Mengambil transaksi `stagnant()` yang `last_activity_at ?? created_at`-nya jatuh dalam 3 hari terakhir (jendela yang sama dengan riwayat), sehingga transaksi yang sudah lama stagnan tidak membanjiri notifikasi pada hari pertama berjalan.
2. Melewati transaksi yang sudah punya `DealBecameStagnant` dengan `deal_id` dan `activity_at` yang sama (aman dijalankan ulang, dan transaksi yang aktif lagi lalu stagnan lagi dihitung sebagai kejadian baru).
3. Mengirim satu notifikasi per transaksi ke Sales pemiliknya, dan satu ringkasan (jumlah transaksi baru) per Supervisor yang memegang tim terkait.

**Halaman dan lonceng.**
- `VisibleCoachingNotifications` diperluas: lonceng tetap menampilkan notifikasi belum dibaca (sampai 10) tetapi kini semua jenis, dan ada metode baru untuk riwayat 3 hari termasuk yang sudah dibaca. Nama kelas menyesatkan setelah ini; mengganti nama boleh asal tes lulus.
- Batas riwayat: awal hari Jakarta 3 hari lalu (hari ini ditambah 3 hari sebelumnya), konsisten dengan aturan stagnan.
- Otorisasi saat dibaca, bukan saat dibuat: komentar tetap lewat `comment_id`; `stage_changed` dan `stagnant` lewat `deal_id` dan `visibleTo($actor)`; ringkasan tidak membawa ID transaksi sehingga tidak bisa dicek ulang (angka saja, risiko diterima).
- `NotificationController` mendapat aksi `index` yang me-render halaman Inertia baru; route `notifications.index` di [routes/web.php](../../../routes/web.php) menggantikan `Route::inertia(... 'module-status')`. Halaman memakai tampilan item yang sama dengan lonceng (judul, pesan, waktu relatif, penanda belum dibaca) dan keadaan kosong yang ada. Whitelist kunci di [HandleInertiaRequests.php](../../../app/Http/Middleware/HandleInertiaRequests.php) ditambah `kind` dan `count` (`deal_id` tidak diekspos ke frontend).
- Maksimum 200 item pada halaman, dengan keterangan "menampilkan 200 terbaru" bila terpotong.

**Dokumen.** Tambahkan kebutuhan baru di PRD bagian 7.5 dekat CVS-09 (satu ID hanya hidup di PRD), daftarkan dokumen ini di `docs/agents/README.md`, dan catat di `memory.md`.

## Batasan

- Isi notifikasi hanya metadata: tahap, jumlah, ID transaksi, tautan. Tanpa nama pelanggan dan tanpa isi komentar.
- Perilaku notifikasi komentar yang ada tidak boleh berubah (tes `CoachingWorkflowTest` harus tetap lulus). Pengambilan penerima boleh diekstrak ke satu tempat bersama bila perilakunya tetap.
- Command harus idempoten.

## Diserahkan ke pembangun

Nama kelas dan berkas, bentuk final data JSON selain kunci di atas, apakah ringkasan Supervisor satu kelas atau dua, desain visual halaman (mengikuti halaman data lain), tes (pemicu tahap termasuk `cancelDo`, penerima tepat, aktor tidak diberi notifikasi, otorisasi baca, jendela 3 hari, command idempoten dan jendela hari pertama, halaman per role). Tes browser/aksesibilitas yang menyebut lonceng atau halaman placeholder perlu diperbarui.

## Risiko

- Notifikasi `stage_changed` bisa ramai bila tim besar. Diterima; filter per jenis bukan bagian pekerjaan ini.
- Ringkasan stagnan memakai hitungan beku. Supervisor yang pindah tim bisa melihat angka lama selama 3 hari.
- Bila `aina-scheduler` mati pukul 00:05 Jakarta, notifikasi stagnan hari itu baru muncul pada hari berikutnya (jendela 3 hari menutup keterlambatan itu).
