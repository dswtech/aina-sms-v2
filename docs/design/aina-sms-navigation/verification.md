# Verifikasi Checkpoint Arah

Tanggal pemeriksaan: 29 Oktober 2026.

## Hasil otomatis

Ketiga prototipe diperiksa dengan browser Chromium lokal pada viewport `1440×900`, `768×1024`, dan `390×844`.

| Pemeriksaan | Operational Sidebar | Today-First | Customer Hub |
|---|---:|---:|---:|
| Horizontal page overflow | 0 px | 0 px | 0 px |
| Console error saat load | 0 | 0 | 0 |
| Pergantian role dan matriks Branch Manager | Lulus | Lulus | Lulus |
| Pencarian pelanggan | Lulus | Lulus | Lulus |
| Detail transaksi terbuka | Lulus | Lulus | Lulus |
| Tab Timeline aktif | Lulus | Lulus | Lulus |
| Detail tertutup dan query tetap | Lulus | Lulus | Lulus |
| Sheet “Lainnya” terbuka | Lulus | Lulus | Lulus |

Uji role memastikan menu Branch Manager memiliki Analisis tetapi tidak menampilkan Pelanggan atau Transaksi operasional. Uji detail memastikan query `Budi` tetap tersimpan setelah dialog atau sheet ditutup.

## Pemeriksaan visual

- Target sentuh utama minimum 44px dan focus ring terlihat.
- Mobile memakai empat tujuan navigasi termasuk “Lainnya”.
- Tabel/list desktop berubah menjadi kartu atau daftar satu kolom pada mobile.
- `prefers-reduced-motion` dihormati.
- Tidak ada gradient, glass, glow, asset eksternal, atau dependency runtime.
- Data contoh dan kontrol pemilih role ditandai sebagai elemen review.
- Kontras teks sekunder dikoreksi setelah inspeksi; warna teks terendah memakai nilai yang memenuhi baseline AA pada permukaan terkait.

## Catatan alat

Pemeriksa Huashu berbasis Python tidak dijalankan karena environment tidak memiliki Python Playwright dan paket baru tidak dipasang. Sebagai pengganti, pemeriksaan viewport, overflow, console, dan screenshot dilakukan dengan browser Chromium lokal tanpa dependency baru. Detector Impeccable juga dijalankan satu kali; temuannya dipakai untuk mengoreksi kontras dan ukuran label penting.

## Screenshot

Setiap folder arah memuat hasil fold dan full-page untuk desktop, tablet, dan mobile:

- `design-demos/screenshots/dir-1/`
- `design-demos/screenshots/dir-2/`
- `design-demos/screenshots/dir-3/`
- `design-demos/screenshots/thumbs/`

Ini adalah verifikasi checkpoint struktur, bukan persetujuan arah. Verifikasi seluruh state dan seluruh role dilakukan setelah satu arah atau kombinasi dipilih.

## Verifikasi prototipe terpilih — runtime lengkap

Runtime lengkap berada di `design-demos/approved.html`, `approved-enhancements.css`, dan `approved-enhancements.js`. Pemeriksaan kode terakhir dilakukan pada 29 Oktober 2026.

| Pemeriksaan | Hasil |
|---|---:|
| Syntax JavaScript (`node --check`) | Lulus |
| Kontrak role, route, store, mutation, auth, dialog, tab, DOM, dan preservasi state | 19/19 lulus |
| `git diff --check` | Lulus |
| TasteSkill source lint | 0 fail, 2 warning yang sah untuk dialog/toast |
| Impeccable detector (satu kali) | 1 false-positive disabled contrast, 1 advisory overlay shadow |
| Dependency, backend, `localStorage`, atau `sessionStorage` baru | Tidak ada |

Kontrak yang diperiksa otomatis mencakup:

- Menu lengkap untuk Sales, Supervisor, Branch Manager, dan Admin.
- Hash route halaman, autentikasi, detail pelanggan, dan detail transaksi.
- Store sesi untuk pelanggan, transaksi, target, pengguna, tim, notifikasi, import, dealer, dan profil.
- Mutation form, validasi terhubung ke field, focus ke error pertama, serta status melalui live region.
- Dialog/sheet modal, focus trap, Escape, backdrop, dan focus return.
- Tab WAI-ARIA, keyboard panah, Back/Forward, query/filter/scroll, serta tab detail yang dipertahankan.
- Detail Branch Manager tersanitasi dan pelanggan/transaksi Admin read-only.

### Batas verifikasi browser saat ini

Screenshot dan `report.json` dari runtime sebelumnya tidak lagi dianggap bukti final. Percobaan membuka file lokal melalui browser terotomasi ditolak oleh kebijakan browser karena protokol `file:` tidak diizinkan; sesuai batas keamanan, pemeriksaan tidak dialihkan melalui raw CDP atau server lokal sebagai jalan memutar. Karena itu, klaim overflow, console, dan interaksi browser final belum ditandai lulus sampai `approved.html` dibuka oleh pengguna pada tab browser yang dapat diinspeksi.

Folder arah awal `dir-1/`, `dir-2/`, `dir-3/`, dan `thumbs/` tetap merupakan bukti checkpoint arah, bukan bukti runtime lengkap.
