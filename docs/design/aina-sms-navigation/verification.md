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

## Verifikasi prototipe terpilih

Kombinasi yang disetujui telah dirakit di `design-demos/approved.html` dan diperiksa pada 29 Oktober 2026.

| Pemeriksaan | Hasil |
|---|---:|
| Horizontal page overflow pada 1440px, 768px, dan 390px | 0 px |
| Console error | 0 |
| Beranda Sales memakai pola Today-First | Lulus |
| Beranda Supervisor, Branch Manager, dan Admin memakai pola operasional | Lulus |
| Pencarian serta detail pelanggan | Lulus |
| Filter, detail, Timeline, dan riwayat tahap transaksi | Lulus |
| Query daftar tetap setelah detail ditutup | Lulus |
| Sheet “Lainnya” dan tombol kembali/tutup | Lulus |
| Login, aktivasi undangan, dan password visibility | Lulus |
| Loading, empty, error/retry, stale, offline, dan access denied | Lulus |
| Branch Manager tanpa kontak pelanggan dan isi coaching | Lulus |

Inspeksi visual menemukan shell aplikasi sempat tetap terlihat di permukaan Login. Aturan `[hidden]` kemudian diperkuat agar Login dan Aktivasi Undangan terisolasi sebagai halaman mandiri. Detector Impeccable final melaporkan satu false-positive kontras lintas selector, satu peringatan padding yang telah dikoreksi, serta satu advisory shadow yang dipertahankan hanya untuk overlay/toast.

Screenshot kanonik tersedia di:

- `design-demos/screenshots/approved/` untuk tiga viewport utama.
- `design-demos/screenshots/approved-flows/` untuk role, halaman, autentikasi, dan state penting.
