<?php

// Plain-language release history, newest first. Add one entry per release in the release PR
// (see docs/operations/release-log.md). `version` has no leading "v".
return [
    [
        'version' => '1.5.2',
        'date' => '2026-11-20',
        'notify' => false,
        'summary' => '',
        'items' => [
            'Menu Manual untuk Admin dan Branch Manager kini membuka halaman pilih manual, bukan halaman galat.',
        ],
    ],
    [
        'version' => '1.5.1',
        'date' => '2026-11-20',
        'notify' => false,
        'summary' => '',
        'items' => [
            'Gambar di panduan pengguna diperbarui supaya sesuai tampilan terbaru tanpa tahap Delivery.',
        ],
    ],
    [
        'version' => '1.5.0',
        'date' => '2026-11-20',
        'notify' => true,
        'summary' => 'Versi baru: tahap Delivery dihapus, grafik di Analisis, serta warna dan Ownership kendaraan.',
        'items' => [
            'Tahap Delivery dihapus. DO sekarang menjadi tahap akhir transaksi, dan transaksi yang sudah Delivery tampil sebagai DO.',
            'DO hanya bisa dibatalkan Admin pada bulan yang sama saat DO dicatat.',
            'Follow-up tidak bisa lagi dijadwalkan pada transaksi yang sudah DO atau Lost. Follow-up yang tertunda dibatalkan otomatis saat transaksi masuk DO.',
            'Analisis Sumber dan Model kini punya grafik. Klik grafik untuk membuka daftar transaksinya.',
            'Transaksi bisa mencatat warna kendaraan dan Ownership (First Buyer, Additional, Trade In). Ownership wajib diisi saat DO.',
            'Sumber lead baru: Repeat Order dan Database. Sumber Telepon Masuk tidak dipakai lagi.',
            'Panduan pengguna untuk Sales dan Supervisor diperbarui.',
        ],
    ],
    [
        'version' => '1.4.0',
        'date' => '2026-11-19',
        'notify' => true,
        'summary' => 'Versi baru: halaman Riwayat Rilis, riwayat follow-up, dan pesan login yang lebih jelas.',
        'items' => [
            'Setiap ada versi baru, kamu mendapat notifikasi. Isi perubahannya bisa dibaca di halaman Riwayat Rilis dari menu pengguna.',
            'Kalender bisa menampilkan rencana yang dibatalkan beserta alasannya.',
            'Detail transaksi menampilkan riwayat follow-up yang sudah selesai atau dibatalkan.',
            'Pesan saat username atau password salah kini tampil jelas dalam bahasa Indonesia.',
        ],
    ],
    [
        'version' => '1.3.0',
        'date' => '2026-11-18',
        'notify' => false,
        'summary' => '',
        'items' => [
            'Username bisa kamu ganti sendiri, satu kali, dari halaman Profil. Username lama tidak bisa dipakai orang lain.',
            'Riwayat notifikasi 3 hari terakhir ada di menu Notifikasi.',
            'Password baru minimal 8 karakter dan harus ada angka serta simbol. Pesan kesalahan sekarang berbahasa Indonesia.',
        ],
    ],
];
