<?php

use App\Models\Dealer;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

function allocationFixture(int $count = 2): array
{
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->count($count)->create(['dealer_id' => $dealer->id]);
    foreach ($sales->concat([$supervisor]) as $user) {
        TeamMembership::create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role, 'started_at' => now()]);
    }

    return compact('dealer', 'team', 'supervisor', 'sales');
}

function allocationPayload(array $f, array $units = [60, 60], int $version = 0): array
{
    return ['team_id' => $f['team']->public_id, 'period' => '2026-11', 'version' => $version,
        'target_units' => 100, 'markup_percent' => 20,
        'allocations' => $f['sales']->values()->map(fn ($user, $i) => ['user_id' => $user->id, 'target_units' => $units[$i]])->all()];
}

it('discloses management targets only to supervisors and branch managers', function (bool $managed) {
    $f = allocationFixture();
    if ($managed) {
        $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    } else {
        TeamTarget::create(['team_id' => $f['team']->id, 'period' => '2026-11-01', 'target_units' => 100]);
        SalesTarget::create(['user_id' => $f['sales'][0]->id, 'period' => '2026-11-01', 'target_units' => 60]);
    }
    $admin = User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);

    foreach ([$f['supervisor'], $manager] as $actor) {
        foreach (['/dashboard', $actor->is($manager) ? '/team-performance' : '/targets'] as $path) {
            $this->actingAs($actor)->get($path.'?period=2026-11')->assertInertia(fn (Assert $p) => $p
                ->where('dashboard.targetUnits', 100)->where('dashboard.teams.0.target_units', 100));
        }
    }

    foreach ([$admin, $f['sales'][0]] as $actor) {
        $paths = $actor->is($admin) ? ['/dashboard', '/targets'] : ['/dashboard'];
        foreach ($paths as $path) {
            $this->actingAs($actor)->get($path.'?period=2026-11')->assertInertia(fn (Assert $p) => $p
                ->where('dashboard.targetUnits', $actor->is($admin) ? null : 60)
                ->where('dashboard.gapUnits', $actor->is($admin) ? null : 60)
                ->where('dashboard.targetAllocationDifference', null)
                ->where('dashboard.teams.0.target_units', null)
                ->where('dashboard.teams.0.gap_units', null)
                ->where('dashboard.teams.0.forecast_gap_units', null)
                ->where('dashboard.teams.0.achievement_percent', null)
                ->where('dashboard.teams.0.target_allocation_difference', null)
                ->where('targetPlans', []));
        }
    }
})->with(['managed' => true, 'legacy' => false]);

it('saves a complete marked up plan and audits decimal personal adjustments atomically', function () {
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f, [59.125, 60.875]))->assertRedirect()->assertSessionHasNoErrors();
    $target = TeamTarget::query()->sole();
    expect((float) $target->benchmark_units)->toBe(120.0)->and($target->version)->toBe(1)
        ->and($target->allocations()->count())->toBe(2);
    $this->post('/target-plans', allocationPayload($f, [60, 64], 1))->assertRedirect()->assertSessionHasNoErrors();
    $revision = $target->revisions()->latest('id')->first();
    expect($revision->old_plan['allocations'][0]['target_units'])->toBe(59.125)
        ->and($revision->new_plan['allocations'][1]['target_units'])->toBe(64)
        ->and($revision->changed_by_id)->toBe($f['supervisor']->id);
    $this->get('/targets?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.teams.0.target_units', 100)->where('dashboard.teams.0.benchmark_units', 120)
        ->where('dashboard.teams.0.sales_target_units', 124)->where('dashboard.teams.0.allocation_percent', 103.33)
        ->where('targetPlans.0.version', 2));
});

it('rejects under allocation forged benchmark and invalid decimals without partial writes', function () {
    $f = allocationFixture();
    $payload = allocationPayload($f, [58, 60]);
    $payload['benchmark_units'] = 1;
    $this->actingAs($f['supervisor'])->post('/target-plans', $payload)->assertSessionHasErrors('allocations');
    $this->assertDatabaseCount('team_targets', 0);
    $this->assertDatabaseCount('team_target_allocations', 0);
    foreach ([-1, '1.00001', 'NaN'] as $invalid) {
        $this->post('/target-plans', allocationPayload($f, [$invalid, 120]))->assertSessionHasErrors('allocations.0.target_units');
    }
});

it('rejects stale plans and legacy individual writes against a managed plan', function () {
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    $this->post('/target-plans', allocationPayload($f, [60, 64]))->assertSessionHasErrors('version');
    $this->post('/targets', ['user_id' => $f['sales'][0]->id, 'period' => '2026-11', 'target_units' => 1])->assertSessionHasErrors('target_units');
    $this->post('/team-targets', ['team_id' => $f['team']->public_id, 'period' => '2026-11', 'target_units' => 999])->assertSessionHasErrors('target_units');
    expect(TeamTarget::query()->sole()->version)->toBe(1);
});

