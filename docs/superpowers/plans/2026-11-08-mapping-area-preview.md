# Mapping Area — preview frontend

Disetujui melalui wireframe dan instruksi implementasi pemilik pada 8 November 2026. Ini preview sintetis pasca-MVP; integrasi lokasi terstruktur pada backend tetap belum dikerjakan sesuai batas ANL-09 di PRD.

## Cakupan

- Analisis → Mapping Area: rentang bulan, realisasi DO, donut per kecamatan FOA, Area lain dan Kecamatan belum diisi, serta rincian yang merekonsiliasi seluruh DO sah.
- Pengaturan Dealer → Area & FOA untuk Admin. Snapshot master resmi BPS SIG/kode Kemendagri berisi 106 kecamatan: Bandung Barat 16, Bandung 31, Sumedang 26, Kota Bandung 30, Kota Cimahi 3. Nama/kode tidak diedit; hanya penanda FOA.
- Contoh FOA Padalarang, Ngamprah dan Batujajar bukan ketetapan operasional dealer. Status FOA dan nama wilayah di-snapshot saat DO; perubahan master tidak mengubah histori.
- Dialog contoh pengisian area transaksi berdasarkan KTP/STNK: kabupaten/kota lalu kecamatan yang cocok. Kota Lain cukup nama kota dan selalu Area lain. Seluruh area boleh kosong; pilihan wilayah parsial harus dilengkapi kecamatan.
- Unduhan PNG 2400 piksel dan CSV BOM/UTF-8, titik koma, escaping dan perlindungan formula. Penyebut seluruh DO, metadata periode, serta penanda Data contoh. Urutan kategori khusus selalu dua terakhir.
- Tidak ada backend, migration, package, peta geografis, atau data pelanggan nyata. State preview hilang saat reload. ID dan bulan DO mengikuti fixture pembiayaan.

## Sumber master

Snapshot 8 November 2026 dari [BPS SIG](https://sig.bps.go.id/rest-bridging-dagri/getwilayah?level=kecamatan&parent=32.17), masing-masing parent 32.17, 32.04, 32.11, 32.73 dan 32.77. Menggunakan kolom kode_dagri/nama_dagri; [referensi API resmi](https://sipedas.pertanian.go.id/api/wilayah/index). Tidak ada permintaan data wilayah saat runtime.

## Verifikasi

- 37 tes frontend lulus, termasuk 106 kode unik/relasi wilayah, nama Cisarua ganda, validasi input, snapshot FOA, pembatalan DO, kategori nol, rekonsiliasi dan ekspor.
- TypeScript, format/lint frontend, build dan PHPStan lulus. Regresi backend terisolasi: 404 lulus, lima skip, 3.724 assertions.
- Browser Admin: 46 DO = 33 FOA + 10 Area lain + 3 belum diisi. Menghapus FOA Padalarang tidak mengubah DO lama; form Prospect mengikuti master terbaru. Kota Lain hanya meminta nama kota dan penyimpanan contoh berhasil.
- Unduhan nyata PNG 2400×1764 diperiksa visual: seluruh label, legenda, metadata dan Data contoh terbaca; CSV berisi lima kategori yang merekonsiliasi 46 DO. Rentang bulan dapat diubah melalui keyboard. Layout 390px tidak mempunyai overflow horizontal.
- Review independen tidak menemukan cacat penting. UAT pengguna dan integrasi server tetap tahap berikutnya.
