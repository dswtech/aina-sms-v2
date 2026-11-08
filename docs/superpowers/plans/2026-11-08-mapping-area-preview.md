# Mapping Area — preview frontend

Disetujui melalui wireframe dan instruksi implementasi pemilik pada 8 November 2026. Ini preview sintetis pasca-MVP; integrasi lokasi terstruktur pada backend tetap belum dikerjakan sesuai batas ANL-09 di PRD.

## Cakupan

- Analisis → Mapping Area: rentang bulan, realisasi DO, pie penuh per kecamatan FOA, Area lain, serta rincian yang merekonsiliasi seluruh DO sah.
- Pengaturan Dealer → Area & FOA untuk Admin. Snapshot master resmi BPS SIG/kode Kemendagri berisi 106 kecamatan: Bandung Barat 16, Bandung 31, Sumedang 26, Kota Bandung 30, Kota Cimahi 3. Nama/kode tidak diedit; hanya penanda FOA.
- Contoh FOA Padalarang, Ngamprah dan Batujajar bukan ketetapan operasional dealer. Status FOA dan nama wilayah di-snapshot saat DO; perubahan master tidak mengubah histori.
- Dialog contoh pengisian area transaksi berdasarkan KTP/STNK: kabupaten/kota lalu kecamatan yang cocok. Kota Lain cukup nama kota dan selalu Area lain. Pada Prospect area boleh kosong; sebelum DO kecamatan wajib lengkap atau Kota Lain wajib nama kota, sesuai ANL-10 di PRD.
- Unduhan PNG 2400 piksel dan CSV BOM/UTF-8, titik koma, escaping dan perlindungan formula. Penyebut seluruh DO, metadata periode, serta penanda Data contoh. Area lain selalu terakhir.
- Tidak ada backend, migration, package, peta geografis, atau data pelanggan nyata. State preview hilang saat reload. ID dan bulan DO mengikuti fixture pembiayaan.

## Sumber master

Snapshot 8 November 2026 dari [BPS SIG](https://sig.bps.go.id/rest-bridging-dagri/getwilayah?level=kecamatan&parent=32.17), masing-masing parent 32.17, 32.04, 32.11, 32.73 dan 32.77. Menggunakan kolom kode_dagri/nama_dagri; [referensi API resmi](https://sipedas.pertanian.go.id/api/wilayah/index). Tidak ada permintaan data wilayah saat runtime.

## Verifikasi

- 37 tes frontend lulus, termasuk 106 kode unik/relasi wilayah, nama Cisarua ganda, validasi input, snapshot FOA, pembatalan DO, kategori nol, rekonsiliasi dan ekspor.
- TypeScript, format/lint frontend, build dan PHPStan lulus. Regresi backend terisolasi: 404 lulus, lima skip, 3.724 assertions.
- Browser Admin: 46 DO = 33 FOA + 10 Area lain + 3 belum diisi. Menghapus FOA Padalarang tidak mengubah DO lama; form Prospect mengikuti master terbaru. Kota Lain hanya meminta nama kota dan penyimpanan contoh berhasil.
- Unduhan nyata PNG 2400×1764 diperiksa visual: seluruh label, legenda, metadata dan Data contoh terbaca; CSV berisi lima kategori yang merekonsiliasi 46 DO. Rentang bulan dapat diubah melalui keyboard. Layout 390px tidak mempunyai overflow horizontal.
- Review independen tidak menemukan cacat penting. UAT pengguna dan integrasi server tetap tahap berikutnya.

- Tindak lanjut visual: pie penuh menggantikan donut sesuai contoh pemilik, dengan persentase dalam irisan serta nama pada irisan yang cukup lebar. PNG aktual 2400×1764 sudah diperiksa ulang. Seluruh 37 tes frontend, TypeScript, lint dan build lulus setelah perubahan.

- Koreksi pemilik: kategori Kecamatan belum diisi dihapus dari laporan dan ekspor. Seluruh fixture DO mempunyai area lengkap; snapshot DO menolak area kosong dan agregasi menolak snapshot DO tidak lengkap agar tidak menghilangkan transaksi diam-diam. Bukti 33 FOA + 10 Area lain + 3 kosong di atas adalah hasil sebelum koreksi ini. Penegakan pada endpoint DO sebenarnya tetap belum dikerjakan.

- Verifikasi koreksi wajib area: tes regresi RED/GREEN, 38 tes frontend lulus, TypeScript, lint dan build lulus. Browser merekonsiliasi 46 DO = 33 FOA + 13 Area lain tanpa kategori kosong.
