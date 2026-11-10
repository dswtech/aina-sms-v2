<?php

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\User;

beforeEach(fn () => legacyVehicleMaster());

it('updates the assigned customers contact preference and refusal with an audit', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'contact_channel_preference' => 'phone', 'opt_out' => false]);
    $customer->assignTo($sales);
    $this->actingAs($sales)->patch('/customers/'.$customer->public_id.'/contact-preferences', [
        'contact_channel_preference' => 'whatsapp', 'opt_out' => true,
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($customer->fresh()->opt_out)->toBeTrue()->and($customer->fresh()->contact_channel_preference)->toBe('whatsapp');
    $audit = AuditLog::query()->where('action', 'customer.contact_preferences_updated')->sole();
    expect($audit->actor_id)->toBe($sales->id)->and($audit->subject_type)->toBe('customer')
        ->and($audit->metadata['before'])->toBe(['contact_channel_preference' => 'phone', 'opt_out' => false])
        ->and($audit->metadata['after'])->toBe(['contact_channel_preference' => 'whatsapp', 'opt_out' => true]);
});

it('rejects contact preference writes outside ownership or allowed roles', function (string $role) {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'opt_out' => true]);
    $customer->assignTo($sales);
    $actor = match ($role) {
        'foreign' => User::factory()->admin()->create(),
        'manager' => User::factory()->branchManager()->create(['dealer_id' => $dealer->id]),
        'sales' => User::factory()->sales()->create(['dealer_id' => $dealer->id]),
    };
    $this->actingAs($actor)->patch('/customers/'.$customer->public_id.'/contact-preferences', ['opt_out' => false, 'contact_channel_preference' => 'any'])->assertForbidden();
    expect($customer->fresh()->opt_out)->toBeTrue();
    $this->assertDatabaseCount('audit_logs', 0);
})->with(['foreign', 'manager', 'sales']);

it('validates contact preference payload without changing the record', function () {
    $sales = User::factory()->sales()->create();
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id, 'opt_out' => true]);
    $customer->assignTo($sales);
    $this->actingAs($sales)->patch('/customers/'.$customer->public_id.'/contact-preferences', ['opt_out' => 'maybe', 'contact_channel_preference' => 'email'])
        ->assertSessionHasErrors(['opt_out', 'contact_channel_preference']);
    expect($customer->fresh()->opt_out)->toBeTrue();
});

it('records contact refusal and preferred channel on a new customer', function () {
    $sales = User::factory()->sales()->create();
    $this->actingAs($sales)->post('/customers', [
        'name' => 'Pelanggan QA', 'gender' => 'L', 'phone' => '081234567890', 'vehicle_model' => 'Model QA', 'source' => 'walk_in',
        'contact_channel_preference' => 'phone', 'opt_out' => true,
    ])->assertSessionHasNoErrors();
    $customer = Customer::query()->sole();
    expect($customer->opt_out)->toBeTrue()->and($customer->contact_channel_preference)->toBe('phone');
});

it('preserves existing consent when a new lead draft confirms an existing customer', function () {
    $sales = User::factory()->sales()->create();
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id, 'phone' => '081234567890', 'opt_out' => true, 'contact_channel_preference' => 'phone']);
    $customer->assignTo($sales);
    $this->actingAs($sales)->post('/customers', [
        'name' => 'Nama draft', 'gender' => 'L', 'phone' => '081234567890', 'vehicle_model' => 'Model QA', 'source' => 'walk_in',
        'existing_customer_id' => $customer->public_id, 'contact_channel_preference' => 'any', 'opt_out' => false,
    ])->assertSessionHasNoErrors();
    expect($customer->fresh()->opt_out)->toBeTrue()->and($customer->fresh()->contact_channel_preference)->toBe('phone');
});
