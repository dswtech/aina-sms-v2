<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a comment and reply on a deal', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);
    $customer->assignTo($sales);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'current_stage' => PipelineStage::Prospect,
    ]);

    $this->actingAs($sales)
        ->post(route('deals.comments.store', $deal), ['body' => 'Komentar awal'])
        ->assertRedirect();

    $comment = $deal->fresh()->comments()->first();
    expect($comment)->not->toBeNull()
        ->and($comment->body)->toBe('Komentar awal');

    $this->actingAs($sales)
        ->post(route('deals.comments.store', $deal), ['body' => 'Balasan', 'parent_id' => $comment->id])
        ->assertRedirect();

    expect($deal->fresh()->comments()->count())->toBe(2);
});

it('allows author to edit comment within 5 minutes and stores revision', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $customer->assignTo($sales);
    $customer->assignTo($sales);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Creta',
        'current_stage' => PipelineStage::Prospect,
    ]);

    $this->actingAs($sales)
        ->post(route('deals.comments.store', $deal), ['body' => 'Teks lama'])
        ->assertRedirect();

    $comment = $deal->fresh()->comments()->first();

    $this->actingAs($sales)
        ->patch(route('comments.update', $comment), ['body' => 'Teks baru'])
        ->assertRedirect();

    expect($comment->fresh()->body)->toBe('Teks baru')
        ->and($comment->fresh()->revisions()->count())->toBe(1)
        ->and($comment->fresh()->revisions()->first()->old_body)->toBe('Teks lama');
});
