<?php

use App\Enums\PipelineStage;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use App\Services\TransactionMasters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
});

function vehicleType(Dealer $dealer, string $name = 'MPV', bool $active = true): int
{
    return DB::table('vehicle_types')->insertGetId(['dealer_id' => $dealer->id, 'name' => $name, 'is_active' => $active]);
}

function vehicleModel(Dealer $dealer, int $typeId, string $name = 'Xpander', bool $active = true): int
{
    return DB::table('vehicle_models')->insertGetId(['dealer_id' => $dealer->id, 'vehicle_type_id' => $typeId, 'name' => $name, 'is_active' => $active]);
}

it('fills the Toyota catalog once and keeps Admin-edited prices', function () {
    TransactionMasters::initializeVehicles($this->dealer->id);
    DB::table('vehicle_models')->where('name', 'Avanza')->update(['price_min' => 1]);
    TransactionMasters::initializeVehicles($this->dealer->id);

    $models = DB::table('vehicle_models')->where('dealer_id', $this->dealer->id);
    expect((clone $models)->count())->toBe(20)
        ->and((clone $models)->whereNotIn('name', TransactionMasters::catalogNames())->count())->toBe(0)
        ->and(DB::table('vehicle_types')->where('dealer_id', $this->dealer->id)->pluck('name')->sort()->values()->all())
        ->toBe(['Hatchback', 'Komersial', 'MPV', 'Pickup', 'SUV', 'Sedan'])
        ->and((clone $models)->where('name', 'Avanza')->value('price_min'))->toBe(1)
        ->and((clone $models)->where('name', 'Alphard')->value('price_max'))->toBe(1_700_000_000);
});

it('reuses Admin-owned types and models that differ only by letter case', function () {
    $suv = vehicleType($this->dealer, 'suv');
    vehicleModel($this->dealer, $suv, 'raize');
    TransactionMasters::initializeVehicles($this->dealer->id);

    expect(DB::table('vehicle_types')->where('dealer_id', $this->dealer->id)->whereRaw('lower(name) = ?', ['suv'])->count())->toBe(1)
        ->and(DB::table('vehicle_models')->where('dealer_id', $this->dealer->id)->whereRaw('lower(name) = ?', ['raize'])->count())->toBe(1)
        ->and(DB::table('vehicle_models')->where('name', 'Rush')->value('vehicle_type_id'))->toBe($suv);
});

it('migration fills the catalog for existing dealers only and keeps it on rollback', function () {
    $migration = require database_path('migrations/2026_11_13_100000_seed_toyota_vehicle_catalog.php');
    $migration->up();
    $migration->up();
    $count = fn (): int => DB::table('vehicle_models')->where('dealer_id', $this->dealer->id)->count();
    expect($count())->toBe(20);

    $migration->down();
    expect($count())->toBe(20);
});

it('creates and updates vehicle types with audit, rejecting duplicates and other dealers', function () {
    $this->actingAs($this->admin)->post('/dealer-settings/vehicle-types', ['name' => 'SUV'])->assertRedirect();
    $this->post('/dealer-settings/vehicle-types', ['name' => 'suv'])->assertSessionHasErrors('name');
    $id = DB::table('vehicle_types')->where('dealer_id', $this->dealer->id)->value('id');

    $this->patch("/dealer-settings/vehicle-types/{$id}", ['name' => 'SUV Kompak', 'is_active' => false])->assertRedirect();
    expect(DB::table('vehicle_types')->find($id))->name->toBe('SUV Kompak')->and((bool) DB::table('vehicle_types')->find($id)->is_active)->toBeFalse()
        ->and(AuditLog::whereIn('action', ['dealer.vehicle_type_created', 'dealer.vehicle_type_updated'])->count())->toBe(2);

    $foreign = vehicleType(Dealer::factory()->create(), 'Sedan');
    $this->patch("/dealer-settings/vehicle-types/{$foreign}", ['is_active' => false])->assertNotFound();
});

it('creates vehicle models with an optional price range', function () {
    $type = vehicleType($this->dealer);
    $this->actingAs($this->admin);

    $this->post('/dealer-settings/vehicle-models', ['vehicle_type_id' => $type, 'name' => 'Avanza'])->assertRedirect();
    $this->post('/dealer-settings/vehicle-models', ['vehicle_type_id' => $type, 'name' => 'Xpander', 'price_min' => 255000000, 'price_max' => 330000000])->assertRedirect();
    expect(DB::table('vehicle_models')->where('name', 'Avanza')->first())->price_min->toBeNull()->price_max->toBeNull()
        ->and(DB::table('vehicle_models')->where('name', 'Xpander')->value('price_max'))->toBe(330000000);

    $this->post('/dealer-settings/vehicle-models', ['vehicle_type_id' => $type, 'name' => 'avanza'])->assertSessionHasErrors('name');
    $this->post('/dealer-settings/vehicle-models', ['vehicle_type_id' => $type, 'name' => 'Rush', 'price_min' => 300, 'price_max' => 200])->assertSessionHasErrors('price_max');
    $this->post('/dealer-settings/vehicle-models', ['vehicle_type_id' => vehicleType(Dealer::factory()->create(), 'Sedan'), 'name' => 'Vios'])->assertSessionHasErrors('vehicle_type_id');
});

