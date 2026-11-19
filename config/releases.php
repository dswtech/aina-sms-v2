<?php

// Plain-language release history, newest first. Add one entry per release in the release PR
// (see docs/operations/release-log.md). `version` has no leading "v".
return [
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
