<?php

use App\Enums\ActivityType;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\FollowUp;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-11-14 04:20:00', 'UTC'));
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Budi']);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create(['dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id, 'sales_id' => $this->sales->id, 'vehicle_model' => 'Avanza', 'current_stage' => PipelineStage::Lead]);
    $this->followUp = $this->customer->scheduleFollowUp($this->sales, $this->sales, CarbonImmutable::parse('2026-11-10 04:22:00', 'UTC'), 'Kirim simulasi', $this->deal);
});

it('completes a follow-up with the activity that records its result', function () {
    $this->actingAs($this->sales)->post("/customers/{$this->customer->public_id}/activities", [
        'type' => 'call', 'notes' => 'Simulasi dikirim', 'follow_up_id' => $this->followUp->id,
    ])->assertSessionHasNoErrors();

    $activity = CustomerActivity::query()->sole();
    $followUp = $this->followUp->fresh();
    expect($followUp->status)->toBe('completed')
        ->and($followUp->completed_activity_id)->toBe($activity->id)
        ->and($followUp->completed_at->equalTo($activity->occurred_at))->toBeTrue()
        // The activity inherits the follow-up's transaction when the form sends none.
        ->and($activity->deal_transaction_id)->toBe($this->deal->id);
});

it('still records an activity without completing anything', function () {
    $this->actingAs($this->sales)->post("/customers/{$this->customer->public_id}/activities", ['type' => 'note', 'notes' => 'Catatan'])
        ->assertSessionHasNoErrors();
    expect($this->followUp->fresh()->status)->toBe('pending');
});

it('rejects completing a follow-up of another customer or one that is no longer pending', function () {
    $other = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $other->assignTo($this->sales);
    $foreign = $other->scheduleFollowUp($this->sales, $this->sales, now(), 'Lain');

    $this->actingAs($this->sales)->post("/customers/{$this->customer->public_id}/activities", ['type' => 'call', 'notes' => 'x', 'follow_up_id' => $foreign->id])
        ->assertSessionHasErrors('follow_up_id');
    $this->followUp->update(['status' => 'cancelled']);
    $this->post("/customers/{$this->customer->public_id}/activities", ['type' => 'call', 'notes' => 'x', 'follow_up_id' => $this->followUp->id])
        ->assertSessionHasErrors('follow_up_id');
    expect(CustomerActivity::count())->toBe(0)->and($foreign->fresh()->status)->toBe('pending');
});

it('cancels a pending follow-up with a required reason', function () {
    $url = "/customers/{$this->customer->public_id}/follow-ups/{$this->followUp->id}/cancel";
    $this->actingAs($this->sales)->patch($url, ['reason' => ''])->assertSessionHasErrors('reason');
    $this->patch($url, ['reason' => 'Pelanggan minta dihubungi bulan depan'])->assertSessionHasNoErrors();

    expect($this->followUp->fresh()->only(['status', 'cancel_reason']))
        ->toBe(['status' => 'cancelled', 'cancel_reason' => 'Pelanggan minta dihubungi bulan depan']);
    $this->patch($url, ['reason' => 'lagi'])->assertSessionHasErrors('follow_up');
});

it('does not let another sales person complete or cancel the follow-up', function () {
    $stranger = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($stranger)->patch("/customers/{$this->customer->public_id}/follow-ups/{$this->followUp->id}/cancel", ['reason' => 'x'])->assertForbidden();
    $this->post("/customers/{$this->customer->public_id}/activities", ['type' => 'call', 'notes' => 'x', 'follow_up_id' => $this->followUp->id])->assertForbidden();
    expect($this->followUp->fresh()->status)->toBe('pending');
});

it('only cancels a follow-up through its own customer', function () {
    $other = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $other->assignTo($this->sales);
    $this->actingAs($this->sales)->patch("/customers/{$other->public_id}/follow-ups/{$this->followUp->id}/cancel", ['reason' => 'x'])->assertNotFound();
});

it('cancels pending follow-ups of a transaction that becomes Lost, keeping completed ones', function () {
    $done = $this->customer->scheduleFollowUp($this->sales, $this->sales, now()->subDay(), 'Sudah', $this->deal);
    $done->update(['status' => 'completed', 'completed_at' => now()]);
    $unrelated = $this->customer->scheduleFollowUp($this->sales, $this->sales, now()->addDay(), 'Tanpa transaksi');

    $this->deal->transitionTo(PipelineStage::Lost, $this->sales, null, ['lost_reason' => 'competitor']);

    expect($this->followUp->fresh()->only(['status', 'cancel_reason']))->toBe(['status' => 'cancelled', 'cancel_reason' => 'Transaksi Lost'])
        ->and($done->fresh()->status)->toBe('completed')
        ->and($unrelated->fresh()->status)->toBe('pending');
});

it('shows completed plans as done and hides cancelled ones in the calendar', function () {
    $this->actingAs($this->sales)->post("/customers/{$this->customer->public_id}/activities", ['type' => 'call', 'notes' => 'Beres', 'follow_up_id' => $this->followUp->id]);
    $this->customer->scheduleFollowUp($this->sales, $this->sales, now()->addDay(), 'Batal')->update(['status' => 'cancelled']);

    $this->get('/kalender')->assertInertia(fn (Assert $p) => $p
        ->has('items', 2)
        ->where('items.0.kind', 'plan')->where('items.0.status', 'completed')->where('items.0.overdue', false)
        ->where('items.0.follow_up_id', $this->followUp->id)->where('items.0.customer_id', $this->customer->public_id)
        ->where('items.1.kind', 'done')->where('items.1.type', ActivityType::Call->value));
});

it('exposes the follow-up id to the activity form', function () {
    $this->actingAs($this->sales)->getJson(route('transactions.show', $this->deal))
        ->assertOk()->assertJsonPath('customer.next_follow_up.id', $this->followUp->id);
    expect(FollowUp::count())->toBe(1);
});
