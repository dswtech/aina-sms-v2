# AINA SMS

Development baseline untuk **DealDrive Supervisor** memakai Laravel 13, Inertia 3, React 19, TypeScript, Tailwind CSS 4, dan komponen shadcn/ui.

## Kebutuhan lokal

- PHP 8.3 atau lebih baru.
- Composer 2.
- Node.js 24 dan pnpm 11.
- PostgreSQL.
- Host lokal `aina.test` diarahkan ke web server yang melayani folder `public/`.

## Menjalankan development

```powershell
nvm use 24
composer install
pnpm install
composer run dev
```

Konfigurasi lokal berada di `.env` dan tidak boleh dikomit. Migration atau seeder tidak dijalankan otomatis dalam repository ini; pastikan target database benar sebelum melakukan operasi write.

## Pemeriksaan

```powershell
composer test
pnpm run check
pnpm run types:check
pnpm run build
```

Dokumentasi produk dan keputusan teknis kanonik berada di [`docs/agents/`](docs/agents/README.md).
