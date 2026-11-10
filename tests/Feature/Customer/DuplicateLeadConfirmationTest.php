<?php

use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(fn () => legacyVehicleMaster());

function duplicateLeadFixture(): array
{
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales']);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Identitas lama', 'phone' => '081299887766', 'notes' => 'Catatan hubungan lama']);
    $customer->assignTo($sales);
    $payload = ['name' => 'Nama draft', 'gender' => 'L', 'phone' => '6281299887766', 'vehicle_model' => 'Model baru', 'source' => 'referral', 'notes' => 'Catatan peluang baru', 'expected_closing_month' => '2026-12'];

    return compact('dealer', 'team', 'sales', 'customer', 'payload');
}

it('warns before writing and returns only accessible matching identities', function () {
    $f = duplicateLeadFixture();
    $this->actingAs($f['sales'])->from('/customers')->post('/customers', $f['payload'])
        ->assertRedirect('/customers')->assertSessionHasErrors('duplicate_customer');
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('customer_assignments', 1);
    $this->assertDatabaseCount('deal_transactions', 0);
    $this->assertDatabaseCount('stage_histories', 0);
    $this->get('/customers')->assertInertia(fn (Assert $p) => $p
        ->where('duplicateLead.phone', $f['payload']['phone'])
        ->where('duplicateLead.customers', [['public_id' => $f['customer']->public_id, 'name' => 'Identitas lama']]));
});

it('creates a confirmed opportunity without duplicating or overwriting the customer', function (string $role) {
    $f = duplicateLeadFixture();
    $actor = $role === 'sales' ? $f['sales'] : User::factory()->role(UserRole::from($role))->create(['dealer_id' => $f['dealer']->id]);
    if ($role === 'supervisor') {
        TeamMembership::factory()->create(['team_id' => $f['team']->id, 'user_id' => $actor->id, 'role' => 'supervisor']);
    }
    $assignmentId = $f['customer']->activeAssignment->id;
    $this->actingAs($actor)->post('/customers', [...$f['payload'], 'existing_customer_id' => $f['customer']->public_id])
        ->assertRedirect('/customers')->assertSessionHasNoErrors();
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('customer_assignments', 1);
    $deal = DealTransaction::query()->sole();
    expect($deal->customer_id)->toBe($f['customer']->id)->and($deal->sales_id)->toBe($f['sales']->id)
        ->and($deal->team_id)->toBe($f['team']->id)->and($deal->vehicle_model)->toBe('Model baru')
        ->and($deal->expected_closing_month->format('Y-m'))->toBe('2026-12')
        ->and($deal->notes)->toBe('Catatan peluang baru')
        ->and($deal->stageHistories()->sole()->actor_id)->toBe($actor->id);
    expect($f['customer']->fresh()->name)->toBe('Identitas lama')
        ->and($f['customer']->fresh()->notes)->toBe('Catatan hubungan lama')
        ->and($f['customer']->fresh()->activeAssignment->id)->toBe($assignmentId);
})->with(['sales', 'supervisor', 'admin']);

it('keeps inaccessible duplicate identity out of errors and page props', function () {
    $f = duplicateLeadFixture();
    $otherSales = User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]);
    $this->actingAs($otherSales)->from('/customers')->post('/customers', $f['payload'])
        ->assertSessionHasErrors('duplicate_customer')
        ->assertSessionHas('errors', fn ($bags): bool => ! str_contains($bags->first('duplicate_customer'), 'Identitas lama'));
    $this->get('/customers')->assertInertia(fn (Assert $p) => $p
        ->where('duplicateLead.customers', [])
        ->where('customers.data', []));
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('deal_transactions', 0);
});

it('rechecks permissions when the user confirms a previously accessible identity', function () {
    $f = duplicateLeadFixture();
    $this->actingAs($f['sales'])->from('/customers')->post('/customers', $f['payload'])->assertSessionHasErrors('duplicate_customer');
    $f['customer']->assignTo(User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]));
    $this->post('/customers', [...$f['payload'], 'existing_customer_id' => $f['customer']->public_id])->assertForbidden();
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('deal_transactions', 0);
});

it('rejects forged or mismatched identities without creating any opportunity', function (string $kind) {
    $f = duplicateLeadFixture();
    $candidate = match ($kind) {
        'foreign' => Customer::factory()->create(['phone' => $f['payload']['phone']]),
        'phone' => Customer::factory()->create(['dealer_id' => $f['dealer']->id, 'phone' => '081234567899']),
        'hidden' => $f['customer'],
    };
    if ($kind !== 'hidden') {
        $candidate->assignTo($f['sales']);
    }
    $actor = $kind === 'hidden' ? User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]) : $f['sales'];
    $response = $this->actingAs($actor)->post('/customers', [...$f['payload'], 'existing_customer_id' => $candidate->public_id]);
    if ($kind === 'hidden') {
        $response->assertForbidden();
    } else {
        $response->assertSessionHasErrors('existing_customer_id');
    }
    $this->assertDatabaseCount('deal_transactions', 0);
})->with(['foreign', 'phone', 'hidden']);

it('offers multiple visible legacy matches and permits choosing the second identity', function () {
    $f = duplicateLeadFixture();
    $second = Customer::factory()->create(['dealer_id' => $f['dealer']->id, 'phone' => '+6281299887766']);
    $second->assignTo($f['sales']);
    $this->actingAs($f['sales'])->from('/customers')->post('/customers', $f['payload'])->assertSessionHasErrors('duplicate_customer');
    $this->get('/customers')->assertInertia(fn (Assert $p) => $p->has('duplicateLead.customers', 2));
    $this->post('/customers', [...$f['payload'], 'existing_customer_id' => $second->public_id])->assertSessionHasNoErrors();
    expect(DealTransaction::query()->sole()->customer_id)->toBe($second->id);
    $this->assertDatabaseCount('customers', 2);
});

it('trims pasted phones before returning an accessible duplicate', function () {
    $f = duplicateLeadFixture();
    $this->actingAs($f['sales'])->from('/customers')->post('/customers', [...$f['payload'], 'phone' => ' 081299887766 '])
        ->assertSessionHasErrors('duplicate_customer');
    $this->get('/customers')->assertInertia(fn (Assert $p) => $p
        ->where('duplicateLead.phone', '081299887766')->has('duplicateLead.customers', 1));
    $this->assertDatabaseCount('deal_transactions', 0);
});

it('does not reuse or reveal a matching phone from another dealer', function () {
    $f = duplicateLeadFixture();
    $other = User::factory()->sales()->create();
    $this->actingAs($other)->post('/customers', $f['payload'])->assertSessionHasNoErrors();
    $newCustomer = Customer::query()->where('dealer_id', $other->dealer_id)->sole();
    expect($newCustomer->id)->not->toBe($f['customer']->id)
        ->and(DealTransaction::query()->sole()->customer_id)->toBe($newCustomer->id);
});

it('refreshes candidate visibility after assignment changes before the warning page loads', function () {
    $f = duplicateLeadFixture();
    $this->actingAs($f['sales'])->from('/customers')->post('/customers', $f['payload'])->assertSessionHasErrors('duplicate_customer');
    $f['customer']->assignTo(User::factory()->sales()->create(['dealer_id' => $f['dealer']->id]));
    $this->get('/customers')->assertInertia(fn (Assert $p) => $p->where('duplicateLead.customers', []));
});
