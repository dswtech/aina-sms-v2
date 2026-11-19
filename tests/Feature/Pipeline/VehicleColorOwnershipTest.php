<?php

use App\Enums\PipelineStage;
use App\Enums\VehicleOwnership;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    legacyVehicleMaster();
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->deal = fn (PipelineStage $stage, array $extra = []) => DealTransaction::create([
        'region_code' => '32.17', 'district_code' => '32.17.08',
        'dealer_id' => $this->dealer->id, 'sales_id' => $this->sales->id,
        'customer_id' => Customer::factory()->create(['dealer_id' => $this->dealer->id])->id,
        'vehicle_model' => 'Avanza', 'current_stage' => $stage, ...$extra,
    ]);
});

it('stores colour and ownership with a new lead and shows them in the list', function () {
    $this->actingAs($this->sales)->post('/transactions', [
        'name' => 'Rina', 'gender' => 'P', 'phone' => '081234567890', 'vehicle_model' => 'Avanza',
        'vehicle_color' => '  Putih Mutiara ', 'vehicle_ownership' => 'trade_in', 'source' => 'walk_in',
    ])->assertRedirect('/transactions')->assertSessionHasNoErrors();

    $deal = DealTransaction::query()->sole();
    expect($deal->vehicle_color)->toBe('Putih Mutiara')
        ->and($deal->vehicle_ownership)->toBe(VehicleOwnership::TradeIn);
    $this->get('/transactions')->assertInertia(fn ($p) => $p
        ->where('transactions.data.0.vehicle_color', 'Putih Mutiara')
        ->where('transactions.data.0.vehicle_ownership', 'trade_in'));
    $this->getJson(route('transactions.show', $deal))->assertJsonPath('vehicle_color', 'Putih Mutiara');
});

it('rejects an unknown ownership and an over-long colour', function () {
    $this->actingAs($this->sales)->post('/transactions', [
        'name' => 'Rina', 'gender' => 'P', 'phone' => '081234567890', 'source' => 'walk_in',
        'vehicle_color' => str_repeat('x', 51), 'vehicle_ownership' => 'leased',
    ])->assertSessionHasErrors(['vehicle_color', 'vehicle_ownership']);
});

it('lets colour and ownership change up to SPK and locks them from DO', function () {
    foreach ([PipelineStage::Prospect, PipelineStage::Spk] as $stage) {
        $deal = ($this->deal)($stage);
        $this->actingAs($this->sales)->patch("/transactions/{$deal->public_id}", ['vehicle_color' => 'Hitam', 'vehicle_ownership' => 'additional'])
            ->assertSessionHasNoErrors();
        expect($deal->fresh()->vehicle_color)->toBe('Hitam')
            ->and($deal->fresh()->vehicle_ownership)->toBe(VehicleOwnership::Additional);
    }

    $deal = ($this->deal)(PipelineStage::Do, ['vehicle_color' => 'Hitam', 'vehicle_ownership' => 'first_buyer']);
    // DO closes the transaction for edits, which is what freezes colour and ownership.
    $this->patch("/transactions/{$deal->public_id}", ['vehicle_color' => 'Merah'])->assertForbidden();
    $this->patch("/transactions/{$deal->public_id}", ['vehicle_ownership' => 'trade_in'])->assertForbidden();
    expect($deal->fresh()->vehicle_color)->toBe('Hitam');
});

it('saves the colour given with the vehicle when moving to SPK', function () {
    $deal = ($this->deal)(PipelineStage::HotProspect, ['vehicle_model' => null]);
    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), [
        'to_stage' => 'spk', 'booking_fee_confirmed' => true, 'vehicle_model' => 'Avanza', 'vehicle_color' => 'Silver',
    ])->assertSessionHasNoErrors();
    expect($deal->fresh()->vehicle_color)->toBe('Silver');
});

it('requires ownership to record DO and saves the one given in the dialog', function () {
    $deal = ($this->deal)(PipelineStage::Spk);
    $payload = ['to_stage' => 'do', 'stage_event_id' => 0, 'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    $this->actingAs($this->sales)->patchJson(route('transactions.stage', $deal), $payload)
        ->assertUnprocessable()->assertJsonValidationErrors('to_stage');
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Spk);

    $this->patch(route('transactions.stage', $deal), [...$payload, 'vehicle_ownership' => 'first_buyer'])->assertSessionHasNoErrors();
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Do)
        ->and($deal->fresh()->vehicle_ownership)->toBe(VehicleOwnership::FirstBuyer);
});
