# Transaksi, Pembiayaan dan Mapping Area — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans task-by-task. This document is a planning handoff, not evidence of implementation. Checklist items remain unchecked until verified.

**Goal:** Menghubungkan pembiayaan dan Mapping Area ke backend nyata, sekaligus membangun halaman Transaksi Baru serta daftar/detail Transaksi sesuai wireframe yang disepakati.

**Status:** Disetujui pemilik pada 8 November 2026. PR ini hanya menetapkan rencana; implementasi dimulai pada PR berikutnya.

**Baseline:** `main` commit `3d972686c26a60c36e6f67c1dcd6babebcdef4e9`, ditandai annotated tag `baseline-before-transactions-e2e-2026-11-08` yang sudah dipush ke origin. Tag tidak menerbitkan GitHub Release atau deployment production.

**Architecture:** Tetap monolit Laravel–Inertia React. Penyimpanan transaksi, validasi lintas field, penugasan dan snapshot DO mempunyai satu service/domain boundary bersama; seluruh entrypoint memakai aturan yang sama. Laporan membaca agregat server yang diotorisasi, bukan mengunduh seluruh data pelanggan untuk dihitung di browser.

**Tech Stack:** Laravel, PostgreSQL, React/TypeScript, Inertia, Tailwind, komponen UI/Canvas yang sudah terpasang. Tidak memerlukan package baru.

**Spec:** PRD, khususnya CRM/PIP/ANL dan ADR 001–004; [preview pembiayaan](2026-11-08-financing-ui-preview.md), [preview Mapping Area](2026-11-08-mapping-area-preview.md), serta kesepakatan wireframe terbaru pada chat 8 November 2026 yang dirangkum di bawah. Perbarui requirement kanonik di PRD sebelum implementasi; requirement ID baru hanya boleh dibuat di PRD.

## 1. Keadaan awal dan batas

- Branch saat penyusunan awal: `codex/mapping-area-preview`. PR #66 dan #67 telah merged; main sudah berisi Mapping Area terbaru. PR #68 berasal dari branch lama dan tumpang tindih. Periksa ulang status remote saat mulai; jangan memakai #68 sebagai baseline dan jangan menutup/merge PR tanpa instruksi.
- Financing/Area saat ini preview sintetis: master dan form belum tersimpan ke server. Jangan membawa pilihan FOA contoh Padalarang/Ngamprah/Batujajar ke konfigurasi dealer nyata.
- Transaksi existing sudah server pagination 15, pembatasan akses, aksi tahap/Delivery/batal DO serta pemulihan kegagalan jaringan. Detail kaya/riwayat masih tertanam di halaman Pelanggan; daftar Transaksi belum punya tombol Detail sendiri.
- Tanggal filter sekarang `created_at`, urutan `updated_at`; keduanya belum memenuhi Tanggal Progress. Catatan umum transaksi belum kolom tersendiri. Impor membuat Lead tanpa initial stage history.
- Pemilik mengonfirmasi **belum ada transaksi aktif dan data lama dapat diabaikan**. Tidak membangun backfill/correction historis dalam pekerjaan ini. Sebelum rollout, lakukan inventaris read-only: jika ditemukan transaksi DO lama tanpa snapshot/area, hentikan aktivasi laporan dan tinjau; jangan hapus, mengarang area, atau memasukkannya ke Area lain.
- Jangan membaca/mengubah `.env`, memasang package, menjalankan migration/seeder pada DB bersama/production, reset, atau deploy otomatis. Migration file dan test DB terisolasi boleh disiapkan. Eksekusi migration pada lingkungan non-test memerlukan otorisasi eksplisit untuk target tersebut.
- Pertahankan dirty changes pengguna pada `docs/agents/memory.md`; stage hanya hunk pekerjaan sendiri. Kerjakan pada branch non-default, Conventional Commits dan PR.

## 2. Desain yang sudah dikunci

### Daftar Transaksi

