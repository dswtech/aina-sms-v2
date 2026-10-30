<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\NewDealCommentNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;

uses(RefreshDatabase::class);

it('sends in-app and email notification to other conversation participants', function () {
    Notification::fake();

    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);

    // put supervisor in same team as sales
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $sales->id, 'role' => 'sales', 'started_at' => now()]);
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $supervisor->id, 'role' => 'supervisor', 'started_at' => now()]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'current_stage' => PipelineStage::Prospect,
    ]);

    $this->actingAs($supervisor)
        ->post(route('deals.comments.store', $deal), ['body' => 'Komentar dari supervisor'])
        ->assertRedirect();

    Notification::assertSentTo($sales, NewDealCommentNotification::class);
});
