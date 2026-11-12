<?php

use App\Enums\LostReason;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('records stage transition with append-only history and updates current stage', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Ioniq 5',
        'current_stage' => PipelineStage::Lead,
    ]);

    $history = $deal->transitionTo(PipelineStage::Prospect, $sales, 'Pelanggan telah dihubungi via WhatsApp');

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Prospect)
        ->and($deal->stageHistories()->count())->toBe(1)
        ->and($history->from_stage)->toBe(PipelineStage::Lead)
        ->and($history->to_stage)->toBe(PipelineStage::Prospect)
        ->and($history->actor_id)->toBe($sales->id)
        ->and($history->notes)->toBe('Pelanggan telah dihubungi via WhatsApp');
});

it('requires booking fee confirmation when transitioning to SPK', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Santa Fe',
        'current_stage' => PipelineStage::HotProspect,
    ]);

    // Fails without booking_fee_confirmed
    expect(fn () => $deal->transitionTo(PipelineStage::Spk, $sales))
        ->toThrow(InvalidArgumentException::class, 'Konfirmasi booking fee diperlukan untuk tahap SPK.');

    // Succeeds with booking_fee_confirmed = true
    $history = $deal->transitionTo(PipelineStage::Spk, $sales, 'Booking fee Rp 10.000.000 terverifikasi', [
        'booking_fee_confirmed' => true,
    ]);

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Spk)
        ->and($deal->fresh()->booking_fee_confirmed_at)->not->toBeNull();
});

it('requires lost reason when transitioning to Lost', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Palisade',
        'current_stage' => PipelineStage::Prospect,
    ]);

    // Fails without lost_reason
    expect(fn () => $deal->transitionTo(PipelineStage::Lost, $sales))
        ->toThrow(InvalidArgumentException::class, 'Alasan lost wajib diisi.');

    // Succeeds with lost_reason
    $history = $deal->transitionTo(PipelineStage::Lost, $sales, 'Pelanggan memilih merek tetangga', [
        'lost_reason' => LostReason::Competitor,
        'lost_notes' => 'Membeli di merek lain karena inden lebih cepat',
    ]);

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Lost)
        ->and($deal->fresh()->lost_reason)->toBe(LostReason::Competitor)
        ->and($deal->fresh()->lost_notes)->toBe('Membeli di merek lain karena inden lebih cepat');
});

it('requires a written reason when moving back to an earlier open stage', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);

    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'customer_id' => $customer->id,
        'sales_id' => $sales->id,
        'vehicle_model' => 'Ioniq 5',
        'current_stage' => PipelineStage::HotProspect,
    ]);

    expect(fn () => $deal->transitionTo(PipelineStage::Prospect, $sales))
        ->toThrow(InvalidArgumentException::class, 'Catatan alasan wajib diisi saat mundur tahap.')
        ->and(fn () => $deal->transitionTo(PipelineStage::Lead, $sales, '   '))
        ->toThrow(InvalidArgumentException::class, 'Catatan alasan wajib diisi saat mundur tahap.')
        ->and($deal->fresh()->current_stage)->toBe(PipelineStage::HotProspect)
        ->and($deal->stageHistories()->count())->toBe(0);

    $deal->transitionTo(PipelineStage::Prospect, $sales, 'Pelanggan minta waktu, belum siap survei');

    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Prospect);
    // Moving forward still needs no note.
    $deal->transitionTo(PipelineStage::HotProspect, $sales);
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::HotProspect);
});
