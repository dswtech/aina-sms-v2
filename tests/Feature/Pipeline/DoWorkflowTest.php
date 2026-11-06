<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('requires a fresh checklist and audits cancellation before delivery', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id, 'sales_id' => $sales->id,
        'customer_id' => $customer->id, 'vehicle_model' => 'DO test',
        'current_stage' => PipelineStage::Spk,
    ]);
    $stage = route('transactions.stage', $deal);
    $checklist = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    for ($mask = 0; $mask < 7; $mask++) {
        $submitted = [];
        foreach (array_keys($checklist) as $index => $key) {
            $submitted[$key] = (bool) ($mask & (1 << $index));
        }
        $this->actingAs($sales)->patchJson($stage, ['to_stage' => 'do', 'stage_event_id' => 0, ...$submitted])->assertUnprocessable();
    }
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Spk)
        ->and($deal->stageHistories()->count())->toBe(0);
    $this->patchJson($stage, ['to_stage' => 'delivery', 'do_event_id' => 0])->assertForbidden();
    $this->patch($stage, ['to_stage' => 'do', 'stage_event_id' => 0, ...$checklist])->assertRedirect()->assertSessionHasNoErrors();
    $original = $deal->stageHistories()->sole();
    expect($original->only(array_keys($checklist)))->toBe($checklist)
        ->and($original->actor_id)->toBe($sales->id);

    $cancel = route('transactions.cancel-do', $deal);
    $this->postJson($cancel, ['reason' => 'Salah catat'])->assertForbidden();
    $this->actingAs($admin)->postJson($cancel, ['reason' => '  '])->assertUnprocessable();
    $this->post($cancel, ['reason' => 'Salah catat', 'do_event_id' => $original->id])->assertRedirect()->assertSessionHasNoErrors();
    $this->postJson($cancel, ['reason' => 'Ulang'])->assertForbidden();
    $correction = $deal->stageHistories()->whereNotNull('reverses_stage_history_id')->sole();
    expect($correction->reverses_stage_history_id)->toBe($original->id)
        ->and($correction->notes)->toBe('Salah catat')
        ->and($correction->actor_id)->toBe($admin->id)
        ->and($deal->fresh()->current_stage)->toBe(PipelineStage::Spk);

    $this->actingAs($sales)->patchJson($stage, ['to_stage' => 'do', 'stage_event_id' => $correction->id])->assertUnprocessable();
    $this->patchJson($stage, ['to_stage' => 'do', 'stage_event_id' => 0, ...$checklist])
        ->assertUnprocessable()->assertJsonValidationErrors('stage_event_id');
    $this->patch($stage, ['to_stage' => 'do', 'stage_event_id' => $correction->id, ...$checklist])->assertRedirect()->assertSessionHasNoErrors();
    $this->patchJson($stage, ['to_stage' => 'do', 'stage_event_id' => $correction->id, ...$checklist])->assertForbidden();
    $current = $deal->currentDoEvent();
    $this->patchJson($stage, ['to_stage' => 'delivery', 'do_event_id' => $original->id])
        ->assertUnprocessable()->assertJsonValidationErrors('do_event_id');
    $this->actingAs($admin)->postJson($cancel, ['reason' => 'Permintaan lama', 'do_event_id' => $original->id])
        ->assertUnprocessable()->assertJsonValidationErrors('do_event_id');
    $this->actingAs($sales)->patch($stage, ['to_stage' => 'delivery', 'do_event_id' => $current->id])->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($admin)->postJson($cancel, ['reason' => 'Terlambat'])->assertForbidden();
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Delivery)
        ->and($deal->stageHistories()->count())->toBe(4);
});

it('limits DO and Delivery to authorized Sales and Supervisors', function () {
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    foreach ([$sales, $supervisor] as $user) {
        TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role, 'ended_at' => null]);
    }
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id, 'team_id' => $team->id, 'sales_id' => $sales->id,
        'customer_id' => Customer::factory()->create(['dealer_id' => $dealer->id])->id,
        'vehicle_model' => 'DO scope test',
    ]);
    $path = route('transactions.stage', $deal);
    $payload = ['to_stage' => 'do', 'stage_event_id' => 0, 'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    $this->actingAs($supervisor)->patchJson($path, $payload)->assertUnprocessable();
    $deal->update(['current_stage' => PipelineStage::Spk]);
    $otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $foreignAdmin = User::factory()->admin()->create();
    foreach ([$otherSupervisor, $admin, User::factory()->sales()->create()] as $unauthorized) {
        $this->actingAs($unauthorized)->patchJson($path, $payload)->assertForbidden();
    }
    $this->actingAs($supervisor)->patch($path, $payload)->assertRedirect()->assertSessionHasNoErrors();
    $this->actingAs($foreignAdmin)->postJson(route('transactions.cancel-do', $deal), ['reason' => 'Asing'])->assertForbidden();
    $delivery = ['to_stage' => 'delivery', 'do_event_id' => $deal->currentDoEvent()->id];
    foreach ([$otherSupervisor, $admin] as $unauthorized) {
        $this->actingAs($unauthorized)->patchJson($path, $delivery)->assertForbidden();
    }
    $this->actingAs($supervisor)->patch($path, $delivery)->assertRedirect()->assertSessionHasNoErrors();
});
