<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
});

function profileDeal(object $t, array $customer = [], PipelineStage $stage = PipelineStage::Lead, array $deal = []): DealTransaction
{
    $c = Customer::factory()->create(['dealer_id' => $t->dealer->id, 'gender' => null, 'address' => null, 'occupation' => null, 'region_code' => null, 'district_code' => null, ...$customer]);
    $c->assignTo($t->sales);

    return DealTransaction::create(['dealer_id' => $t->dealer->id, 'customer_id' => $c->id, 'sales_id' => $t->sales->id, 'vehicle_model' => 'Ioniq 5', 'current_stage' => $stage, ...$deal]);
}

function leadPayload(array $extra = []): array
{
    return ['name' => 'Rina', 'phone' => '081234567890', 'source' => 'walk_in', ...$extra];
}

it('requires a valid gender when a lead is created', function () {
    $this->actingAs($this->sales);
    $this->post('/transactions', leadPayload())->assertSessionHasErrors('gender');
    $this->post('/transactions', leadPayload(['gender' => 'X']))->assertSessionHasErrors('gender');
    $this->assertDatabaseCount('customers', 0);

    $this->post('/transactions', leadPayload(['gender' => 'P', 'birth_date' => '1990-05-17', 'occupation' => 'teacher', 'address' => 'Jl. Merdeka 1']))->assertSessionHasNoErrors();
    $customer = Customer::query()->sole();
    expect($customer->gender)->toBe('P')->and($customer->birth_date->toDateString())->toBe('1990-05-17')
        ->and($customer->occupation)->toBe('teacher')->and($customer->address)->toBe('Jl. Merdeka 1');
});

it('rejects an unknown occupation or a future birth date', function () {
    $this->actingAs($this->sales);
    $this->post('/transactions', leadPayload(['gender' => 'L', 'occupation' => 'astronaut']))->assertSessionHasErrors('occupation');
    $this->post('/transactions', leadPayload(['gender' => 'L', 'birth_date' => now()->addDay()->toDateString()]))->assertSessionHasErrors('birth_date');
});

it('asks for gender and address before Prospect and saves them with the stage change', function () {
    $deal = profileDeal($this);
    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), ['to_stage' => 'prospect'])
        ->assertSessionHasErrors(['customer.gender', 'customer.address']);
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Lead);

    $this->patch(route('transactions.stage', $deal), ['to_stage' => 'prospect', 'customer' => ['gender' => 'L', 'address' => 'Jl. Raya 5']])
        ->assertSessionHasNoErrors();
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Prospect)
        ->and($deal->customer->fresh()->only(['gender', 'address']))->toBe(['gender' => 'L', 'address' => 'Jl. Raya 5']);
});

it('does not gate the Lost stage on profile data', function () {
    $deal = profileDeal($this);
    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), ['to_stage' => 'lost', 'lost_reason' => 'competitor'])
        ->assertSessionHasNoErrors();
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Lost);
});

it('asks for kecamatan and occupation before SPK, even when skipping Prospect', function () {
    $deal = profileDeal($this, ['gender' => 'L', 'address' => 'Jl. Raya 5']);
    $spk = ['to_stage' => 'spk', 'booking_fee_confirmed' => true];

    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), $spk)
        ->assertSessionHasErrors(['customer.occupation', 'customer.area.district_code']);
    $this->patch(route('transactions.stage', $deal), [...$spk, 'customer' => ['occupation' => 'astronaut']])->assertSessionHasErrors('customer.occupation');
    $this->patch(route('transactions.stage', $deal), [...$spk, 'customer' => ['occupation' => 'farmer', 'area' => ['region_code' => 'other']]])
        ->assertSessionHasErrors('customer.area.other_city');
    $this->patch(route('transactions.stage', $deal), [...$spk, 'customer' => ['occupation' => 'farmer', 'area' => ['region_code' => '32.17', 'district_code' => '32.73.05']]])
        ->assertSessionHasErrors('customer.area.district_code');
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Lead);

    $this->patch(route('transactions.stage', $deal), [...$spk, 'customer' => ['occupation' => 'farmer', 'area' => ['region_code' => '32.17', 'district_code' => '32.17.08']]])
        ->assertSessionHasNoErrors();
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Spk)
        ->and($deal->customer->fresh()->only(['occupation', 'district_code']))->toBe(['occupation' => 'farmer', 'district_code' => '32.17.08']);
});

