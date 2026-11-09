<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => legacyVehicleMaster());

function g02Fixture(): array
{
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    foreach ([$supervisor, $sales] as $user) {
        TeamMembership::create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role, 'started_at' => now()]);
    }
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    return compact('dealer', 'team', 'supervisor', 'sales', 'customer');
}

function g02Deal(array $f, array $attributes = []): DealTransaction
{
    return DealTransaction::create(array_merge([
        'dealer_id' => $f['dealer']->id, 'team_id' => $f['team']->id,
        'customer_id' => $f['customer']->id, 'sales_id' => $f['sales']->id,
        'vehicle_model' => 'Model uji', 'current_stage' => PipelineStage::HotProspect,
        'expected_closing_month' => '2026-11-01',
    ], $attributes));
}

it('keeps team and sales targets independent and audits every team change', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    SalesTarget::create(['user_id' => $f['sales']->id, 'period' => '2026-11-01', 'target_units' => 25]);
    foreach ([30, 0] as $units) {
        $this->actingAs($f['supervisor'])->post('/team-targets', [
            'team_id' => $f['team']->public_id, 'period' => '2026-11', 'target_units' => $units,
        ])->assertRedirect()->assertSessionHasNoErrors();
    }
    $target = TeamTarget::query()->sole();
    expect($target->target_units)->toBe(0)->and($target->revisions()->count())->toBe(2);
    $revision = $target->revisions()->latest('id')->first();
    expect($revision->old_target_units)->toBe(30)->and($revision->new_target_units)->toBe(0)
        ->and($revision->changed_by_id)->toBe($f['supervisor']->id)->and($revision->created_at)->not->toBeNull();
    $this->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', 0)->where('dashboard.salesTargetUnits', 25)
        ->where('dashboard.targetAllocationDifference', -25));
});

it('distinguishes unset targets from zero and validates reporting periods', function () {
    $f = g02Fixture();
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', null)->where('dashboard.gapUnits', null));
    $this->get('/dashboard?period=2026-13')->assertSessionHasErrors('period');
    $this->get('/targets?period=bad')->assertSessionHasErrors('period');
});

it('rejects team target writes by managers sales and unrelated supervisors', function () {
    $f = g02Fixture();
    $other = g02Fixture();
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    foreach ([$f['sales'], $manager, $other['supervisor']] as $actor) {
        $this->actingAs($actor)->post('/team-targets', [
            'team_id' => $f['team']->public_id, 'period' => '2026-11', 'target_units' => 30,
        ])->assertForbidden();
    }
    $this->assertDatabaseCount('team_targets', 0);
});

it('requires active sales and rejects unrelated dealer targets', function () {
    $f = g02Fixture();
    $f['sales']->update(['is_active' => false]);
    $this->actingAs($f['supervisor'])->post('/targets', [
        'user_id' => $f['sales']->id, 'period' => '2026-11', 'target_units' => 8,
    ])->assertForbidden();
    $this->assertDatabaseCount('sales_targets', 0);
});

it('reconciles forecast to closing month and DO events at Jakarta boundaries', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    g02Deal($f);
    g02Deal($f, ['expected_closing_month' => '2026-12-01']);
    g02Deal($f, ['expected_closing_month' => null]);
    $delivered = g02Deal($f, ['current_stage' => PipelineStage::Delivery]);
    foreach (['2026-10-31 17:00:00', '2026-11-02 00:00:00'] as $at) {
        $delivered->stageHistories()->create([
            'from_stage' => 'spk', 'to_stage' => 'do', 'actor_id' => $f['sales']->id, 'created_at' => $at,
            'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
        ]);
    }
    $delivered->update(['updated_at' => '2026-12-10 00:00:00']);
    $outside = g02Deal($f, ['current_stage' => PipelineStage::Delivery]);
    $outside->stageHistories()->create([
        'to_stage' => 'do', 'actor_id' => $f['sales']->id, 'created_at' => '2026-10-31 16:59:59',
        'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
    ]);
    g02Deal($f, ['current_stage' => PipelineStage::Delivery]);
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.realizationUnits', 1)->where('dashboard.forecastUnits', 1.5)
        ->where('dashboard.missingClosingMonthCount', 1)->where('dashboard.missingDoHistoryCount', 1)
        ->where('dashboard.performance.0.forecast_units', 1.5));
    $this->get('/dashboard?period=2026-10')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.forecastUnits', null)->where('dashboard.forecastGapUnits', null));
});

