<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\CsvImportBatch;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

uses(TestCase::class);

it('measures real Laravel endpoints on a synthetic PostgreSQL workload', function () {
    $profile = getenv('G13_BENCHMARK_PROFILE') ?: 'pilot';
    [$transactions, $teams, $salesPerTeam] = match ($profile) {
        'pilot' => [10000, 2, 20],
        'capacity' => [100000, 10, 5],
        default => throw new RuntimeException('Expected the pilot or capacity benchmark profile.'),
    };
    $connection = DB::connection();
    if (! app()->environment('testing') || $connection->getDriverName() !== 'pgsql'
        || $connection->getConfig('host') !== '127.0.0.1'
        || $connection->getDatabaseName() !== 'aina_g13_benchmark'
        || $connection->getConfig('username') !== 'g13_runner'
        || $connection->scalar("select to_regclass('public.migrations')") !== null) {
        throw new RuntimeException('Use an empty, dedicated G13 PostgreSQL benchmark database.');
    }

    $this->artisan('migrate', ['--force' => true])->assertSuccessful();
    Storage::fake('local');
    $this->travelTo(now('Asia/Jakarta')->setDate(2026, 11, 25)->startOfDay());
    $dealer = Dealer::factory()->create();
    $manager = User::factory()->branchManager()->create(['dealer_id' => $dealer->id]);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    foreach (Team::factory()->count($teams)->create(['dealer_id' => $dealer->id]) as $team) {
        $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
        TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor', 'ended_at' => null]);
        foreach (User::factory()->sales()->count($salesPerTeam)->create(['dealer_id' => $dealer->id]) as $sales) {
            TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales', 'ended_at' => null]);
        }
    }

    DB::statement(<<<'SQL'
        insert into customers (id, public_id, dealer_id, name, phone, created_at, updated_at)
        select i, gen_random_uuid(), ?, 'Synthetic customer ' || i, '+6288' || lpad(i::text, 8, '0'), now(), now()
        from generate_series(1, cast(? as integer)) as i
        SQL, [$dealer->id, $transactions]);
    DB::statement("select setval(pg_get_serial_sequence('customers','id'), ?)", [$transactions]);
    DB::statement(<<<'SQL'
        with roster as (select user_id, team_id, row_number() over (order by user_id) as slot from team_memberships where role = 'sales'),
        samples as (
            select id, dealer_id,
                (array['lead','prospect','hot_prospect','spk','do','delivery','lost'])[1 + id % 7] as stage,
                timestamptz '2025-12-01 00:00:00+07' + (id % 12) * interval '1 month' + (id % 23) * interval '1 day' as acquired_at
            from customers
        )
        insert into deal_transactions (public_id, dealer_id, customer_id, sales_id, team_id, vehicle_model, source, current_stage, estimated_value, expected_closing_month, last_activity_at, created_at, updated_at)
        select gen_random_uuid(), dealer_id, id, user_id, team_id, 'Model ' || (id % 15),
            (array['walk_in','referral','digital_ad','call'])[1 + id % 4], stage, 250000000,
            date_trunc('month', acquired_at at time zone 'Asia/Jakarta')::date, acquired_at, acquired_at, acquired_at
        from samples join roster on slot = 1 + id % cast(? as integer)
        SQL, [$teams * $salesPerTeam]);
    DB::statement(<<<'SQL'
        insert into customer_assignments (customer_id, sales_id, started_at, created_at, updated_at)
        select customer_id, sales_id, created_at, created_at, created_at from deal_transactions
        SQL);
    DB::statement(<<<'SQL'
        insert into stage_histories (deal_transaction_id, to_stage, actor_id, created_at, po_confirmed, dp_confirmed, unit_confirmed)
        select id, 'lead', sales_id, created_at, false, false, false from deal_transactions
        union all
        select id, current_stage, sales_id, created_at + interval '3 days',
            current_stage = 'do', current_stage = 'do', current_stage = 'do'
        from deal_transactions where current_stage <> 'lead'
        union all
        select id, 'do', sales_id, created_at + interval '2 days', true, true, true
        from deal_transactions where current_stage = 'delivery'
        SQL);
    DB::statement('analyze');
    $this->assertDatabaseCount('deal_transactions', $transactions);
    $histories = DB::table('stage_histories')->count();
    $this->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => app(HandleInertiaRequests::class)->version(Request::create('/dashboard')) ?? '',
    ]);

    $queryCount = 0;
    $queryMs = 0.0;
    DB::listen(function (QueryExecuted $query) use (&$queryCount, &$queryMs): void {
        $queryCount++;
        $queryMs += $query->time;
    });
    $samples = [];
    $measure = function (string $name, callable $request, int $iteration) use (&$samples, &$queryCount, &$queryMs): mixed {
        // A PHPUnit process survives every request, unlike PHP's per-request lifecycle.
        gc_collect_cycles();
        if (in_array($iteration, [1, 16, 32], true)) {
            fwrite(STDERR, sprintf("%s sample %d, PHP memory %.1f MiB used / %.1f MiB reserved\n", $name, $iteration, memory_get_usage() / 1048576, memory_get_usage(true) / 1048576));
        }
        $queryCount = 0;
        $queryMs = 0.0;
        $start = hrtime(true);
        $response = $request();
        $elapsedMs = (hrtime(true) - $start) / 1_000_000;
        if ($iteration > 2) {
            $samples[$name][] = ['ms' => round($elapsedMs, 2), 'sql_ms' => round($queryMs, 2), 'queries' => $queryCount];
        }

        return $response;
    };

    $this->actingAs($manager);
    for ($i = 1; $i <= 32; $i++) {
        $measure('dashboard', fn () => $this->get('/dashboard?period=2026-11'), $i)->assertOk();
        $measure('analytics_achievement', fn () => $this->get('/analytics?period=2026-11&mode=achievement'), $i)->assertOk();
    }
    $this->actingAs($supervisor);
    for ($i = 1; $i <= 32; $i++) {
        $measure('dashboard_supervisor', fn () => $this->get('/dashboard?period=2026-11'), $i)->assertOk();
    }
    $this->actingAs($sales);
    for ($i = 1; $i <= 32; $i++) {
        $measure('customers', fn () => $this->get('/customers'), $i)->assertOk();
        $measure('create_lead', fn () => $this->post('/customers', [
            'name' => 'Synthetic lead '.$i, 'phone' => '0815'.str_pad((string) $i, 8, '0', STR_PAD_LEFT),
            'vehicle_model' => 'Model 1', 'source' => 'walk_in',
        ]), $i)->assertRedirect()->assertSessionHasNoErrors();
    }
    $this->actingAs($admin);
    for ($i = 1; $i <= 32; $i++) {
        $this->travel(2)->minutes();
        $csv = "name,phone,vehicle_model,source,sales_username\n";
        for ($row = 1; $row <= 100; $row++) {
            $phone = '0816'.str_pad((string) ($i * 100 + $row), 8, '0', STR_PAD_LEFT);
            $csv .= "Synthetic import,{$phone},Model 1,walk_in,{$sales->username}\n";
        }
        $file = UploadedFile::fake()->createWithContent('g13.csv', $csv);
        $measure('import_preview_100', fn () => $this->post('/imports/preview', ['file' => $file]), $i)->assertOk();
        $batch = CsvImportBatch::query()->latest('id')->firstOrFail();
        expect($batch->accepted_count)->toBe(100);
        $measure('import_commit_100', fn () => $this->post(route('imports.commit', $batch)), $i)->assertRedirect()->assertSessionHasNoErrors();
    }
    $this->assertDatabaseCount('deal_transactions', $transactions + 3232);

    $summary = [];
    foreach ($samples as $name => $values) {
        $times = array_column($values, 'ms');
        $sqlTimes = array_column($values, 'sql_ms');
        sort($times);
        sort($sqlTimes);
        $p95 = (int) ceil(count($times) * .95) - 1;
        $summary[$name] = [
            'p50_ms' => $times[(int) ceil(count($times) * .50) - 1],
            'p95_ms' => $times[$p95],
            'p95_sql_ms' => $sqlTimes[$p95],
            'max_ms' => max($times),
            'max_queries' => max(array_column($values, 'queries')),
        ];
    }
    fwrite(STDOUT, json_encode([
        'benchmark' => $summary, 'profile' => $profile, 'initial_transactions' => $transactions, 'initial_stage_events' => $histories,
        'samples' => $samples, 'php_peak_bytes' => memory_get_peak_usage(true),
    ], JSON_THROW_ON_ERROR).PHP_EOL);
});
