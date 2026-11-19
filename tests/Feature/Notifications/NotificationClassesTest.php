<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\DealBecameStagnant;
use App\Notifications\DealCommentCreated;
use App\Notifications\DealStageChanged;
use App\Notifications\StagnantDealsSummary;
use App\Services\DealAudience;

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $this->sales->id, 'role' => 'sales']);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $this->supervisor->id, 'role' => 'supervisor']);
    TeamMembership::factory()->create(['team_id' => $this->otherTeam->id, 'user_id' => $this->otherSupervisor->id, 'role' => 'supervisor']);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'NAMA-PELANGGAN-RAHASIA']);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model QA', 'current_stage' => PipelineStage::Prospect,
    ]);
});

it('returns only active supervisors of the sales team', function () {
    $inactive = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id, 'is_active' => false]);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $inactive->id, 'role' => 'supervisor']);
    $ended = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    TeamMembership::factory()->ended()->create(['team_id' => $this->team->id, 'user_id' => $ended->id, 'role' => 'supervisor']);

    expect(app(DealAudience::class)->supervisorsOf($this->deal)->pluck('id')->all())->toBe([$this->supervisor->id]);

    $loner = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $lonerDeal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $loner->id, 'vehicle_model' => 'Model QA',
    ]);
    expect(app(DealAudience::class)->supervisorsOf($lonerDeal))->toBeEmpty();
});

it('builds metadata-only database payloads', function () {
    $stage = (new DealStageChanged($this->deal->id, $this->deal->public_id, 'prospect', 'hot_prospect'))->toDatabase($this->supervisor);
    $stagnant = (new DealBecameStagnant($this->deal->id, $this->deal->public_id, '2026-11-14T13:00:00.000000Z'))->toDatabase($this->sales);
    $summary = (new StagnantDealsSummary(3))->toDatabase($this->supervisor);

    expect($stage)->toMatchArray([
        'kind' => 'stage_changed', 'title' => 'Tahap transaksi berubah',
        'message' => 'Transaksi pindah dari Prospect ke Hot Prospect.',
        'url' => route('transactions.coaching', $this->deal->public_id, false), 'deal_id' => $this->deal->id,
    ]);
    expect($stagnant)->toMatchArray([
        'kind' => 'stagnant', 'title' => 'Transaksi menjadi stagnan', 'message' => 'Tidak ada aktivitas lebih dari 3 hari.',
        'url' => route('transactions.coaching', $this->deal->public_id, false), 'deal_id' => $this->deal->id,
        'activity_at' => '2026-11-14T13:00:00.000000Z',
    ]);
    expect($summary)->toMatchArray([
        'kind' => 'stagnant_summary', 'title' => 'Transaksi stagnan baru', 'message' => '3 transaksi baru menjadi stagnan.',
        'url' => route('transactions.index', ['tab' => 'stagnant', 'date_from' => '', 'date_to' => ''], false), 'count' => 3,
    ]);
    foreach ([$stage, $stagnant, $summary] as $payload) {
        expect(json_encode($payload))->not->toContain('NAMA-PELANGGAN-RAHASIA')->and($payload)->not->toHaveKey('email_status');
    }
    foreach ([new DealStageChanged(1, 'x', 'lead', 'prospect'), new DealBecameStagnant(1, 'x', 'y'), new StagnantDealsSummary(1)] as $notification) {
        expect($notification->via($this->sales))->toBe(['database']);
    }
});

it('marks new comment notifications with kind comment', function () {
    $payload = (new DealCommentCreated($this->deal->id, $this->deal->public_id, 1, $this->sales->id, 'prospect'))->toDatabase($this->supervisor);

    expect($payload['kind'])->toBe('comment');
});

it('still renders notifications queued for a stage that no longer exists', function () {
    $mail = (new DealCommentCreated(1, 'trx-1', 1, 1, 'delivery'))->toMail($this->sales);
    $stage = (new DealStageChanged(1, 'trx-1', 'do', 'delivery'))->toDatabase($this->sales);

    expect($mail->introLines[0])->toContain('tahap Delivery')
        ->and($stage['message'])->toBe('Transaksi pindah dari DO ke Delivery.');
});