it('allows closing month changes only for an authorized active transaction', function () {
    $f = g02Fixture();
    $deal = g02Deal($f);
    $this->actingAs($f['sales'])->patch('/transactions/'.$deal->public_id.'/closing-month', ['expected_closing_month' => '2026-12'])
        ->assertRedirect()->assertSessionHasNoErrors();
    expect($deal->fresh()->expected_closing_month->format('Y-m-d'))->toBe('2026-12-01');
    $this->patch('/transactions/'.$deal->public_id.'/closing-month', ['expected_closing_month' => 'bad'])->assertSessionHasErrors('expected_closing_month');
    $this->patch('/transactions/'.$deal->public_id.'/closing-month', ['expected_closing_month' => null])->assertRedirect();
    expect($deal->fresh()->expected_closing_month)->toBeNull();
    $other = g02Fixture();
    $this->actingAs($other['sales'])->patch('/transactions/'.$deal->public_id.'/closing-month', ['expected_closing_month' => '2026-12'])->assertForbidden();
    $deal->update(['current_stage' => PipelineStage::Delivery]);
    $this->actingAs($f['sales'])->patch('/transactions/'.$deal->public_id.'/closing-month', ['expected_closing_month' => '2026-12'])->assertForbidden();
});

it('keeps transaction team attribution after membership changes and sanitizes manager output', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    g02Deal($f);
    g02Deal($f, ['team_id' => null]);
    $newTeam = Team::factory()->create(['dealer_id' => $f['dealer']->id]);
    $f['sales']->activeTeamMemberships()->update(['ended_at' => now()]);
    TeamMembership::create(['team_id' => $newTeam->id, 'user_id' => $f['sales']->id, 'role' => 'sales', 'started_at' => now()]);
    $foreign = g02Fixture();
    g02Deal($foreign);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    $response = $this->actingAs($manager)->get('/team-performance?period=2026-11')->assertOk();
    $response->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.forecastUnits', 1)->where('dashboard.unassignedTeam.forecast_units', 0.5)
        ->has('dashboard.teams', 2)->where('dashboard.priorities.unread', []));
    $payload = $response->original->getData()['page']['props']['dashboard'];
    expect(json_encode($payload))->not->toContain($f['customer']->phone, 'customer_id', 'body', 'email', 'address');
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.forecastUnits', 0.5));
});

it('counts stagnant deals in SQL within the branch manager reporting scope', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-05 09:00:00', 'Asia/Jakarta'));
    $f = g02Fixture();
    $beforeCutoff = '2026-11-01 16:59:59';
    $atCutoff = '2026-11-01 17:00:00';

    g02Deal($f, ['last_activity_at' => $beforeCutoff]);
    g02Deal($f, ['team_id' => null])->forceFill([
        'last_activity_at' => null,
        'created_at' => $beforeCutoff,
    ])->save();
    g02Deal($f, ['last_activity_at' => $atCutoff])->forceFill(['created_at' => $beforeCutoff])->save();
    g02Deal($f, ['current_stage' => PipelineStage::Delivery, 'last_activity_at' => $beforeCutoff]);
    g02Deal(g02Fixture(), ['last_activity_at' => $beforeCutoff]);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);

    DB::enableQueryLog();
    try {
        $this->actingAs($manager)->get('/dashboard?period=2026-10')->assertInertia(fn (Assert $p) => $p
            ->where('dashboard.stagnantCount', 2)->where('dashboard.priorities.stagnant', []));
        expect(collect(DB::getQueryLog())->contains(fn (array $entry): bool => str_starts_with($entry['query'], 'select count(*)')
            && str_contains($entry['query'], 'deal_transactions')
            && str_contains($entry['query'], 'last_activity_at')))->toBeTrue();
    } finally {
        DB::disableQueryLog();
        DB::flushQueryLog();
    }
});

it('lists stagnant and closing priorities without exposing revoked coaching notifications', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    $deal = g02Deal($f, ['last_activity_at' => now()->subDays(4)]);
    g02Deal($f, ['last_activity_at' => now()->subDays(3)]);
    $other = g02Fixture();
    $foreignDeal = g02Deal($other);
    foreach ([$deal, $foreignDeal] as $item) {
        $comment = $item->comments()->create(['user_id' => $item->sales_id, 'body' => 'Coaching secret', 'stage_at_creation' => 'hot_prospect']);
        $f['supervisor']->notifications()->create(['id' => (string) Str::uuid(), 'type' => DealCommentCreated::class,
            'data' => ['comment_id' => $comment->id, 'url' => '/transactions/'.$item->public_id.'/coaching']]);
    }
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->has('dashboard.priorities.stagnant', 1)->has('dashboard.priorities.closing', 2)
        ->has('dashboard.priorities.unread', 1)->has('notifications', 1)->where('notificationsUnreadCount', 1)->where('dashboard.stagnantCount', 1));
});

