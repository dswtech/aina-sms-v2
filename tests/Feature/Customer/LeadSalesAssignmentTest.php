<?php

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;

beforeEach(fn () => legacyVehicleMaster());

function leadAssignmentFixture(string $role = 'supervisor'): array
{
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $actor = User::factory()->role(UserRole::from($role))->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    foreach ([$actor, $sales] as $user) {
        TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }
    $payload = ['name' => 'Pelanggan QA', 'gender' => 'L', 'phone' => '081234567890', 'vehicle_model' => 'Model QA', 'source' => 'walk_in', 'expected_closing_month' => '2026-12'];

    return compact('dealer', 'team', 'actor', 'sales', 'payload');
}

it('assigns a lead created by management to the selected sales while preserving its author', function (string $role) {
    $f = leadAssignmentFixture($role);
    $this->actingAs($f['actor'])->post('/customers', [...$f['payload'], 'sales_id' => $f['sales']->id])->assertSessionHasNoErrors();
    $customer = Customer::query()->sole();
    $deal = DealTransaction::query()->sole();
    expect($customer->created_by_id)->toBe($f['actor']->id)
        ->and($customer->activeAssignment->sales_id)->toBe($f['sales']->id)
        ->and($customer->activeAssignment->assigned_by_id)->toBe($f['actor']->id)
        ->and($deal->sales_id)->toBe($f['sales']->id)->and($deal->team_id)->toBe($f['team']->id)
        ->and($deal->stageHistories()->sole()->actor_id)->toBe($f['actor']->id)
        ->and($deal->expected_closing_month->format('Y-m'))->toBe('2026-12');
})->with(['supervisor', 'admin']);

it('requires a sales selection for a new customer created by management', function (string $role) {
    $f = leadAssignmentFixture($role);
    $this->actingAs($f['actor'])->post('/customers', $f['payload'])->assertSessionHasErrors('sales_id');
    $this->assertDatabaseCount('customers', 0);
    $this->assertDatabaseCount('deal_transactions', 0);
})->with(['supervisor', 'admin']);

it('rejects an inactive foreign wrong-role or unrelated sales selection without writes', function (string $kind) {
    $f = leadAssignmentFixture();
    $candidate = match ($kind) {
        'inactive' => tap($f['sales'])->update(['is_active' => false]),
        'foreign' => User::factory()->sales()->create(),
        'role' => $f['actor'],
        'unrelated' => User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]),
    };
    $this->actingAs($f['actor'])->post('/customers', [...$f['payload'], 'sales_id' => $candidate->id])->assertSessionHasErrors('sales_id');
    $this->assertDatabaseCount('customers', 0);
    $this->assertDatabaseCount('customer_assignments', 0);
    $this->assertDatabaseCount('deal_transactions', 0);
})->with(['inactive', 'foreign', 'role', 'unrelated']);

it('does not allow a sales to assign their new lead to another user', function () {
    $f = leadAssignmentFixture();
    $this->actingAs($f['sales'])->post('/customers', [...$f['payload'], 'sales_id' => $f['actor']->id])->assertSessionHasErrors('sales_id');
    $this->assertDatabaseCount('customers', 0);
});

it('preserves the original owner when management confirms a duplicate despite a different draft selection', function () {
    $f = leadAssignmentFixture('admin');
    $customer = Customer::factory()->create(['dealer_id' => $f['dealer']->id, 'phone' => $f['payload']['phone']]);
    $customer->assignTo($f['sales']);
    $other = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]);
    $this->actingAs($f['actor'])->post('/customers', [...$f['payload'], 'existing_customer_id' => $customer->public_id, 'sales_id' => $other->id])->assertSessionHasNoErrors();
    expect(DealTransaction::query()->sole()->sales_id)->toBe($f['sales']->id)
        ->and($customer->fresh()->activeAssignment->sales_id)->toBe($f['sales']->id);
});

it('does not create a lead in an inactive team even when an admin selects an active sales', function () {
    $f = leadAssignmentFixture('admin');
    $f['team']->update(['is_active' => false]);
    $this->actingAs($f['actor'])->post('/customers', [...$f['payload'], 'sales_id' => $f['sales']->id])->assertSessionHasErrors('sales_id');
    $this->assertDatabaseCount('customers', 0);
    $this->assertDatabaseCount('deal_transactions', 0);
});

it('requires an active sales assignment on an existing unassigned customer instead of using the admin as owner', function () {
    $f = leadAssignmentFixture('admin');
    $customer = Customer::factory()->create(['dealer_id' => $f['dealer']->id, 'phone' => $f['payload']['phone']]);
    $this->actingAs($f['actor'])->post('/customers', [...$f['payload'], 'existing_customer_id' => $customer->public_id])->assertSessionHasErrors('sales_id');
    $this->assertDatabaseCount('deal_transactions', 0);
    $this->assertDatabaseCount('customer_assignments', 0);
});
