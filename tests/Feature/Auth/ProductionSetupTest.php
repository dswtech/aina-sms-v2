<?php

use App\Models\Invitation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;

function productionSetupConfiguration(array $overrides = []): void
{
    config(['app.url' => 'https://production.example.test']);
    config(['deployment.production_setup' => array_merge([
        'enabled' => true,
        'environment' => 'production',
        'branch' => 'main',
        'source_commit' => 'reviewed-commit',
        'approved_commit' => 'reviewed-commit',
        'expires_at' => now()->addMinutes(10)->getTimestamp(),
        'expected_host' => '127.0.0.1',
        'expected_database' => 'aina_production_bootstrap_test',
        'domain' => 'production.example.test',
        'dealer' => 'Production Test Dealer',
        'name' => 'Test Owner',
        'email' => 'owner@example.test',
        'username' => 'owner',
    ], $overrides)]);
}

it('never starts production setup outside its explicit release authorization', function (array $overrides) {
    Notification::fake();
    productionSetupConfiguration($overrides);
    $this->artisan('app:prepare-production')->assertSuccessful();
    expect(Invitation::query()->count())->toBe(0);
    Notification::assertNothingSent();
})->with([
    'disabled' => [['enabled' => false]],
    'preview' => [['environment' => 'preview']],
    'feature branch' => [['branch' => 'codex/feature']],
    'wrong commit' => [['approved_commit' => 'different-commit']],
    'missing commit' => [['approved_commit' => '']],
    'expired' => [['expires_at' => 1]],
    'unbounded window' => [['expires_at' => PHP_INT_MAX]],
]);

it('rejects a mismatched database target before migration', function () {
    Notification::fake();
    productionSetupConfiguration(['expected_host' => 'another.example.test']);
    $this->artisan('app:prepare-production')->assertFailed();
    Notification::assertNothingSent();
});

function withEmptyProductionTestDatabase(Closure $callback): void
{
    $default = config('database.default');
    $source = DB::connection($default);
    config(['database.connections.production_setup_admin' => array_merge(config('database.connections.'.$default), [
        'url' => null, 'host' => $source->getConfig('host'), 'port' => $source->getConfig('port'),
        'username' => $source->getConfig('username'), 'password' => $source->getConfig('password'),
        'database' => $source->getDatabaseName(),
    ])]);
    $admin = DB::connection('production_setup_admin');
    $database = 'aina_production_setup_empty_test';
    $admin->statement('CREATE DATABASE '.$database);
    config(['database.connections.production_setup_test' => array_merge(config('database.connections.'.$default), [
        'url' => null, 'host' => $admin->getConfig('host'), 'port' => $admin->getConfig('port'),
        'username' => $admin->getConfig('username'), 'password' => $admin->getConfig('password'),
        'database' => $database,
    ]), 'database.default' => 'production_setup_test']);
    productionSetupConfiguration(['expected_host' => $admin->getConfig('host'), 'expected_database' => $database]);
    try {
        $callback();
    } finally {
        DB::purge('production_setup_test');
        config(['database.default' => $default]);
        $admin->statement('DROP DATABASE '.$database.' WITH (FORCE)');
        DB::purge('production_setup_admin');
    }
}

it('migrates an empty PostgreSQL database and sends only one Admin invitation on replay', function () {
    Notification::fake();
    withEmptyProductionTestDatabase(function () {
        $this->artisan('app:prepare-production')->assertSuccessful();
        expect(Schema::hasTable('invitations'))->toBeTrue()
            ->and(Invitation::query()->count())->toBe(1);
        $this->artisan('app:prepare-production')->assertFailed();
        expect(Invitation::query()->count())->toBe(1);
    });
})->skip(fn () => DB::connection()->getDriverName() !== 'pgsql', 'Requires an isolated PostgreSQL test cluster');

it('preserves an existing PostgreSQL schema instead of migrating it without backup review', function () {
    Notification::fake();
    withEmptyProductionTestDatabase(function () {
        DB::statement('CREATE TABLE operator_marker (id bigint PRIMARY KEY)');
        $this->artisan('app:prepare-production')
            ->expectsOutputToContain('existing schema requires backup and operator review')->assertFailed();
        expect(Schema::hasTable('operator_marker'))->toBeTrue()
            ->and(Schema::hasTable('migrations'))->toBeFalse();
        Notification::assertNothingSent();
    });
})->skip(fn () => DB::connection()->getDriverName() !== 'pgsql', 'Requires an isolated PostgreSQL test cluster');
