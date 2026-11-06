<?php

use App\Models\User;
use Illuminate\Contracts\Console\Kernel as ConsoleKernel;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(ConsoleKernel::class)->bootstrap();
$db = DB::connection();
if (! $app->environment('testing') || $db->getDriverName() !== 'pgsql'
    || $db->getConfig('host') !== '127.0.0.1' || $db->getConfig('username') !== 'g13_runner'
    || $db->getDatabaseName() !== 'aina_g13_concurrency') {
    throw new RuntimeException('Expected the dedicated G13 concurrency database.');
}

[$worker, $actorId, $publicId] = array_slice($argv, 1);
$db->selectOne("select set_config('application_name', ?, false)", [$worker]);
Auth::guard('web')->setUser(User::query()->findOrFail($actorId));
$request = Request::create('/transactions/'.$publicId.'/stage', 'PATCH', [
    'to_stage' => 'do', 'stage_event_id' => 0, 'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
], server: ['HTTP_ACCEPT' => 'application/json']);
$response = $app->make(HttpKernel::class)->handle($request);
echo $response->getStatusCode();