- Urutan kolom: **Tanggal Progress · Pelanggan · Unit yang diminati · Tahap · Sumber · Kecamatan · Sales/Supervisor · Aktivitas terakhir · Keterangan · Aksi**.
- Progress hanya tanggal perubahan tahap terakhir dalam Asia/Jakarta; tanggal dibuat muncul pada tooltip yang dapat difokuskan serta detail. Tidak memakai waktu aktivitas atau edit catatan sebagai tanggal progress. Estimasi nilai hanya di detail.
- Pelanggan tetap nama/telepon sesuai akses existing. Model dinamai Unit yang diminati. Sales dan Supervisor dalam satu sel, dua baris. Supervisor adalah Supervisor aktif dari `team_id` transaksi, bukan tim Sales saat ini; jika lebih dari satu, tampilkan semua secara deterministik. Jangan mengubah atribusi tim histori.
- Aksi ikon kecil + tooltip + label aksesibel: Detail biru, Ubah tahap amber, Delivery hijau, Batal DO merah. Target sentuh 44px. Tampilkan berdasarkan permission flags server, pertahankan seluruh syarat aksi existing.
- Filter awal: rentang tanggal **Progress**, Tahap, tombol Cari. Default tanggal awal bulan Jakarta sampai hari ini, Tahap semua. Sorting progress terbaru, tie-break id terbaru.
- Kanan atas: Refresh, Ekspor, Filter detail, Tambah transaksi. Refresh mempertahankan filter/page terapan. Ekspor tahap ini CSV seluruh hasil terfilter, bukan hanya halaman aktif; tidak menambah XLSX/PDF transaksi.
- Filter detail inline: Supervisor, Sales, Nama pelanggan, Kabupaten/Kota → Kecamatan, Sumber lead → Kanal digital bila Digital Ad. Default semua; pilihan mengikuti scope aktor. Reset kembali ke default awal bulan/hari ini dan halaman 1. Cari/Terapkan selalu kembali halaman 1; URL menyimpan filter. Pertahankan tab existing Semua/Aktif/Stagnan/Selesai sebagai quick filters.
- Pagination 15, nomor halaman serta jumlah hasil. Desktop tabel, ponsel kartu ringkas. Buka/tutup detail mempertahankan konteks; loading, empty, retry, draft filter dan fokus tetap berfungsi.
- Ekspor CSV tidak memuat telepon, alamat, akun medsos, coaching atau catatan pribadi pelanggan. Bawa hanya kolom operasional aman, termasuk Keterangan transaksi yang terpisah dari coaching. BOM UTF-8, titik koma, escaping dan perlindungan formula; validasi scope/filter sama persis dengan daftar.

### Halaman Transaksi Baru dan Detail

- Halaman tersendiri `/transactions/create`, dua kolom desktop/satu kolom mobile. Kiri Data Transaksi; kanan Pelanggan dan Area Transaksi KTP/STNK. Kembali menjaga filter daftar; konfirmasi bila meninggalkan draft yang sudah diubah. Setelah sukses kembali ke daftar dengan toast dan akses Detail transaksi baru.
- Kiri: Sales penanggung jawab, Supervisor read-only, Unit yang diminati wajib, Sumber lead wajib, Kanal digital kondisional, estimasi bulan closing opsional, pembiayaan, leasing kondisional, Keterangan umum. Tanggal dibuat otomatis server, tahap awal Lead. Estimasi nilai tidak dihapus dari model/detail; tidak menjadi field utama form ini.
- Pelanggan Baru/Lama: baru meminta nama dan telepon wajib, akun media sosial opsional (`social_media_account`, plain text maksimal 255). Pencarian lama via nama/nomor, server-scoped, debounced dan paginated; kartu terpilih menampilkan identitas/penugasan tanpa menimpanya. Akun medsos lama ditampilkan read-only; edit profil terpisah tidak ditambahkan diam-diam.
- Sales otomatis dirinya; Admin/SPV memilih Sales aktif dalam scope untuk pelanggan baru. Pelanggan lama mempertahankan assignment. Pelanggan tanpa assignment aktif tidak dapat dibuatkan transaksi sampai assignment diperbaiki melalui alur existing.
- Nomor duplikat tetap konfirmasi sebelum write, tanpa membuka pelanggan di luar akses. Identitas baru + assignment + transaksi Lead + histori awal + audit harus atomik. Draft tidak hilang ketika server/network gagal; tombol submit mencegah kirim ganda.
- `source=digital_ad` wajib `source_channel` salah satu `facebook,instagram,tiktok,website,other`. Sumber lain mengosongkan channel. Lainnya adalah pilihan kanal, tidak menambah field lain. Jangan mengubah sumber existing menjadi katalog baru yang tidak diminta.
- Area transaksi terpisah dari alamat profil pelanggan. Sebelum DO boleh kosong seluruhnya; wilayah parsial harus dilengkapi kecamatan yang cocok. Kota Lain cukup nama kota, selalu non-FOA.
- Pembiayaan mengikuti preview: belum ditentukan/cash/credit, kredit memilih leasing atau Kredit Lain dengan nama wajib. Cash/belum ditentukan membersihkan nilai leasing. Tidak menambahkan kewajiban pembiayaan lengkap saat DO tanpa keputusan produk baru; kategori belum ditentukan/leasing belum dipilih tetap bermakna pada laporan pembiayaan.
- Detail bersama dibuka dari Aksi, memuat identitas sesuai policy, tanggal dibuat/progress, unit/tahap, area, pembiayaan, sumber/channel, estimasi nilai/closing dan catatan transaksi; riwayat/coaching serta aksi existing tetap mengikuti permission. Area/pembiayaan terkunci saat DO/Delivery, dapat diedit lagi setelah DO dibatalkan ke SPK.
- Entry Tambah Lead/Buat Transaksi dari Pelanggan diarahkan ke form yang sama dengan pelanggan lama terpilih bila relevan; tidak menyisakan jalur penyimpanan dengan aturan berbeda.

