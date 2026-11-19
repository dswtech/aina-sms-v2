<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Services\StageAchievements;
use App\Support\ReportingPeriod;

function achievementFixture(): array
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

/** @param list<array{0: string, 1: string, 2?: array<string, mixed>}> $history */
function achievementDeal(array $f, string $current, array $history): DealTransaction
{
    $deal = DealTransaction::create(['dealer_id' => $f['dealer']->id, 'team_id' => $f['team']->id, 'customer_id' => $f['customer']->id,
        'sales_id' => $f['sales']->id, 'vehicle_model' => 'Model '.$current, 'source' => 'walk_in', 'current_stage' => $current]);
    foreach ($history as $row) {
        StageHistory::create(['deal_transaction_id' => $deal->id, 'to_stage' => $row[0], 'actor_id' => $f['sales']->id,
            'created_at' => $row[1].' 03:00:00', ...($row[2] ?? [])]);
    }

    return $deal;
}

const ACHIEVEMENT_CHECKLIST = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];

it('counts each deal once per stage it effectively reached in the period', function () {
    $f = achievementFixture();
    achievementDeal($f, 'do', [['lead', '2026-11-02'], ['prospect', '2026-11-03'], ['hot_prospect', '2026-11-04'], ['spk', '2026-11-05'], ['do', '2026-11-06', ACHIEVEMENT_CHECKLIST]]);

    $result = app(StageAchievements::class)->bySales($f['supervisor'], new ReportingPeriod('2026-11'));
    $expected = ['lead' => 1, 'prospect' => 1, 'hot_prospect' => 1, 'spk' => 1, 'do' => 1];

    expect($result['stages'])->toBe(array_keys($expected))
        ->and($result['rows'])->toBe([['id' => $f['sales']->id, 'name' => $f['sales']->name, 'counts' => $expected]])
        ->and($result['totals'])->toBe($expected);
});

it('shows active team Sales with zero counts to their Supervisor', function () {
    $f = achievementFixture();
    $inactive = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id, 'is_active' => false]);
    TeamMembership::create(['team_id' => $f['team']->id, 'user_id' => $inactive->id, 'role' => $inactive->role, 'started_at' => now()]);

    $result = app(StageAchievements::class)->bySales($f['supervisor'], new ReportingPeriod('2026-11'));

    expect(array_column($result['rows'], 'id'))->toBe([$f['sales']->id])
        ->and(array_sum($result['rows'][0]['counts']))->toBe(0);
});

it('scopes rows like the team report', function () {
    $f = achievementFixture();
    $other = achievementFixture();
    $manager = User::factory()->branchManager()->create(['dealer_id' => $f['dealer']->id]);
    $admin = User::factory()->admin()->create(['dealer_id' => $f['dealer']->id]);
    $window = new ReportingPeriod('2026-11');
    $ids = fn (User $actor): array => array_column(app(StageAchievements::class)->bySales($actor, $window)['rows'], 'id');

    expect($ids($other['supervisor']))->toBe([$other['sales']->id])
        ->and($ids($manager))->toBe([$f['sales']->id])
        ->and($ids($admin))->toBe([$f['sales']->id]);
});

it('matches the transaction list for the same filter', function () {
    $f = achievementFixture();
    achievementDeal($f, 'lead', [['lead', '2026-11-02']]);
    achievementDeal($f, 'spk', [['lead', '2026-10-30'], ['spk', '2026-11-05']]);
    achievementDeal($f, 'do', [['lead', '2026-11-02'], ['spk', '2026-11-03'], ['do', '2026-11-30', ACHIEVEMENT_CHECKLIST]]);
    achievementDeal($f, 'do', [['lead', '2026-11-02'], ['do', '2026-11-04', ACHIEVEMENT_CHECKLIST]]);

    $result = app(StageAchievements::class)->bySales($f['supervisor'], new ReportingPeriod('2026-11'));
    $this->actingAs($f['supervisor']);

    foreach ($result['stages'] as $stage) {
        $listed = count($this->get("/transactions?stage=$stage&sales_id={$f['sales']->id}&date_from=2026-11-01&date_to=2026-11-30")
            ->viewData('page')['props']['transactions']['data']);
        expect($result['rows'][0]['counts'][$stage])->toBe($listed, $stage);
    }
    expect(array_sum($result['totals']))->toBeGreaterThan(0);
});
