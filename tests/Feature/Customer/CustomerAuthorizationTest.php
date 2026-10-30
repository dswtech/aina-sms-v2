<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function makeDeal(Dealer $dealer, Customer $customer, User $sales, PipelineStage $stage = PipelineStage::Prospect): DealTransaction
{
    return DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'current_stage' => $stage,
    ]);
}

it('forbids a sales from logging activity on a customer assigned to another sales', function () {
    $dealer = Dealer::factory()->create();
    $salesMe = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $salesOther = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($salesOther);

    $this->actingAs($salesMe)
        ->post(route('customers.activities.store', $customer), [
            'type' => 'call',
            'notes' => 'Percobaan akses tidak sah',
        ])
        ->assertForbidden();

    expect($customer->fresh()->activities()->count())->toBe(0);
});

it('forbids a sales from scheduling a follow-up on a customer assigned to another sales', function () {
    $dealer = Dealer::factory()->create();
    $salesMe = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $salesOther = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($salesOther);

    $this->actingAs($salesMe)
        ->post(route('customers.follow-ups.store', $customer), [
            'scheduled_at' => now()->addDay()->toDateTimeString(),
            'plan_notes' => 'Percobaan akses tidak sah',
        ])
        ->assertForbidden();

    expect($customer->fresh()->followUps()->count())->toBe(0);
});

it('denies branch managers from the customers route entirely', function () {
    $dealer = Dealer::factory()->create();
    $branchManager = User::factory()->branchManager()->create(['dealer_id' => $dealer->id]);

    $this->actingAs($branchManager)
        ->get(route('customers.index'))
        ->assertForbidden();
});

it('denies access to customers from another dealer', function () {
    $dealerA = Dealer::factory()->create();
    $dealerB = Dealer::factory()->create();

    $salesA = User::factory()->sales()->create(['dealer_id' => $dealerA->id]);
    $salesB = User::factory()->sales()->create(['dealer_id' => $dealerB->id]);

    $customerB = Customer::factory()->create(['dealer_id' => $dealerB->id]);
    $customerB->assignTo($salesB);

    $this->actingAs($salesA)
        ->post(route('customers.activities.store', $customerB), [
            'type' => 'call',
            'notes' => 'Percobaan lintas dealer',
        ])
        ->assertForbidden();

    expect($customerB->fresh()->activities()->count())->toBe(0);
});

it('forbids a sales from moving the stage of another sales transaction', function () {
    $dealer = Dealer::factory()->create();
    $salesMe = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $salesOther = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($salesOther);
    $deal = makeDeal($dealer, $customer, $salesOther);

    $this->actingAs($salesMe)
        ->patch(route('transactions.stage', $deal), [
            'to_stage' => 'hot_prospect',
        ])
        ->assertForbidden();

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Prospect);
});

it('forbids stage changes on a closed transaction', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);
    $deal = makeDeal($dealer, $customer, $sales, PipelineStage::Delivery);

    $this->actingAs($sales)
        ->patch(route('transactions.stage', $deal), [
            'to_stage' => 'lost',
            'lost_reason' => 'other',
        ])
        ->assertForbidden();

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Delivery);
});

it('lets a supervisor move the stage of a team member transaction', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor']);
    TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales']);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales, $supervisor);
    $deal = makeDeal($dealer, $customer, $sales);

    $this->actingAs($supervisor)
        ->patch(route('transactions.stage', $deal), [
            'to_stage' => 'hot_prospect',
        ])
        ->assertRedirect();

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::HotProspect);
});

it('flashes a duplicate warning without blocking lead creation', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $existing = Customer::factory()->create([
        'dealer_id' => $dealer->id,
        'name' => 'Agus Pratama',
        'phone' => '081299887766',
    ]);

    $this->actingAs($sales)
        ->post(route('customers.store'), [
            'name' => 'Agus Duplikat',
            'phone' => '6281299887766',
            'vehicle_model' => 'Stargazer',
            'source' => 'walk_in',
        ])
        ->assertRedirect(route('customers.index'))
        ->assertInertiaFlash('toast');

    expect(Customer::query()->where('dealer_id', $dealer->id)->count())->toBe(2)
        ->and(Customer::query()->where('name', 'Agus Duplikat')->exists())->toBeTrue()
        ->and($existing->fresh()->name)->toBe('Agus Pratama');
});
