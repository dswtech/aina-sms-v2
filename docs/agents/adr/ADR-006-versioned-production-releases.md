# ADR 006 — Production dari GitHub Release bernomor

| Item | Keterangan |
|---|---|
| Status | Dipilih pemilik, 8 November 2026; penerapan mengikuti runbook |
| Mengubah | Pemicu deployment Git pada hosting ADR 005 |

## Keputusan

Pemilik memilih GitHub Release bernomor agar merge main tidak langsung mengubah aplikasi yang dipakai dealer. Release production memakai format vMAJOR.MINOR.PATCH, dipublikasikan sebagai stable release, dan menunjuk commit dalam main yang lulus workflow tests.yml pada event push main. Draft, prerelease, tag yang berpindah dan commit tanpa CI sukses ditolak.

vercel.json menonaktifkan deployment Git otomatis untuk main. Branch lain tetap memperoleh preview. Auto-assign production domains dinonaktifkan di Vercel. Workflow production-release membuat build production dari SHA yang dipastikan, menunggu READY, memeriksa ulang release, lalu melakukan promote eksplisit. Domain final harus menunjuk deployment baru dan health endpoint merespons 200 sebelum workflow melaporkan berhasil.

Alternatif branch production lebih sederhana tetapi tidak memberikan pemicu publikasi versi yang dipilih pemilik. GitHub Release membutuhkan satu Vercel token di GitHub Secret; ini memakai REST dengan Node bawaan, tanpa dependency/CLI tambahan dan tanpa memindahkan credential database/email dari Vercel.

## Batas

Workflow tidak menjalankan migration, seeder, bootstrap Admin, backup atau rollback otomatis. Perubahan schema memerlukan rencana dan otorisasi operator sebelum versi dirilis. Publikasi release adalah tindakan rilis production; membuat tag saja tidak cukup. Retry diperiksa operator lebih dahulu bila hasil request API tidak pasti. Release dijalankan berurutan; jangan memublikasikan beberapa versi bersamaan atau memakai versi lama untuk rollback terselubung.

Token disimpan oleh pemilik langsung di GitHub; nilai tidak boleh masuk source, log atau chat. Pemilik membatasi scope ke tim Vercel terkait dan menentukan masa berlaku. Token yang kedaluwarsa menghentikan workflow. Aktivasi workflow belum terbukti sampai secret disimpan dan release nyata yang disetujui berhasil; pengujian otomatis memakai API sintetis, bukan production.

Endpoint promote dapat mengaktifkan kembali auto-assignment; workflow menegaskan ulang false sesudah permintaan promote, termasuk jika respons promote gagal. Laporan upstream: [vercel/vercel #15095](https://github.com/vercel/vercel/issues/15095). Kegagalan penegasan ulang menghentikan workflow dan perlu pemeriksaan operator; git.deploymentEnabled main=false tetap menjadi penghalang Git-trigger tersendiri.

## Referensi

- [Pemicu Git Vercel](https://vercel.com/docs/project-configuration/git-configuration)
- [GitHub release events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#release)
- [Vercel REST deployment](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment)
- [Vercel promote](https://vercel.com/docs/rest-api/projects/point-production-traffic-to-a-given-deployment)