it('persists closing estimates and team attribution in both transaction creation flows', function () {
    $f = g02Fixture();
    $this->actingAs($f['sales'])->post('/customers', [
        'name' => 'Lead closing', 'phone' => '081234560001', 'vehicle_model' => 'Model baru',
        'source' => 'walk_in', 'expected_closing_month' => '2026-12',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $created = DealTransaction::query()->where('vehicle_model', 'Model baru')->sole();
    expect($created->expected_closing_month->format('Y-m-d'))->toBe('2026-12-01')
        ->and($created->team_id)->toBe($f['team']->id);
    $this->post('/customers/'.$f['customer']->public_id.'/transactions', [
        'vehicle_model' => 'Repeat order', 'source' => 'referral', 'expected_closing_month' => '2027-01',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $repeat = DealTransaction::query()->where('vehicle_model', 'Repeat order')->sole();
    expect($repeat->expected_closing_month->format('Y-m-d'))->toBe('2027-01-01')->and($repeat->team_id)->toBe($f['team']->id);
    $this->post('/customers/'.$f['customer']->public_id.'/transactions', [
        'vehicle_model' => 'Invalid', 'source' => 'referral', 'expected_closing_month' => '2026-13',
    ])->assertSessionHasErrors('expected_closing_month');
    $this->assertDatabaseMissing('deal_transactions', ['vehicle_model' => 'Invalid']);
});

it('authorizes targets by active supervisor membership and preserves the original target creator', function () {
    $f = g02Fixture();
    $otherTeam = Team::factory()->create(['dealer_id' => $f['dealer']->id]);
    $payload = ['team_id' => $otherTeam->public_id, 'period' => '2026-11', 'target_units' => 7];
    $this->actingAs($f['supervisor'])->post('/team-targets', $payload)->assertForbidden();
    $f['team']->update(['is_active' => false]);
    $this->post('/team-targets', array_merge($payload, ['team_id' => $f['team']->public_id]))->assertForbidden();
    $f['team']->update(['is_active' => true]);
    $admin = User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]);
    $salesPayload = ['user_id' => $f['sales']->id, 'period' => '2026-11', 'target_units' => 8];
    $this->actingAs($f['supervisor'])->post('/targets', $salesPayload)->assertRedirect();
    $this->actingAs($admin)->post('/targets', array_merge($salesPayload, ['target_units' => 9]))->assertRedirect();
    $target = SalesTarget::query()->sole();
    expect($target->created_by_id)->toBe($f['supervisor']->id)->and($target->revisions()->count())->toBe(2);
    $revision = $target->revisions()->latest('id')->first();
    expect($revision->old_target_units)->toBe(8)->and($revision->new_target_units)->toBe(9)
        ->and($revision->changed_by_id)->toBe($admin->id)->and($revision->created_at)->not->toBeNull();
    $this->post('/team-targets', $payload)->assertRedirect()->assertSessionHasNoErrors();
});

it('scopes dealer targets and unassigned transactions without counting team targets twice', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    $foreign = g02Fixture();
    $admin = User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]);
    foreach ([$f, $foreign] as $item) {
        TeamTarget::create(['team_id' => $item['team']->id, 'period' => '2026-11-01', 'target_units' => 30]);
        SalesTarget::create(['user_id' => $item['sales']->id, 'period' => '2026-11-01', 'target_units' => 25]);
        g02Deal($item);
    }
    g02Deal($f, ['team_id' => null]);
    $this->actingAs($admin)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', null)->where('dashboard.salesTargetUnits', 25)
        ->where('dashboard.forecastUnits', 1)->where('dashboard.teams.0.forecast_units', 0.5)
        ->where('dashboard.unassignedTeam.forecast_units', 0.5));
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    $this->actingAs($manager)->get('/team-performance?period=bad')->assertSessionHasErrors('period');
});