it('updates a vehicle model, clears prices and deactivates it', function () {
    $type = vehicleType($this->dealer);
    $id = vehicleModel($this->dealer, $type);
    $this->actingAs($this->admin)->patch("/dealer-settings/vehicle-models/{$id}", ['price_min' => 100, 'price_max' => 200])->assertRedirect();
    $this->patch("/dealer-settings/vehicle-models/{$id}", ['price_min' => 300])->assertSessionHasErrors('price_max');
    $this->patch("/dealer-settings/vehicle-models/{$id}", ['price_min' => null, 'price_max' => null, 'is_active' => false])->assertRedirect();
    expect(DB::table('vehicle_models')->find($id))->price_min->toBeNull()->price_max->toBeNull()
        ->and((bool) DB::table('vehicle_models')->find($id)->is_active)->toBeFalse();
});

it('renders vehicle masters for Admin and rejects other roles', function () {
    $type = vehicleType($this->dealer);
    vehicleModel($this->dealer, $type);
    $this->actingAs($this->admin)->get('/dealer-settings/vehicles')->assertInertia(fn (Assert $p) => $p
        ->has('vehicleTypes', 1)->has('vehicleModels', 1));

    $this->actingAs(User::factory()->sales()->create(['dealer_id' => $this->dealer->id]));
    $this->post('/dealer-settings/vehicle-types', ['name' => 'X'])->assertForbidden();
    $this->post('/dealer-settings/vehicle-models', ['vehicle_type_id' => $type, 'name' => 'X'])->assertForbidden();
});

it('lets a lead be created without a vehicle but only from the master when given', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $type = vehicleType($this->dealer);
    vehicleModel($this->dealer, $type, 'Xpander');
    vehicleModel($this->dealer, $type, 'Lama', active: false);
    $base = ['name' => 'Budi', 'gender' => 'L', 'source' => 'digital_ad', 'source_channel' => 'instagram'];

    $this->actingAs($sales)->post('/transactions', [...$base, 'phone' => '081234567890'])->assertSessionHasNoErrors();
    expect(DealTransaction::query()->latest('id')->first()->vehicle_model)->toBeNull();

    $this->post('/transactions', [...$base, 'phone' => '081234567891', 'vehicle_model' => 'Bebas'])->assertSessionHasErrors('vehicle_model');
    $this->post('/transactions', [...$base, 'phone' => '081234567892', 'vehicle_model' => 'Lama'])->assertSessionHasErrors('vehicle_model');
    $this->post('/transactions', [...$base, 'phone' => '081234567893', 'vehicle_model' => 'Xpander'])->assertSessionHasNoErrors();
    expect(DealTransaction::query()->latest('id')->first()->vehicle_model)->toBe('Xpander');
});

it('requires a vehicle only when moving to SPK', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => Customer::factory()->create(['dealer_id' => $this->dealer->id])->id,
        'sales_id' => $sales->id, 'vehicle_model' => null, 'current_stage' => PipelineStage::Lead,
    ]);

    $deal->transitionTo(PipelineStage::Prospect, $sales);
    $deal->transitionTo(PipelineStage::HotProspect, $sales);
    expect(fn () => $deal->transitionTo(PipelineStage::Spk, $sales, null, ['booking_fee_confirmed' => true]))
        ->toThrow(InvalidArgumentException::class, 'Kendaraan wajib diisi untuk tahap SPK.');

    $deal->transitionTo(PipelineStage::Spk, $sales, null, ['booking_fee_confirmed' => true, 'vehicle_model' => 'Xpander']);
    expect($deal->fresh())->vehicle_model->toBe('Xpander')->current_stage->toBe(PipelineStage::Spk);
});

it('accepts the vehicle on the stage change request and rejects one outside the master', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    vehicleModel($this->dealer, vehicleType($this->dealer), 'Xpander');
    $deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => Customer::factory()->create(['dealer_id' => $this->dealer->id])->id,
        'sales_id' => $sales->id, 'vehicle_model' => null, 'current_stage' => PipelineStage::HotProspect,
    ]);
    $url = "/transactions/{$deal->public_id}/stage";
    $payload = ['to_stage' => 'spk', 'booking_fee_confirmed' => true];

    $this->actingAs($sales)->patch($url, $payload)->assertSessionHasErrors('to_stage');
    $this->patch($url, [...$payload, 'vehicle_model' => 'Bebas'])->assertSessionHasErrors('vehicle_model');
    $this->patch($url, [...$payload, 'vehicle_model' => 'Xpander'])->assertSessionHasNoErrors();
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Spk)->and($deal->fresh()->vehicle_model)->toBe('Xpander');
});

it('forbids clearing the vehicle once the deal reached SPK', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => Customer::factory()->create(['dealer_id' => $this->dealer->id])->id,
        'sales_id' => $sales->id, 'vehicle_model' => 'Xpander', 'current_stage' => PipelineStage::Spk,
    ]);
    $this->actingAs($sales)->patch("/transactions/{$deal->public_id}", ['vehicle_model' => null])->assertSessionHasErrors('vehicle_model');
    expect($deal->fresh()->vehicle_model)->toBe('Xpander');
});
