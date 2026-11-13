<?php

use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use App\Support\RandomizerRand;
use App\Support\UsernameGenerator;
use Illuminate\Support\Facades\DB;
use Random\Engine\Mt19937;
use Random\Randomizer;
use Symfony\Component\Process\Process;
use Tests\TestCase;

uses(TestCase::class);

it('gives two simultaneous invitations for the same name different usernames', function () {
    $db = DB::connection();
    if (! app()->environment('testing') || $db->getDriverName() !== 'pgsql'
        || $db->getConfig('host') !== '127.0.0.1' || $db->getConfig('username') !== 'g13_runner'
        || $db->getDatabaseName() !== 'aina_g13_username'
        || $db->scalar("select to_regclass('public.migrations')") !== null) {
        throw new RuntimeException('Use an empty, dedicated G13 PostgreSQL username race database.');
    }
    $this->artisan('migrate', ['--force' => true])->assertSuccessful();
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $first = (new UsernameGenerator(new RandomizerRand(new Randomizer(new Mt19937(2026))), fn () => false))->generate('Siti Rahmawati');

    $workers = [];
    $db->beginTransaction();
    try {
        // Invitation inserts need a key-share lock on the dealer, so both workers park after reserving.
        Dealer::query()->whereKey($dealer->id)->lockForUpdate()->firstOrFail();
        foreach ([1, 2] as $slot) {
            $worker = new Process([PHP_BINARY, __DIR__.'/username-worker.php', 'g13-username-'.$slot,
                (string) $admin->id, (string) $team->id, "race{$slot}@example.test"]);
            $worker->setTimeout(20);
            $worker->start();
            $workers[] = $worker;
        }
        $waiting = 0;
        $deadline = microtime(true) + 8;
        while ($waiting < 2 && microtime(true) < $deadline) {
            $db->statement('select pg_stat_clear_snapshot()');
            $waiting = (int) $db->scalar("select count(*) from pg_stat_activity where application_name like 'g13-username-%' and wait_event_type = 'Lock'");
            usleep(20000);
        }
        expect($waiting)->toBe(2, implode("\n", array_map(fn (Process $worker) => $worker->getOutput().$worker->getErrorOutput(), $workers)));
        $db->commit();
        foreach ($workers as $worker) {
            expect($worker->wait())->toBe(0, $worker->getErrorOutput())
                ->and(trim($worker->getOutput()))->toBe('302');
        }
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

    $usernames = Invitation::query()->pluck('username');
    expect($usernames)->toHaveCount(2)
        ->and($usernames->unique())->toHaveCount(2)
        ->and($usernames)->toContain($first)
        ->and(DB::table('username_reservations')->orderBy('username')->pluck('username')->all())
        ->toBe($usernames->sort()->values()->all());
});