it('preserves former members and adds a newcomer without reducing existing allocations', function () {
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    TeamMembership::where('user_id', $f['sales'][0]->id)->update(['ended_at' => now()]);
    $newSales = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]);
    TeamMembership::create(['team_id' => $f['team']->id, 'user_id' => $newSales->id, 'role' => 'sales', 'started_at' => now()]);
    $this->get('/targets?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.teams.0.sales_target_units', 120)->where('dashboard.teams.0.active_allocation_units', 60)
        ->has('targetPlans.0.members', 3));
    $payload = allocationPayload($f, [60, 60], 1);
    $payload['allocations'][] = ['user_id' => $newSales->id, 'target_units' => 4];
    $this->post('/target-plans', $payload)->assertSessionHasNoErrors();
    expect((float) TeamTarget::query()->sole()->allocations()->sum('target_units'))->toBe(124.0);
    $this->actingAs($f['sales'][0])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', 60)->where('targetPlans', []));
});

it('limits writes and plan details to the authorized organization', function () {
    $f = allocationFixture();
    $other = allocationFixture();
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    foreach ([$manager, $f['sales'][0], $other['supervisor']] as $actor) {
        $this->actingAs($actor)->post('/target-plans', allocationPayload($f))->assertForbidden();
    }
    $payload = allocationPayload($f);
    $payload['allocations'][0]['user_id'] = $other['sales'][0]->id;
    $this->actingAs($f['supervisor'])->post('/target-plans', $payload)->assertSessionHasErrors('allocations');
    $this->actingAs($manager)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p->where('targetPlans', []));
});

it('preserves legacy targets until a supervisor explicitly adopts the new plan', function () {
    $f = allocationFixture();
    TeamTarget::create(['team_id' => $f['team']->id, 'period' => '2026-11-01', 'target_units' => 100]);
    SalesTarget::create(['user_id' => $f['sales'][0]->id, 'period' => '2026-11-01', 'target_units' => 8]);
    $this->actingAs($f['supervisor'])->get('/targets?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('targetPlans.0.legacy', true)->where('dashboard.teams.0.benchmark_units', null)
        ->where('dashboard.teams.0.sales_target_units', 8));
    $this->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    expect(SalesTarget::query()->sole()->target_units)->toBe(8);
});

it('supports explicit zero and refuses a positive plan without any sales', function () {
    $f = allocationFixture(0);
    $payload = allocationPayload($f, []);
    $this->actingAs($f['supervisor'])->post('/target-plans', $payload)->assertSessionHasErrors('allocations');
    $payload['target_units'] = 0;
    $this->post('/target-plans', $payload)->assertSessionHasNoErrors();
    expect((float) TeamTarget::query()->sole()->benchmark_units)->toBe(0.0);
});

it('rejects legacy targets for newcomers to a managed monthly team', function () {
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    $newSales = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]);
    TeamMembership::create(['team_id' => $f['team']->id, 'user_id' => $newSales->id, 'role' => 'sales', 'started_at' => now()]);
    $this->post('/targets', ['user_id' => $newSales->id, 'period' => '2026-11', 'target_units' => 4])->assertSessionHasErrors('target_units');
    $this->assertDatabaseCount('sales_targets', 0);
});

it('rechecks membership after acquiring user locks before changing personal targets', function () {
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    $interleaved = false;
    DB::listen(function (QueryExecuted $query) use ($f, &$interleaved): void {
        if (! $interleaved && str_contains($query->sql, 'from "users"') && str_contains($query->sql, 'order by "id"')) {
            $interleaved = true;
            DB::table('team_memberships')->where('user_id', $f['sales'][0]->id)->update(['ended_at' => now()]);
        }
    });
    $this->post('/target-plans', allocationPayload($f, [61, 60], 1))->assertSessionHasErrors('allocations');
    expect($interleaved)->toBeTrue()
        ->and((float) TeamTarget::query()->sole()->allocations()->where('user_id', $f['sales'][0]->id)->value('target_units'))->toBe(60.0);
});

it('does not fill a newcomer allocation from an unrelated legacy personal target', function () {
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f))->assertSessionHasNoErrors();
    $newSales = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]);
    SalesTarget::create(['user_id' => $newSales->id, 'period' => '2026-11-01', 'target_units' => 8]);
    TeamMembership::create(['team_id' => $f['team']->id, 'user_id' => $newSales->id, 'role' => 'sales', 'started_at' => now()]);
    $this->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p->where('dashboard.salesTargetsMissing', 1));
    $this->actingAs($newSales)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p->where('dashboard.targetUnits', null));
});

it('preserves four decimal places in personal forecast gaps', function () {
    $this->travelTo(now()->setDate(2026, 11, 5));
    $f = allocationFixture();
    $this->actingAs($f['supervisor'])->post('/target-plans', allocationPayload($f, ['17.1429', '102.8571']))->assertSessionHasNoErrors();
    $this->actingAs($f['sales'][0])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', 17.1429)->where('dashboard.gapUnits', 17.1429)->where('dashboard.forecastGapUnits', 17.1429));
});
