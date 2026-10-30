<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('schedules next follow up and provides the nearest pending follow up for a customer', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $tomorrow = now()->addDay()->setHour(10)->setMinute(0);
    $nextWeek = now()->addDays(7)->setHour(14)->setMinute(0);

    // Schedule two follow-ups
    $customer->scheduleFollowUp($sales, $sales, $nextWeek, 'Follow up jangka panjang');
    $nearest = $customer->scheduleFollowUp($sales, $sales, $tomorrow, 'Telepon konfirmasi DP');

    expect($customer->fresh()->nextFollowUp?->id)->toBe($nearest->id)
        ->and($nearest->plan_notes)->toBe('Telepon konfirmasi DP')
        ->and($nearest->status)->toBe('pending');

    // Completing nearest follow-up makes next one active
    $nearest->update(['status' => 'completed', 'completed_at' => now()]);

    expect($customer->fresh()->nextFollowUp?->plan_notes)->toBe('Follow up jangka panjang');
});
