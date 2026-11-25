# Halaman Coaching bergaya WhatsApp Web

## Context

Pengguna ingin satu tempat untuk melihat percakapan coaching yang sedang berlangsung atau perlu diperhatikan, lengkap dengan transaksi yang dibahas. Saat ini:

- `/transactions/{id}/coaching` hanya memuat satu transaksi, tanpa nama pelanggan dan Sales. Tidak ada daftar percakapan.
- "Komentar belum dibaca" di Beranda hanya menghitung notifikasi 3 hari terakhir, jadi komentar lama yang belum dibalas hilang dari pantauan.
- Tidak ada status percakapan.

Hasil yang diinginkan: Sales dan Supervisor tidak kehilangan percakapan yang belum dituntaskan, tanpa batas waktu.

**Anti-tujuan:** komentar baru terkubur karena percakapan sudah "selesai"; Branch Manager melihat isi coaching; ada dua halaman coaching yang berbeda perilaku.

## Keputusan

Diputuskan pengguna:

1. Percakapan tetap aktif **sampai ditandai selesai**.
2. **Hanya Supervisor** yang menandai selesai atau membuka lagi.
3. Tampilan **seperti WhatsApp Web** (daftar kiri, percakapan kanan) dengan komponen **Bubble** shadcn.

4. Pembiayaan tampil: Cash, atau Kredit + leasing (+ tenor dan asuransi di header).
5. Tombol **Lihat transaksi** membuka halaman Transaksi yang hanya menampilkan transaksi itu.
6. Ada **kotak pencarian** di daftar.

Mockup interaktif v3 (25 November 2026) disetujui pengguna bersama desain ini.

Usulan saya (koreksi bila tidak cocok):

- Pencarian mencocokkan nama pelanggan atau kendaraan di semua tab; hasilnya diberi badge status. Tidak mencari isi chat atau nomor telepon.
- Filter transaksi memakai `transaction=<public_id>`, bukan nama, supaya pelanggan dengan nama sama atau beberapa transaksi tidak ikut muncul.

- Satu transaksi = satu percakapan; status selesai dipakai bersama. Komentar baru dari siapa pun membukanya lagi.
- Giliran dihitung dari penulis komentar terakhir: Sales → giliran Supervisor; selain itu → giliran Sales. Balasan Supervisor lain di tim yang sama sudah dihitung.
- Masuk tahap DO otomatis menandai selesai (keputusan pengguna sesudah implementasi, 25 November 2026); Batalkan DO membuka lagi percakapan yang ditutup DO itu. Lost juga otomatis selesai, dan komentar ditutup pada DO maupun Lost (keputusan pengguna, 25 November 2026). Transaksi yang sudah DO/Lost saat rilis di-backfill selesai.
- Tombol Selesai ditolak bila ada komentar lebih baru dari yang terlihat di layar Supervisor.
- Akses mengikuti `DealTransaction::visibleTo()`: Sales transaksinya, Supervisor timnya, Admin baca saja, Branch Manager 403. "Login sebagai" otomatis hanya baca (middleware yang ada).
- Perubahan tahap dan aktivitas tetap tampil (CVS-01) sebagai baris kecil di tengah, seperti pesan sistem WhatsApp.
- Form estimasi closing tetap ada di header percakapan, karena Beranda menautkan ke sini untuk mengisinya.

## Pendekatan yang dipertimbangkan

| Opsi | Plus–minus | Hasil |
|---|---|---|
| A. Daftar + halaman lama | Kode terkecil, tetapi bolak-balik | Tidak dipilih |
| B. Daftar + modal detail transaksi | Semua data terlihat, tetapi coaching ada di dua tempat | Tidak dipilih |
| C. Dua panel ala WhatsApp Web | Paling cepat untuk banyak percakapan, kode terbanyak | **Dipilih pengguna** |

## Tampilan

```
Desktop
+---------------------------+--------------------------------------------+
| Coaching                  | (BS) Budi S. · Avanza                      |
| [Cari pelanggan/kendaraan]|      [Prospect] Sales: Andi  > Closing: Des|
| [Perlu dibalas 2]         |      Kredit · Leasing A  48 bln · Kombinasi|
| [Menunggu Sales 5]        |      [Lihat transaksi] [Tandai selesai]    |
| [Selesai]                 |--------------------------------------------|
|---------------------------|            [Muat sebelumnya]               |
| (BS) Budi S.       2 hari |        -- Lead -> Prospect · 20 Nov --     |
|      Avanza · Sales Andi  |  Andi                                      |
|      Andi: "minta 5 th"   |  ( Pelanggan minta tenor 5 th )            |
|      [Prospect][Kredit·A] |                                            |
|---------------------------|    20 Nov 10.12 · Prospek · Balas          |
| (DK) Dedi K.       3 hari |                                            |
|      Innova · Hot Prospek |            ( Coba tawarkan promo leasing ) |
|      Andi: "..."          |              20 Nov 10.30 · Prospek · Edit |
|                           |--------------------------------------------|
| [Sebelumnya] [Berikutnya] | [ Tulis komentar coaching ]        [Kirim] |
+---------------------------+--------------------------------------------+
HP: /coaching hanya daftar; membuka percakapan menampilkan panel kanan saja + "Kembali ke Coaching".
```

