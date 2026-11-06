<?php

use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;

// The launcher must supply a new, empty SQLite file in the system temp directory.
$database = realpath(getenv('DB_DATABASE') ?: '');
$temporaryRoot = realpath(sys_get_temp_dir());
if (getenv('APP_ENV') !== 'testing' || getenv('DB_CONNECTION') !== 'sqlite'
    || $database === false || dirname($database) !== $temporaryRoot
    || ! str_starts_with(basename($database), 'aina-g11-') || filesize($database) !== 0) {
    throw new RuntimeException('Expected a fresh G11 test database in the system temp directory.');
}

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
if (! $app->environment('testing') || config('database.default') !== 'sqlite'
    || realpath(config('database.connections.sqlite.database')) !== $database
    || config('database.connections.sqlite.url')) {
    throw new RuntimeException('Resolved connection is not the isolated G11 SQLite database.');
}

if (Artisan::call('migrate', ['--force' => true]) !== 0) {
    throw new RuntimeException(Artisan::output());
}

$sales = User::factory()->sales()->create(['name' => 'G11 Synthetic Sales', 'username' => 'g11.synthetic.sales']);
$team = Team::factory()->create(['dealer_id' => $sales->dealer_id]);
TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales', 'ended_at' => null]);
