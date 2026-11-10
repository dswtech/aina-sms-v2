<?php

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\User;

beforeEach(fn () => legacyVehicleMaster());

it('lets the assigned sales fill the profile before the stage that requires it', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'occupation' => null, 'address' => 'Jl. Lama']);
    $customer->assignTo($sales);

    $this->actingAs($sales)->patch('/customers/'.$customer->public_id.'/profile', ['customer' => [
        'address' => 'Jl. Baru 1', 'occupation' => 'employee', 'gender' => 'P', 'birth_date' => '1990-05-01',
    ]])->assertRedirect()->assertSessionHasNoErrors();

    $fresh = $customer->fresh();
    expect($fresh->address)->toBe('Jl. Baru 1')->and($fresh->occupation)->toBe('employee')
        ->and($fresh->gender)->toBe('P')->and($fresh->birth_date->toDateString())->toBe('1990-05-01');
    $audit = AuditLog::query()->where('action', 'customer.profile_updated')->sole();
    expect($audit->actor_id)->toBe($sales->id)->and($audit->metadata['before']['address'])->toBe('Jl. Lama');
});

it('does not blank a stored profile value', function () {
    $sales = User::factory()->sales()->create();
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id, 'address' => 'Jl. Tetap']);
    $customer->assignTo($sales);

    $this->actingAs($sales)->patch('/customers/'.$customer->public_id.'/profile', ['customer' => ['address' => '']])->assertSessionHasNoErrors();

    expect($customer->fresh()->address)->toBe('Jl. Tetap');
});

it('validates the profile payload', function () {
    $sales = User::factory()->sales()->create();
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id]);
    $customer->assignTo($sales);

    $this->actingAs($sales)->patch('/customers/'.$customer->public_id.'/profile', ['customer' => ['gender' => 'X', 'occupation' => 'astronaut']])
        ->assertSessionHasErrors(['customer.gender', 'customer.occupation']);
});

it('rejects profile writes from roles or users without access', function (string $role) {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'address' => 'Jl. Tetap']);
    $customer->assignTo($sales);
    $actor = match ($role) {
        'foreign' => User::factory()->admin()->create(),
        'manager' => User::factory()->branchManager()->create(['dealer_id' => $dealer->id]),
        'other-sales' => User::factory()->sales()->create(['dealer_id' => $dealer->id]),
    };

    $this->actingAs($actor)->patch('/customers/'.$customer->public_id.'/profile', ['customer' => ['address' => 'Dibajak']])->assertForbidden();

    expect($customer->fresh()->address)->toBe('Jl. Tetap');
})->with(['foreign', 'manager', 'other-sales']);
