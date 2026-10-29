# Design System — DealDrive Supervisor

> Keputusan struktur kanonik berada di [`docs/design/aina-sms-navigation/direction-approved.md`](docs/design/aina-sms-navigation/direction-approved.md). Requirement produk tetap mengikuti PRD dan ADR.

## Karakter

Ruang kerja operasional yang tenang dan sigap. Informasi penting dibedakan melalui urutan, ukuran, dan satu aksen biru; bukan melalui dekorasi.

## Struktur

- Desktop: sidebar berlabel sekitar 228px dan lembar kerja putih di dalam frame biru-abu sangat muda.
- Tablet: sidebar dilipat; navigasi dan konten tetap mempertahankan urutan desktop.
- Mobile: empat tujuan utama termasuk “Lainnya”; detail transaksi menjadi full-screen sheet.
- Sales memulai dari antrean waktu. Role lain memulai dari dashboard operasional.

## Token visual

- Ground: `#e9f0f8`.
- Surface: `#ffffff`.
- Ink: `#0f172a`.
- Secondary ink: `#526175`.
- Accent/action: `#1769e0`; dark accent text: `#0f4faa`.
- Border: `#dbe4f0`; control border: `#c4d0df`.
- Negative: `#b42318`; warning: `#92400e`; positive: `#08783e`.
- Font: system sans-serif; scale utama 12/14/16/24px.
- Radius: 8px untuk kontrol, 12px untuk panel, 14px untuk dialog.

## Komponen

- Navigasi aktif memakai perubahan surface dan warna teks, tanpa sidebar gelap.
- KPI berada dalam satu strip terbagi, tanpa ikon atau sparkline.
- Tabel desktop berubah menjadi kartu/list mobile dengan field penting tetap tersedia.
- Status memakai tint pucat dengan teks gelap; warna bukan satu-satunya pembeda.
- Satu tombol primary per layar. Shadow hanya pada dialog/sheet yang mengambang.
- Ikon berupa SVG outline konsisten; tidak memakai emoji.

## Interaksi dan aksesibilitas

- Target sentuh minimum 44×44px.
- Focus ring biru terlihat dan tidak tertutup sticky navigation.
- Semua dialog dapat ditutup dengan Escape dan mengembalikan focus ke pemicu.
- Filter dan posisi daftar dipertahankan ketika detail ditutup.
- `prefers-reduced-motion` menghapus perpindahan non-esensial.
- Tidak ada horizontal page scroll pada 390px, 768px, atau 1440px.

## Larangan

Tidak memakai gradient, glass, glow, emoji, sidebar gelap pada canvas terang, ikon dalam kotak berwarna untuk KPI, atau data yang tampak nyata tanpa label “Data contoh”.
