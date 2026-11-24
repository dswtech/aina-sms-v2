<?php

use App\Models\Dealer;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use App\Services\TargetReminder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

// 00:30 on 1 November in Jakarta is still 31 October in UTC.
beforeEach(fn () => $this->travelTo(CarbonImmutable::parse('2026-11-01 00:30:00', 'Asia/Jakarta')));

function reminderTeam(?Dealer $dealer = null, ?User $supervisor = null, string $name = 'Tim A', int $salesCount = 2): array
{
    $dealer ??= Dealer::factory()->create();
    $supervisor ??= User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $team = Team::factory()->create(['dealer_id' => $dealer->id, 'name' => $name]);
    $sales = User::factory()->sales()->count($salesCount)->create(['dealer_id' => $dealer->id]);
    foreach ($sales->concat([$supervisor]) as $user) {
        TeamMembership::create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role, 'started_at' => now()]);
    }

    return compact('dealer', 'supervisor', 'team', 'sales');
}

/** @param  iterable<User>  $allocated */
function reminderTarget(Team $team, int $version, iterable $allocated = [], string $period = '2026-11-01'): void
{
    $target = TeamTarget::create(['team_id' => $team->id, 'period' => $period, 'target_units' => 10, 'version' => $version]);
    foreach ($allocated as $user) {
        $target->allocations()->create(['user_id' => $user->id, 'target_units' => 5]);
    }
}

function reminderFor(?User $user): ?array
{
    return app(TargetReminder::class)->forUser($user);
}

it('reminds when the team target is missing even if legacy sales targets exist', function () {
    $f = reminderTeam();
    SalesTarget::create(['user_id' => $f['sales'][0]->id, 'period' => '2026-11-01', 'target_units' => 5]);

    expect(reminderFor($f['supervisor']))->toBe(['today' => '2026-11-01', 'period' => '2026-11', 'teams' => [
        ['id' => $f['team']->public_id, 'name' => 'Tim A', 'reason' => 'missing_target', 'unallocated_count' => 0],
    ]]);
});

it('reminds about active sales without an allocation', function () {
    $f = reminderTeam();
    reminderTarget($f['team'], 1, [$f['sales'][0]]);
    expect(reminderFor($f['supervisor'])['teams'][0])->toMatchArray(['reason' => 'unallocated_sales', 'unallocated_count' => 1]);

    SalesTarget::create(['user_id' => $f['sales'][1]->id, 'period' => '2026-11-01', 'target_units' => 5]);
    expect(reminderFor($f['supervisor'])['teams'][0]['unallocated_count'])->toBe(1);
});

it('uses sales targets to judge an undivided legacy team target', function () {
    $f = reminderTeam();
    reminderTarget($f['team'], 0);
    expect(reminderFor($f['supervisor'])['teams'][0])->toMatchArray(['reason' => 'unallocated_sales', 'unallocated_count' => 2]);

    foreach ($f['sales'] as $sales) {
        SalesTarget::create(['user_id' => $sales->id, 'period' => '2026-11-01', 'target_units' => 5]);
    }
    expect(reminderFor($f['supervisor']))->toBeNull();
});

it('ignores inactive and departed sales', function () {
    $f = reminderTeam(salesCount: 3);
    reminderTarget($f['team'], 1, [$f['sales'][0]]);
    $f['sales'][1]->update(['is_active' => false]);
    TeamMembership::query()->where('user_id', $f['sales'][2]->id)->update(['ended_at' => now()]);

    expect(reminderFor($f['supervisor']))->toBeNull();
});

it('only looks at the current month and the active teams the supervisor holds', function () {
    $f = reminderTeam();
    reminderTarget($f['team'], 1, $f['sales'], '2026-10-01');
    $complete = reminderTeam($f['dealer'], $f['supervisor'], 'Tim B');
    reminderTarget($complete['team'], 1, $complete['sales']);
    reminderTeam($f['dealer'], null, 'Tim Lain');
    $inactive = reminderTeam($f['dealer'], $f['supervisor'], 'Tim Mati');
    $inactive['team']->update(['is_active' => false]);

    expect(collect(reminderFor($f['supervisor'])['teams'])->pluck('name')->all())->toBe(['Tim A']);
});

it('reminds no one but supervisors', function () {
    $f = reminderTeam();
    foreach ([$f['sales'][0], User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]), User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]), null] as $user) {
        DB::flushQueryLog();
        DB::enableQueryLog();
        expect(reminderFor($user))->toBeNull()->and(DB::getQueryLog())->toBe([]);
    }
});

it('uses a bounded number of queries', function () {
    $f = reminderTeam();
    reminderTarget($f['team'], 1, [$f['sales'][0]]);
    foreach (['Tim B', 'Tim C', 'Tim D'] as $name) {
        $more = reminderTeam($f['dealer'], $f['supervisor'], $name);
        reminderTarget($more['team'], 0);
    }
    DB::enableQueryLog();
    reminderFor($f['supervisor']);
    expect(count(DB::getQueryLog()))->toBeLessThanOrEqual(5);
});

it('shares the reminder and clears it once the plan is saved', function () {
    $f = reminderTeam();
    $this->actingAs($f['supervisor'])->get('/dashboard')->assertInertia(fn (Assert $p) => $p
        ->where('targetReminder.teams.0.reason', 'missing_target')->missing('targetReminder.teams.0.target_units'));
    $this->post('/target-plans', ['team_id' => $f['team']->public_id, 'period' => '2026-11', 'version' => 0, 'target_units' => 10, 'markup_percent' => 0,
        'allocations' => $f['sales']->map(fn (User $s): array => ['user_id' => $s->id, 'target_units' => 5])->all()])->assertSessionHasNoErrors();
    $this->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('targetReminder', null));
});

it('stays silent while an Admin views the app as a supervisor', function () {
    $f = reminderTeam();
    $admin = User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]);
    $this->actingAs($admin)->post('/users/'.$f['supervisor']->public_id.'/impersonate')->assertRedirect('/dashboard');
    $this->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('auth.user.role', 'supervisor')->where('targetReminder', null));
});
