# Katalog Kendaraan Toyota Bawaan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Master kendaraan berisi 20 model Toyota dengan harga perkiraan OTR Bandung 2026 di demo, di production berjalan, dan di install baru.

**Architecture:** Katalog jadi konstanta di `TransactionMasters` dengan `initializeVehicles()` (pola sama dengan `initialize()`/`initializeFoa()`). Migration memanggilnya untuk dealer yang ada; `app:invite-first-admin` memanggilnya saat membuat dealer; seeder demo memakainya.

**Tech Stack:** Laravel 12, Pest, PostgreSQL/SQLite test.

**Spec:** `docs/superpowers/specs/2026-11-13-toyota-vehicle-catalog-design.md`

## Global Constraints
- Branch `chore/toyota-demo-vehicles` (sudah ada; berisi perubahan seeder belum di-commit). Stage per path, jangan `git add .`.
- Conventional Commits, akhiri dengan `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Jangan jalankan migration/seeder di database non-test.
- Katalog persis seperti tabel di spec (nama berawalan `Toyota `, tipe `MPV`, `SUV`, `Hatchback`, `Sedan`, `Pickup`, `Komersial`).

## Review Focus
- Admin sudah mengubah harga "Toyota Avanza" lalu migration/initializer jalan lagi → harga Admin tetap (Task 1 test).
- Admin sudah punya tipe "SUV" milik sendiri → dipakai ulang, tidak gagal unique (Task 1 test: initializer dua kali).
- Migration pada database tanpa dealer → tidak error, tidak ada baris (Task 2 test).
- Rollback migration → master kendaraan tetap (Task 2: `down()` kosong).
- `app:invite-first-admin` gagal kirim email → rollback juga membatalkan katalog (sudah tercakup karena di dalam transaksi yang sama; test lama "rolls back failed delivery" menghitung dealer 0).

---

### Task 1: Katalog dan `initializeVehicles()` di TransactionMasters, seeder demo memakainya

**Files:**
- Modify: `app/Services/TransactionMasters.php` (dekat `initialize()`, baris ~18)
- Modify: `database/seeders/DevelopmentDemoSeeder.php` (hapus `seedVehicleMaster()`, baris ~444; pemanggil baris ~306)
- Test: `tests/Feature/Admin/VehicleMasterTest.php` (tambah test)

**Interfaces:**
- Produces: `public const TOYOTA_CATALOG` (`array<string, array<string, array{int,int}>>`, tipe → nama → [min, max]); `public static function initializeVehicles(int $dealerId): void`.

- [ ] **Step 1: Write the failing test** di `VehicleMasterTest.php`:

```php
it('fills the Toyota catalog once and keeps Admin-edited prices', function () {
    TransactionMasters::initializeVehicles($this->dealer->id);
    DB::table('vehicle_models')->where('name', 'Toyota Avanza')->update(['price_min' => 1]);
    TransactionMasters::initializeVehicles($this->dealer->id);

    $models = DB::table('vehicle_models')->where('dealer_id', $this->dealer->id);
    expect((clone $models)->count())->toBe(20)
        ->and((clone $models)->where('name', 'not like', 'Toyota %')->count())->toBe(0)
        ->and(DB::table('vehicle_types')->where('dealer_id', $this->dealer->id)->pluck('name')->sort()->values()->all())
        ->toBe(['Hatchback', 'Komersial', 'MPV', 'Pickup', 'SUV', 'Sedan'])
        ->and((clone $models)->where('name', 'Toyota Avanza')->value('price_min'))->toBe(1)
        ->and((clone $models)->where('name', 'Toyota Alphard')->value('price_max'))->toBe(1_700_000_000);
});
```

- [ ] **Step 2:** `php artisan test --compact --filter="Toyota catalog"` → FAIL (undefined method).
- [ ] **Step 3:** Pindahkan `$catalog` dan loop `insertOrIgnore` dari `DevelopmentDemoSeeder::seedVehicleMaster()` ke `TOYOTA_CATALOG` + `initializeVehicles()`; docblock satu baris: harga perkiraan OTR Bandung 2026, bukan pricelist resmi. Di seeder: `TransactionMasters::initializeVehicles($dealer->id); $vehicleModels = array_merge(...array_map(array_keys(...), array_values(TransactionMasters::TOYOTA_CATALOG)));` lalu hapus `seedVehicleMaster()`.
- [ ] **Step 4:** `php artisan test --compact --filter="VehicleMaster|DevelopmentDemoSeeder|DevelopmentReportingSeeder"` → PASS.
- [ ] **Step 5: Commit**

```bash
git add app/Services/TransactionMasters.php database/seeders/DevelopmentDemoSeeder.php tests/Feature/Admin/VehicleMasterTest.php tests/Feature/DevelopmentDemoSeederTest.php
git commit -m "feat(vehicles): add the Toyota catalog with estimated Bandung prices"
```

### Task 2: Migration untuk dealer yang sudah ada dan bootstrap dealer baru

**Files:**
- Create: `database/migrations/2026_11_13_100000_seed_toyota_vehicle_catalog.php`
- Modify: `app/Console/Commands/InviteFirstAdmin.php` (setelah `$dealer ??= Dealer::query()->create([...])`, baris ~90)
- Test: `tests/Feature/Auth/FirstAdminBootstrapTest.php`, `tests/Feature/Admin/VehicleMasterTest.php`

**Interfaces:**
- Consumes: `TransactionMasters::initializeVehicles(int $dealerId): void` (Task 1).

- [ ] **Step 1: Write the failing tests**
  - `FirstAdminBootstrapTest`, test pertama ("bootstraps only an invitation…"): tambah `->and(DB::table('vehicle_models')->where('dealer_id', Dealer::query()->sole()->id)->count())->toBe(20)`.
  - `VehicleMasterTest`: `it('migration fills the catalog for existing dealers only')` — `(require database_path('migrations/2026_11_13_100000_seed_toyota_vehicle_catalog.php'))->up()` dua kali; expect 20 model untuk `$this->dealer`; panggil `->down()`; expect tetap 20.
- [ ] **Step 2:** `php artisan test --compact --filter="FirstAdminBootstrap|existing dealers"` → FAIL.
- [ ] **Step 3:** Migration: `up()` = `foreach (DB::table('dealers')->pluck('id') as $id) TransactionMasters::initializeVehicles((int) $id);`; `down()` kosong dengan komentar satu baris (data milik Admin setelah deploy). Di `InviteFirstAdmin`: panggil `initializeVehicles` hanya ketika dealer baru dibuat (bukan dealer yang sudah ada).
- [ ] **Step 4:** `php artisan test --compact` (full suite) → PASS; `vendor/bin/pint --dirty --test` → passed.
- [ ] **Step 5: Docs** — tambah satu baris di `docs/agents/memory.md` (katalog Toyota bawaan, harga perkiraan, migration belum dijalankan di non-test) dan daftarkan spec + plan ini di `docs/agents/README.md`.
- [ ] **Step 6: Commit**

```bash
git add database/migrations/2026_11_13_100000_seed_toyota_vehicle_catalog.php app/Console/Commands/InviteFirstAdmin.php tests/Feature/Auth/FirstAdminBootstrapTest.php tests/Feature/Admin/VehicleMasterTest.php docs/agents/memory.md docs/agents/README.md docs/superpowers/specs/2026-11-13-toyota-vehicle-catalog-design.md docs/superpowers/plans/2026-11-13-toyota-vehicle-catalog.md
git commit -m "feat(vehicles): seed the Toyota catalog for existing and new dealers"
```