### Master, DO dan laporan nyata

- Master resmi 106 kecamatan dari lima pemerintah daerah mengikuti snapshot yang sudah diverifikasi. Nama/kode resmi immutable; FOA adalah konfigurasi per dealer, awal kosong. Admin menandai FOA; nama sama seperti Cisarua selalu disertai parent.
- Master leasing per dealer dimulai delapan nama pantauan yang disepakati. Aktif/pantauan dikelola Admin dengan audit; tidak hard-delete entri yang direferensikan. Leasing non-pantauan masuk Kredit Lain. Mengubah master tidak menulis ulang histori DO.
- Penguncian DO berada di domain boundary existing setelah row lock/refresh. Validasi area lengkap dan snapshot area + pembiayaan dibuat atomik pada **kejadian DO**. Snapshot menyimpan kode/nama wilayah, status FOA, jenis pembiayaan, nama/identitas leasing dan klasifikasi pantauan saat itu.
- Pembatalan mengeluarkan DO beserta snapshot-nya dari realisasi tanpa menghapus histori. DO ulang membuat snapshot baru; Delivery tidak menambah penjualan atau memperbarui snapshot.
- Laporan Pembiayaan: Prospek memakai kejadian pertama masuk Prospect dalam rentang, satu transaksi sekali, dengan pilihan pembiayaan terkini. Realisasi DO memakai kejadian DO sah dan snapshot. Tidak menyamakan Prospek dengan tanggal Lead dibuat.
- Mapping Area DO saja, kategori per kecamatan FOA + Area lain terakhir, tanpa Kecamatan belum diisi. Seluruh DO baru terverifikasi menjadi penyebut; rentang kosong menampilkan empty state.
- Kredit Lain selalu kedua terakhir, Leasing belum dipilih terakhir; nol tetap aman. Cash/kredit/belum ditentukan merekonsiliasi total; batang leasing merekonsiliasi total kredit. Jangan menambahkan konsep MSCP baru.
- Laporan Admin/SPV/BM mengikuti scope atribusi laporan existing. BM hanya menerima agregat tersanitasi, tidak route Transaksi/Pelanggan/master atau form operasional. Master Admin saja.
- Ganti entry preview menjadi report/master nyata setelah integrasi siap; fixture hanya test/demo terisolasi. PNG/CSV memakai agregat dan filter terapan yang disalin saat unduh, `synthetic:false`; jangan membawa penanda Data contoh atau reset preview ke layar operasional.
- Rentang bulan backend Sumber & Model yang sebelumnya diminta juga diselaraskan dengan filter frontend existing, termasuk drilldown/CSV, tanpa mengubah metrik dan otorisasinya.

## 3. Kontrak integrasi dan kepemilikan

Kontrak diselesaikan oleh integrator sebelum sub-agent mulai menulis. Gunakan nama yang sama pada validasi, PHP serializer, TS type, dan test.

| Kontrak | Bentuk minimum |
|---|---|
| Pelanggan | `public_id,name,phone,social_media_account,assigned_sales` hanya sesuai permission |
| Draft transaksi | `customer_mode`, `existing_customer_id` atau identitas baru, `sales_id`, `vehicle_model,source,source_channel,notes,expected_closing_month`, `area {region_code,district_code,other_city}`, `financing {type,leasing_id,other_name}` |
| Baris transaksi | Existing fields + `progress_at`, sumber/channel, area berlabel, Sales dan daftar Supervisor, `notes`, permission flags; `created_at` untuk tooltip |
| Pagination | `data,current_page,last_page,total,from,to,links` |
| Query daftar/CSV | `date_from,date_to,stage,tab,sales_id,supervisor_id,customer_name,source,source_channel,region_code,district_code,page`; tanggal menyaring progress, page tidak membatasi CSV |
| Aggregate laporan | Periode terapan, mode, total/kategori/count/percentage; tidak mengirim koleksi identitas pelanggan untuk perhitungan browser |

Endpoint baru menggunakan route bernama sesuai pola Laravel existing: GET `/transactions/create` untuk form dan POST `/transactions` untuk store; GET `/transactions/customer-search`, GET `/transactions/{transaction}` untuk detail; PATCH `/transactions/{transaction}` untuk metadata; GET `/transactions/export.csv`. Daftarkan route statis sebelum binding `{transaction}`. Endpoint tahap/Delivery/batal DO tetap dipakai.

Laporan: GET `/analytics/financing`, GET `/analytics/mapping-area`; link query preview lama diarahkan ke layar nyata setelah cutover. Master GET/PATCH `/dealer-settings/area-foa`, GET/POST/PATCH `/dealer-settings/leasing` sesuai kebutuhan aksi. Route, policy, request, kontrak dan migrasi hanya mempunyai satu pemilik integrasi.

