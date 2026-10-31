<?php

use App\Models\Dealer;
use App\Models\SalesTarget;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('lets a supervisor set a target for sales in their team and audits changes', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor', 'started_at' => now()]);
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales', 'started_at' => now()]);

    $this->actingAs($supervisor)->post(route('targets.store'), [
        'user_id' => $sales->id,
        'period' => now()->format('Y-m'),
        'target_units' => 8,
        'target_value' => 2_000_000_000,
    ])->assertRedirect();

    $target = SalesTarget::query()->firstOrFail();
    expect($target->target_units)->toBe(8)
        ->and($target->revisions()->count())->toBe(1)
        ->and($target->revisions()->first()->changed_by_id)->toBe($supervisor->id);
});

it('rejects target changes for sales outside the supervisor team', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $otherSales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor', 'started_at' => now()]);

    $this->actingAs($supervisor)->post(route('targets.store'), [
        'user_id' => $otherSales->id,
        'period' => now()->format('Y-m'),
        'target_units' => 8,
    ])->assertForbidden();
});
