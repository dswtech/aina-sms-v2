<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('enforces customer visibility scope for each role and rejects cross-team access', function () {
    $dealerA = Dealer::factory()->create();
    $dealerB = Dealer::factory()->create();

    // Teams in Dealer A
    $teamAlpha = Team::factory()->create(['dealer_id' => $dealerA->id, 'name' => 'Tim Alpha']);
    $teamBeta = Team::factory()->create(['dealer_id' => $dealerA->id, 'name' => 'Tim Beta']);

    // Users in Dealer A
    $admin = User::factory()->admin()->create(['dealer_id' => $dealerA->id]);
    $bm = User::factory()->branchManager()->create(['dealer_id' => $dealerA->id]);

    $spvAlpha = User::factory()->supervisor()->create(['dealer_id' => $dealerA->id]);
    $salesAlpha = User::factory()->sales()->create(['dealer_id' => $dealerA->id]);
    TeamMembership::factory()->create(['team_id' => $teamAlpha->id, 'user_id' => $spvAlpha->id, 'role' => 'supervisor']);
    TeamMembership::factory()->create(['team_id' => $teamAlpha->id, 'user_id' => $salesAlpha->id, 'role' => 'sales']);

    $spvBeta = User::factory()->supervisor()->create(['dealer_id' => $dealerA->id]);
    $salesBeta = User::factory()->sales()->create(['dealer_id' => $dealerA->id]);
    TeamMembership::factory()->create(['team_id' => $teamBeta->id, 'user_id' => $spvBeta->id, 'role' => 'supervisor']);
    TeamMembership::factory()->create(['team_id' => $teamBeta->id, 'user_id' => $salesBeta->id, 'role' => 'sales']);

    // Customers
    $custAlpha = Customer::factory()->create(['dealer_id' => $dealerA->id, 'name' => 'Cust Alpha']);
    $custAlpha->assignTo($salesAlpha, $spvAlpha);

    $custBeta = Customer::factory()->create(['dealer_id' => $dealerA->id, 'name' => 'Cust Beta']);
    $custBeta->assignTo($salesBeta, $spvBeta);

    $custForeign = Customer::factory()->create(['dealer_id' => $dealerB->id, 'name' => 'Cust Foreign']);

    // Admin sees all in dealerA
    $adminVisible = Customer::query()->visibleTo($admin)->pluck('id');
    expect($adminVisible)->toContain($custAlpha->id, $custBeta->id)
        ->not->toContain($custForeign->id);

    // Branch Manager sees all in dealerA
    $bmVisible = Customer::query()->visibleTo($bm)->pluck('id');
    expect($bmVisible)->toContain($custAlpha->id, $custBeta->id)
        ->not->toContain($custForeign->id);

    // Supervisor Alpha only sees customer of their team (custAlpha)
    $spvAlphaVisible = Customer::query()->visibleTo($spvAlpha)->pluck('id');
    expect($spvAlphaVisible)->toContain($custAlpha->id)
        ->not->toContain($custBeta->id)
        ->not->toContain($custForeign->id);

    // Sales Alpha only sees their assigned customer (custAlpha)
    $salesAlphaVisible = Customer::query()->visibleTo($salesAlpha)->pluck('id');
    expect($salesAlphaVisible)->toContain($custAlpha->id)
        ->not->toContain($custBeta->id)
        ->not->toContain($custForeign->id);

    // Inactive user sees nothing
    $salesAlpha->update(['is_active' => false]);
    expect(Customer::query()->visibleTo($salesAlpha)->count())->toBe(0);
});
