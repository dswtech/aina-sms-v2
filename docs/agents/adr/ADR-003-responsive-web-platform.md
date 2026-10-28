# ADR-003 — Gunakan responsive web app mobile-first

| Item | Keterangan |
|---|---|
| Dokumen | ADR-003 — Platform aplikasi |
| Status | Berlaku |
| Ditetapkan | 28 Oktober 2026 |
| Rujukan | [`../PRD.md`](../PRD.md) |

## Keadaan

Sales bekerja dari ponsel di lapangan, sedangkan Supervisor dan Branch Manager juga menggunakan tablet atau desktop untuk memantau data yang lebih padat. Produk harus dapat digunakan pada semua ukuran tersebut tanpa memelihara basis kode terpisah. Dukungan offline penuh menambah penyimpanan lokal, sinkronisasi, konflik perubahan, dan risiko data sensitif tertinggal di perangkat.

## Keputusan

Bangun responsive web app dengan pendekatan mobile-first. Semua fungsi utama tersedia melalui browser pada ponsel, tablet, dan desktop. MVP membutuhkan koneksi internet dan tidak menyediakan instalasi PWA atau offline sync.

Detail transaksi menggunakan pola adaptif: dialog besar pada desktop dan full-screen dialog atau sheet pada mobile. Tabel desktop berubah menjadi list dua baris atau kartu pada layar kecil; halaman tidak boleh mengandalkan horizontal scroll untuk alur utama.

## Ditolak — aplikasi native Android/iOS

Aplikasi native membutuhkan basis kode, distribusi, dan siklus rilis tambahan. Nilai utama MVP dapat diberikan melalui browser tanpa kemampuan perangkat khusus.

## Ditolak — PWA dengan offline sync

Offline sync membutuhkan strategi konflik dan perlindungan data lokal yang belum diperlukan pada MVP. Menambahkannya sekarang memperbesar risiko data pipeline berbeda antara perangkat dan server.

## Ditolak — tampilan desktop yang hanya diperkecil

Tabel dan dialog referensi menjadi sempit serta sulit digunakan pada ponsel. Mobile harus memiliki komposisi sendiri, bukan sekadar versi kecil dari desktop.

## Konsekuensi

- Desain dan acceptance test wajib mencakup lebar 390px, 768px, dan 1440px.
- Semua target sentuh minimal 44px.
- Filter kompleks pindah ke sheet pada mobile bila tidak muat dalam satu baris.
- Koneksi terputus menampilkan keadaan gagal yang jelas; data tidak disimpan sebagai perubahan lokal tersembunyi.
