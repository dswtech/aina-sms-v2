<?php

use App\Models\CsvImportBatch;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;
use Tests\TestCase;

uses(TestCase::class);

it('serializes simultaneous PostgreSQL import commits and rejects replay or duplicate identity', function () {
    $db = DB::connection();
    if (! app()->environment('testing') || $db->getDriverName() !== 'pgsql'
        || $db->getConfig('host') !== '127.0.0.1' || $db->getConfig('username') !== 'g13_runner'
        || $db->getDatabaseName() !== 'aina_g13_concurrency'
        || $db->scalar("select to_regclass('public.migrations')") !== null) {
        throw new RuntimeException('Use an empty, dedicated G13 PostgreSQL concurrency database.');
    }
    $this->artisan('migrate', ['--force' => true])->assertSuccessful();
    $dealer = Dealer::factory()->create();
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    User::factory()->sales()->create(['dealer_id' => $dealer->id, 'username' => 'g13.sales']);

    $newBatch = fn () => CsvImportBatch::create([
        'dealer_id' => $dealer->id, 'user_id' => $admin->id, 'original_filename' => 'g13.csv', 'file_path' => 'g13.csv',
        'status' => 'preview', 'total_rows' => 1, 'accepted_count' => 1, 'rejected_count' => 0, 'started_at' => now(),
    ]);
    foreach ([true, false] as $sameBatch) {
        $first = $newBatch();
        $second = $sameBatch ? $first : $newBatch();
        $phone = $sameBatch ? '081234560001' : '081234560002';
        $workers = [];
        $db->beginTransaction();
        try {
            Dealer::query()->whereKey($dealer->id)->lockForUpdate()->firstOrFail();
            foreach ([$first, $second] as $slot => $batch) {
                $worker = new Process([PHP_BINARY, __DIR__.'/import-worker.php', 'g13-import-'.$slot, (string) $admin->id, (string) $batch->id, $phone]);
                $worker->setTimeout(20);
                $worker->start();
                $workers[] = $worker;
            }
            $waiting = 0;
            $deadline = microtime(true) + 8;
            while ($waiting < 2 && microtime(true) < $deadline) {
                $db->statement('select pg_stat_clear_snapshot()');
                $waiting = (int) $db->scalar("select count(*) from pg_stat_activity where application_name like 'g13-import-%' and wait_event_type = 'Lock'");
                usleep(20000);
            }
            expect($waiting)->toBe(2);
            $db->commit();
            $outcomes = [];
            foreach ($workers as $worker) {
                expect($worker->wait())->toBe(0, $worker->getErrorOutput());
                $outcomes[] = trim($worker->getOutput());
            }
            sort($outcomes);
            expect($outcomes)->toBe(['committed', $sameBatch ? 'http:422' : 'duplicate']);
        } finally {
            if ($db->transactionLevel() > 0) {
                $db->rollBack();
            }
            foreach ($workers as $worker) {
                if ($worker->isRunning()) {
                    $worker->stop();
                }
            }
        }
    }

    $this->assertDatabaseCount('customers', 2);
    $this->assertDatabaseCount('customer_assignments', 2);
    $this->assertDatabaseCount('deal_transactions', 2);
    expect(CsvImportBatch::query()->where('status', 'completed')->count())->toBe(2);

    $sales = User::query()->where('username', 'g13.sales')->sole();
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id, 'sales_id' => $sales->id,
        'customer_id' => Customer::query()->firstOrFail()->id,
        'vehicle_model' => 'Concurrent DO', 'current_stage' => 'spk',
    ]);
    $workers = [];
    $db->beginTransaction();
    try {
        DealTransaction::query()->whereKey($deal->id)->lockForUpdate()->firstOrFail();
        foreach ([1, 2] as $slot) {
            $worker = new Process([PHP_BINARY, __DIR__.'/do-worker.php', 'g13-do-'.$slot, (string) $sales->id, $deal->public_id]);
            $worker->setTimeout(20);
            $worker->start();
            $workers[] = $worker;
        }
        $waiting = 0;
        $deadline = microtime(true) + 8;
        while ($waiting < 2 && microtime(true) < $deadline) {
            $db->statement('select pg_stat_clear_snapshot()');
            $waiting = (int) $db->scalar("select count(*) from pg_stat_activity where application_name like 'g13-do-%' and wait_event_type = 'Lock'");
            usleep(20000);
        }
        expect($waiting)->toBe(2);
        $db->commit();
        $outcomes = [];
        foreach ($workers as $worker) {
            expect($worker->wait())->toBe(0, $worker->getErrorOutput());
            $outcomes[] = trim($worker->getOutput());
        }
        sort($outcomes);
        expect($outcomes)->toBe(['302', '403'])
            ->and($deal->stageHistories()->where('to_stage', 'do')->count())->toBe(1);
    } finally {
        if ($db->transactionLevel() > 0) {
            $db->rollBack();
        }
        foreach ($workers as $worker) {
            if ($worker->isRunning()) {
                $worker->stop();
            }
        }
    }
});
