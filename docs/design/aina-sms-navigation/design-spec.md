# Design Spec — Tiga Arah Struktur

## Tujuan checkpoint

Menilai tiga struktur navigasi yang berbeda menggunakan konten, data, dan alur yang sama sebelum satu arah diperluas menjadi wireframe lengkap.

## Audiens dan konteks

- Pengguna utama checkpoint: Sales yang membuka aplikasi berulang kali dari ponsel selama hari kerja.
- Reviewer sekunder: Supervisor, Branch Manager, Admin, Product Owner, engineering, dan QA.
- Mode: **Operate** — kejelasan tugas, state, dan affordance lebih penting daripada ekspresi dekoratif.

## Pertanyaan layar

- Beranda Sales: **Siapa yang harus saya tindak lanjuti sekarang?**
- Buku Pelanggan: **Pelanggan mana yang membutuhkan tindakan berikutnya?**
- Detail transaksi: **Apa kondisi peluang ini dan tindakan apa yang harus dilakukan berikutnya?**

## Konten bersama

- Nama pengguna sintetis: Rina Pratama, Sales — Tim Anggrek.
- Pelanggan sintetis: Budi Santoso, Sari Wijaya, Andi Permana, Maya Lestari.
- Kendaraan contoh: Model A, Model B, Model C; tidak merujuk merek nyata.
- Semua angka diberi label “Data contoh”.
- Data yang sama digunakan pada ketiga arah agar perbandingan hanya menilai struktur.

## Interaksi minimum per arah

- Navigasi Beranda ↔ Buku Pelanggan ↔ Transaksi.
- Pencarian dan filter kebutuhan follow-up.
- Memilih pelanggan dan membuka detail transaksi.
- Tab Ringkasan, Timeline, dan Riwayat tahap.
- Menutup detail dan kembali ke daftar dengan filter serta scroll state terjaga.
- Mobile sheet “Lainnya” dan tombol kembali yang dapat diprediksi.

## Batas visual

- Neutral-blue; satu aksen biru pada data dan satu aksi utama.
- Tanpa gradient, glass, glow, emoji, icon KPI, atau sidebar gelap pada canvas terang.
- Tipografi sistem tanpa font eksternal; 12/14/16/24px menjadi skala utama.
- Satu keluarga outline SVG dengan stroke konsisten.
- Target sentuh minimum 44px dan body mobile 16px.

## Form lima pertanyaan

| Pertanyaan | Jawaban |
|---|---|
| Peran naratif | Ruang kerja operasional, bukan presentasi pemasaran. |
| Jarak pandang | 10cm pada ponsel Sales dan 1m pada laptop reviewer. |
| Temperatur | Tenang, sigap, dapat dipercaya. |
| Kapasitas | Satu layar harus memperlihatkan tindakan utama dan 3–5 item pertama tanpa terasa sesak. |
| Motif | “Langkah berikutnya” sebagai garis penghubung antara pelanggan, transaksi, dan follow-up. |

Form berasal dari pekerjaan dealer: setiap hubungan pelanggan harus berujung pada tindakan berikutnya yang tercatat.

## Acceptance checkpoint

- Tiga HTML mandiri dan satu papan enam kandidat tersedia.
- Ketiga arah memakai data serta fungsi yang sama tetapi memiliki struktur berbeda.
- Tidak ada horizontal page scroll pada 390, 768, atau 1440px.
- Semua kontrol minimum dapat digunakan dengan mouse dan keyboard.
- Ketiga arah berhenti pada checkpoint; ekspansi role lain menunggu pilihan pengguna.
