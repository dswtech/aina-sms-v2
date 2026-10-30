<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('assigns customer to sales and closes previous assignment with history intact', function () {
    $dealer = Dealer::factory()->create();
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $salesA = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $salesB = User::factory()->sales()->create(['dealer_id' => $dealer->id]);

    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    // Initial assignment to salesA
    $assignmentA = $customer->assignTo($salesA, $supervisor, 'Penugasan awal');

    expect($assignmentA->sales_id)->toBe($salesA->id)
        ->and($assignmentA->assigned_by_id)->toBe($supervisor->id)
        ->and($assignmentA->ended_at)->toBeNull()
        ->and($customer->activeAssignment?->id)->toBe($assignmentA->id)
        ->and($customer->assignedSales?->id)->toBe($salesA->id);

    // Reassign to salesB
    $assignmentB = $customer->assignTo($salesB, $supervisor, 'Alih tanggung jawab cuti');

    $assignmentA->refresh();
    expect($assignmentA->ended_at)->not->toBeNull()
        ->and($assignmentB->sales_id)->toBe($salesB->id)
        ->and($assignmentB->ended_at)->toBeNull()
        ->and($customer->fresh()->assignedSales?->id)->toBe($salesB->id)
        ->and($customer->assignments()->count())->toBe(2);
});
