<?php

use App\Enums\PipelineStage;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\DealComment;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(ConsoleKernel::class)->bootstrap();
// Let failures terminate this standalone worker with a nonzero exit code.
restore_exception_handler();
$db = DB::connection();
if (! $app->environment('testing') || $db->getDriverName() !== 'pgsql'
    || $db->getConfig('host') !== '127.0.0.1' || $db->getConfig('username') !== 'restore_runner'
    || ! in_array($db->getDatabaseName(), ['aina_restore_source', 'aina_restore_target'], true)) {
    throw new RuntimeException('Expected an isolated restore drill database.');
}

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

$mode = $argv[1] ?? '';
if ($mode === 'seed') {
    check($db->getDatabaseName() === 'aina_restore_source', 'Seed only the source.');
    check($db->scalar("select to_regclass('public.migrations')") === null, 'Expected an empty source.');
    check(Artisan::call('migrate', ['--force' => true]) === 0, Artisan::output());
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $users = [];
    foreach (['admin', 'branchManager', 'supervisor', 'sales'] as $role) {
        $user = User::factory()->$role()->create(['dealer_id' => $dealer->id, 'username' => 'r.'.strtolower(substr($role, 0, 9))]);
        $users[$role] = $user;
        if (in_array($role, ['supervisor', 'sales'], true)) {
            TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role]);
        }
    }
    foreach ([PipelineStage::Prospect, PipelineStage::Do, PipelineStage::Delivery] as $stage) {
        $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'created_by_id' => $users['sales']->id, 'name' => 'RESTORE OWN CUSTOMER '.$stage->value]);
        $customer->assignTo($users['sales'], $users['supervisor']);
        $deal = DealTransaction::create([
            'dealer_id' => $dealer->id, 'customer_id' => $customer->id, 'team_id' => $team->id,
            'sales_id' => $users['sales']->id, 'vehicle_model' => 'Restore example', 'current_stage' => $stage,
        ]);
        if ($stage !== PipelineStage::Prospect) {
            $deal->stageHistories()->create([
                'from_stage' => PipelineStage::Spk, 'to_stage' => PipelineStage::Do,
                'actor_id' => $users['sales']->id, 'created_at' => now()->subMinute(),
                'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
            ]);
        }
        if ($stage === PipelineStage::Delivery) {
            $deal->stageHistories()->create([
                'from_stage' => PipelineStage::Do, 'to_stage' => PipelineStage::Delivery,
                'actor_id' => $users['sales']->id, 'created_at' => now(),
            ]);
        }
        DealComment::create([
            'deal_transaction_id' => $deal->id, 'user_id' => $users['supervisor']->id,
            'body' => 'Synthetic restore coaching', 'stage_at_creation' => $stage,
        ]);
    }
    $foreignSales = User::factory()->sales()->create(['username' => 'r.foreign']);
    $foreignCustomer = Customer::factory()->create(['dealer_id' => $foreignSales->dealer_id, 'created_by_id' => $foreignSales->id, 'name' => 'RESTORE FOREIGN CUSTOMER']);
    $foreignCustomer->assignTo($foreignSales, $foreignSales);
    AuditLog::create([
        'dealer_id' => $dealer->id, 'actor_id' => $users['admin']->id,
        'action' => 'restore_drill', 'subject_type' => 'dealer', 'subject_public_id' => $dealer->public_id,
        'metadata' => ['synthetic' => true],
    ]);
    check(User::count() === 5 && Customer::count() === 4 && DealTransaction::count() === 3, 'Unexpected fixture counts');
    echo "Seeded synthetic fixture.\n";
} elseif ($mode === 'fingerprint') {
    $tables = $db->select("select tablename from pg_tables where schemaname = 'public' order by tablename");
    $result = [];
    foreach ($tables as $table) {
        $name = $table->tablename;
        $quoted = '"'.str_replace('"', '""', $name).'"';
        $rows = $db->select("select row_to_json(t)::text as row from public.{$quoted} t order by row_to_json(t)::text");
        $result[$name] = ['count' => count($rows), 'sha256' => hash('sha256', json_encode($rows, JSON_THROW_ON_ERROR))];
    }
    $result['_sequences'] = $db->select("select sequencename, start_value, increment_by, max_value, min_value, cache_size, cycle, last_value from pg_sequences where schemaname = 'public' order by sequencename");
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR)."\n";
} elseif ($mode === 'smoke') {
    $role = $argv[2] ?? '';
    $user = User::query()->where('username', 'r.'.strtolower(substr($role, 0, 9)))->sole();
    $kernel = $app->make(HttpKernel::class);
    $login = $kernel->handle(Request::create('/login', 'POST', [
        'username' => $user->username, 'password' => 'password',
    ], server: ['HTTP_ACCEPT' => 'application/json']));
    check(in_array($login->getStatusCode(), [200, 302], true) && Auth::id() === $user->id, 'Restored login failed for '.$role.' HTTP '.$login->getStatusCode());
    $routes = [
        'admin' => ['/dashboard', '/customers', '/imports', '/analytics', '/users'],
        'branchManager' => ['/dashboard', '/analytics', '/team-performance'],
        'supervisor' => ['/dashboard', '/customers', '/imports', '/analytics', '/targets'],
        'sales' => ['/dashboard', '/customers', '/transactions'],
    ];
    foreach ($routes[$role] as $route) {
        Auth::guard('web')->setUser($user);
        $response = $kernel->handle(Request::create($route, 'GET', server: [
            'HTTP_ACCEPT' => 'text/html, application/xhtml+xml',
        ]));
        check($response->getStatusCode() === 200, $role.' '.$route.' returned '.$response->getStatusCode());
        check(! str_contains($response->getContent(), 'RESTORE FOREIGN CUSTOMER'), 'Foreign customer leaked.');
        if ($route === '/customers') {
            check(str_contains($response->getContent(), 'RESTORE OWN CUSTOMER'), 'Assigned customer is missing.');
        }
    }
    if ($role === 'branchManager') {
        $response = $kernel->handle(Request::create('/customers', 'GET', server: ['HTTP_ACCEPT' => 'application/json']));
        check($response->getStatusCode() === 403, 'Branch Manager customer access must be denied.');
    }
    echo $role." login and routes passed.\n";
} else {
    throw new RuntimeException('Unknown drill mode.');
}
