# Accessibility & Responsive QA — 4 November 2026

| Item | Hasil |
|---|---|
| Baseline | `caf2cf5`, merge PR #21 |
| Branch audit | `codex/phase-6-accessibility-responsive-qa` |
| Target | Aplikasi lokal `http://aina.test`, data demo yang sudah tersedia |
| Metode | `playwright-cli`, pengukuran DOM, keyboard, screenshot, inspeksi source |
| Keputusan | **Gerbang aksesibilitas belum lulus.** Tidak ada perbaikan aplikasi dalam perubahan dokumentasi ini. |
| Sumber acceptance | [PRD](PRD.md), [ADR-003](adr/ADR-003-responsive-web-platform.md), [roadmap](roadmap.md) |

## Cakupan dan batas bukti

Lebar viewport 390, 768, dan 1440 CSS px; tinggi halaman awal 900px. Pengujian dialog/menu mobile memakai 390×844. Login juga diukur pada ketiga lebar dengan tinggi 844px. Akun demo dipakai dengan izin pengguna; credential tidak disalin ke laporan. Tidak menjalankan seeder, migration, import, atau penyimpanan data bisnis.

| Role | Route yang diperiksa | Kombinasi halaman/viewport |
|---|---|---:|
| Admin | Dashboard, Pelanggan, Transaksi, Pengguna & Undangan, Tim & Penempatan, Analisis, Import, Pengaturan Dealer, Notifikasi, Profil, gerbang konfirmasi password Security, Appearance | 36 |
| Supervisor | Dashboard, Pelanggan, Transaksi, Target, Analisis, Import, Notifikasi, Profil, gerbang konfirmasi password Security, Appearance | 30 |
| Branch Manager | Dashboard, Kinerja Tim, Analisis, Notifikasi, Profil, gerbang konfirmasi password Security, Appearance | 21 |
| Sales | Dashboard, Pelanggan, Transaksi, Notifikasi, Profil, gerbang konfirmasi password Security, Appearance | 21 |
| **Total** | Keadaan awal halaman, bukan seluruh state interaksi | **108** |

Seluruh kombinasi tersebut memiliki `document.documentElement.scrollWidth === window.innerWidth`. Ini membuktikan tidak ada horizontal **page** overflow pada keadaan yang diukur, bukan jaminan bahwa tidak ada konten terpotong, scroll internal, atau masalah pada state lain. Login juga tidak mengalami page overflow pada tiga viewport.

Uji interaksi terarah mencakup detail pelanggan Sales dengan Enter/Escape, dialog Tambah Lead Admin, sheet Lainnya Sales, kontrol panel pengguna Sales, notifikasi Admin, combobox Sales pada dashboard Admin, dan urutan Tab login. Komponen bersama tidak diulang untuk setiap role. Security setelah konfirmasi password, seluruh validasi server, seluruh state kosong/gagal, pembaca layar nyata, forced colors, zoom 200%, dan pengukuran p95 belum diuji. Pemeriksaan ini bukan UAT per role atau sertifikasi WCAG.

Screenshot dan hasil DOM lengkap tersimpan sebagai artefak lokal di luar repository. Bukti numerik dan langkah reproduksi berikut dapat dijalankan ulang tanpa artefak tersebut.

## Ringkasan kualitas

Implementasi mempunyai sistem visual yang konsisten: shell, token terang/gelap, daftar mobile, dan dialog adaptif dipakai bersama. Detector Impeccable pada `resources/js/components`, `resources/js/pages`, dan `resources/css/app.css` mengembalikan `[]`; hasil itu tidak mendeteksi masalah keyboard dan bukan bukti kepatuhan aksesibilitas.

| Dimensi | Skor indikatif /4 | Dasar |
|---|---:|---|
| Accessibility | 2 | Banyak kontrol berlabel, tetapi keyboard, fokus, dan nama aksi mobile masih bermasalah. |
| Performance | 3 | Build berhasil dan halaman memakai chunk terpisah; skor sementara, tanpa pengukuran latency/perangkat lapangan. |
| Responsive | 3 | 108 keadaan awal tanpa page overflow; target sentuh dan state tambahan masih perlu diperbaiki/diuji. |
| Theming | 2 | Token konsisten; tiga pasangan warna primary pada tema terang gagal kontras teks biasa. |
| Implementation integrity | 3 | Pola visual konsisten, tetapi semantik menu dan landmark menyimpang. |
| **Total** | **13/20** | **Indikatif: masih memerlukan pekerjaan signifikan. Bukan skor kelulusan produk.** |

**10 temuan: 0 P0, 6 P1, 4 P2, 0 P3.** Temuan lintas halaman dikelompokkan berdasarkan akar masalah, bukan dihitung per elemen.