**Mockup v3 (rapikan layout, ui-ux-pro-max + DESIGN.md) menggantikan sketsa dan v2 bila berbeda:**

- Daftar ±320px di desktop: judul, pencarian berlabel, tab segmented satu baris ("Perlu dibalas N", "Menunggu N", "Selesai"; Admin "Supervisor N", "Sales N", "Selesai"), lalu satu kalimat penjelas tab.
- Baris: nama + waktu, kendaraan · Sales, cuplikan satu baris, `StageBadge` + pembiayaan sebagai teks. Terpilih: latar muted + garis aksen kiri. Teks terpotong tampil utuh saat percakapan dibuka. Saat mencari, pembiayaan diganti nama status.
- Header: nama + badge tahap + kendaraan, aksi di kanan (Lihat transaksi, Selesai/Buka lagi, keduanya outline), lalu satu baris properti Sales · pembiayaan lengkap · Closing (form closing tetap otomatis terbuka bila perlu diisi).
- Pesan: pemisah hari (Asia/Jakarta); bubble beruntun dari penulis sama digabung; meta 12px "jam · tahap · Balas/Edit"; tahap/aktivitas sebagai garis dengan teks tengah. Lebar baca maks. 78%.
- Form: kutipan "Membalas …" + Batal; hanya Kirim yang primary. Percakapan selesai dan mode Admin memakai baris pemberitahuan.
- Aturan: teks ≥12px, target 44px pada layar sentuh, fokus terlihat, pembaruan diumumkan lewat satu `role="status"`, tanpa scroll horizontal, warna hanya dari token tema.

Detail:

- Bubble saya di kanan (`align="end"`, varian default); pihak lain di kiri (`muted`, nama penulis di atas). Admin melihat semua di kiri.
- Label tab: giliran sendiri "Perlu dibalas", giliran lain "Menunggu Sales/Supervisor". Admin: "Menunggu Supervisor", "Menunggu Sales". Angka pada dua tab aktif saja.
- Urutan: komentar terbaru di atas. Tab awal: giliran sendiri (Admin: Supervisor); bila datang dari tautan notifikasi, tab mengikuti status percakapan itu.
- Kosong: "Pilih percakapan" di kanan. Di daftar: "Belum ada percakapan. Mulai dari komentar di detail transaksi."
- Percakapan yang ditandai selesai tetap menerima komentar selama transaksinya belum DO atau Lost.

## Implementasi

Branch `feat/coaching-inbox` dari `main`. Tiap langkah dimulai dari test gagal.

**1. Data dan status**
- Migration `deal_transactions.coaching_closed_at` (timestamp nullable); backfill `now()` untuk transaksi DO/Lost yang punya komentar. `down()` menghapus kolom.
- [DealTransaction.php](../../../app/Models/DealTransaction.php): fillable, cast, `latestComment()` (`hasOne(DealComment)->latestOfMany(['created_at','id'])`).
- [DealTransactionPolicy.php](../../../app/Policies/DealTransactionPolicy.php): `closeCoaching` = Supervisor dan `view`.
- `DevelopmentDemoSeeder::seedComments`: sebagian percakapan demo selesai, sebagian giliran Supervisor/Sales; idempoten dan tidak menimpa data pengguna.

**2. Backend** ([DealCommentController.php](../../../app/Http/Controllers/Customer/DealCommentController.php), [web.php](../../../routes/web.php))
- `GET /coaching` (`coaching.index`) dan `GET /transactions/{transaction}/coaching` yang ada memakai `index(Request, TransactionTimeline, ?DealTransaction)` dan merender `transactions/coaching`. Semua tautan notifikasi/email/Beranda tetap sama.
- Props: `conversations` (simplePaginate 20: public_id, customer_name, vehicle_model, stage_label, sales_name, author_name, excerpt 90 karakter, commented_at), `counts`, `tab`, `transaction` (null bila belum dipilih; tambah customer_name, sales_name, closed, can_close, last_comment_id), `timeline` (halaman terbaru, `newestFirst: true`). Tanpa telepon, alamat, atau catatan pelanggan.
- Pembiayaan: baris dan header mengirim bentuk `financing` yang sama dengan `TransactionController::row()`; nama leasing satu query (termasuk leasing nonaktif), dan label memakai `financingParts` di [transaction-labels.ts](../../../resources/js/lib/transaction-labels.ts).
- `search` (string, maks. 100): `lower(name)`/`lower(vehicle_model)` dengan wildcard di-escape, pola sama dengan `customer_name`; bila terisi, tab diabaikan.
- `TransactionController::filtered()`: param `transaction` (nullable uuid) → `where public_id`, tetap di dalam `visibleTo`, ikut berlaku pada ekspor CSV, dan ada di `filters`. Tautan: `/transactions?transaction=<id>&date_from=&date_to=` (tanggal kosong supaya transaksi bulan lalu tetap muncul).
- Tab divalidasi `in:supervisor,sales,done`. Hindari N+1 dengan eager load `customer:id,name`, `sales:id,name`, `latestComment.author`.
- `store()`: dalam transaksi yang sama set `coaching_closed_at = null`.
- `PATCH /transactions/{transaction}/coaching` (`role:supervisor`): `closed` boolean, `last_comment_id`. Kunci baris, otorisasi, tolak bila komentar terbaru berbeda, catat `AuditRecorder` (`coaching.closed` / `coaching.reopened`) tanpa isi komentar.
- [TransactionTimeline.php](../../../app/Services/TransactionTimeline.php): tambah `is_mine` dan `author_role` pada komentar (posisi bubble, label peran, penggabungan bubble).
- `TransactionController::feed`: `kind` menerima `all`.