Schema additive: nullable akun medsos di Customer; catatan umum, kanal sumber, metadata area/pembiayaan dan `progress_at` di DealTransaction; `area_snapshot`/`financing_snapshot` nullable JSON pada StageHistory untuk DO; master region/district, leasing dan pivot FOA dealer. Gunakan FK/check/index sesuai PostgreSQL dan tes SQLite. Jangan menyalin Customer.notes/coaching ke catatan transaksi secara otomatis.

`progress_at` diperbarui hanya pada histori perubahan tahap (termasuk pembatalan); untuk Lead baru = created_at. Transaksi existing dengan histori memakai histori terbaru, tanpa histori fallback created_at. Semua penulisan tahap lewat boundary bersama. Tambahkan histori awal Lead pada impor.

## 4. Urutan kerja dan sub-agent

### Tahap 0 — Integrator: baseline, spec dan kontrak (serial)

- [ ] Revalidasi PR/main, perubahan pengguna, manifest, data target secara read-only, PRD/ADR. Buat branch/worktree non-default dari baseline yang benar setelah memperhitungkan #67.
- [ ] Perbarui kebutuhan kanonik di PRD dan spec terkait; jangan menimpa ADR lama. Kunci DTO, route, schema dan ownership di atas. Siapkan fixture kontrak sintetis untuk frontend/backend.
- [ ] Tetapkan daftar tes penerimaan dan titik commit. Pastikan semua agent menerima dokumen ini, scope file dan batas DB/package.

### Tahap 1 — Backend inti: schema, master dan invariants (serial, satu owner)

- [x] Tulis regresi gagal untuk area DO kosong, mismatch parent, Kota Lain, kanal digital, pemisahan catatan dan akun medsos opsional.
- [x] Tambahkan migration additive/master resmi, enum/validasi dan seed development guarded/idempotent. FOA produksi kosong; jangan mengaktifkan contoh sebagai keputusan dealer.
- [x] Ekstrak service pembuatan transaksi bersama dari `CustomerController`, mempertahankan lock duplikat, assignment, otorisasi, audit dan rollback. Update import serta endpoint lama sebagai adapter ke service yang sama.
- [x] Implementasikan progress_at dan snapshot di `DealTransaction::transitionTo`, endpoint edit metadata dengan lock yang sama, serta cancellation/redo/Delivery semantics. Perubahan master dan snapshot perlu konsistensi transaksi agar tidak menghasilkan snapshot campuran.
- [x] Jalankan test domain/customer/import/DO sampai hijau, termasuk PostgreSQL race edit-vs-DO, dua DO dan duplicate customer. Commit fondasi yang dapat diuji sebelum paralel.

### Tahap 2 — Paralel setelah kontrak stabil (root + tiga sub-agent maksimal)

| Pemilik | Pekerjaan dan batas edit | Gerbang selesai |
|---|---|---|
| Integrator/root | Backend query/endpoint, request/policy, route, schema/model bersama, wiring halaman Pelanggan, DTO umum | Test backend untuk daftar, detail, search, master, report dan ekspor; tidak mengubah file UI yang dimiliki agent lain |
| Agent A — Form | Halaman `transactions/create` dan komponen form khusus; pelanggan baru/lama, medsos, sumber/channel, area/pembiayaan | Error field, duplikat, assignment, conditional fields, retry/submit; tidak mengedit halaman Pelanggan atau route |
| Agent B — Daftar/detail | `transactions/index`, komponen filter/tabel/kartu/aksi/pagination serta shared detail | Kolom final, tooltip, aksi, progress filter, numbered pages, focus/retry; ekstraksi detail dari Pelanggan dikoordinasikan melalui root, bukan edit bersamaan |
| Agent C — Laporan/master | Komponen laporan nyata, UI master Area/FOA/leasing, adapter chart export | Agregat nyata, zero state, urutan, PNG/CSV, scope BM; tidak mengubah form transaksi/root route |

- [ ] Tiap agent menulis test perilaku relevan, bekerja pada ownership-nya, dan menyerahkan diff + bukti + batas. Bila kontrak perlu berubah, berhenti pada dependency itu dan kirim kebutuhan ke root; jangan membuat DTO/route alternatif.
- [ ] Root memasang perubahan bertahap; jangan menjalankan build sambil browser/backend test memakai manifest yang sedang dibangun.

### Tahap 3 — Integrasi lintas alur dan cutover (serial)

