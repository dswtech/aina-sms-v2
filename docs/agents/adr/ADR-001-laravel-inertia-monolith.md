# ADR-001 — Gunakan monolit Laravel dengan React melalui Inertia

| Item | Keterangan |
|---|---|
| Dokumen | ADR-001 — Arsitektur aplikasi |
| Status | Berlaku |
| Ditetapkan | 28 Oktober 2026 |
| Rujukan | [`../PRD.md`](../PRD.md) |

## Keadaan

Produk membutuhkan autentikasi, kewenangan berlapis, pengelolaan pipeline, komentar, notifikasi, laporan, dan pengalaman seperti single-page application. Tim menginginkan Laravel sebagai backend serta React, Tailwind CSS, dan shadcn/ui sebagai frontend dalam satu repository. Memisahkan frontend dan backend akan menambah kontrak API, autentikasi lintas aplikasi, deployment, serta sinkronisasi tipe sejak hari pertama.

## Keputusan

Bangun satu aplikasi Laravel dengan routing dan otorisasi server-side. Halaman React + TypeScript dirender melalui Inertia dan dibundel menggunakan Vite. Node.js digunakan untuk toolchain frontend, bukan sebagai backend kedua.

Gunakan versi stabil terbaru yang kompatibel pada saat bootstrap. Baseline keputusan saat ADR ini ditetapkan adalah Laravel 13, Inertia 3, React 19, Tailwind CSS 4, dan shadcn/ui.

## Ditolak — React SPA dan Laravel API terpisah

Pilihan ini membutuhkan dua permukaan deployment, autentikasi API, kontrak respons eksplisit, penanganan CORS, serta sinkronisasi routing dan validasi. Biaya tersebut belum menghasilkan nilai tambahan untuk aplikasi internal satu dealer.

## Ditolak — backend Node.js terpisah

Menjalankan Node.js dan Laravel sebagai dua backend menciptakan dua tempat untuk aturan bisnis, otorisasi, logging, dan akses database. Ini meningkatkan risiko aturan akses berbeda antara jalur yang melayani data yang sama.

## Ditolak — Blade atau Livewire tanpa React

Pilihan ini lebih sederhana untuk aplikasi server-rendered, tetapi tidak memenuhi keputusan produk untuk menggunakan React dan shadcn/ui sebagai basis komponen interaktif.

## Konsekuensi

- Backend dan frontend berada dalam satu repository dan satu siklus rilis.
- Controller Laravel memberikan data halaman melalui Inertia props.
- Validasi dan otorisasi tetap ditegakkan server-side.
- Tidak dibangun REST API publik pada MVP kecuali ada kebutuhan integrasi yang disetujui kemudian.
- Instalasi atau pembaruan package tetap memerlukan persetujuan pengguna sesuai `rules/README.md`.