## Temuan P1 — tutup sebelum gerbang aksesibilitas dinyatakan lulus

### 1. Keyboard melewati kontrol di dalam menu floating

- **Lokasi:** `resources/js/components/user-menu-content.tsx:90`, `resources/js/components/notification-menu.tsx:123`.
- **Kategori:** Accessibility / implementation integrity.
- **Reproduksi:** buka kontrol panel pengguna dengan Enter; gunakan ArrowDown, Home/End, Tab dan Shift+Tab. Fokus hanya menjangkau Profil dan Keluar; pilihan tema, ukuran, dan warna tidak dapat dicapai. Pada notifikasi Admin dengan tiga item, Home/ArrowDown/Tab tetap berfokus pada Lihat semua notifikasi.
- **Penyebab:** tombol biasa berada dalam Radix dropdown menu tanpa mengikuti sistem menu item dan navigasi fokusnya.
- **Dampak:** pengguna keyboard tidak dapat mengoperasikan pilihan tampilan atau membuka item notifikasi langsung dari panel. Halaman notifikasi tetap tersedia sebagai alternatif, tetapi pilihan warna/ukuran pada panel tidak mempunyai padanan keyboard yang terbukti dalam audit ini.
- **Rujukan:** [WCAG 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).
- **Perbaikan dan test:** gunakan semantik menu item yang sesuai, atau dialog/popover dengan urutan Tab normal. Test harus membuka panel dengan keyboard, mencapai setiap kelompok kontrol/item, dan memastikan Escape mengembalikan fokus. Rute pengaturan/notifikasi dapat dimock agar test tidak menulis data bisnis. Perintah tindak lanjut: `$impeccable harden`.

### 2. Aksi kontak pada kartu mobile tidak mempunyai nama aksesibel

- **Lokasi:** `resources/js/pages/customers/index.tsx:810` dan `:824`.
- **Kategori:** Accessibility.
- **Reproduksi:** buka Pelanggan sebagai Sales pada 390px. Snapshot aksesibilitas menampilkan dua `link` tanpa nama pada setiap kartu: telepon dan WhatsApp. Teks disembunyikan oleh `hidden xs:inline`, sedangkan anchor tidak diberi `aria-label`. Versi tabel desktop mempunyai label, tetapi kartu mobile belum.
- **Dampak:** pembaca layar tidak dapat membedakan tujuan dua aksi kontak penting.
- **Rujukan:** WCAG 4.1.2 Name, Role, Value / 2.4.4 Link Purpose.
- **Perbaikan dan test:** beri nama yang mencakup aksi dan pelanggan pada kedua anchor. Assert role link memiliki nama pada viewport mobile tanpa membuka aplikasi telepon/WhatsApp. Perintah: `$impeccable harden`.

### 3. Fokus detail pelanggan berada di luar area terlihat dan tidak kembali ke pemicu

- **Lokasi:** `resources/js/pages/customers/index.tsx:232`, `:1557`, `:1883`.
- **Kategori:** Accessibility.
- **Reproduksi:** Sales, 390×844, pelanggan pertama dengan coaching; fokus tombol Detail lalu Enter. Sesudah animasi selesai, `document.activeElement` adalah Balas pada `y=1730`, di luar viewport dan area scroll yang terlihat. Escape menutup dialog, tetapi fokus kembali ke `BODY`. Gejala diperiksa dua kali setelah dialog selesai membuka/menutup.
- **Dampak:** pengguna kehilangan posisi fokus dan konteks daftar. Dialog sudah memenuhi ukuran full-screen; masalah ada pada pengelolaan fokus, bukan lebar dialog.
- **Rujukan:** WCAG 2.4.3 Focus Order / 2.4.7 Focus Visible.
- **Perbaikan dan test:** tetapkan fokus awal pada judul atau kontrol awal yang terlihat; simpan/kembalikan fokus ke tombol Detail yang membuka dialog. Test dengan riwayat panjang, tunggu animasi selesai, assert elemen fokus berada dalam area terlihat dan kembali ke pemicu. Perintah: `$impeccable harden`.

### 4. Kontras tiga aksen terang tidak mencukupi untuk teks biasa

