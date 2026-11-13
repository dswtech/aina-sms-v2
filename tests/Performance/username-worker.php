<?php

use App\Http\Controllers\Auth\InvitationController;
use App\Http\Requests\Auth\StoreInvitationRequest;
use App\Models\User;
use App\Services\UsernameReservations;
use App\Support\Rand;
use App\Support\RandomizerRand;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Random\Engine\Mt19937;
use Random\Randomizer;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$db = DB::connection();
if (! $app->environment('testing') || $db->getDriverName() !== 'pgsql'
    || $db->getConfig('host') !== '127.0.0.1' || $db->getConfig('username') !== 'g13_runner'
    || $db->getDatabaseName() !== 'aina_g13_username') {
    throw new RuntimeException('Expected the dedicated G13 username race database.');
}

[$worker, $actorId, $teamId, $email] = array_slice($argv, 1);
$db->selectOne("select set_config('application_name', ?, false)", [$worker]);
// The same seed in both workers makes them pick the same first candidate.
$app->instance(Rand::class, new RandomizerRand(new Randomizer(new Mt19937(2026))));
$actor = User::query()->findOrFail($actorId);

$request = StoreInvitationRequest::create('/invitations', 'POST', [
    'name' => 'Siti Rahmawati', 'email' => $email, 'role' => 'sales', 'team_id' => (int) $teamId,
]);
$request->setContainer($app)->setRedirector($app['redirect']);
$request->setLaravelSession($app['session']->driver('array'));
$app->instance('request', $request); // Rebinding resets the request user resolver to the auth guard.
$app['auth']->guard()->setUser($actor);
$request->validateResolved();

$response = $app->make(InvitationController::class)->store($request, $app->make(UsernameReservations::class));
echo $response->getStatusCode();