- [ ] Sambungkan seluruh entrypoint Pelanggan dan Transaksi ke form/service yang sama; uji detail bersama tidak kehilangan riwayat/coaching/aksi existing.
- [ ] Samakan filter query daftar/export, aggregate report/snapshot dan rentang bulan Sumber & Model. Pastikan export real tidak memakai fixture atau stale draft filter.
- [ ] Hilangkan preview/reset/tab form operasional dari report produksi; pertahankan fixture untuk tes. Verifikasi master FOA default kosong dan indikator kosong informatif.
- [ ] Integrasi import: template/preview/commit menerima field baru secara konsisten. Kolom baru opsional untuk kompatibilitas template lama; Digital Ad baru wajib kanal dan error baris jelas, area parsial ditolak. Impor Lead kosong area tetap boleh; DO harus melalui boundary wajib area.
- [ ] Review independen oleh agent yang tidak menulis perubahan terkait; perbaiki sebelum gerbang penuh.

### Tahap 4 — Verifikasi dan delivery

- [ ] Tes backend lengkap, frontend Node, TypeScript, format/lint, build, Pint/PHPStan dan pemeriksaan CI yang terdaftar. Jalankan PostgreSQL concurrency dan test server/DB terisolasi; jangan mengklaim cukup dari SQLite saja.
- [ ] Browser empat role pada desktop 1440, tablet 768, mobile 390; keyboard/tooltip, tidak overflow, numbered pagination, filter tersimpan, draft/retry, permission negatif.
- [ ] Alur penerimaan: buat Pelanggan Baru + transaksi → ganti ke Prospect → lengkapi area/pembiayaan → SPK → DO → pie/CSV/PNG merekonsiliasi → ubah FOA/leasing master → histori tetap → batal DO → report berkurang → edit → DO ulang → snapshot baru → Delivery tidak menambah total.
- [ ] Alur Pelanggan Lama: search sesuai akses → pilih → repeat transaction, identitas/assignment/medsos tidak berubah; duplikat baru tidak menghasilkan partial write.
- [ ] Cek beda progress vs aktivitas: komentar/follow-up/ubah catatan tidak mengubah progress; tahap berubah mengubah progress. Batas tanggal Jakarta serta created tooltip benar.
- [ ] Download nyata PNG dan CSV; periksa dimensi 2400px, nama/label panjang, rentang/mode, CSV formula safety, jumlah seluruh halaman, tanpa kontak/coaching. Zero/empty dataset tidak NaN.
- [ ] Perbarui ledger, manifest dan memory hanya dengan bukti baru. Commit Conventional Commits, push PR, laporkan migration yang perlu dijalankan dan keputusan FOA operasional. Tidak merge/deploy/migrate non-test otomatis.

## 5. Titik irisan yang dilarang paralel

1. Schema/model/route/DTO dan service pembuatan transaksi: root/backend inti saja.
2. DO locking/snapshot/cancel serta update metadata: satu owner; beririsan langsung dengan seluruh laporan.
3. `customers/index.tsx` dan CustomerController: root; Agent Form/Daftar tidak saling mengedit entrypoint ini.
4. Agregasi dan denominator: backend menentukan, UI hanya presentasi/ekspor; jangan membuat dua definisi kohort.
5. Master data ↔ snapshot: satu kontrak, master UI boleh paralel setelah service nyata tersedia; konfigurasi baru tidak mewarnai ulang histori DO.

## 6. Handoff ke chat berikutnya

Mulai dengan membaca dokumen ini, workflow proyek, PRD dan status Git/remote aktual. Ini **rencana saja**, tidak ada migration atau fitur backend baru yang dijalankan saat penyusunan. Tahap pertama yang harus dikerjakan adalah Tahap 0 lalu Tahap 1; jangan mulai tiga agent UI dengan schema/DTO yang belum disepakati. Perubahan pengguna di memory tetap harus dilindungi.

Default implementasi yang belum diminta lebih jauh: export transaksi hanya CSV aman; medsos satu field teks opsional; FOA awal kosong; tidak menambah kewajiban pembiayaan lengkap saat DO, akun medsos multi-platform, backfill historis, MSCP, map geografis atau package baru.


## Ledger implementasi Tahap 1 — 8 November 2026