- **Lokasi:** `resources/js/hooks/use-color.tsx`, pasangan `light.primary` / `primaryForeground`; dipakai antara lain oleh `resources/js/components/ui/button.tsx`.
- **Kategori:** Theming / accessibility.
- **Bukti:** perhitungan relative luminance sRGB terhadap putih menghasilkan hijau `#16a34a` **3,296:1**, oranye `#ea580c` **3,560:1**, teal `#0d9488` **3,744:1**. Tombol memakai teks kecil sehingga ambang teks besar tidak berlaku. Biru, ungu, merah terang serta keenam pasangan primary/foreground gelap melewati 4,5:1 pada perhitungan token ini; itu tidak mencakup seluruh state hover atau semua teks aplikasi.
- **Dampak:** keterbacaan teks tombol dan teks primary pada latar putih berkurang pada ketiga tema tersebut.
- **Rujukan:** [WCAG 1.4.3 Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Perbaikan dan test:** sesuaikan pasangan token dan periksa state normal/hover/focus serta primary text. Tambahkan pemeriksaan rasio terhadap pasangan warna aktual, bukan hanya snapshot warna. Perintah: `$impeccable colorize`.

### 5. Tampil/sembunyikan password tidak dapat dicapai lewat Tab

- **Lokasi:** `resources/js/components/password-input.tsx:27`, `resources/js/pages/auth/login.tsx:39`.
- **Kategori:** Accessibility.
- **Reproduksi:** dari Username, tekan Tab berulang. Urutan: Password → Ingat saya → Masuk → Lupa password? → logo; Show password dilewati karena `tabIndex={-1}`. Login juga memakai positive tabindex yang memindahkan urutan visual tautan lupa password.
- **Dampak:** pengguna keyboard kehilangan fungsi untuk memeriksa password yang diketik. Masalah komponen juga memengaruhi form lain yang memakai PasswordInput.
- **Rujukan:** WCAG 2.1.1 Keyboard / 2.4.3 Focus Order.
- **Perbaikan dan test:** gunakan urutan fokus DOM yang logis dan tombol toggle yang dapat difokuskan. Test Tab lalu Space/Enter mengubah tipe input dan nama tombol. Gunakan nilai dummy pada test terisolasi. Perintah: `$impeccable harden`.

### 6. Opsi aktif combobox hanya ditandai secara visual

- **Lokasi:** `resources/js/components/ui/combobox.tsx:208`, `:271`, `:296`.
- **Kategori:** Accessibility.
- **Reproduksi:** buka combobox Sales dashboard Admin, tekan ArrowDown. Fokus tetap pada input pencarian (`role` tidak disetel), `aria-activedescendant` kosong, opsi yang disorot tidak memiliki ID, dan `aria-selected=false` menunjukkan nilai tersimpan, bukan sorotan yang sedang digerakkan.
- **Dampak:** perubahan opsi aktif tidak mempunyai hubungan programatik dengan input yang berfokus. Pengoperasian panah/Enter terlihat bekerja, tetapi informasi untuk pembaca layar tidak lengkap. Audit belum memakai pembaca layar nyata.
- **Rujukan:** WCAG 4.1.2 Name, Role, Value.
- **Perbaikan dan test:** gunakan pola combobox/listbox konsisten dengan ID opsi dan active descendant, atau pindahkan fokus secara benar ke opsi. Test ArrowDown/Up setelah pencarian, hasil kosong, Enter, dan Escape. Perintah: `$impeccable harden`.

## Temuan P2 — perbaikan lanjutan

### 7. Target interaktif belum konsisten memenuhi minimum produk

- **Lokasi:** `components/ui/input.tsx:11`, `components/ui/dialog.tsx:64`, `components/ui/sheet.tsx:73`, `components/color-picker.tsx:17`, `components/app-sidebar-header.tsx:38`, pagination pada `pages/customers/index.tsx:1139` dan `pages/transactions/index.tsx:422` (seluruh path relatif terhadap `resources/js/`).
- **Kategori:** Responsive / accessibility.
- **Bukti DOM:** input login 36px tinggi; toggle password 40×36; checkbox visual login 16×16 (label juga dapat diklik, sehingga ukuran checkbox saja tidak membuktikan ukuran gabungan target); tutup dialog 16×16; swatch warna 20×20; pilihan tema/ukuran 24px tinggi; kembali ke Beranda 40×40; nomor pagination pelanggan sekitar 29,5–34,5px lebar walaupun 44px tinggi.
- **Dampak:** aksi rapat dan kecil lebih sulit disentuh. Perbaiki komponen bersama dan override halaman agar minimum produk konsisten.
- **Rujukan:** minimum produk berada di PRD/ADR-003. Jangan menyamakan minimum produk 44×44 dengan [WCAG 2.5.8 AA](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), yang memakai 24×24 beserta pengecualian/spasi.
- **Test:** ukur bounding box seluruh target mobile yang terlihat dan enabled, termasuk menu/dialog terbuka; pertimbangkan label yang dapat diklik dan perluasan hit area. Perintah: `$impeccable adapt`.

### 8. Pencarian pelanggan bergantung pada placeholder

- **Lokasi:** `resources/js/pages/customers/index.tsx:693`.
- **Kategori:** Accessibility.
- **Bukti:** input tidak memiliki label terkait, `aria-label`, atau `aria-labelledby`; snapshot browser memakai placeholder sebagai fallback nama. Karena itu kandidat “unnamed” dari pemindai DOM sederhana tidak boleh dilaporkan sebagai bukti bahwa browser sama sekali tidak memberi nama pada input ini.
- **Dampak:** petunjuk visual hilang ketika pengguna mengetik dan tujuan field tidak mempunyai label persisten.
- **Perbaikan/test:** beri label Pencarian pelanggan yang tersedia secara programatik; assert nama setelah nilai terisi. Rujukan: WCAG 3.3.2 Labels or Instructions. Perintah: `$impeccable clarify`.

### 9. Pesan validasi belum terhubung secara programatik dengan field

- **Lokasi:** `resources/js/pages/auth/login.tsx:43`, `resources/js/pages/settings/profile.tsx:61`, `resources/js/components/input-error.tsx`.
- **Kategori:** Accessibility.
- **Bukti source:** pemanggilan InputError tidak memberi ID pesan yang dirujuk `aria-describedby`, dan field terkait tidak menandai `aria-invalid` dari state errors. Ini temuan inspeksi source, belum reproduksi respons validasi server di browser.
- **Dampak:** pesan mungkin terlihat, tetapi hubungan field–pesan tidak diberikan kepada teknologi bantu.
- **Perbaikan/test:** tambahkan hubungan ID pesan/field dan penanda invalid, lalu uji respons error dalam lingkungan test terisolasi atau dengan respons mock. Jangan mengirim data bisnis hanya untuk menguji tampilan error. Rujukan: WCAG 1.3.1 / 3.3.1. Perintah: `$impeccable harden`.

### 10. Halaman mempunyai main landmark bersarang

- **Lokasi:** `resources/js/components/ui/sidebar.tsx:302`, `resources/js/pages/dashboard.tsx:384`, `resources/js/pages/customers/index.tsx:403`.
- **Kategori:** Accessibility / implementation integrity.
- **Bukti:** DOM halaman dashboard/pelanggan mempunyai dua elemen `main`, shell membungkus main halaman.
- **Dampak:** navigasi landmark tidak menunjukkan satu area utama yang jelas.
- **Perbaikan/test:** pilih satu lapisan sebagai main landmark dan gunakan elemen netral pada lapisan lainnya. Assert satu main yang terlihat pada halaman terkait. Rujukan: WCAG 1.3.1. Perintah: `$impeccable harden`.

## Praktik yang dipertahankan

- Daftar pelanggan/transaksi mempunyai komposisi mobile, tidak bergantung pada tabel desktop yang diperkecil.
- Detail pelanggan memenuhi viewport mobile setelah animasi selesai; isi panjang mempunyai area scroll internal.
- Sheet Lainnya Sales dapat dibuka dengan Enter, ditutup dengan Escape, dan mengembalikan fokus ke pemicu.
- Kontrol panel pengguna mengembalikan fokus ke pemicu saat Escape; perbaikannya difokuskan pada navigasi kontrol di dalam panel.
- Tombol notifikasi dan kontrol panel pengguna memiliki nama aksesibel; forecast dashboard tetap dilabeli estimasi.

## Verifikasi teknis dan tindak lanjut

- `composer ci:check`: lulus; frontend formatting/lint, TypeScript, Pint, PHPStan; Pest 150 tes, 147 lulus, 3 skip, 896 assertions.
- `pnpm.cmd run build`: lulus. Peringatan font fallback opsional masih muncul; tidak memasang package.
- Corepack `pnpm` pada PATH awal mencoba mengunduh package manager dan gagal DNS. Pemeriksaan memakai `pnpm` 11.25.0 yang sudah tersedia pada runtime lokal dengan PATH sementara.
- PHPStan awal gagal membaca konfigurasi dalam sandbox. Pengulangan gerbang CI lengkap di luar sandbox lulus. Chrome Playwright juga dijalankan di luar sandbox setelah gagal launch dalam sandbox.
- Tidak ada test aplikasi baru karena perubahan ini hanya laporan; langkah regresi di setiap temuan harus diwujudkan ketika perilaku diperbaiki.

Urutan tindak lanjut: `$impeccable harden` untuk keyboard/nama/fokus/semantik, `$impeccable colorize` untuk pasangan token, `$impeccable adapt` untuk target sentuh, lalu `$impeccable polish` setelah test regresi lulus. Pilihan perintah ini dapat dikerjakan satu per satu atau sekaligus; setelah perbaikan, ulangi `$impeccable audit` pada state yang diperbaiki dan lengkapi state yang belum diuji. Jangan menyatakan Fase 6 selesai sebelum gerbang roadmap termasuk UAT dan runbook terpenuhi.
