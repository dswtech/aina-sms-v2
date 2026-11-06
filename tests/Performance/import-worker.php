<?php

use App\Http\Controllers\ImportController;
use App\Models\CsvImportBatch;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

require __DIR__.'/../../vendor/autoload.php';
$app = require __DIR__.'/../../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$db = DB::connection();
if (! $app->environment('testing') || $db->getDriverName() !== 'pgsql'
    || $db->getConfig('host') !== '127.0.0.1' || $db->getConfig('username') !== 'g13_runner'
    || $db->getDatabaseName() !== 'aina_g13_concurrency') {
    throw new RuntimeException('Expected the dedicated G13 concurrency database.');
}

[$worker, $actorId, $batchId, $phone] = array_slice($argv, 1);
$db->selectOne("select set_config('application_name', ?, false)", [$worker]);
$actor = User::query()->findOrFail($actorId);
$request = Request::create('/imports/'.$batchId.'/commit', 'POST');
$request->setUserResolver(fn () => $actor);
$request->setLaravelSession($app['session']->driver('array'));
$request->session()->put('import_preview', ['batch_id' => (int) $batchId, 'rows' => [[
    'valid' => true, 'row_number' => 2,
    'data' => ['name' => 'Concurrent import', 'phone' => $phone, 'sales_username' => 'g13.sales',
        'vehicle_model' => 'Model', 'source' => 'walk_in', 'email' => null, 'address' => null,
        'notes' => null, 'contact_channel_preference' => null, 'estimated_value' => null],
]]]);

try {
    $app->make(ImportController::class)->commit($request, CsvImportBatch::query()->findOrFail($batchId));
    echo 'committed';
} catch (HttpExceptionInterface $error) {
    echo 'http:'.$error->getStatusCode();
} catch (ValidationException $error) {
    echo str_contains($error->errors()['import'][0] ?? '', 'sudah terdaftar') ? 'duplicate' : 'unexpected-validation';
}
