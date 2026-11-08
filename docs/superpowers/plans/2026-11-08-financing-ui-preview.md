# Preview UI Pembiayaan

## Batas pekerjaan

Prototipe React interaktif yang diminta pengguna, hanya dengan data sintetis. Tidak menambah endpoint, migration, database write bisnis, dependency, atau koneksi pembiayaan nyata. Kebutuhan backend dan perubahan requirement PRD ditunda sampai desain UI disetujui.

## Implementasi

1. Fixture 160 transaksi contoh dan delapan leasing. Agregasi per bulan Prospect atau DO, pembiayaan Cash/Kredit/belum ditentukan, serta leasing pantauan/Kredit Lain/belum dipilih. Snapshot sintetis menjaga mode DO dari perubahan master.
2. Preview laporan dari `/analytics?preview=financing`. Halaman Analisis operasional tetap tersedia. Data yang dirender preview berasal dari fixture lokal, bukan props laporan operasional; request tetap melewati controller Analisis dan otorisasi yang sudah ada.
3. Master leasing di preview Admin dengan tambah/edit, validasi nama duplikat, status aktif dan pantauan utama. Pengaturan Dealer menautkan ke `/analytics?preview=financing&screen=leasing`.
4. Form transaksi contoh untuk Admin/Supervisor, dengan field kondisional Kredit/Kredit Lain dan contoh terkunci saat DO. Pilihan tersimpan dalam state selama preview terbuka; kembali ke laporan memperbarui agregat dan mempertahankan filter.
5. Semua layar menandai data contoh. Reset atau reload mengembalikan fixture. Ekspor dan penyimpanan server belum tersedia. Sales belum mempunyai entry preview karena route Analisis tidak terbuka untuk Sales; Branch Manager hanya melihat laporan sintetis.

## Verifikasi

- Tiga tes agregasi/penyuntingan baru ditulis sebelum implementasi, gagal ketika modul belum ada lalu lulus. Suite frontend keseluruhan: 20 tes lulus.
- Pemeriksaan format/lint frontend dan TypeScript lulus. Build produksi lulus tanpa package baru; warning `fontaine` opsional berasal dari konfigurasi font yang sudah ada.
- Regresi backend setelah build selesai: 404 lulus, lima skip, 3.726 assertions; Pint dan PHPStan lulus. Run pertama yang bersamaan dengan build mencatat satu kegagalan respons Inertia; test terkait (13 skenario) dan suite penuh lulus saat diulang tanpa build paralel. PHPStan memerlukan proses di luar sandbox karena PHP dalam sandbox tidak dapat membaca konfigurasi `.neon` yang ada.
- Review independen menemukan ID contoh berubah setelah pindah layar. Diperbaiki dengan ID dari fixture awal; diverifikasi mengubah #001 ke Cash, melihat Cash 26/belum ditentukan 9, kemudian membuka #001 kembali dengan pilihan Cash.
- Browser lokal memakai fixture SQLite testing terisolasi melalui launcher yang setara `tests/Browser/run-isolated.ps1`. Tidak memakai database development/production.
- Diperiksa: laporan Prospek/DO, bulan kosong melalui kontrol bulan native, filter tetap setelah pindah layar, penolakan nama leasing duplikat, penambahan leasing lokal, serta viewport 390/768/1440 piksel tanpa horizontal page scroll. Filter tablet ditumpuk agar tidak menyempit di samping sidebar.

## Handoff

Branch `codex/financing-ui-preview` awalnya berangkat dari checkout `27f8fa2`. Fetch menemukan `origin/main` pada `d9cac42` dengan tree identik (monitoring sudah squash-merged); baseline branch diselaraskan memakai soft reset, tanpa mengganti file kerja. Perubahan lokal pengguna dipertahankan dan tidak disertakan dalam commit preview. Belum ada implementasi backend pembiayaan, migration, atau rilis production.
