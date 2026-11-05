# Matriks UAT dan Pemetaan Gap MVP

| Item | Nilai |
|---|---|
| Baseline inspeksi | `47ff7a9`, merge [PR #25](https://github.com/dswtech/aina-sms-v2/pull/25) |
| Tanggal penyusunan | 4 November 2026, Asia/Jakarta |
| Sumber kebutuhan | [PRD](PRD.md), terutama bagian 7, 11, 13, dan 14 |
| Gerbang rilis | [Roadmap Fase 6](roadmap.md#fase-6--import-hardening-dan-pilot) |
| Status UAT | **Belum dijalankan** untuk seluruh skenario; belum ada persetujuan go-live |

Dokumen ini adalah peta bukti dan panduan pengujian, bukan salinan requirement atau keputusan produk baru. Delapan puluh baris di bawah merujuk requirement kanonik di PRD. Assertion yang disebut hanya membuktikan perilaku yang benar-benar diperiksa; tes lulus tidak berarti seluruh requirement selesai. Pemeriksaan source adalah bukti statis, bukan reproduksi runtime atau hasil UAT.

## Cara membaca dan menjalankan

- Role: **A** Admin, **S** Sales, **V** Supervisor, **B** Branch Manager; **Semua** mencakup keempat role dan pengunjung tanpa login bila relevan.
- Status teknis **Parsial** berarti ada assertion relevan tetapi acceptance belum lengkap; **Belum ada** berarti assertion langsung belum ditemukan dalam suite yang diperiksa; **Gap source** berarti ada perbedaan konkret antara source dan kebutuhan; **Batas MVP** berarti larangan yang perlu dijaga; **Ditunda** berarti capability memang ditunda PRD dan bukan fitur MVP yang hilang. Status gabungan mempertahankan kedua informasi.
- Bukti E01–E24 di katalog menunjuk file dan nama tes, disertai batas assertion. Hasil suite terbaru dicatat terpisah dari cakupan. Kode G menunjuk backlog; kode A/S/V/B/X/O menunjuk skenario dan gerbang.
- Semua skenario fungsional harus dijalankan nanti oleh pemilik role dengan QA pada lingkungan UAT terisolasi yang telah disetujui. Tidak ada langkah di dokumen ini yang sudah dijalankan. Persiapan akun, manipulasi waktu/data, pengiriman email, impor, dan penyimpanan melalui UI dilakukan hanya setelah target lingkungan dan izin pelaksanaan ditetapkan; tidak memakai production atau database development bersama secara otomatis.
- Isi hasil aktual dengan waktu, commit, lingkungan, pelaksana, screenshot/rekaman tersanitasi, dan ID temuan. Jangan simpan credential, token aktivasi/reset, isi environment, atau data pelanggan nyata. Status boleh menjadi Lulus/Gagal/Terblokir hanya setelah ada bukti eksekusi.

### Data sintetis bersama

Siapkan dealer uji D1 dengan tim T1 dan T2; Admin A1, Manager B1, Supervisor V1/T1 dan V2/T2; Sales S1/S2/T1 dan S3/T2. Tambahkan akun nonaktif serta fixture dealer D2 hanya untuk uji isolasi negatif, bukan fitur multi-dealer. Credential ditetapkan pemilik akun melalui alur yang sah dan tidak ditulis di sini.

Gunakan pelanggan berlabel jelas `UAT-C1`/S1, `UAT-C2`/S2, `UAT-C3`/S3, pelanggan tanpa transaksi, pelanggan dengan dua transaksi, serta pelanggan opt-out dan pilihan kanal berbeda. Kontak harus berupa fixture yang tidak mengarah ke orang nyata; tautan telepon/WhatsApp diperiksa tanpa menghubungi penerima.

Siapkan transaksi pada tujuh tahap, tanggal aktivitas tepat sebelum/pada/setelah ambang tiga hari, follow-up kemarin/hari ini/besok, serta transaksi melintasi batas bulan UTC/Asia/Jakarta. Buat CSV valid, campuran invalid, duplikat, dan Sales di luar tim dari template unduhan; jangan unggah data asli. Untuk angka laporan, QA menyusun ledger input sintetis dan hasil hitung manual sebelum pengujian; bobot uji tidak dianggap bobot production yang telah disetujui.

## Matriks ketertelusuran — 80 referensi

Kolom UAT sengaja terpisah dari status teknis. Semua hasil masih **Belum dijalankan**, termasuk pemeriksaan batas MVP; fitur tertunda tidak memerlukan eksekusi capability yang belum masuk MVP.

### Authentication dan identity

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [IAM-01](PRD.md#71-authentication--identity-iam) | Semua | [X01](#x01) | [E01](#e01): guest dashboard redirect login; login valid authenticated, invalid tetap guest. | Parsial | Lengkapi guest request pada semua route bisnis dan sesi kedaluwarsa. | Belum dijalankan |
| [IAM-02](PRD.md#71-authentication--identity-iam) | A | [A01](#a01) | [E02](#e02): role/team tersimpan, token hash, non-Admin dan tim asing ditolak. | Parsial | Uji undangan sampai aktivasi melalui browser serta delivery email; [O01](#o01). | Belum dijalankan |
| [IAM-03](PRD.md#71-authentication--identity-iam) | A, penerima | [A01](#a01) | [E02](#e02): token kedua ditolak; expired/revoked/used tidak membocorkan email. | Parsial | Uji klik ulang dan kedaluwarsa pada lingkungan UAT tanpa mencatat token. | Belum dijalankan |
| [IAM-04](PRD.md#71-authentication--identity-iam) | A, Semua | [A02](#a02), [X01](#x01) | [E01](#e01), [E03](#e03): akun tetap ada, audit status ada, akun nonaktif tidak login dan sesi aktif dikeluarkan. | Parsial | Verifikasi riwayat bisnis lama tetap terbaca setelah offboarding. | Belum dijalankan |
| [IAM-05](PRD.md#71-authentication--identity-iam) | Semua | [X01](#x01), [V01](#v01), [B02](#b02) | [E04](#e04), [E07](#e07): route 200/403 per role; mutasi pelanggan asing 403 tanpa perubahan. | Parsial | Matriks route bukan bukti seluruh aksi/field; tambahkan kasus coaching, ekspor, dan perpindahan assignment [G09](#g09). | Belum dijalankan |
| [IAM-06](PRD.md#71-authentication--identity-iam) | A, Semua | [A02](#a02), [X01](#x01) | [E03](#e03), [E05](#e05): props tanpa password/token; reset valid redirect tanpa error, invalid ditolak. | Parsial | Belum menguji login dengan password baru/lama dan seluruh permukaan ekspor/log; email nyata [O01](#o01). | Belum dijalankan |
| [IAM-07](PRD.md#71-authentication--identity-iam) | Pengunjung | [X04](#x04) | [E05](#e05): GET dan POST `/register` menghasilkan 404. | Batas MVP | Pertahankan akses melalui undangan; bukan backlog registrasi publik. | Belum dijalankan |

### Organisasi

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [ORG-01](PRD.md#72-organization--team-org) | A | [A03](#a03) | [E06](#e06): relasi dealer/team/user dan scope dealer; field organisasi tersedia. | Parsial | Model mendukung fixture dealer lain untuk isolasi; uji operasi satu dealer dengan dua tim. | Belum dijalankan |
| [ORG-02](PRD.md#72-organization--team-org) | A | [A03](#a03) | [E06](#e06): rename, deactivate, membership ended, undangan revoked dan audit. | Parsial | Penolakan transaksi baru pada tim nonaktif serta riwayat bisnis perlu verifikasi lebih lanjut [G09](#g09). | Belum dijalankan |
| [ORG-03](PRD.md#72-organization--team-org) | A | [A03](#a03), [V01](#v01) | [E06](#e06): membership lama berakhir, dua histori tetap ada; inactive/foreign/invalid ditolak. | Parsial | Uji akses sesi yang sudah terbuka setelah penempatan berubah, termasuk Supervisor. | Belum dijalankan |
| [ORG-04](PRD.md#72-organization--team-org) | B | [B01](#b01), [B02](#b02) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Perbandingan tim tersanitasi tersedia; B01 dan UAT lintas tim belum dijalankan. | Belum dijalankan |
| [ORG-05](PRD.md#72-organization--team-org) | V, A | [V01](#v01) | [E06](#e06), [E07](#e07): scope team/query dan larangan mutasi membership oleh Supervisor. | Parsial | Uji reassignment pelanggan/lead lintas tim pada endpoint dan sesi nyata [G09](#g09). | Belum dijalankan |
| [ORG-06](PRD.md#72-organization--team-org) | V | [V02](#v02) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Target management, markup, benchmark dan alokasi personal diuji pada [E28](#e28); penerimaan Supervisor belum dijalankan. | Belum dijalankan |
| [ORG-07](PRD.md#72-organization--team-org) | A | [A02](#a02) | [E03](#e03): daftar user/undangan satu dealer dan filter inactive/query tepat. | Parsial | Periksa label semua status dan resend/revoke di UI. | Belum dijalankan |

### Customer dan lead

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [CRM-01](PRD.md#73-customer--lead-crm) | S, V | [S01](#s01) | [E08](#e08): Customer, assignment Sales terotorisasi, pelaku histori, estimasi bulan closing dan tahap Lead tersimpan. | Terverifikasi teknis | Pilihan PIC dan preservasi penugasan pelanggan lama diuji pada [G05](#g05); UAT manusia belum dijalankan. | Belum dijalankan |
| [CRM-02](PRD.md#73-customer--lead-crm) | S, V | [S01](#s01) | [E09](#e09): warning tanpa write, konfirmasi identitas existing, akses terkini dan regresi batal/lanjut browser. | Terverifikasi teknis | UAT manusia belum dijalankan; batas bukti dan revalidasi import di [G04](#g04). | Belum dijalankan |
| [CRM-03](PRD.md#73-customer--lead-crm) | S | [S02](#s02), [X01](#x01) | [E07](#e07), [E08](#e08): daftar hanya assigned; aktivitas/follow-up/stage asing 403 tanpa mutasi. | Parsial | Uji semua aksi termasuk komentar dan akses transaksi setelah perpindahan Customer. | Belum dijalankan |
| [CRM-04](PRD.md#73-customer--lead-crm) | V | [V01](#v01) | [E10](#e10): histori assignment model tetap dua; endpoint reassignment yang dites memakai Admin. | Parsial | Belum membuktikan endpoint Supervisor sukses maupun penolakan lintas tim [G09](#g09). | Belum dijalankan |
| [CRM-05](PRD.md#73-customer--lead-crm) | A | [A04](#a04) | [E07](#e07): query Customer Admin memuat D1 dan mengecualikan D2; [E11](#e11) redaksi audit. | Parsial | Akses baca riwayat lengkap dan batas aksi Admin/coaching perlu [G06](#g06). | Belum dijalankan |
| [CRM-06](PRD.md#73-customer--lead-crm) | S, V | [S02](#s02) | [E08](#e08): pencarian/sort; [E19](#e19): filter tanggal Jakarta/sumber, scope dan preservasi tab di [G05](#g05). | Parsial / Gap verifikasi | Filter baru terverifikasi teknis; seluruh kombinasi/pagination/posisi scroll serta konsistensi stagnant [G07](#g07) tetap perlu verifikasi lanjutan. | Belum dijalankan |
| [CRM-07](PRD.md#73-customer--lead-crm) | B | [B02](#b02) | [E07](#e07): route Customer B ditolak; [E18](#e18): drilldown tanpa phone/address/notes. | Parsial | Tidak ada assertion langsung atas seluruh props dashboard B; audit data turunannya [G09](#g09). | Belum dijalankan |
| [CRM-08](PRD.md#73-customer--lead-crm) | S | [S03](#s03) | [E10](#e10): transaksi baru pada Customer existing, count satu dan tahap Lead. | Parsial | Fixture tes mulai tanpa transaksi; belum membuktikan dua transaksi dan pemilihan riwayat lama [G06](#g06). | Belum dijalankan |
| [CRM-09](PRD.md#73-customer--lead-crm) | S | [S02](#s02) | [E08](#e08): daftar assigned dan pencarian nama/nomor. | Parsial | Tab follow-up/overdue/stagnant belum mempunyai assertion hasil query per kondisi [G09](#g09). | Belum dijalankan |
| [CRM-10](PRD.md#73-customer--lead-crm) | S | [S02](#s02), [S04](#s04) | [E08](#e08), [E12](#e12): data history/activities, timestamp dan nextFollowUp; [E20](#e20) rendering fixture. | Parsial | Lengkapi assertion seluruh field item dari server dan inspeksi mobile/desktop. | Belum dijalankan |
| [CRM-11](PRD.md#73-customer--lead-crm) | S | [S03](#s03), [S04](#s04) | [E12](#e12): aktivitas/follow-up tersimpan; [E10](#e10): transaksi baru; [E20](#e20): nama link dan fokus dialog. | Parsial | Link perangkat tidak diuji menghubungi penerima; uji hasil tersimpan dari UI terpisah. | Belum dijalankan |
| [CRM-12](PRD.md#73-customer--lead-crm) | S, V, A | [S03](#s03), [A04](#a04) | [E08](#e08): satu history dan recent activity benar. | Parsial / Gap source | Props hanya memilih satu deal dan sepuluh aktivitas; histori seluruh transaksi belum tersedia [G06](#g06). | Belum dijalankan |
| [CRM-13](PRD.md#73-customer--lead-crm) | V, A | [A04](#a04), [V01](#v01) | [E10](#e10): assignment lama ended dan dua record tetap ada. | Parsial | Belum mengassert aktivitas/transaksi tak berubah dan otoritas Sales lama/baru setelah alih tugas. | Belum dijalankan |
| [CRM-14](PRD.md#73-customer--lead-crm) | V, A, B | [V01](#v01), [B02](#b02) | [E07](#e07), [E18](#e18): scope Customer/query, route B 403 dan sanitasi drilldown. | Parsial | Query model B memuat Customer; perlindungan HTTP harus tetap diuji di semua jalur [G09](#g09). | Belum dijalankan |
| [CRM-15](PRD.md#73-customer--lead-crm) | S, V | [S04](#s04), [X04](#x04) | [E13](#e13): pembaruan preference/opt-out sesuai akses, audit dan gating aksi telepon/WhatsApp. | Terverifikasi teknis | Data legacy bukan bukti opt-in; skenario manusia dan kanal nyata belum diuji, batas bukti di [G05](#g05). | Belum dijalankan |

### Pipeline

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [PIP-01](PRD.md#74-sales-pipeline-pip) | S, V | [S05](#s05) | [E14](#e14): from/to/actor/notes dan satu history; stage saat ini berubah. | Parsial | Dua transisi berurutan, timestamp, rollback dan append-only negatif belum diassert. | Belum dijalankan |
| [PIP-02](PRD.md#74-sales-pipeline-pip) | S, V, B | [S05](#s05), [X03](#x03) | [E20](#e20): tujuh label badge, warna berbeda dan kontras; [E14](#e14) sebagian transisi. | Parsial | Fixture tujuh badge bukan bukti seluruh perjalanan pipeline dari server. | Belum dijalankan |
| [PIP-03](PRD.md#74-sales-pipeline-pip) | S, V | [S05](#s05) | [E14](#e14): tanpa konfirmasi throws; dengan konfirmasi SPK dan timestamp ada. | Parsial / Keputusan | Bukti booking fee final belum ditetapkan PRD bagian 14; [G12](#g12). | Belum dijalankan |
| [PIP-04](PRD.md#74-sales-pipeline-pip) | S, V | [S05](#s05) | [E14](#e14), [E08](#e08): alasan kosong ditolak; enum alasan dan catatan Lost tersimpan. | Parsial | Uji pilihan katalog, validasi UI dan percobaan tahap tidak sah. | Belum dijalankan |
| [PIP-05](PRD.md#74-sales-pipeline-pip) | S, V | [S04](#s04), [V02](#v02) | [E14](#e14): empat hari stagnant, closed tidak; [E12](#e12) aktivitas menghapus stagnant. | Parsial / Gap source | Accessor fallback created_at dan batas `<` berbeda dari filter SQL last_activity_at `<=`; [G07](#g07). | Belum dijalankan |
| [PIP-06](PRD.md#74-sales-pipeline-pip) | S, V | [S04](#s04) | [E12](#e12): activity, actor dan timestamp Customer/deal diperbarui. | Parsial | Belum mengassert tahap tetap sama serta endpoint positif Supervisor. | Belum dijalankan |
| [PIP-07](PRD.md#74-sales-pipeline-pip) | S, V | [S05](#s05) | [E07](#e07): closed Delivery menolak perubahan dengan 403, tahap tetap Delivery. | Parsial | Mekanisme koreksi berwenang dan kelestarian histori perlu konfirmasi/tes [G09](#g09). | Belum dijalankan |

### Conversation dan coaching

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [CVS-01](PRD.md#75-conversation--coaching-cvs) | S, V, A | [S06](#s06), [V03](#v03) | [E08](#e08) history/activity; [E16](#e16) komentar tersimpan, tanpa assertion timeline gabungan. | Parsial / Gap source | UI memisahkan riwayat tahap, aktivitas dan coaching; belum timeline kronologis tunggal [G06](#g06). | Belum dijalankan |
| [CVS-02](PRD.md#75-conversation--coaching-cvs) | S, V | [S06](#s06), [V03](#v03) | [E16](#e16), [E25](#e25): Sales/Supervisor terkait boleh menulis; actor asing ditolak sebelum validasi; snapshot server tidak berubah saat edit/tahap berganti. | Parsial | G01 ditutup teknis pada branch perbaikan; UAT dan gerbang operasional tetap terbuka. | Belum dijalankan |
| [CVS-03](PRD.md#75-conversation--coaching-cvs) | A | [A04](#a04) | [E25](#e25): Admin membaca, can_comment/can_edit false; create/edit komentar Admin ditolak, termasuk komentar lama miliknya. | Parsial | Penulisan sudah dibatasi; inspeksi revisi audit lengkap masih [G06](#g06), UAT belum dijalankan. | Belum dijalankan |
| [CVS-04](PRD.md#75-conversation--coaching-cvs) | B | [B02](#b02) | [E04](#e04) menolak Customer/Transaksi B; belum mengetes endpoint komentar atau body bocor. | Parsial | Tambahkan HTTP negatif komentar/edit serta pemeriksaan laporan/email [G09](#g09). | Belum dijalankan |
| [CVS-05](PRD.md#75-conversation--coaching-cvs) | S, V | [S06](#s06) | [E16](#e16), [E25](#e25): reply satu tingkat berhasil; parent reply/deal lain/tidak ada/nol/negatif ditolak tanpa mutasi/notifikasi. | Parsial | Backend dan kontrol reply root diuji; UAT conversation belum dijalankan. | Belum dijalankan |
| [CVS-06](PRD.md#75-conversation--coaching-cvs) | S, V | [S06](#s06) | [E16](#e16), [E25](#e25): edit milik sendiri pada 299 detik diizinkan, 300/301 ditolak; actor lain ditolak dan snapshot tetap. | Parsial | Boundary diuji mengikuti implementasi strict lima menit; penerimaan pengguna masih diperlukan. | Belum dijalankan |
| [CVS-07](PRD.md#75-conversation--coaching-cvs) | S, V, A | [S06](#s06), [A04](#a04) | [E16](#e16): count revision satu dan old_body benar. | Parsial / Gap source | edited_by/time belum diassert; belum ada route/props inspeksi revisi bagi Admin [G06](#g06). | Belum dijalankan |
| [CVS-08](PRD.md#75-conversation--coaching-cvs) | Semua | [S06](#s06), [X01](#x01) | Belum ada assertion delete komentar; policy delete false dan route delete tidak ada pada source. | Belum ada | Tambahkan uji DELETE ditolak dan record/revision tetap ada [G09](#g09). | Belum dijalankan |
| [CVS-09](PRD.md#75-conversation--coaching-cvs) | S, V | [V03](#v03), [O01](#o01) | [E25](#e25): notifikasi database metadata, job tanpa body, worker retry/recovery enqueue dan otorisasi ulang; SMTP template dikonfirmasi Mailtrap CLI. | Parsial | Intent durable/tautan transaksi sudah tersedia; SLA, provider production, worker/scheduler deployment dan UAT tetap terbuka. | Belum dijalankan |
| [CVS-10](PRD.md#75-conversation--coaching-cvs) | S, V | [X04](#x04) | Belum ada assertion lampiran; request komentar hanya body/parent_id. | Ditunda | Lampiran di luar MVP; cek tidak ada kontrol/jalur upload coaching aktif. | Belum dijalankan |

### Impor

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [IMP-01](PRD.md#76-csv-import-imp) | A, V | [A05](#a05), [V01](#v01) | [E17](#e17): Admin upload; Sales luar tim V rejected_count satu. | Parsial | Supervisor upload valid, batch aktor asing dan akses file belum diassert [G10](#g10). | Belum dijalankan |
| [IMP-02](PRD.md#76-csv-import-imp) | A, V | [A05](#a05) | [E17](#e17): accepted satu/rejected satu pada preview. | Parsial | Belum mengassert isi errors per baris dan nihil Customer sebelum commit. | Belum dijalankan |
| [IMP-03](PRD.md#76-csv-import-imp) | A, V | [A05](#a05) | [E17](#e17): commit campuran menghasilkan tepat satu Customer dan satu transaksi. | Parsial | Uji koreksi/resubmit, rollback gagal, duplikat dalam file dan double submit [G10](#g10). | Belum dijalankan |
| [IMP-04](PRD.md#76-csv-import-imp) | A, V | [A05](#a05) | [E17](#e17): batch ditemukan, count preview; tidak mengassert seluruh metadata audit. | Parsial | Verifikasi actor, waktu, nama file, status dan jumlah di riwayat, termasuk penolakan akses batch. | Belum dijalankan |
| [IMP-05](PRD.md#76-csv-import-imp) | A, V | [A05](#a05) | [E17](#e17): template hanya assertOk. | Parsial | Assertion header/MIME/nama file/isi contoh dan kesesuaian form belum ada. | Belum dijalankan |

### Dashboard

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [DSH-01](PRD.md#77-dashboard--reporting-dsh) | V | [V02](#v02) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | Periode/scope dan sumber realisasi diuji E26/E27; UAT serta benchmark volume masih terbuka. | Belum dijalankan |
| [DSH-02](PRD.md#77-dashboard--reporting-dsh) | V | [V02](#v02) | [E21](#e21): data Sales lain tidak dihitung dalam dashboard Sales. | Parsial | Belum memeriksa performance per Sales untuk V serta scope lintas tim [G09](#g09). | Belum dijalankan |
| [DSH-03](PRD.md#77-dashboard--reporting-dsh) | V | [V02](#v02), [V03](#v03) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Daftar stagnant, unread pribadi berizin dan peluang closing tersedia; daftar kondisi operasional saat ini diberi label. | Belum dijalankan |
| [DSH-04](PRD.md#77-dashboard--reporting-dsh) | B | [B01](#b01), [B02](#b02) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | Perbandingan tim dan scope dealer tersedia; konsistensi total/rincian diuji E26/E27, UAT belum dijalankan. | Belum dijalankan |
| [DSH-05](PRD.md#77-dashboard--reporting-dsh) | A | [A04](#a04) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Scope agregat dealer dan target diuji E26; UAT audit serta PostgreSQL/performa belum dijalankan. | Belum dijalankan |
| [DSH-06](PRD.md#77-dashboard--reporting-dsh) | V, B | [X04](#x04) | Belum ada assertion penjadwalan/ekspor dashboard penuh. | Ditunda | Memang pasca-MVP; ekspor Analisis tetap diuji lewat B01. | Belum dijalankan |

### Forecast

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [FCT-01](PRD.md#78-sales-forecasting-fct) | V, B | [V02](#v02), [B01](#b01) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | Batas Jakarta, sumber Delivery, scope dan instan UTC diuji E26/E27; bobot production dan gerbang performa masih terbuka. | Belum dijalankan |
| [FCT-02](PRD.md#78-sales-forecasting-fct) | V, B, PO | [V02](#v02), [O05](#o05) | Belum assertion konfigurasi bobot; [config forecast][forecast-source] masih approved=false. | Belum ada / Keputusan | Bobot dev tersedia server-side, persetujuan production belum ada [G12](#g12). | Belum dijalankan |
| [FCT-03](PRD.md#78-sales-forecasting-fct) | V, B | [V02](#v02), [X03](#x03) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Forecast diberi label estimasi/bobot belum disetujui; bulan lampau null. UAT belum dijalankan. | Belum dijalankan |
| [FCT-04](PRD.md#78-sales-forecasting-fct) | V, B | [V02](#v02), [B01](#b01) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Forecast dan kedua basis gap management/benchmark tersedia; histori alokasi dan presisi empat desimal diuji pada [E28](#e28). | Belum dijalankan |
| [FCT-05](PRD.md#78-sales-forecasting-fct) | V, B | [V02](#v02) | [E26](#e26): target/kinerja/periode dan sanitasi sesuai skenario G02; bukti awal tetap historis. | Parsial | Kontributor tersanitasi diurutkan nilai berbobot pada estimasi bulan terpilih; penerimaan operasional belum dijalankan. | Belum dijalankan |
| [FCT-06](PRD.md#78-sales-forecasting-fct) | V, B | [X04](#x04) | Belum assertion fitur AI; source memakai bobot konfigurasi statis. | Ditunda | Pembelajaran otomatis bukan kekurangan MVP; jangan mengusulkan AI untuk menutup gap rumus. | Belum dijalankan |

### UX

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [UIX-01](PRD.md#79-user-experience-uix) | Semua | [X03](#x03) | [E20](#e20): scrollWidth=innerWidth pada viewport uji; [QA terdahulu][qa] 108 keadaan halaman awal. | Parsial | Seluruh state terbuka/landscape/zoom belum tercakup; [G11](#g11). | Belum dijalankan |
| [UIX-02](PRD.md#79-user-experience-uix) | Semua | [X03](#x03) | [E20](#e20): jumlah baris terlihat sesuai tabel/kartu pada 390/768/1440. | Parsial / Gap source | Impor tetap tabel min-width di mobile; kesetaraan semua field belum diassert [G08](#g08). | Belum dijalankan |
| [UIX-03](PRD.md#79-user-experience-uix) | S, V, A | [S02](#s02), [X03](#x03) | [E20](#e20): fokus detail, Escape, footer grid tidak overlap dan tidak ikut scroll. | Parsial | Dialog dari daftar Transaksi dan kembalinya filter/posisi hasil server belum dibuktikan. | Belum dijalankan |
| [UIX-04](PRD.md#79-user-experience-uix) | S, V | [X03](#x03) | Belum assertion posisi awal daftar terhadap tinggi filter. | Belum ada | Ukur pada 390px; filter/tab Pelanggan masih dapat memakan banyak layar; [G11](#g11). | Belum dijalankan |
| [UIX-05](PRD.md#79-user-experience-uix) | Semua | [X03](#x03) | [E20](#e20): ukuran target, nama kontak, keyboard menu/combobox dan pengembalian fokus. | Parsial | Pembaca layar nyata, forced colors dan semua kontrol/state belum diuji [G11](#g11). | Belum dijalankan |
| [UIX-06](PRD.md#79-user-experience-uix) | Semua | [X02](#x02) | [E20](#e20): error form fixture, combobox kosong, daftar kosong; bukan semua blok. | Parsial | Uji loading/error/stale per blok, kegagalan parsial dan retry [G11](#g11). | Belum dijalankan |
| [UIX-07](PRD.md#79-user-experience-uix) | Semua | [X02](#x02), [X04](#x04) | Belum assertion kehilangan koneksi; tidak ada bukti antrean offline dari tes yang diperiksa. | Batas MVP / Belum ada | Offline sync/PWA ditunda, tetapi pesan gagal koneksi tetap perlu diverifikasi [G11](#g11). | Belum dijalankan |
| [UIX-08](PRD.md#79-user-experience-uix) | Semua | [X04](#x04) | Tidak ada assertion platform native dalam suite web. | Batas MVP | Native di luar MVP; bukti pemeriksaan distribusi web dicatat saat UAT. | Belum dijalankan |

### Analisis

| Referensi PRD | Role | Skenario | Bukti assertion | Status teknis | Keterbatasan dan sisa pekerjaan | UAT |
|---|---|---|---|---|---|---|
| [ANL-01](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01), [V02](#v02) | [E18](#e18): component analytics, mode, sumber dan model benar pada fixture server. | Parsial / Gap source | Dashboard belum punya pemilihan periode yang setara Analisis [G03](#g03). | Belum dijalankan |
| [ANL-02](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01) | [E18](#e18): source walk_in, delivery satu, conversion 100. | Parsial | Belum mengassert total/share, seluruh tahap dan beberapa sumber; rekonsiliasi ledger [G09](#g09). | Belum dijalankan |
| [ANL-03](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01) | [E18](#e18): nama model Creta benar, bukan jumlah/porsi model. | Parsial | Tambahkan model majemuk, SPK/DO/Delivery dan porsi [G09](#g09). | Belum dijalankan |
| [ANL-04](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | Rekonsiliasi sumber/model, transaksi unik dan penyebut diuji E27; penerimaan operasional belum dijalankan. | Belum dijalankan |
| [ANL-05](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | Jendela Jakarta dan mode Akuisisi/Pencapaian diuji E27 pada SQLite/PostgreSQL; tidak ada conversion Pencapaian. | Belum dijalankan |
| [ANL-06](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | ID drilldown dan himpunan transaksi sumber diuji E27; UAT konteks navigasi penuh masih terbuka. | Belum dijalankan |
| [ANL-07](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B02](#b02), [V01](#v01) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | Scope tim transaksi, perpindahan/ended membership dan sanitasi mengikuti E27; UAT lintas role belum dijalankan. | Belum dijalankan |
| [ANL-08](PRD.md#710-analisis-penjualan-anl) | V, B, A | [B01](#b01) | [E27](#e27), [E26](#e26): rekonsiliasi laporan, scope dan PostgreSQL; bukti awal tetap historis. | Parsial | CSV mengikuti periode/scope dan direkonsiliasi E27. Bukti PDF/print dan gap lain tetap G08. | Belum dijalankan |
| [ANL-09](PRD.md#710-analisis-penjualan-anl) | V, B | [X04](#x04) | Belum assertion Area/MSCP; PRD secara eksplisit menunda. | Ditunda | Menunggu lokasi terstruktur serta modul leasing/definisi MSCP; bukan penghambat MVP. | Belum dijalankan |

## Katalog bukti otomatis

E01–E24 mencatat inspeksi baseline awal; E25 mencatat tindak lanjut G01 pada 5 November 2026. Perubahan bukti teknis tidak mengubah hasil UAT menjadi lulus.

Katalog ini mengikat nama tes pada assertion yang dibaca di baseline; tidak menggunakan nama file sebagai bukti kelulusan requirement. Semua tes PHP di bawah termasuk suite `composer ci:check`, kecuali bagian browser E20. Detail hasil run ada pada bagian verifikasi.

### E01

[AuthenticationTest](../../tests/Feature/Auth/AuthenticationTest.php): `test_users_can_authenticate_using_the_login_screen`, `test_users_can_not_authenticate_with_invalid_password`, `test_inactive_users_can_not_authenticate`, `test_users_can_logout` dan rate limit memeriksa authenticated/guest, redirect/error dan 429. [DashboardTest](../../tests/Feature/DashboardTest.php): `test_guests_are_redirected_to_the_login_page`, `test_inactive_authenticated_users_are_logged_out`, `test_authenticated_user_props_use_a_safe_allowlist` memeriksa redirect login, guest, tepat tujuh field auth, dan absennya password/remember_token/supervisor_id.

### E02

[InvitationActivationTest](../../tests/Feature/Auth/InvitationActivationTest.php): `lets a same-dealer admin create and deliver a hashed single-use invitation` memeriksa dealer/team/role, hash token, notification fake dan audit. `shows valid invitation details and activates the account atomically` memeriksa user, membership, accepted_at, penggunaan kedua ditolak, count user satu. `renders safe terminal states and rejects expired revoked and used tokens`, `rejects unknown tokens without leaking invitation data`, serta tes kombinasi role/team/foreign dan inactive memeriksa validasi serta field yang tidak bocor. Notification fake tidak membuktikan delivery email.

### E03

[UserLifecycleTest](../../tests/Feature/Admin/UserLifecycleTest.php): `lists only users and invitations in the admin dealer` memeriksa jumlah/field dan absennya credential; `filters the lifecycle list by status and query` memeriksa satu inactive dan filters. `resends and revokes a pending same-dealer invitation with audit records` memeriksa hash berubah, expiry, fake notification dan audit; `deactivates and reactivates a same-dealer user without deleting history` memeriksa user tetap ada dan audit. Tes negatif memeriksa foreign/non-Admin/self/terminal. Nama tes preservation tidak mengassert seluruh riwayat bisnis.

### E04

[RoleRouteAccessTest](../../tests/Feature/Access/RoleRouteAccessTest.php): `enforces the server route scope for each role` menjalankan dataset empat role dan mengassert GET route allowed 200 serta denied 403. Tidak memeriksa isi placeholder, mutasi POST/PATCH/DELETE, atau sanitasi semua props.

### E05

[PublicRegistrationDisabledTest](../../tests/Feature/Auth/PublicRegistrationDisabledTest.php): `test_public_registration_routes_are_disabled` memeriksa GET/POST register 404. [PasswordResetTest](../../tests/Feature/Auth/PasswordResetTest.php): notification fake untuk reset, `test_password_can_be_reset_with_valid_token` memeriksa tanpa error dan redirect login, `test_password_cannot_be_reset_with_invalid_token` memeriksa error email; tidak mengassert password baru bisa login. Suite reset memakai guard fitur Fortify.

### E06

[OrganizationModelTest](../../tests/Feature/Organization/OrganizationModelTest.php) dan [OrganizationSchemaTest](../../tests/Feature/Organization/OrganizationSchemaTest.php) memeriksa relasi dan kolom organisasi. [TeamPlacementTest](../../tests/Feature/Admin/TeamPlacementTest.php): `creates renames and deactivates a team while closing active memberships`, `assigns reassigns and closes membership while preserving history`, dan tes negatif memeriksa status, ended_at, jumlah histori, audit dan validasi. [OrganizationPolicyTest](../../tests/Feature/Access/OrganizationPolicyTest.php) mengassert Gate/query scope active/ended/foreign dan Admin-only mutation; tidak mengassert semua endpoint bisnis.

### E07

[CustomerAccessScopeTest](../../tests/Feature/Customer/CustomerAccessScopeTest.php): `enforces customer visibility scope for each role and rejects cross-team access` mengassert ID pada query visibleTo, termasuk B pada level model dan kosong untuk inactive. [CustomerAuthorizationTest](../../tests/Feature/Customer/CustomerAuthorizationTest.php) mengassert 403 serta nihil aktivitas/follow-up untuk Sales asing, stage asing tetap Prospect, closed tetap Delivery, route Customer B 403, dan Supervisor boleh mengubah tahap transaksi tim.

### E08

[CustomerControllerTest](../../tests/Feature/Customer/CustomerControllerTest.php): `renders Buku Pelanggan Saya for sales with only their assigned customers`, `filters customers by search query (name or phone)`, dan `sorts the customer list by name and ignores unknown sort columns` mengassert hasil Inertia. `creates a new lead with customer, transaction, and initial assignment in one transaction` memeriksa normalisasi, pemilik dan model/stage. `logs activity for a customer and updates timestamps`, `schedules next follow up for a customer`, `updates deal stage with audit and validation`, serta `exposes stage history and recent activities for the transaction detail view` memeriksa hasil tersimpan/field terkait; tidak membuktikan semua detail pada judul tes, misalnya tidak ada assertion audit log pada tes update stage.

Tambahan G05: [LeadSalesAssignmentTest](../../tests/Feature/Customer/LeadSalesAssignmentTest.php) memeriksa PIC pilihan SPV/Admin, self-assignment Sales, wajib memilih, kandidat nonaktif/lintas dealer/role salah/di luar tim, histori tetap menunjuk pembuat, estimasi closing, tim nonaktif dan preservasi penugasan duplikat. Pelanggan existing tanpa PIC Sales aktif tidak menggunakan Admin sebagai fallback pemilik transaksi.

### E09

[DuplicateCustomerWarningTest](../../tests/Feature/Customer/DuplicateCustomerWarningTest.php) memeriksa nomor ternormalisasi dan batas dealer. [DuplicateLeadConfirmationTest](../../tests/Feature/Customer/DuplicateLeadConfirmationTest.php) memeriksa warning tanpa Customer/assignment/transaksi/histori baru, konfirmasi oleh Sales/SPV/Admin yang mempertahankan identitas/assignment, draft peluang dan audit, UUID forged/nomor tidak cocok/dealer lain, kandidat inaccessible, perubahan assignment sebelum baca/konfirmasi, kandidat legacy ganda serta nomor dengan spasi. [CustomerAuthorizationTest](../../tests/Feature/Customer/CustomerAuthorizationTest.php) kini mengassert penolakan duplikat sebelum write. [ImportTest](../../tests/Feature/ImportTest.php) memeriksa nomor berulang sesama CSV serta duplikat yang muncul sesudah preview, dengan rollback seluruh batch.

[Regresi browser G04](../../tests/Browser/customer-duplicate.js) memeriksa 18 kombinasi role Sales/SPV/Admin × 390/768/1440 × terang/gelap: draft dipertahankan, batal tanpa submit tambahan, konfirmasi UUID existing, fokus keyboard, overflow dan teks kandidat tidak terpotong. Skenario tambahan mencakup nomor ditempel dengan spasi, pelanggan inaccessible, perubahan nomor, kandidat stale dan error HTTP/jaringan. Dokumen sintetis memakai aset aplikasi asli, semua submit diintersep; otorisasi/persistensi dibuktikan feature test terpisah. Ini bukan UAT manusia atau bukti concurrency multikoneksi PostgreSQL. Rincian di [catatan G04](implementation-g04-duplicate-confirmation.md).

### E10

[CustomerAssignmentTest](../../tests/Feature/Customer/CustomerAssignmentTest.php): `assigns customer to sales and closes previous assignment with history intact` memeriksa actor/ended_at, activeAssignment dan dua histori pada model. [CustomerPipelineExtensionTest](../../tests/Feature/Customer/CustomerPipelineExtensionTest.php): `creates a new transaction for an existing customer` mengassert satu transaksi Lead pada Customer tanpa transaksi sebelumnya; `reassigns customer to another sales and keeps history` memakai Admin untuk PATCH dan mengassert owner serta dua assignment, bukan endpoint positif Supervisor.

### E11

[AuditRecorderTest](../../tests/Feature/Audit/AuditRecorderTest.php): `records actor action subject timestamp and redacted before after data` mengassert actor/action/subject/waktu dan redaksi before/after/context. `never persists common credential fields through context aliases` memeriksa sejumlah alias credential. Ini tidak membuktikan adanya layar audit atau bahwa semua operasi bisnis sudah memanggil recorder.

### E12

[CustomerActivityTest](../../tests/Feature/Customer/CustomerActivityTest.php): `logs customer activity and automatically updates customer last_contact_at and deal last_activity_at` memeriksa customer/deal/actor/type, timestamp dan stagnant menjadi false. [FollowUpScheduleTest](../../tests/Feature/Customer/FollowUpScheduleTest.php): `schedules next follow up and provides the nearest pending follow up for a customer` memeriksa jadwal terdekat pending, lalu jadwal berikut setelah yang pertama completed; operasi model, bukan browser.

### E13

[CustomerSchemaTest](../../tests/Feature/Customer/CustomerSchemaTest.php): `creates a customer with required attributes and casts` memeriksa normalisasi, relasi dan opt_out false; `supports opt_out and channel preferences` memeriksa opt_out true/preference phone pada model. Tidak membuktikan form edit consent atau perilaku aksi kontak.

Tambahan G05: [ContactPreferencesTest](../../tests/Feature/Customer/ContactPreferencesTest.php) memeriksa endpoint update, audit sebelum/sesudah, validasi dan penolakan akses Sales lain/manager/dealer lain, pencatatan awal serta preservasi consent pada konfirmasi G04. [Tes frontend kontak](../../tests/Frontend/customer-contact.test.mjs) memeriksa penolakan global serta kanal pilihan/legacy. [Browser G05](../../tests/Browser/lead-contact-filters.js) memeriksa pembaruan langsung seluruh aksi kontak dan error request tanpa mengaktifkan consent yang belum tersimpan.

### E14

[StageTransitionTest](../../tests/Feature/Pipeline/StageTransitionTest.php): `records stage transition with append-only history and updates current stage` memeriksa satu perpindahan Lead→Prospect dan field histori; tes SPK/Lost memeriksa exception serta hasil dengan konfirmasi/alasan. [DealTransactionTest](../../tests/Feature/Pipeline/DealTransactionTest.php): initial Lead, relasi, dan `calculates stagnant status when active deal has no activity for more than 3 days` menguji empat hari dan pengecualian closed; bukan batas tepat tiga hari atau semua filter SQL.

### E15

[TargetManagementTest](../../tests/Feature/TargetManagementTest.php): `lets a supervisor set a target for sales in their team and audits changes` memeriksa target_units 8, satu revision dan changed_by_id; `rejects target changes for sales outside the supervisor team` memeriksa 403. Belum update target existing, team target, old/new values lengkap dan timestamp.

### E16

[DealCommentTest](../../tests/Feature/Customer/DealCommentTest.php): `creates a comment and reply on a deal` memeriksa body awal dan jumlah dua komentar; `allows author to edit comment within 5 minutes and stores revision` mengedit langsung lalu memeriksa body baru, satu revision, old_body. Tidak ada time travel, dispatch notifikasi, boundary edit, role negatif, delete, kedalaman reply atau audit read Admin dalam kedua tes tersebut.

### E17

[ImportTest](../../tests/Feature/ImportTest.php): `previews and imports valid csv rows` memakai CSV campuran, memeriksa accepted/rejected satu, redirect commit serta tepat satu Customer dan satu transaksi. `rejects sales outside supervisor team` hanya memeriksa rejected_count satu. `downloads csv template` hanya memeriksa 200. Belum memeriksa nihil mutasi bisnis saat preview, error detail, metadata batch, kepemilikan, double submit atau file access.

### E18

[AnalyticsTest](../../tests/Feature/AnalyticsTest.php): `shows acquisition analysis by source and model with conversion` memeriksa component/mode/source/delivery satu/conversion 100/model Creta; `hides conversion in achievement mode and sanitizes drilldown` memeriksa achievement, conversion null, satu drilldown, absennya phone/address/notes. Tidak ada request CSV, capture PDF, pemeriksaan coaching field, multi-cohort atau timezone boundary.

### E19

[TransactionPageTest](../../tests/Feature/TransactionPageTest.php): `shows transactions page for sales` mengassert component dan satu item; `updates transaction stage from transactions page` mengassert stage Prospect setelah PATCH. Tidak mengassert hasil filter kombinasi, pagination, posisi scroll atau close dialog.

Tambahan G05: [TransactionFiltersTest](../../tests/Feature/TransactionFiltersTest.php) memeriksa rentang tanggal pembuatan inklusif menurut Asia/Jakarta, batas UTC di kedua ujung, kombinasi sumber/scope Sales, opsi sumber tersanitasi, source `0` dan parameter invalid. Browser G05 memeriksa query tanggal/sumber tetap pada perubahan tab, enam viewport/tema serta input PIC tiga role. Browser memakai fixture sintetis; persistensi/otorisasi diuji feature test terpisah.

### E20

[Browser accessibility](../../tests/Browser/accessibility.js): 16 kelompok regresi, termasuk `keyboard can select theme, text size and accent in the user menu`, `mobile contact links have action names`, `long detail focuses visible content and returns to its opener`, `customer detail keeps its action grid readable and visible`, `all primary theme pairs and hover states meet normal text contrast`, combobox, target sentuh, label/error/landmark, tujuh badge dan dua kelompok striped rows. Assertion memeriksa DOM, fokus, geometri, kontras, background serta overflow pada fixture komponen nyata. Mutasi diintersep; bukan tes simpan melalui server. Hasil historis dan batas cakupan tersedia di [laporan QA][qa]; browser belum masuk CI.

Tambahan G05: suite aksesibilitas diselaraskan dengan kanal valid, disclosure dashboard dan editor target bulanan. Audit akhir 21 kelompok lulus/0 gagal; kontrol/fokus/footer/kontras/nama aksi dan keyboard tetap diperiksa. Browser G05 dan G04 lulus, semuanya memakai fixture/intersepsi write. Bukti dan batas ada di [catatan G05](implementation-g05-lead-contact-filters.md) serta [laporan QA][qa].

### E21

[DashboardMetricsTest](../../tests/Feature/DashboardMetricsTest.php): `reconciles sales dashboard metrics to visible source transactions` memeriksa targetUnits 5, realizationUnits 1, gapUnits 4, hot_prospect/delivery satu; `does not expose another sales dashboard data` memeriksa realisasi/stage Delivery nol. Tidak ada assertion forecastUnits, forecastValue, Supervisor/Manager multi-tim, batas periode atau kinerja per Sales.

### E22

[SecurityHeadersTest](../../tests/Feature/SecurityHeadersTest.php): `sends security headers on web responses` memeriksa nosniff, SAMEORIGIN, referrer policy; `exposes laravel health endpoint` memeriksa `/up` 200. Bukan bukti alert production, kesiapan dependency atau observability menyeluruh.

### E23

[PHPUnit config](../../phpunit.xml) memakai SQLite `:memory:`, mail array dan queue sync. [Workflow CI](../../.github/workflows/tests.yml) menjalankan setup/build melalui `composer setup`, lalu `composer ci:check`; belum ada browser step atau PostgreSQL service. [ADR database](adr/ADR-002-postgresql.md) tetap mensyaratkan pengujian PostgreSQL terisolasi ketika perilaku bergantung fiturnya. Bukti PostgreSQL Fase 1 di memory bersifat historis, bukan pengulangan seluruh baseline ini.

### E24

[TestCase](../../tests/TestCase.php) menjalankan `markTestSkipped` bila fitur Fortify tidak aktif. Tiga tes halaman 2FA pada [Settings SecurityTest](../../tests/Feature/Settings/SecurityTest.php) memakai guard twoFactorAuthentication, sementara [config Fortify](../../config/fortify.php) hanya mengaktifkan resetPasswords/emailVerification. Run terarah `php vendor/bin/pest --filter SecurityTest --display-skipped` menghasilkan lima tes (dua lulus, tiga skip), delapan assertions; tes halaman 2FA belum menjadi bukti kelulusan. Output reporter proyek merangkum jumlah tanpa detail pesan skip; guard source dan konfigurasi menjelaskan kondisi skip ini, bukan bukti fitur 2FA rusak atau wajib ditambahkan ke MVP.

### E25

[CoachingWorkflowTest](../../tests/Feature/Customer/CoachingWorkflowTest.php) menambah 21 kasus (termasuk dataset): role/scope penulis, otorisasi sebelum validasi, penolakan parent yang tidak sah, snapshot server immutable serta legacy null, Admin baca saja, pemilihan penerima/metadata/read status, halaman coaching transaksi setelah reassignment Customer tanpa payload Customer, penyaringan coaching transaksi asing, boundary edit dan perubahan akses sebelum delivery. Nama tes antara lain `allows only the assigned sales and team supervisors to write coaching`, `captures the server stage for roots and replies and preserves it after stage changes and edits`, `opens the exact authorized transaction from its notification even when a newer deal exists`, `retains a pending email intent when enqueue fails and recovers it on the next dispatch pass`, dan `records exhausted delivery and permits an explicit retry while ignoring a completed replay`.

Assertion juga memeriksa rollback komentar/notifikasi, payload job tanpa body, retry provider dengan worker database test, intent pending pulih melalui command lalu tidak di-enqueue dua kali, serta failed/sent/replay. Suite lokal terbaru: 171 tes (168 lulus, 3 skip), 1065 assertions. [Browser](../../tests/Browser/accessibility.js) kini 17 kelompok lulus, dengan G01 pada 390/1440px untuk Admin/Sales, label snapshot/legacy, readonly, composer/reply dan error aksesibel. Satu template metadata coaching sintetis dikirim lewat Laravel SMTP ke Mailtrap Sandbox dan dikonfirmasi menggunakan CLI; bukan lifecycle komentar pada database development. Bukti deployment, provider production, PostgreSQL dan UAT tetap belum tersedia. Lihat [runbook G01](../operations/coaching-notifications.md).

### E26

**G02 — target dan kinerja tim, 5 November 2026.** [Rencana, kontrak, ledger dan rollout](implementation-g02-team-performance.md). `tests/Feature/TeamPerformanceTest.php` memeriksa target tim/Sales independen dan nol/belum diisi, revisi nilai/pelaku/waktu, larangan lintas role/tim/dealer, estimasi closing pada kedua alur create serta update aktif, Delivery unik dan batas Jakarta, bulan lampau null, perpindahan Sales, data tanpa tim, kontributor tersanitasi, notifikasi akses dicabut, presisi 0,25, tim nonaktif dan rollback schema terisolasi. `DashboardMetricsTest` kini memakai history Delivery dan estimasi closing sebagai sumber; matriks route memasukkan halaman Target bagi Admin sesuai kemampuan dukungan yang sudah ada.

Regresi browser sintetis `tests/Browser/accessibility.js` lulus 21 kelompok/0 gagal, termasuk G02 pada tiga viewport dan dua tema; 12 mutasi diintersep, tidak dikirim ke aplikasi. Skenario G02 diperiksa ulang melalui menu tema aplikasi untuk memastikan screenshot tidak mengambil warna di tengah transisi. Ini bukan UAT, bukti PostgreSQL/concurrency, benchmark 100.000 transaksi, SLA email atau verifikasi database bisnis.

### E27

**G03 — rekonsiliasi laporan dan PostgreSQL, 5 November 2026.** [Rencana, hasil migration/seeder, ledger dan batas bukti](implementation-g03-reporting-reconciliation.md). `ReportingReconciliationTest` memakai ledger dua bulan/dua tim/dua dealer untuk batas Jakarta, Delivery unik termasuk kejadian berulang, kohort Akuisisi dan penyebut conversion, perpindahan Sales, tim nonaktif/ended membership, bulan default, input invalid layar/CSV, ID drilldown, scope tampering, instan UTC tersimpan, serta rekonsiliasi target Sales menurut recipient ID. Scope laporan memakai tim transaksi tanpa mengubah policy operasional/coaching.

Suite PostgreSQL menggunakan database test acak yang dibuat khusus dan dibersihkan setelah eksekusi, bukan database bisnis. Tes seeder meliputi guard local, idempotensi, preservasi nilai manual, transaksi manual pada customer demo, tim/komentar manual, snapshot menurut kejadian terakhir, dan tidak ada dispatch email bahkan ketika recovery command dipanggil. Preview dari props demo lokal tersanitasi lulus 18 kombinasi tiga layar × tiga viewport × dua tema, tanpa overflow/error JavaScript/mutasi browser. Hasil ini bukan UAT manusia, concurrency atau benchmark p95 volume besar. Migration lokal G01/G02 dan seeder development sudah diterapkan atas otorisasi pengguna; timestamp historis tidak dikoreksi otomatis.

### E28

**Rencana target management dan alokasi, 5 November 2026.** [Implementasi dan bukti](implementation-target-allocation.md), [ADR-004](adr/ADR-004-monthly-target-plans.md). Bukti E26 tentang target independen berlaku historis untuk data legacy; alur baru mengikuti PRD terkini. `TargetAllocationTest` menguji simpan atomik, markup server, total minimal benchmark, pecahan, audit, versi tertinggal, organisasi, nol, legacy, anggota baru/keluar, interleaving penempatan, bypass endpoint lama dan presisi forecast gap. CI lulus 213 tes/3 skip serta tiga tes frontend; PostgreSQL test terisolasi juga lulus 213 tes/3 skip. Browser sintetis lulus tiga viewport/dua tema serta kasus anggota dan konflik, tanpa mutasi database bisnis. Migration batch 7 dan seeder development lokal kemudian dijalankan atas perintah pengguna; 3 rencana Desember/24 alokasi serta preservasi target lama terverifikasi. Production dan UAT manusia belum dijalankan; rincian batas bukti ada pada catatan implementasi.

## Skenario UAT empat role

Semua skenario memakai data sintetis bersama. Jika langkah tidak dapat dilakukan karena gap source, catat **Terblokir/Gagal** setelah dicoba pada lingkungan yang disetujui; jangan mengganti expected result mengikuti keterbatasan source. Penolakan request berarti tidak ada mutasi dan tidak ada data sensitif pada respons, bukan sekadar tombol disembunyikan.

### A01

**Undangan dan aktivasi — Admin/penerima.** Prasyarat: A1 aktif, T1 aktif, mailbox uji, undangan valid/expired/revoked/used disiapkan secara terkontrol. Data: calon S2 dan calon Supervisor dengan email sandbox berbeda. Langkah: undang dengan role/tim; buka tautan sebagai penerima, tetapkan credential sendiri dan login; coba tautan kedua kali, kedaluwarsa dan dicabut; coba tim nonaktif/asing serta role/tim invalid. Hasil: role/tim berasal dari undangan, aktivasi satu kali, kegagalan tidak membuat akun atau membocorkan identitas; email mengikuti O01. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### A02

**Lifecycle dan credential — Admin.** Prasyarat: A1, akun S2 dengan riwayat bisnis dan sesi login, mailbox reset uji. Data: user active/inactive dan undangan beberapa status. Langkah: cari/filter user; resend lalu revoke undangan; nonaktifkan S2, uji login baru serta request dari sesi lama; aktifkan kembali; lakukan reset valid/invalid sebagai pemilik akun; periksa respons daftar dan auth. Hasil: status/audit benar, riwayat tetap ada, akun nonaktif ditolak, reset mengubah credential tanpa mengungkap password/token ke Admin; tidak ada self-deactivation atau mutasi asing. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### A03

**Tim dan penempatan — Admin.** Prasyarat: T1/T2, V1/V2, S1/S2/S3; fixture histori aktif/berakhir. Langkah: buat/rename tim uji, tempatkan dan pindahkan Sales serta Supervisor, akhiri membership, nonaktifkan tim, coba assignment baru dan akses dari sesi lama. Hasil: penempatan aktif berubah, histori/penulis lama tidak hilang, tim nonaktif tidak menerima transaksi baru, akses segera mengikuti organisasi. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### A04

**Assignment dan audit baca — Admin.** Prasyarat: C1 memiliki dua transaksi, aktivitas, komentar dan revisi; S1/S2 aktif. Langkah: buka dashboard/profil/riwayat, pindahkan C1 ke S2, periksa histori dan hak S1/S2 sesuai penugasan transaksi resmi; buka revisi coaching; coba menulis komentar sebagai Admin; audit sebelum/sesudah. Hasil: baca audit lengkap tanpa menyamar atau menulis coaching, histori tetap utuh dan angka dashboard tidak berubah karena dibaca; redaksi secret berlaku. Perselisihan akses Customer versus transaksi lama dicatat untuk penyelesaian, tidak diputuskan baru di dokumen ini. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### A05

**CSV — Admin, diulang Supervisor.** Prasyarat: mailbox tidak diperlukan, data/DB UAT terisolasi disetujui; template diunduh. Data: file valid, missing field, nomor invalid, Sales asing, nomor existing, dua nomor sama dalam satu file, header rusak dan file berlebih ukuran. Langkah: preview tanpa commit, bandingkan jumlah data bisnis sebelum/sesudah; baca error per baris; commit subset valid setelah konfirmasi hasil preview; perbaiki lalu upload ulang; ulangi commit batch yang sama dan akses batch aktor lain. Hasil: preview belum menyimpan Customer/transaksi, invalid jelas dan tidak tersimpan diam-diam, commit aman terhadap pengulangan, audit actor/waktu/file/jumlah benar, file tidak dapat diakses publik. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### S01

**Lead dan kandidat duplikat — Sales, diulang Supervisor.** Prasyarat: S1/V1 dan C1 dengan nomor ternormalisasi yang sudah ada. Langkah: catat lead baru dengan field wajib termasuk estimasi waktu pembelian; coba field kosong; masukkan nomor C1 dalam format lain, tinjau kandidat sebelum simpan, batalkan lalu lanjutkan sebagai peluang berbeda memakai identitas existing bila sesuai; periksa pemilik setelah create oleh V1. Hasil: penolakan tidak menyimpan data, pengguna dapat membatalkan duplikat sebelum simpan, satu identitas menjaga beberapa peluang, pemilik operasional adalah Sales yang sah. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### S02

**Buku Pelanggan, pencarian dan konteks — Sales.** Prasyarat: C1/C2/C3, >15 pelanggan sintetis, follow-up variasi waktu. Langkah: cari nama dan nomor, buka tab follow-up/overdue/uncontacted/active/purchased/inactive/repeat/referral/stagnant; sort, pindah halaman; gunakan filter periode/tahap/Sales/sumber pada daftar lead; buka detail lalu tutup. Hasil: hanya data berhak tampil, field kerja minimum lengkap, hasil sesuai input, filter/pagination/scroll dipertahankan; tidak ada kebocoran C2/C3. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### S03

**Peluang ulang dan riwayat — Sales.** Prasyarat: C1 pernah Delivery dan punya aktivitas lama serta peluang aktif lain. Langkah: buat transaksi baru melalui profil C1, buka masing-masing riwayat transaksi lama/baru, periksa assignment dan identitas; periksa tautan tel/WhatsApp tanpa melakukan panggilan/pengiriman. Hasil: Customer tetap satu, semua transaksi dan aktivitas yang berhak dapat ditelusuri, link memiliki nama/nomor benar, identitas tidak digandakan. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### S04

**Aktivitas, follow-up dan consent — Sales, diulang Supervisor.** Prasyarat: C1 dengan transaksi aktif; pelanggan opt-out dan preferensi kanal; aktivitas batas tiga hari disiapkan QA. Langkah: periksa/simpan preferensi dan opt-out, tinjau peringatan sebelum aksi kontak; catat hasil komunikasi tanpa menghubungi penerima; jadwalkan follow-up kemarin/hari ini/besok sesuai alur yang diizinkan, selesaikan yang terdekat bila tersedia; periksa waktu Jakarta, last_contact dan tahap sebelum/sesudah. Hasil: consent tercatat/terlihat, jadwal terdekat pending tepat, aktivitas memperbarui waktu tanpa mengganti tahap, stagnant konsisten pada profil/filter/dashboard. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### S05

**Pipeline — Sales, diulang Supervisor.** Prasyarat: dua peluang uji terpisah untuk jalur Delivery dan Lost; kebijakan booking fee yang disetujui atau tandai bagian SPK terblokir. Langkah: lakukan Lead→Prospect→Hot Prospect→SPK→DO→Delivery; coba SPK tanpa konfirmasi dan Lost tanpa alasan; pada peluang kedua pilih Lost dengan katalog/catatan; coba perubahan closed dan request asing; buka histori setiap langkah. Hasil: stage tunggal, histori append-only lengkap actor/waktu/from/to, penolakan tidak menambah histori, Delivery/Lost keluar dari aktif; koreksi closed hanya lewat mekanisme berwenang yang disetujui. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### S06

**Conversation dan batas koreksi — Sales/Supervisor, audit Admin.** Prasyarat: C1 memiliki stage event/aktivitas/komentar bertimestamp berbeda; waktu tes terkontrol tanpa mengubah jam sistem bersama. Langkah: tulis komentar, ubah tahap, reply satu tingkat; coba reply ke reply dan parent dari deal lain; edit sebelum/pada/setelah lima menit serta sebagai actor lain; periksa revisi oleh Admin; coba DELETE dan lampiran yang tidak didukung. Hasil: timeline kronologis gabungan, konteks tahap saat komentar tidak berubah karena tahap terbaru, reply tidak bertingkat, edit sesuai batas yang dikonfirmasi PRD, revisi lengkap actor/waktu dan body lama, delete/lampiran tidak tersedia; komentar tersimpan walau email gagal. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### V01

**Batas tim dan reassignment — Supervisor.** Prasyarat: V1/T1, S1/S2/T1, S3/T2, C1 dan C3; salinan request uji disiapkan QA. Langkah: buka data T1, assign C1 dari S1 ke S2, ulangi dengan S3/record D2, coba manipulasi scope request dan operasi membership khusus Admin; ulangi saat membership V1 berakhir. Hasil: penugasan dalam T1 berhasil, histori lengkap; lintas tim/dealer/role ditolak tanpa mutasi; isi Customer dan hak transaksi diverifikasi kembali. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### V02

**Target, kendali tim dan forecast — Supervisor.** Prasyarat: ledger sintetis dua Sales, target Sales dan target tim yang diharapkan, transaksi tiap tahap/batas bulan, bobot uji terdokumentasi. Langkah: tetapkan lalu ubah target periode Sales/tim, coba Sales asing; pilih periode dashboard; cocokkan target/realisasi/stage/forecast/gap per Sales dan tim dengan ledger, uji top-five; buka daftar stagnant, unread coaching dan peluang closing. Hasil: periode/scope konsisten, audit old/new/actor/waktu lengkap, forecast berlabel estimasi dan cocok rumus PRD; daftar tindakan dapat ditindaklanjuti. Bagian production menunggu O05. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### V03

**Coaching dan notifikasi — Supervisor/Sales.** Prasyarat: V1 dan S1 memiliki akses C1, recipient/queue/mailbox uji disetujui. Langkah: V1 memberi arahan, S1 melihat notifikasi lalu membalas; buka tautan dan tandai baca; ulangi sebagai orang lain; QA mensimulasikan email gagal sesuai O01. Hasil: in-app/email diberikan hanya kepada pihak conversation lain, URL menuju transaksi berhak, unread/read benar, email tanpa body coaching; penyimpanan komentar tidak bergantung keberhasilan email. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### B01

**Perbandingan tim, Analisis dan ekspor — Branch Manager, ulangi Analisis sebagai Admin/Supervisor.** Prasyarat: ledger T1/T2, beberapa sumber/model, transaksi tanggal akuisisi dan event tahap pada bulan berbeda; expected count/share/conversion dihitung QA. Langkah: bandingkan tim pada dashboard/kinerja; pilih periode Analisis, berganti Akuisisi/Pencapaian; drilldown Sumber dan Model lalu kembali; unduh CSV, simpan PDF melalui dialog cetak; cocokkan angka, label penyebut dan hasil filter. Hasil: seluruh tim D1 teragregasi dengan benar, hanya V1/T1 untuk Supervisor, conversion hanya Akuisisi, CSV/PDF agregat konsisten dan tanpa data sensitif; periode/mode/dimensi tetap. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### B02

**Read-only dan sanitasi — Branch Manager.** Prasyarat: B1, data D1/D2, Customer/komentar bertanda sintetis untuk deteksi kebocoran. Langkah: periksa props/response dashboard, Analisis/drilldown dan ekspor; coba URL Customer/Transaksi serta request stage/target/assignment/comment/edit/delete langsung. Hasil: tidak ada phone/alamat/catatan hubungan/coaching, mutasi ditolak, data D2 tidak masuk agregat dan percobaan tidak mengubah data. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### X01

**Autentikasi dan akses negatif — Semua.** Prasyarat: matriks role, akun nonaktif/ended membership dan fixture asing. Langkah: uji guest/sesi kedaluwarsa pada route bisnis, ulangi GET dan mutasi tiap role sesuai matriks; manipulasi ID, parent_id dan scope; uji logout, rate limit dan reset; inspect respons tersanitasi serta data sebelum/sesudah. Hasil: login wajib, otorisasi server berlaku pada setiap operasi, tidak ada kebocoran atau mutasi tanpa hak, credential tidak pernah dikembalikan. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### X02

**Loading, empty, error, stale dan koneksi — Semua.** Prasyarat: lingkungan UAT, throttle jaringan dan respons gagal yang dapat dikendalikan QA. Data: pencarian kosong, payload invalid, blok laporan gagal dan formulir berisi perubahan belum tersimpan. Langkah: uji respons lambat, 422, 403, 500 dan putus koneksi; periksa tiap blok utama serta retry/reload; kembali online. Hasil: pesan jelas dan aksesibel, stale diketahui, kegagalan satu blok tidak mengosongkan semuanya, tidak ada silent save/antrean offline, retry tidak menggandakan penyimpanan. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### X03

**Responsif, aksesibilitas dan waktu tugas — Semua.** Prasyarat: 390/768/1440px, tema terang/gelap, ukuran teks Normal/Ekstra, zoom 200%, keyboard serta pembaca layar/forced colors; data kosong/panjang/tiga baris dan dialog terbuka. Langkah: jelajahi tugas utama, filter/detail/dialog berlapis, keyboard/Tab/Escape, tabel/kartu dan footer; ukur target/nama/fokus/kontras/overflow; Sales menemukan pelanggan dan memulai langkah berikutnya lalu memperbarui lead dengan stopwatch. Hasil: mengikuti PRD bagian 7.9/11/13, termasuk target 44px, tidak ada horizontal page scroll dan field penting tetap ada; temuan geometri/label dicatat. Catat waktu mentah: setiap pembaruan tahap/aktivitas oleh pengguna terlatih maksimal 60 detik (PRD bagian 11), median pembaruan lead <60 detik, serta pencarian/pemahaman/tindakan berikut ≤30 detik (bagian 13), bukan perkiraan agent. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

### X04

**Batas MVP — Semua/PO.** Prasyarat: daftar batas di PRD dan inventaris route/menu/build yang disiapkan QA. Langkah: cek register publik tidak tersedia, tidak ada upload coaching, sync kontak pribadi/bulk phonebook/broadcast, instalasi PWA/offline sync/native, Area/MSCP, AI forecast atau laporan terjadwal aktif yang diklaim sebagai MVP; pastikan ekspor Analisis tetap tersedia. Hasil: batas scope dipertahankan, capability tertunda tidak dicatat sebagai bug fitur hilang; kehilangan koneksi tetap diuji X02. **Hasil aktual/bukti: Belum dijalankan; pelaksana/waktu/commit/temuan: —.**

## Gerbang operasional terpisah

### O01

**Email dan antrean — IT/QA, penerima role.** Prasyarat: penyedia dipilih PO/IT, sandbox mailbox, worker dan retry strategy disetujui; data hanya undangan/reset/coaching sintetis. Langkah: jalankan undangan/reset/coaching, simulasikan provider gagal lalu pulih; verifikasi retry, status gagal, duplikasi, penerima dan isi email/log. Hasil: sesuai target PRD bagian 11: dari email yang diterima penyedia antrean, minimal 95% terkirim atau tercatat gagal dalam lima menit; penerimaan oleh provider saja belum dihitung sebagai hasil terkirim, komentar tetap tersimpan, email coaching hanya metadata/link dan token tidak masuk bukti publik. **Hasil aktual/bukti: Belum dijalankan; provider/konfigurasi/latensi/temuan: —.**

### O02

**PostgreSQL dan performa — Engineering/IT/QA.** Prasyarat: PostgreSQL test terisolasi, versi/runtime dan profil beban disepakati, 100.000 transaksi sintetis tanpa salinan production. Langkah: ulangi integrasi yang bergantung PostgreSQL, uji concurrency/constraint dan alur import/report; ukur distribusi respons beberapa run pada data representatif, periksa query/indeks dan resource. Hasil: target PRD bagian 11, termasuk p95 CRUD/navigasi <2 detik dan dashboard bulanan <3 detik; catat beban/konfigurasi mentah, bukan hasil SQLite sebagai substitusi. **Hasil aktual/bukti: Belum dijalankan; lingkungan/profil beban/p95/temuan: —.**

### O03

**Backup, restore dan rollback — IT/Engineering.** Prasyarat: server/penyimpanan backup, jadwal, retensi serta RPO/RTO ditetapkan pihak operasional; target restore non-production terisolasi dengan izin khusus. Langkah: ikuti [runbook dasar](../operations/backup-restore.md), backup terenkripsi sesuai kebijakan yang disetujui, restore ke target uji, cocokkan count dan audit/scope, smoke test empat role; simulasi rollback deployment. Hasil: data/akses pulih, waktu pemulihan terukur dan memenuhi keputusan operasional; file backup tidak publik. RPO/RTO belum ditetapkan dokumen ini. **Hasil aktual/bukti: Belum dijalankan; target/waktu pemulihan/temuan: —.**

### O04

**Pilot dan penerimaan pengguna — PO, pemilik empat role, QA.** Prasyarat: skenario kritis lulus, temuan kritis ditutup, pelatihan dan pilot satu tim disetujui; rekonsiliasi/deduplikasi data awal dilakukan sebelum impor yang diotorisasi. Langkah: pengguna menjalankan tugas harian, catat waktu/kendala, rekonsiliasi ledger dan laporan, evaluasi feedback serta indikator PRD bagian 13 setelah periode pengamatan yang ditentukan. Hasil: bukti UAT ditandatangani pemilik role dan keputusan pilot/go-live dicatat; metrik satu bulan/baseline dua minggu tidak dinyatakan tercapai saat setup. **Hasil aktual/bukti: Belum dijalankan; peserta/periode/persetujuan/temuan: —.**

### O05

**Kesiapan rilis dan keputusan — PO/operasional/IT.** Prasyarat: semua keputusan PRD bagian 14 dibahas oleh pemutus yang tercantum di sana. Langkah: tetapkan bobot forecast dan bukti SPK, provider email, hosting, nama produk serta retensi; lengkapi runbook deployment/worker/scheduler, monitoring/error/alert dan respons insiden; tunjuk pemilik serta rekam bukti gerbang O01–O04. Hasil: keputusan dicatat pada sumber kanonik, konfigurasi aman, go-live hanya setelah gerbang roadmap terpenuhi. **Hasil aktual/bukti: Belum dijalankan; keputusan/pemilik/persetujuan: —.**

## Backlog gap berdasarkan dampak

Urutan ini adalah rekomendasi triase engineering, bukan perubahan prioritas requirement di PRD atau persetujuan pembangunan fitur baru. Gap source dikonfirmasi melalui pembacaan jalur yang disebut; reproduksi runtime dan tes gagal masih menjadi langkah pertama pekerjaan perbaikannya. Kekurangan bukti tidak otomatis berarti implementasi salah. Status G01 diperbarui berdasarkan E25; gap lain tetap memakai bukti inspeksi awal sampai diuji atau diperbaiki tersendiri.

### G01

**Ditutup secara teknis pada branch G01, belum menjadi kelulusan UAT.** Inspeksi awal menemukan store/update hanya menyimpan komentar/revisi, tanpa dispatch; tahap tidak disimpan, reply-ke-reply diterima, dan Admin dapat menulis melalui izin view deal. Perbaikan memakai policy write Sales/Supervisor, parent root pada deal sama, snapshot nullable/immutable, notifikasi database metadata serta intent email durable dengan worker retry dan pemulihan enqueue melalui scheduler. Tautan membuka halaman coaching berdasarkan izin transaksi, tanpa memperluas payload Customer. [E25](#e25) mereproduksi kegagalan awal dan memeriksa perbaikan; [runbook](../operations/coaching-notifications.md) menjelaskan migration, worker/scheduler dan keterbatasan at-least-once. Pemilik: Engineering + QA untuk review/merge dan regresi; IT/operasional/PO untuk [O01](#o01) dan UAT. Migration database development belum dijalankan, scheduler/worker belum diaktifkan; provider production/SLA tetap terbuka. Timeline gabungan dan audit revisi penuh masih G06; daftar unread pada dashboard masih G02.

### G02

**Implementasi teknis tersedia; UAT dan rollout belum dijalankan.** [E26](#e26) melengkapi target tim independen, target Sales, kinerja per tim/Sales, forecast berdasarkan estimasi bulan closing dan daftar prioritas. Branch Manager tetap read-only; Supervisor mengatur target timnya untuk penggunaan saat ini sesuai PRD. Kontributor forecast tetap tersanitasi, target nol dibedakan dari belum diisi, dan data tanpa tim dipisahkan. Perubahan memerlukan migration baru yang belum diterapkan ke database development/production. Bobot production, PostgreSQL/concurrency, performa dan penerimaan pengguna tetap gerbang terbuka; rincian bukti di [catatan implementasi](implementation-g02-team-performance.md).

### G03

**Ditutup teknis untuk konsistensi angka/periode/scope; gerbang operasional tetap terpisah.** [E27](#e27) menyatukan jendela bulan Jakarta dan scope tim transaksi pada dashboard/Analisis; menguji Delivery history unik, mode Akuisisi/Pencapaian dan CSV, ID drilldown, input invalid, serta target Sales per tim. Verifikasi PostgreSQL menemukan dan memperbaiki timezone sesi koneksi serta query JSON pada kolom metadata teks. Seeder development dan migration lokal diverifikasi secara terpisah dari database test. Audit timestamp sebelum koreksi timezone, UAT manusia, concurrency dan benchmark volume tetap terbuka di G13/G15 dan catatan implementasi. Ini bukan klaim seluruh Fase 6 atau bobot production sudah diterima.

### G04

**Ditutup teknis untuk konfirmasi sebelum write dan identitas kanonik.** [E09](#e09) memverifikasi warning sebelum Customer/transaksi tersimpan, batal/konfirmasi eksplisit, reuse identitas dan assignment, batas akses serta revalidasi import. Sales dengan kandidat di luar cakupan diarahkan ke SPV/Admin sesuai [PRD](PRD.md); tidak membuat identitas terpisah atau membuka nama pelanggan tersembunyi. Data lama tidak digabung/dihapus. UAT manusia dan concurrency PostgreSQL tetap gerbang terpisah; rincian bukti/limitasinya ada di [catatan G04](implementation-g04-duplicate-confirmation.md).

### G05

**Ditutup teknis untuk form lead, PIC, filter tanggal/sumber dan preferensi kontak.** [PRD](PRD.md) memuat keputusan pengguna untuk pilihan Sales wajib oleh SPV/Admin serta penolakan global + kanal pilihan. [E08](#e08)/[E13](#e13)/[E19](#e19) memverifikasi PIC/pelaku, estimasi closing yang sudah ada, scope, audit, consent dan filter. Tidak membuat migration atau memperluas akses. UAT manusia, semua kombinasi filter/pagination dan concurrency tetap gerbang terpisah; G06/G07 belum ditutup. Rincian di [catatan G05](implementation-g05-lead-contact-filters.md).

### G06

**Gap fungsi MVP — riwayat terpadu dan audit revisi.** Bukti: [props Customer][customer-source] memilih satu deal aktif/terbaru dan sepuluh aktivitas, komentar terpisah dari history/activity; [UI][customer-ui] menampilkan bagian terpisah; tidak mengirim revisions atau daftar seluruh transaksi Customer. Tindak lanjut: reproduksi C1 dua transaksi, urutan event campuran, inspeksi revisi Admin, lalu penuhi PRD dengan akses/scope yang sama. Pemilik: Engineering full-stack + QA. Terkait: CRM-08/12, CVS-01/07.

### G07

**Gap logika — stagnant berbeda antara item dan filter.** Bukti: [accessor DealTransaction][deal-model] memakai last_activity_at fallback created_at dan `< now−3 hari`; [query dashboard][dashboard-source] dan [query transaksi][transaction-source] memakai last_activity_at `<=` tanpa fallback. Tindak lanjut: tes tanggal null, tepat ambang dan melewati ambang serta closed pada model/query/UI, satukan perilaku sesuai PRD tanpa membuat definisi baru di memory. Pemilik: Engineering backend + QA.

### G08

**Gap responsif — tabel impor mobile.** Bukti: [UI Import][import-ui] memakai tabel min-width 720/640px dengan overflow container, belum list/kartu mobile. Tes striped rows hanya membuktikan warna/overflow halaman, bukan pemenuhan penggantian tabel atau seluruh field. Tindak lanjut: uji A05/X03 pada 390px dan rancang representasi mobile sesuai PRD. Pemilik: Engineering frontend + QA.

### G09

**Kekurangan verifikasi — keamanan, batas waktu dan rekonsiliasi.** Bukti: batas assertion E04/E07/E10/E14/E15/E16/E18/E21. Belum ada bukti langsung lengkap untuk coaching lintas role/tim/parent, non-deletion, edit boundary, assignment V endpoint dan perubahan hak sesi, seluruh dashboard/Analisis multi-periode/team, top-five forecast, serta koreksi transaksi closed. Tindak lanjut: tulis kasus gagal terarah dahulu saat implementasi/perbaikan berikutnya, lalu jalankan suite dan UAT relevan; jangan menyatakan seluruh requirement lulus berdasarkan 147 tes. Pemilik: QA + Engineering.

### G10

**Kekurangan verifikasi — ekspor dan impor.** Bukti: E17/E18; [source Analisis][analytics-source] punya CSV, [UI][analytics-ui] memakai window.print untuk Save as PDF, sehingga PDF bukan endpoint renderer tersendiri. [ImportController][import-source] menyaring validRows dan membatasi commit actor/status/session, tetapi assertion belum memeriksa rollback, replay, invalid detail, intra-file duplicate dan akses file. Tindak lanjut: uji isi CSV/PDF terhadap ledger/filter/sanitasi, template lengkap, preview tanpa mutasi bisnis dan kasus commit gagal/berulang. Pemilik: QA + Engineering; operasional memverifikasi hasil cetak yang diterima.

### G11

**Kekurangan verifikasi — browser nyata, aksesibilitas dan CI.** Bukti: [E20](#e20), [laporan QA][qa], [workflow][ci-source]. Browser memakai fixture/intercept dan dijalankan terpisah; state gagal/stale/loading seluruh blok, server-save E2E, pembaca layar, zoom, forced colors, landscape pendek dan posisi filter belum lengkap. Tindak lanjut: UAT X02/X03 dan regresi browser melalui server pada target test terisolasi, masukkan regresi yang stabil ke CI. Pemilik: QA + Engineering frontend/CI. Tidak menjalankan UAT pada DB bisnis sebagai bagian tugas dokumentasi ini.

### G12

**Keputusan produk — belum ditutup di sumber kanonik.** Bukti: [PRD bagian 14](PRD.md#14-keputusan-terbuka) memuat enam keputusan, [config forecast][forecast-source] masih approved=false. Bobot forecast, booking-fee evidence, provider email dan hosting menghambat gerbang terkait; nama final serta retensi perlu pemutus/target penyelesaian, tanpa otomatis mengubah prioritas PRD. Tindak lanjut: PO bersama operasional/IT/legal sebagaimana PRD merekam keputusan; baru sesuaikan konfigurasi dan acceptance. Pemilik: pemutus yang tercantum pada PRD, Engineering mendukung opsi teknis. Jangan menyatakan forecast produksi aktif.

### G13

**Gerbang operasional — performa dan concurrency tetap terbuka.** E27 memverifikasi baseline terbaru pada PostgreSQL test terisolasi; ini belum membuktikan concurrency atau p95 pada 100.000 transaksi. Bukti awal: [E23](#e23), target PRD bagian 11; belum ditemukan benchmark p95 volume 100.000 transaksi atau bukti pengulangan baseline penuh pada PostgreSQL. Tindak lanjut: O02, ukur juga biaya query dashboard/Analisis/import dan concurrency; verifikasi fitur PostgreSQL yang relevan. Pemilik: Engineering/IT/QA. Tes SQLite lulus tidak menutup gerbang ini.

### G14

**Gerbang operasional — deployment, monitoring dan pemulihan.** Bukti: [runbook backup dasar](../operations/backup-restore.md) tersedia tetapi belum memuat bukti drill restore; [E22](#e22) hanya header/health 200; hosting/email masih terbuka di PRD. Tindak lanjut: O01/O03/O05, tetapkan pemilik/jadwal/retensi/RPO/RTO, deployment/rollback, worker/scheduler, alert error/antrean dan respons insiden. Pemilik: IT + Engineering, PO menyetujui kebutuhan operasional. Bukan klaim runbook sama sekali belum ada.

### G15

**Gerbang penerimaan — UAT/pilot belum dijalankan.** Bukti: [laporan QA][qa] membatasi audit sebagai bukan UAT; dokumen ini belum berisi hasil aktual atau tanda tangan pengguna. Tindak lanjut: O04 setelah blocker teknis ditriase, data awal direkonsiliasi, peserta dijadwalkan dan lingkungan/write diotorisasi. Pemilik: PO + pemilik empat role + QA/operasional. Fase 6 dan go-live tetap terbuka.

## Verifikasi dokumen dan baseline awal (4 November 2026)

- Baseline source `47ff7a9`; pemeriksaan lokal `composer ci:check` pada penyusunan dokumen ini lulus: frontend lint/format, TypeScript, Pint, PHPStan, Pest 150 tes (147 lulus, 3 skip), 896 assertions. Database test SQLite in-memory sesuai konfigurasi; bukan write database bisnis.
- Tidak menjalankan ulang browser, build, benchmark, email, migration/seeder, impor bisnis atau UAT manusia pada tugas dokumentasi ini. Bukti 16 kelompok browser/build pada PR #25 adalah bukti historis tertaut, bukan hasil run baru.
- Validasi struktur lokal lulus: tepat 80 baris requirement unik dan berurutan sesuai PRD, 20 skenario UAT, lima gerbang operasional, 15 gap, 24 entri bukti; 400 referensi tautan (399 lokal beserta anchor/path valid dan satu tautan PR #25), nama tes berkutip cocok source, manifest mencantumkan file ini, serta seluruh status UAT awal belum dijalankan. Pemeriksaan ini memakai skrip sementara lokal, bukan test aplikasi baru atau gerbang CI permanen.
- Review independen memeriksa pemetaan dan klaim bukti; dua koreksi kriteria telah diterapkan: outcome email harus terkirim/tercatat gagal, bukan sekadar provider menerima; waktu pembaruan mencakup maksimum pengguna terlatih dan median sesuai bagian PRD masing-masing. `git diff --check` bersih sebelum pengiriman.
- Tidak ada perubahan API, tipe data, dependency, keputusan produk atau source aplikasi. Semua gap merupakan backlog untuk ditriase dan dikerjakan melalui perubahan terpisah.

[qa]: accessibility-responsive-qa-2026-11-04.md
[routes-source]: ../../routes/web.php
[customer-source]: ../../app/Http/Controllers/Customer/CustomerController.php
[comment-source]: ../../app/Http/Controllers/Customer/DealCommentController.php
[comment-model]: ../../app/Models/DealComment.php
[deal-policy]: ../../app/Policies/DealTransactionPolicy.php
[deal-model]: ../../app/Models/DealTransaction.php
[dashboard-source]: ../../app/Http/Controllers/DashboardController.php
[target-source]: ../../app/Http/Controllers/TargetController.php
[target-model]: ../../app/Models/SalesTarget.php
[lead-request]: ../../app/Http/Requests/Customer/StoreCustomerLeadRequest.php
[transaction-source]: ../../app/Http/Controllers/TransactionController.php
[customer-ui]: ../../resources/js/pages/customers/index.tsx
[import-ui]: ../../resources/js/pages/imports/index.tsx
[import-source]: ../../app/Http/Controllers/ImportController.php
[analytics-source]: ../../app/Http/Controllers/AnalyticsController.php
[analytics-ui]: ../../resources/js/pages/analytics/index.tsx
[forecast-source]: ../../config/forecast.php
[ci-source]: ../../.github/workflows/tests.yml