it('reconciles quarter-weight forecasts across sales and team totals without rounding drift', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    $second = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]);
    TeamMembership::create(['team_id' => $f['team']->id, 'user_id' => $second->id, 'role' => 'sales', 'started_at' => now()]);
    g02Deal($f, ['current_stage' => PipelineStage::Prospect]);
    g02Deal($f, ['sales_id' => $second->id, 'current_stage' => PipelineStage::Prospect]);
    $this->actingAs($f['supervisor'])->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.forecastUnits', 0.5)->where('dashboard.teams.0.forecast_units', 0.5)
        ->where('dashboard.performance.0.forecast_units', 0.25)->where('dashboard.performance.1.forecast_units', 0.25));
});

it('does not require a new target for an inactive historical team', function () {
    $f = g02Fixture();
    Team::factory()->create(['dealer_id' => $f['dealer']->id, 'is_active' => false]);
    TeamTarget::create(['team_id' => $f['team']->id, 'period' => '2026-11-01', 'target_units' => 30]);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    $this->actingAs($manager)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->where('dashboard.targetUnits', 30)->where('dashboard.teamTargetsMissing', 0)->has('dashboard.teams', 2));
});

it('lists each current, allocated and historical sales user once in manager performance', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-05 09:00:00', 'Asia/Jakarta'));
    $f = g02Fixture();
    $f['sales']->update(['name' => 'A Current']);
    $allocated = User::factory()->sales()->create([
        'dealer_id' => $f['dealer']->id, 'name' => 'B Allocated', 'is_active' => false,
    ]);
    $historical = User::factory()->sales()->create([
        'dealer_id' => $f['dealer']->id, 'name' => 'C Historical', 'is_active' => false,
    ]);
    $target = TeamTarget::create([
        'team_id' => $f['team']->id, 'period' => '2026-11-01', 'target_units' => 10,
        'created_by_id' => $f['supervisor']->id,
    ]);
    $target->allocations()->create(['user_id' => $allocated->id, 'target_units' => 2.5]);
    g02Deal($f, ['sales_id' => $historical->id]);
    g02Deal($f, ['sales_id' => $historical->id]);

    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    $loadedDeals = 0;
    DealTransaction::retrieved(function () use (&$loadedDeals): void {
        $loadedDeals++;
    });
    $this->actingAs($manager)->get('/dashboard?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->has('dashboard.performance', 3)
        ->where('dashboard.performance.0.id', $f['sales']->id)
        ->where('dashboard.performance.0.is_current_member', true)
        ->where('dashboard.performance.1.id', $allocated->id)
        ->where('dashboard.performance.1.target_units', 2.5)
        ->where('dashboard.performance.2.id', $historical->id)
        ->where('dashboard.performance.2.is_current_member', false)
        ->where('dashboard.performance.2.stage_counts.hot_prospect', 2));
    expect($loadedDeals)->toBe(0);
});

it('preserves sanitized weighted contributors for managers within the closing period', function () {
    $this->travelTo(now()->setDate(2026, 11, 5)->startOfSecond());
    $f = g02Fixture();
    g02Deal($f, ['vehicle_model' => 'Kontributor besar', 'current_stage' => PipelineStage::Prospect, 'estimated_value' => 1_000_000_000]);
    g02Deal($f, ['vehicle_model' => 'Kontributor kecil', 'current_stage' => PipelineStage::Spk, 'estimated_value' => 100_000_000]);
    g02Deal($f, ['vehicle_model' => 'DO selesai', 'current_stage' => PipelineStage::Do, 'estimated_value' => 2_000_000_000]);
    g02Deal($f, ['vehicle_model' => 'Bulan lain', 'expected_closing_month' => '2026-12-01', 'estimated_value' => 2_000_000_000]);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    $this->actingAs($manager)->get('/team-performance?period=2026-11')->assertInertia(fn (Assert $p) => $p
        ->has('dashboard.contributors', 2)->where('dashboard.contributors.0.vehicle_model', 'Kontributor besar')
        ->where('dashboard.contributors.0.weighted_value', 250_000_000)
        ->missing('dashboard.contributors.0.phone')->missing('dashboard.contributors.0.url'));
});

it('can roll back only the G02 schema without removing existing sales targets', function () {
    $planMigration = require database_path('migrations/2026_11_05_120000_add_target_plan_allocations.php');
    $planMigration->down();
    $migration = require database_path('migrations/2026_11_05_100000_add_team_targets_and_closing_month.php');
    $migration->down();
    expect(Schema::hasTable('team_targets'))->toBeFalse()
        ->and(Schema::hasTable('team_target_revisions'))->toBeFalse()
        ->and(Schema::hasColumn('deal_transactions', 'expected_closing_month'))->toBeFalse()
        ->and(Schema::hasTable('sales_targets'))->toBeTrue();
});