it('accepts Kota Lain with a city name as the SPK area', function () {
    $deal = profileDeal($this, ['gender' => 'P', 'address' => 'Jl. A']);
    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), [
        'to_stage' => 'spk', 'booking_fee_confirmed' => true,
        'customer' => ['occupation' => 'others', 'area' => ['region_code' => 'other', 'other_city' => 'Garut']],
    ])->assertSessionHasNoErrors();
    expect($deal->customer->fresh()->only(['region_code', 'district_code', 'other_city']))->toBe(['region_code' => 'other', 'district_code' => null, 'other_city' => 'Garut']);
});

it('never blanks stored profile data when a stage change sends empty values', function () {
    $deal = profileDeal($this, ['gender' => 'L', 'address' => 'Jl. Lama'], PipelineStage::Prospect);
    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), ['to_stage' => 'hot_prospect', 'customer' => ['gender' => '', 'address' => null]])
        ->assertSessionHasNoErrors();
    expect($deal->customer->fresh()->address)->toBe('Jl. Lama');
});

it('requires tenor and insurance only when financing is credit', function () {
    $this->actingAs($this->sales);
    $base = leadPayload(['gender' => 'L', 'financing' => ['type' => 'credit', 'leasing_id' => 'other', 'other_name' => 'Leasing X']]);

    $this->post('/transactions', $base)->assertSessionHasErrors('financing.tenor_months');
    $this->post('/transactions', [...$base, 'financing' => [...$base['financing'], 'tenor_months' => 36]])->assertSessionHasErrors('financing.insurance_type');
    $this->post('/transactions', [...$base, 'financing' => [...$base['financing'], 'tenor_months' => 18, 'insurance_type' => 'tlo']])->assertSessionHasErrors('financing.tenor_months');
    $this->post('/transactions', [...$base, 'financing' => [...$base['financing'], 'tenor_months' => 36, 'insurance_type' => 'none']])->assertSessionHasErrors('financing.insurance_type');
    $this->assertDatabaseCount('deal_transactions', 0);

    $this->post('/transactions', [...$base, 'financing' => [...$base['financing'], 'tenor_months' => 36, 'insurance_type' => 'combination']])->assertSessionHasNoErrors();
    expect(DealTransaction::query()->sole()->only(['tenor_months', 'insurance_type']))->toBe(['tenor_months' => 36, 'insurance_type' => 'combination']);
});

it('drops tenor and insurance when financing is cash', function () {
    $this->actingAs($this->sales)->post('/transactions', leadPayload(['gender' => 'L', 'phone' => '081234567891', 'financing' => ['type' => 'cash', 'tenor_months' => 24, 'insurance_type' => 'tlo']]))
        ->assertSessionHasNoErrors();
    expect(DealTransaction::query()->sole()->only(['financing_type', 'tenor_months', 'insurance_type']))->toBe(['financing_type' => 'cash', 'tenor_months' => null, 'insurance_type' => null]);
});

it('lets a legacy credit deal without tenor be edited elsewhere but not re-saved as credit', function () {
    $deal = profileDeal($this, deal: ['financing_type' => 'credit', 'financing_other_name' => 'Leasing Lama']);
    $this->actingAs($this->sales)->patch('/transactions/'.$deal->public_id, ['notes' => 'Catatan baru'])->assertSessionHasNoErrors();
    expect($deal->fresh()->notes)->toBe('Catatan baru');

    $this->patch('/transactions/'.$deal->public_id, ['financing' => ['type' => 'credit', 'leasing_id' => 'other', 'other_name' => 'Leasing Lama']])
        ->assertSessionHasErrors('financing.tenor_months');
    $this->patch('/transactions/'.$deal->public_id, ['financing' => ['type' => 'credit', 'leasing_id' => 'other', 'other_name' => 'Leasing Lama', 'tenor_months' => 48, 'insurance_type' => 'all_risk']])
        ->assertSessionHasNoErrors();
    expect($deal->fresh()->only(['tenor_months', 'insurance_type']))->toBe(['tenor_months' => 48, 'insurance_type' => 'all_risk']);
});
