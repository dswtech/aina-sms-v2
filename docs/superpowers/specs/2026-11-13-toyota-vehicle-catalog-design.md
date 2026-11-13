# Katalog kendaraan Toyota bawaan — desain singkat

Disetujui pengguna 13 November 2026.

## Intent
Dealer adalah dealer Toyota (Bandung). Master kendaraan harus langsung berisi model Toyota, baik di database demo (local) maupun di production, termasuk production yang di-install dari nol. Harga mengikuti perkiraan OTR Bandung 2026 agar Sales punya rentang referensi sejak hari pertama; Admin mengoreksinya dari pricelist dealer.

## Goals
- Satu katalog: 20 model, 6 tipe (MPV, SUV, Hatchback, Sedan, Pickup, Komersial), harga perkiraan.
- Production yang sudah berjalan: migration mengisi katalog untuk dealer yang ada.
- Install baru: dealer pertama mendapat katalog saat dibuat oleh `app:invite-first-admin`.
- Seeder demo memakai katalog yang sama; data demo hanya Toyota.

## Non-goals / anti-goals
- Tidak menimpa tipe/model/harga yang sudah dibuat atau diubah Admin (`insertOrIgnore` pada unique `dealer_id + name`).
- Rollback migration tidak menghapus master kendaraan; setelah deploy datanya milik Admin.
- Tidak menjalankan migration atau seeder pada database non-test tanpa perintah terpisah.
- Harga bukan pricelist resmi dan tidak dipakai di perhitungan laporan; hanya referensi di pilihan kendaraan.

## Approaches
- **Migration saja**: tidak mengisi apa-apa pada install baru karena dealer dibuat setelah `migrate`. Ditolak.
- **`Dealer::created` hook** (disetujui di percakapan): setiap dealer di test ikut mendapat tipe MPV/SUV/Sedan sehingga test master kendaraan yang membuat tipe bernama sama gagal. Saat menyusun rencana diganti dengan opsi berikut; efek production sama karena `app:invite-first-admin` satu-satunya pembuat dealer di production.
- **Migration + `app:invite-first-admin`** (dipakai): mencakup production berjalan dan install baru tanpa mengubah dealer di test lain.

## Katalog (rupiah; * batas atas tebakan)
MPV: Calya 174–195*, Avanza 247–285, Veloz 306–388, Innova Zenix 441–625*, Voxy 639–650*, Alphard 1.291–1.700* (jt).
SUV: Raize 247–320, Rush 293–320, Yaris Cross 363–452, Corolla Cross 610–655*, Fortuner 588–777.
Hatchback: Agya 177–266, Yaris 350–365*. Sedan: Vios 379–464, Corolla Altis 643–700*, Camry 859–980.
Pickup: Hilux Rangga 197–260*, Hilux Single Cab 420–440*, Hilux Double Cab 469–560*. Komersial: Hiace 682–780*.
Nama tersimpan dengan awalan "Toyota ". Sumber: harga mulai OTR Jabodetabek auto2000.co.id Okt–Nov 2026 + ±Rp3 jt.

## Risiko
Model yang sudah diisi Admin dengan nama berbeda (mis. "Avanza") akan berdampingan dengan "Toyota Avanza".
