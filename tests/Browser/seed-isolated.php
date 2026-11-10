<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

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

$sales = User::factory()->sales()->create(['name' => 'G11 Synthetic Sales', 'username' => 'g11.sales']);
$team = Team::factory()->create(['dealer_id' => $sales->dealer_id]);
// The lead form only offers models from the Admin master.
$vehicleType = DB::table('vehicle_types')->insertGetId(['dealer_id' => $sales->dealer_id, 'name' => 'G11 Type']);
foreach (['G11 Recovery Model', 'G11 Test Model', 'ACC Flow Unit', 'ACC Flow Repeat', '+SUM EXPT'] as $vehicleName) {
    DB::table('vehicle_models')->insert(['dealer_id' => $sales->dealer_id, 'vehicle_type_id' => $vehicleType, 'name' => $vehicleName]);
}
TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales', 'ended_at' => null]);
$supervisor = User::factory()->supervisor()->create(['dealer_id' => $sales->dealer_id, 'username' => 'g11.spv']);
TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor', 'ended_at' => null]);

$reportCustomer = Customer::factory()->create(['dealer_id' => $sales->dealer_id]);
$reportDeal = DealTransaction::create([
    'dealer_id' => $sales->dealer_id, 'team_id' => $team->id, 'sales_id' => $sales->id,
    'customer_id' => $reportCustomer->id, 'vehicle_model' => 'G11 Report Model', 'source' => 'walk_in',
]);
$reportDeal->forceFill(['created_at' => '2001-01-12 00:00:00', 'progress_at' => '2001-01-12 00:00:00'])->save();

// An assigned customer, so Supervisors may edit the profile from the detail modal.
$workspaceCustomer = Customer::factory()->create(['dealer_id' => $sales->dealer_id, 'occupation' => null, 'region_code' => null, 'district_code' => null, 'other_city' => null]);
$workspaceCustomer->assignTo($sales);
DealTransaction::create([
    'dealer_id' => $sales->dealer_id, 'team_id' => $team->id, 'sales_id' => $sales->id,
    'customer_id' => $workspaceCustomer->id, 'vehicle_model' => 'G11 Workspace Model', 'source' => 'walk_in',
]);

for ($i = 1; $i <= 16; $i++) {
    DealTransaction::create([
        'dealer_id' => $sales->dealer_id, 'team_id' => $team->id, 'sales_id' => $sales->id,
        'customer_id' => $reportCustomer->id, 'vehicle_model' => "G11 Pagination Model {$i}", 'source' => 'walk_in',
    ]);
}

User::factory()->admin()->create(['dealer_id' => $sales->dealer_id, 'username' => 'g11.admin']);
foreach (['Ship', 'Cancel'] as $scenario) {
    DealTransaction::create([
        'dealer_id' => $sales->dealer_id, 'team_id' => $team->id, 'sales_id' => $sales->id,
        'customer_id' => $reportCustomer->id, 'vehicle_model' => "G11 DO {$scenario}", 'source' => 'walk_in',
        'current_stage' => PipelineStage::Spk,
        'region_code' => '32.17', 'district_code' => '32.17.08',
    ]);
}

// Transactions/financing/area fixtures. Names avoid the "G11 DO ..." prefix mutated by do-workflow.js.
User::factory()->branchManager()->create(['dealer_id' => $sales->dealer_id, 'username' => 'g11.bm']);
$db = fn (string $table) => DB::table($table);
$db('dealer_foa_districts')->insertOrIgnore(['dealer_id' => $sales->dealer_id, 'district_code' => '32.17.08']);
$leasingId = $db('leasing_companies')->where('dealer_id', $sales->dealer_id)->orderBy('id')->value('id');
$fixtureAdmin = User::query()->where('username', 'g11.admin')->firstOrFail();
foreach (['Fin Do' => 'credit', 'Fin Cash' => 'cash'] as $label => $type) {
    $deal = DealTransaction::create([
        'dealer_id' => $sales->dealer_id, 'team_id' => $team->id, 'sales_id' => $sales->id,
        'customer_id' => $reportCustomer->id, 'vehicle_model' => "G11 {$label}", 'source' => 'walk_in',
        'current_stage' => PipelineStage::Spk, 'region_code' => '32.17', 'district_code' => '32.17.08',
        'financing_type' => $type, 'leasing_id' => $type === 'credit' ? $leasingId : null,
    ]);
    $deal->transitionTo(PipelineStage::Do, $fixtureAdmin, null, ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true]);
}
