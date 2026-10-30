<?php

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

it('renders Buku Pelanggan Saya for sales with only their assigned customers', function () {
    $dealer = Dealer::factory()->create();
    $salesMe = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $salesOther = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $custMe = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Pelanggan Saya']);
    $custMe->assignTo($salesMe);

    $custOther = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Pelanggan Lain']);
    $custOther->assignTo($salesOther);

    $this->actingAs($salesMe)
        ->get(route('customers.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('customers/index')
            ->has('customers.data', 1)
            ->where('customers.data.0.name', 'Pelanggan Saya')
            ->has('counts')
        );
});

it('filters customers by search query (name or phone)', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $custA = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Hendra Gunawan', 'phone' => '081211112222']);
    $custA->assignTo($sales);

    $custB = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => 'Bambang Wijaya', 'phone' => '081399998888']);
    $custB->assignTo($sales);

    $this->actingAs($sales)
        ->get(route('customers.index', ['search' => 'Hendra']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('customers.data', 1)
            ->where('customers.data.0.name', 'Hendra Gunawan')
        );

    $this->actingAs($sales)
        ->get(route('customers.index', ['search' => '081399998888']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('customers.data', 1)
            ->where('customers.data.0.name', 'Bambang Wijaya')
        );
});

it('creates a new lead with customer, transaction, and initial assignment in one transaction', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $response = $this->actingAs($sales)
        ->post(route('customers.store'), [
            'name' => 'Doni Kusuma',
            'phone' => '081234567890',
            'email' => 'doni@example.com',
            'vehicle_model' => 'Stargazer Prime',
            'source' => 'walk_in',
            'estimated_value' => 320000000,
            'notes' => 'Minat warna hitam transmisi IVT',
        ]);

    $response->assertRedirect(route('customers.index'));

    $customer = Customer::query()->where('phone', '+6281234567890')->first();
    expect($customer)->not->toBeNull()
        ->and($customer->name)->toBe('Doni Kusuma')
        ->and($customer->assignedSales?->id)->toBe($sales->id)
        ->and($customer->transactions()->count())->toBe(1)
        ->and($customer->transactions()->first()->vehicle_model)->toBe('Stargazer Prime')
        ->and($customer->transactions()->first()->current_stage)->toBe(PipelineStage::Lead);
});

it('logs activity for a customer and updates timestamps', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'current_stage' => PipelineStage::Prospect,
    ]);

    $response = $this->actingAs($sales)
        ->post(route('customers.activities.store', $customer), [
            'deal_transaction_id' => $deal->id,
            'type' => 'call',
            'notes' => 'Telepon pengenalan promo diskon akhir bulan',
        ]);

    $response->assertRedirect();

    expect($customer->fresh()->activities()->count())->toBe(1)
        ->and($customer->fresh()->last_contact_at)->not->toBeNull()
        ->and($deal->fresh()->last_activity_at)->not->toBeNull();
});

it('schedules next follow up for a customer', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    $tomorrow = now()->addDay()->format('Y-m-d H:i:s');

    $response = $this->actingAs($sales)
        ->post(route('customers.follow-ups.store', $customer), [
            'scheduled_at' => $tomorrow,
            'plan_notes' => 'Konfirmasi test drive Sabtu pagi',
        ]);

    $response->assertRedirect();

    expect($customer->fresh()->nextFollowUp)->not->toBeNull()
        ->and($customer->fresh()->nextFollowUp->plan_notes)->toBe('Konfirmasi test drive Sabtu pagi');
});

it('updates deal stage with audit and validation', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Ioniq 5',
        'current_stage' => PipelineStage::Prospect,
    ]);

    // Advance to Hot Prospect
    $this->actingAs($sales)
        ->patch(route('transactions.stage', $deal), [
            'to_stage' => 'hot_prospect',
            'notes' => 'Pelanggan sudah test drive dan puas',
        ])
        ->assertRedirect();

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::HotProspect);

    // Transition to Lost requires lost_reason
    $this->actingAs($sales)
        ->patch(route('transactions.stage', $deal), [
            'to_stage' => 'lost',
        ])
        ->assertSessionHasErrors(['lost_reason']);

    // Valid transition to Lost
    $this->actingAs($sales)
        ->patch(route('transactions.stage', $deal), [
            'to_stage' => 'lost',
            'lost_reason' => 'competitor',
            'lost_notes' => 'Beralih ke merek lain',
        ])
        ->assertRedirect();

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Lost)
        ->and($deal->fresh()->lost_reason)->toBe(LostReason::Competitor);
});