- Baseline: origin/main `040f082` (PR #69), tree identik branch perencanaan `4bcc849`; implementasi di `codex/transactions-core`. Catatan lokal pengguna di memory dipertahankan.
- Ruling: lanjut serial hanya Tahap 1. UI, query/report, form baru dan cutover tetap Tahap 2–4; inventaris data target dilakukan sebelum rollout, tanpa membaca `.env` atau membuka koneksi target pada pekerjaan ini.
- Ruling: API memakai `region_code=other` untuk Kota Lain, `financing.type=null|cash|credit`, `leasing_id=other` dengan nama bebas atau ID integer master. PATCH mengganti objek area/pembiayaan yang dikirim secara utuh; objek yang tidak dikirim dipertahankan.
- Preflight antarmuka: manual/impor harus menghasilkan Lead dan histori awal yang sama. DO/PATCH berbagi lock transaksi; konfigurasi master/snapshot berbagi lock dealer. Laporan berikutnya membaca snapshot histori DO, bukan metadata terkini.
- RED/GREEN awal: 11 kasus fondasi gagal lalu lulus; dua regresi impor gagal sebelum adapter disatukan kemudian lulus. Verifikasi akhir: `composer ci:check` lulus (420 backend, lima skip, 3.839 assertions, 38 frontend; lint, TypeScript, Pint dan PHPStan). PostgreSQL 16.4 terisolasi lulus 422 backend/tiga skip/3.850 assertions, serta 34 assertions concurrency (duplikat/replay impor, dua DO, metadata-dulu dan DO-dulu). `pnpm run build` lulus. Reviewer independen tidak menemukan cacat penting tambahan setelah regresi leasing nonaktif dan guard dealer diperbaiki.

- Ruling: launcher PostgreSQL Windows memakai Start-Process tersembunyi dan WaitForExit pada pg_ctl, bukan menunggu seluruh pohon server. Opsi `-SkipBenchmark` menjalankan suite/concurrency tanpa benchmark volume yang tidak relevan pada perubahan ini.
- Seeder development hanya menambahkan metadata/snapshot pada demo yang baru dibuat; tidak mengarang snapshot atau mengubah demo existing yang sudah diedit. FOA tetap kosong. Schema/migration belum dijalankan pada database non-test.
- Batas delivery: PR ini fondasi backend; jangan rilis ke pengguna sebelum form/master operasional dan cutover Tahap 2–4. Form lama belum menyediakan kanal digital/area; API sudah menegakkan kontrak baru. Template CSV dan serializer/list/report masih mengikuti tahapan integrasi berikutnya.
- Regresi browser CI `tests/Browser/run-isolated.ps1` lulus seluruh sepuluh script pada Laravel + SQLite sintetis, termasuk DO/Delivery/pembatalan, simpan lead dan pemulihan form/filter/pagination/impor. Fixture DO sekarang memuat area valid; ini bukan verifikasi UI Tahap 2 yang belum dibuat.

## Ledger implementasi Tahap 2 (bagian root/backend) — 8 November 2026

- Revalidasi: PR #70 (Tahap 1) sudah squash-merged menjadi `origin/main` `1b0dec1`; branch `codex/transactions-core` tertinggal (tree identik). Tahap 2 dikerjakan pada `codex/transactions-ui` dari `origin/main`; perubahan lokal `docs/agents/memory.md` dipertahankan dan tidak di-stage.
- Selesai (root): `GET /transactions` memakai Tanggal Progress (`progress_at`, Asia/Jakarta, default awal bulan s.d. hari ini bila kunci tanggal absen; string kosong = tanpa batas), urutan progress terbaru lalu id, filter `customer_name,source_channel,region_code,district_code` serta `supervisor_id` (Admin saja), serializer menambah `progress_at,notes,source_channel,area,financing,supervisors`. `GET /transactions/export.csv` memakai definisi filter yang sama, seluruh hasil (bukan satu halaman), BOM UTF-8, titik koma, proteksi formula, tanpa telepon/alamat/medsos/coaching; BM ditolak. `GET /transactions/create`, `POST /transactions` (service dan request Lead yang sama), `GET /transactions/customer-search` (server-scoped, wajib assignment aktif, paginated) dan `GET /transactions/{transaction}` (detail JSON + riwayat via `TransactionTimeline`, flag `can_edit_metadata`).
- Selesai (UI): halaman `transactions/create` (Pelanggan Baru/Lama, medsos, sumber/kanal, area, pembiayaan, draft dipertahankan saat gagal, cegah kirim ganda, konfirmasi keluar bila berubah). Daftar lama hanya diberi tombol Tambah transaksi/Ekspor CSV dan label filter "Progress".
- Belum (tetap Tahap 2–4): kolom/tabel final, tooltip, ikon aksi, filter detail inline, nomor halaman, kartu mobile, komponen detail bersama, ekstraksi detail dari Pelanggan, endpoint/UI master Area-FOA & leasing, laporan Pembiayaan/Mapping Area nyata, rentang bulan Sumber & Model, template/preview impor, cutover entrypoint Pelanggan dan preview sintetis, browser empat role, PostgreSQL concurrency ulang.
- Bukti: RED lalu GREEN pada 13 tes baru (`TransactionListContractTest`, `TransactionCreateFlowTest`); tes filter lama diselaraskan ke progress. `composer ci:check` lulus: 438 backend (433 lulus, lima skip), 3.976 assertions, 38 frontend, lint/TypeScript/Pint/PHPStan bersih; `pnpm run build` lulus.
- Batas: skrip browser (`tests/Browser`) hanya diselaraskan label "Progress mulai/sampai" dan seed `progress_at`; **belum dijalankan ulang**. Default tanggal baru dapat memengaruhi skrip yang mengandalkan daftar tanpa query. Tidak ada migration/seeder non-test, install package, commit, push atau deploy.

## Ledger Tahap 2 (daftar Transaksi) — 8 November 2026

- Baseline: PR #71 merged (`12e6380`); dikerjakan pada `codex/transactions-list-ui`.
- Selesai: `transactions/index` memakai kolom final (Tanggal Progress dengan tooltip/fokus tanggal dibuat · Pelanggan · Unit · Tahap · Sumber(+kanal) · Kecamatan · Sales/Supervisor · Aktivitas terakhir · Keterangan · Aksi), kartu ponsel, aksi ikon 44px berlabel (Detail, Ubah tahap, Konfirmasi Delivery, Batalkan DO) menurut flag server, filter detail (nama pelanggan, Supervisor untuk Admin, Kabupaten/Kota → Kecamatan, kanal digital), Reset ke default awal bulan, Refresh yang mempertahankan filter/halaman, teks jumlah hasil, dan dialog Detail (identitas sesuai policy, area, pembiayaan, estimasi, keterangan, riwayat halaman pertama, status kunci area/pembiayaan). Props baru `supervisorOptions,regions,districts`.
- Perilaku: tanggal kosong dikirim sebagai string kosong (tanpa batas) agar berbeda dari default server.
- Bukti: 439 backend (434 lulus, lima skip), lint/format/TypeScript bersih, build lulus, seluruh skrip `tests/Browser/run-isolated.ps1` lulus lokal (PowerShell 7). Skrip `narrow-viewport-reflow.js` kini membandingkan URL tanpa memperhatikan urutan query.
- Belum: edit metadata (area/pembiayaan) dari Detail, ekstraksi detail dari halaman Pelanggan, UI master FOA/leasing, laporan nyata, cutover Pelanggan/impor, browser tiga ukuran × empat role, PostgreSQL concurrency.

## Ledger Tahap 2 (detail, master, laporan nyata, rentang bulan) — 8 November 2026

- Detail: dialog Detail menyediakan edit area, pembiayaan dan keterangan (flag `can_edit_metadata`, terkunci saat DO/Delivery); hanya bagian yang berubah dikirim ke PATCH agar leasing lama nonaktif tidak divalidasi ulang. Field area/pembiayaan dibagi pakai `components/transaction-fields.tsx` bersama form Transaksi Baru.
- Master (Admin): `GET /dealer-settings` (halaman nyata menggantikan `module-status`), `PATCH /dealer-settings/area-foa`, `POST /dealer-settings/leasing`, `PATCH /dealer-settings/leasing/{id}`; nama leasing unik per dealer (tanpa membedakan huruf), audit setiap perubahan, tidak hard-delete. `AreaMasterSeeder` (idempoten, upsert dari `database/data/bandung-raya.json`) dipanggil `DevelopmentDemoSeeder`; migration tetap memuat master resmi agar production dan tes terisi tanpa seeder.
- Laporan nyata: `TransactionReports` + `ReportController` — `GET /analytics/financing` (Prospek = kejadian pertama masuk Prospect, satu kali per transaksi, pilihan pembiayaan terkini; Realisasi DO = DO sah, snapshot) dan `GET /analytics/mapping-area` (DO sah, snapshot, FOA saat DO, Area lain terakhir, jumlah DO tanpa snapshot ditampilkan sebagai peringatan). Scope atribusi laporan, hanya agregat. Komponen preview/fixture dihapus dari layar; fixture tetap untuk tes. Navigasi Analisis memakai path nyata.
- Rentang bulan Sumber & Model: `period` + `to` (opsional, bawaan = period) pada `/analytics`, drilldown dan CSV; nama file CSV memuat rentang.
- Bukti: `composer ci:check` lulus (450 backend: 445 lulus, lima skip; 4.171 assertions; 38 frontend; lint/TypeScript/Pint/PHPStan bersih); `tests/Browser/run-isolated.ps1` lulus lokal. Migration lokal `aina.test` sudah terpasang; tidak ada migration/seeder non-test lain dijalankan, belum merge/deploy.
- Belum: cutover entrypoint Pelanggan dan ekstraksi detail dari halaman Pelanggan, template/preview/commit impor field baru, browser tiga ukuran × empat role, PostgreSQL concurrency ulang, unduhan PNG/CSV nyata diperiksa manual, inventaris data target sebelum rollout, keputusan FOA operasional.

## Ledger Tahap 3 (cutover dan impor) — 8 November 2026

- Cutover: halaman Pelanggan tidak lagi memiliki dialog simpan Lead/Transaksi; "Tambah Lead Baru" dan "Buat Transaksi Baru" menuju `/transactions/create` (`?customer=` memilih pelanggan lama bila terlihat dan beralokasi aktif). Rute API `customers.store` dan `customers.transactions.store` tetap sebagai adapter ke `CreateLeadTransaction`. Form baru menampilkan galat jaringan/server dengan draft utuh. Preferensi kontak Lead tidak lagi diisi saat pembuatan; tetap dapat diubah dari kartu pelanggan.
- Impor: kolom opsional medsos, kanal, area (kode atau nama), Kota Lain, pembiayaan dan leasing; template diperbarui; jalur validasi sama dengan form (`TransactionMetadata`). Catatan: kanal pada sumber non-digital ditolak di impor tetapi dibuang diam-diam di form manual (belum diselaraskan).
- Verifikasi: PostgreSQL terisolasi lulus (455 backend, 452 lulus, 3 skip, 4.277 assertions; concurrency 34 assertions). Skrip browser baru `transactions-financing-roles.js` (4 role × 3 viewport, negatif izin) plus `lead-server-save.js` ditulis ulang untuk form baru (offline, duplikat, Pelanggan Lama); `customer-duplicate.js` (dialog lama, mock) dihapus; `accessibility.js` dan `lead-contact-filters.js` (mock, dijalankan manual) disesuaikan tetapi belum dijalankan. Suite `run-isolated.ps1` lulus.

## Keputusan pemilik dan ledger tambahan — 8 November 2026

- Batas rentang laporan: maksimal 24 bulan (inklusif) pada Analisis, Pembiayaan dan Mapping Area; `ReportingPeriod::maxRangeRule` dipakai `AnalyticsRequest` dan `ReportController`; tes pada `AnalyticsTest`.
- FOA sementara (menggantikan "FOA awal kosong"): dealer baru dan dealer yang sudah ada saat migration fondasi dijalankan mendapat seluruh 16 kecamatan Kabupaten Bandung Barat (`32.17`) sebagai FOA. Admin dapat mengubahnya dari `/dealer-settings`; perubahan tidak menulis ulang snapshot DO lama. `TransactionMasters::initializeFoa` memuat default ini.
- Impor dipertahankan untuk sementara; keputusan menghapus fitur impor atau menyimpan file CSV ditunda pemilik (file masih disimpan di `storage/imports`).

## Ledger Tahap 4 (review independen, penerimaan, ekspor) — 8 November 2026

- Review independen (agent yang tidak menulis kode) atas Tahap 1–3: aturan DO/snapshot, cakupan laporan, `progress_at` dan kunci dealer/transaksi sesuai rencana; tidak ada IDOR, mass-assignment, atau kebocoran data pelanggan di laporan/CSV. Diperbaiki: pencarian Pelanggan Lama mengembalikan semua pelanggan untuk kata biasa (`normalize()` bernilai `null`, bukan teks kosong); nama Kredit Lain hilang pada impor tanpa `leasing_id`; nama leasing master tidak tampil di Detail; respons Detail usang dapat menimpa Detail lain; `leasing_id` boolean menyebabkan 500 di PostgreSQL; zona waktu aktivitas terakhir; teks FOA; hasil pencarian terpotong tanpa petunjuk. Tes baru: filter terlarang Sales/Supervisor, isi CSV tanpa data pelanggan, laporan Pembiayaan per tim.
- Ditunda (kecil/keputusan): konfirmasi meninggalkan form lewat Back, isian filter basi setelah Back, tooltip tanggal progress, FOA tanpa cek versi, aturan kanal sumber non-digital, `/analytics/export.csv` tanpa BOM dan memakai koma (CSV lain memakai BOM dan titik koma).
- Penerimaan end-to-end lewat UI nyata (`tests/Browser/acceptance-flow.js`): Pelanggan Baru → Prospect → SPK → DO; laporan Mapping Area dan Pembiayaan bertambah dan merekonsiliasi; ubah FOA dan status pantauan leasing tidak mengubah DO tercatat; batal DO mengurangi laporan; edit area/pembiayaan lalu DO ulang membuat snapshot baru; Delivery tidak menambah total; aktivitas/follow-up/komentar/edit keterangan tidak mengubah Tanggal Progress sedangkan ubah tahap mengubahnya; Pelanggan Lama via `?customer=` tidak mengubah identitas/penugasan/medsos.
- Ekspor nyata (`tests/Browser/exports-real.js`): PNG chart 2400 px, CSV chart, CSV transaksi seluruh hasil (bukan satu halaman), BOM, `;`, tanpa kolom/isi telepon-alamat-medsos-coaching, proteksi formula, rentang kosong tanpa NaN; BM 403 pada ekspor transaksi.
- Batas: PostgreSQL tidak dipakai oleh skrip browser (SQLite sementara); batas tengah malam Jakarta tidak diuji; label panjang di PNG dan isi visual PNG tidak diuji; tiga ukuran layar hanya pada skrip peran.
