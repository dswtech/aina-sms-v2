<?php

use App\Enums\ActivityType;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('logs customer activity and automatically updates customer last_contact_at and deal last_activity_at', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'last_contact_at' => null]);
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Stargazer Prime',
        'last_activity_at' => now()->subDays(5),
    ]);

    expect($deal->is_stagnant)->toBeTrue();

    $activity = $customer->logActivity(
        actor: $sales,
        type: ActivityType::Whatsapp,
        notes: 'Follow-up simulasi kredit via WhatsApp',
        deal: $deal,
    );

    expect($activity->customer_id)->toBe($customer->id)
        ->and($activity->deal_transaction_id)->toBe($deal->id)
        ->and($activity->user_id)->toBe($sales->id)
        ->and($activity->type)->toBe(ActivityType::Whatsapp)
        ->and($customer->fresh()->last_contact_at)->not->toBeNull()
        ->and($deal->fresh()->last_activity_at)->not->toBeNull()
        ->and($deal->fresh()->is_stagnant)->toBeFalse();
});