**3. Frontend**
- `pnpm exec shadcn add bubble` → `components/ui/bubble.tsx`. Dependensinya (`radix-ui`, `class-variance-authority`) sudah ada; batalkan bila `package.json` berubah.
- Tulis ulang [coaching.tsx](../../../resources/js/pages/transactions/coaching.tsx) jadi dua panel. Pakai ulang `useTransactionFeed` (kind `all`), `CommentComposer` + `composerKey`, `ClosingMonthForm`, `Avatar` + `useInitials`, `formatRelativeTime`, `historyDate`. Komponen baru hanya entri chat (bubble + balasan + tahap + edit + riwayat revisi Admin), dengan semua fungsi `TimelineEntry` dipertahankan.
- [transactions/index.tsx](../../../resources/js/pages/transactions/index.tsx): filter `transaction` mengikuti pola `closing_month` (tipe, param, reset, hitungan filter aktif, pemberitahuan "Hanya transaksi …" + "Tampilkan semua").
- Panel percakapan di-`key` per `public_id`. Panel scroll sendiri, terbaru di bawah, tidak melompat saat memuat pesan lama.
- [navigation.ts](../../../resources/js/lib/navigation.ts): menu "Coaching" setelah Transaksi untuk Sales, Supervisor, Admin (HP: di Lainnya); aktif juga pada `/transactions/*/coaching`.

**4. Dokumen**
- Spec disalin ke `docs/superpowers/specs/2026-11-25-coaching-inbox-design.md`; daftarkan spec dan rencana di manifest.
- PRD: CVS-15 (daftar percakapan dan giliran) dan CVS-16 (selesai oleh Supervisor, dibuka lagi oleh komentar baru). Perbarui `knowledge.md`, `memory.md`, `uat-matrix.md`, dan `menu-structure.md` (coaching kini menu).
- Manual Sales dan Supervisor: bagian Coaching, screenshot data demo, naik versi.

## Verifikasi

- Pest baru `tests/Feature/Customer/CoachingInboxTest.php`: isi dan giliran per role; isolasi tim/dealer; BM 403 dan tidak ada cuplikan; transaksi terhapus hilang; tanpa komentar tidak masuk daftar; komentar lebih dari 3 hari tetap tampil; hanya Supervisor tim yang menutup; Sales/Admin/Supervisor tim lain ditolak; komentar baru membuka lagi; `last_comment_id` usang ditolak; audit tanpa isi; backfill migration; label Cash/Kredit/Kredit Lain/kosong; pencarian (semua tab, karakter `%` dan `_`, tidak menembus tim lain); filter `transaction` di daftar dan CSV hanya mengembalikan transaksi itu, dan kosong untuk milik tim lain; telepon tidak terkirim; login sebagai tidak menulis.
- Sesuaikan `CoachingWorkflowTest`, `CustomerHistoryTest`, dan tes frontend navigasi. Sesuaikan selector browser di `customer-history.js` (paging jadi "Muat sebelumnya"), `accessibility.js`, `acceptance-flow.js` (`#coaching-body`).
- `php artisan test`, `vp check`, tes frontend, `pnpm run build`, dan browser di 390/768/1440 px, terang dan gelap, keyboard.
- Uji nyata di `aina.test`: Supervisor komentar → Sales lihat "Perlu dibalas" → balas → pindah ke "Menunggu" → Supervisor selesai → komentar baru membuka lagi. Migration dan seeder di database lokal hanya dijalankan atas izin Anda.
- Rilis: backup lalu migrate di production **sebelum** rilis kode, karena kode membutuhkan kolom baru.

## Tidak termasuk

Pembaruan otomatis/realtime, filter per Sales, pencarian isi chat, badge angka di menu, memulai chat baru dari halaman ini, Enter untuk kirim, tanda baca, perubahan bubble di modal detail transaksi. "Komentar belum dibaca" di Beranda tetap memakai aturan 3 hari.
