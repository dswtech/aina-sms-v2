<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\DealStageChanged;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->manager = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->sales, $this->supervisor] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }
    TeamMembership::factory()->create(['team_id' => $this->otherTeam->id, 'user_id' => $this->otherSupervisor->id, 'role' => 'supervisor']);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model QA', 'current_stage' => PipelineStage::Prospect,
    ]);
});

it('notifies team supervisors when sales moves a stage', function () {
    $this->deal->transitionTo(PipelineStage::HotProspect, $this->sales);

    $notification = $this->supervisor->notifications()->sole();
    expect($notification->type)->toBe(DealStageChanged::class)
        ->and($notification->data['kind'])->toBe('stage_changed')
        ->and($notification->data['message'])->toContain('Prospect')->toContain('Hot Prospect');
    foreach ([$this->sales, $this->otherSupervisor, $this->admin, $this->manager] as $user) {
        expect($user->notifications()->count())->toBe(0);
    }
});

it('does not notify the acting supervisor but notifies a second team supervisor', function () {
    $second = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $second->id, 'role' => 'supervisor']);

    $this->deal->transitionTo(PipelineStage::HotProspect, $this->supervisor);

    expect($this->supervisor->notifications()->count())->toBe(0)
        ->and($second->notifications()->count())->toBe(1);
});

it('ignores inactive supervisors', function () {
    $this->supervisor->update(['is_active' => false]);

    $this->deal->transitionTo(PipelineStage::HotProspect, $this->sales);

    expect(DB::table('notifications')->count())->toBe(0);
});

it('creates no notification when the transition is rejected', function () {
    expect(fn () => $this->deal->transitionTo(PipelineStage::Prospect, $this->sales))
        ->toThrow(InvalidArgumentException::class);

    expect(DB::table('notifications')->count())->toBe(0);
});

it('notifies team supervisors when a DO is cancelled', function () {
    $deal = DealTransaction::create([
        'region_code' => '32.17', 'district_code' => '32.17.08',
        'dealer_id' => $this->dealer->id, 'sales_id' => $this->sales->id,
        'customer_id' => $this->customer->id, 'vehicle_model' => 'DO test', 'vehicle_ownership' => 'first_buyer',
        'current_stage' => PipelineStage::Spk,
    ]);
    $checklist = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    $this->actingAs($this->sales)->patch(route('transactions.stage', $deal), ['to_stage' => 'do', 'stage_event_id' => 0, ...$checklist])
        ->assertRedirect();
    $this->supervisor->notifications()->delete();

    $this->actingAs($this->admin)->post(route('transactions.cancel-do', $deal), [
        'reason' => 'Salah catat', 'do_event_id' => $deal->currentDoEvent()->id,
    ])->assertRedirect();

    $notification = $this->supervisor->notifications()->sole();
    expect($notification->data['message'])->toBe('Transaksi pindah dari DO ke SPK.');
});

it('does not notify when a lead is created', function () {
    legacyVehicleMaster();
    $dealer = Dealer::factory()->create();
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    foreach ([$sales, $supervisor] as $user) {
        TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }

    $this->actingAs($sales)->post(route('customers.store'), [
        'name' => 'Doni Kusuma', 'gender' => 'L', 'phone' => '081234567890', 'email' => 'doni@example.com',
        'vehicle_model' => 'Stargazer Prime', 'source' => 'walk_in', 'estimated_value' => 320000000,
    ])->assertRedirect();

    expect(DealTransaction::where('dealer_id', $dealer->id)->count())->toBe(1)
        ->and($supervisor->notifications()->count())->toBe(0);
});
