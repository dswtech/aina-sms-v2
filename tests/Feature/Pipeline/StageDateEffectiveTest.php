<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use Carbon\CarbonImmutable;

/** A Jakarta wall-clock time as the UTC instant the database stores. */
function wib(string $at): CarbonImmutable
{
    return CarbonImmutable::parse(strlen($at) === 10 ? "$at 10:00" : $at, 'Asia/Jakarta')->utc();
}

function stageDateDeal(PipelineStage $current = PipelineStage::Lead, string $createdAt = '2026-11-01'): DealTransaction
{
    $dealer = Dealer::factory()->create();
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id,
        'sales_id' => User::factory()->sales()->create(['dealer_id' => $dealer->id])->id,
        'customer_id' => Customer::factory()->create(['dealer_id' => $dealer->id])->id,
        'vehicle_model' => 'Uji',
        'current_stage' => $current,
    ]);
    $deal->forceFill(['created_at' => wib($createdAt)])->save();

    return $deal;
}

/** @param array<string, mixed> $extra */
function stageRow(DealTransaction $deal, PipelineStage $to, string $at, array $extra = []): StageHistory
{
    return StageHistory::create([
        'deal_transaction_id' => $deal->id,
        'to_stage' => $to,
        'actor_id' => $deal->sales_id,
        'created_at' => $at === 'raw' ? $extra['created_at'] : wib($at),
        ...$extra,
    ]);
}

/** Whether the deal reached the stage within the given Jakarta dates [start, end). */
function reached(DealTransaction $deal, ?PipelineStage $stage, ?string $start, ?string $end): bool
{
    $bound = fn (?string $date) => $date === null ? null : CarbonImmutable::parse($date, 'Asia/Jakarta')->startOfDay()->utc();

    return DealTransaction::query()->whereKey($deal->id)->reachedStage($stage, $bound($start), $bound($end))->exists();
}

it('keeps the owner example: lead 5, hot 7 voided by prospect 9, hot 15, spk 20', function () {
    $deal = stageDateDeal();
    stageRow($deal, PipelineStage::Lead, '2026-11-05');
    stageRow($deal, PipelineStage::HotProspect, '2026-11-07');
    stageRow($deal, PipelineStage::Prospect, '2026-11-09');
    stageRow($deal, PipelineStage::HotProspect, '2026-11-15');
    stageRow($deal, PipelineStage::Spk, '2026-11-20');

    foreach ([PipelineStage::Lead, PipelineStage::Prospect, PipelineStage::HotProspect, PipelineStage::Spk] as $stage) {
        expect(reached($deal, $stage, '2026-11-01', '2026-12-01'))->toBeTrue();
    }
    expect(reached($deal, PipelineStage::HotProspect, '2026-11-07', '2026-11-08'))->toBeFalse()
        ->and(reached($deal, PipelineStage::HotProspect, '2026-11-15', '2026-11-16'))->toBeTrue();
});

it('voids retroactively across months', function () {
    $deal = stageDateDeal(createdAt: '2026-10-01');
    stageRow($deal, PipelineStage::Spk, '2026-10-28');
    stageRow($deal, PipelineStage::HotProspect, '2026-11-03');

    expect(reached($deal, PipelineStage::Spk, '2026-10-01', '2026-11-01'))->toBeFalse();
});

it('drops everything above the backward target', function () {
    $deal = stageDateDeal();
    stageRow($deal, PipelineStage::Lead, '2026-11-02');
    stageRow($deal, PipelineStage::HotProspect, '2026-11-15');
    stageRow($deal, PipelineStage::Spk, '2026-11-20');
    stageRow($deal, PipelineStage::Prospect, '2026-11-25');

    expect(reached($deal, PipelineStage::HotProspect, null, null))->toBeFalse()
        ->and(reached($deal, PipelineStage::Spk, null, null))->toBeFalse()
        ->and(reached($deal, PipelineStage::Lead, null, null))->toBeTrue()
        ->and(reached($deal, PipelineStage::Prospect, null, null))->toBeTrue();
});

it('counts only the redo after a cancelled DO and keeps SPK', function () {
    $deal = stageDateDeal(PipelineStage::Do);
    $checklist = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    stageRow($deal, PipelineStage::Spk, '2026-11-05');
    $first = stageRow($deal, PipelineStage::Do, '2026-11-10', $checklist);
    stageRow($deal, PipelineStage::Spk, '2026-11-11', ['reverses_stage_history_id' => $first->id]);
    stageRow($deal, PipelineStage::Do, '2026-11-12', $checklist);

    expect(reached($deal, PipelineStage::Do, '2026-11-10', '2026-11-11'))->toBeFalse()
        ->and(reached($deal, PipelineStage::Do, '2026-11-12', '2026-11-13'))->toBeTrue()
        ->and(reached($deal, PipelineStage::Spk, '2026-11-05', '2026-11-06'))->toBeTrue()
        ->and(reached($deal, PipelineStage::Spk, '2026-11-11', '2026-11-12'))->toBeFalse();
});

it('does not fill skipped stages', function () {
    $deal = stageDateDeal();
    stageRow($deal, PipelineStage::Lead, '2026-11-02');
    stageRow($deal, PipelineStage::Spk, '2026-11-04');

    expect(reached($deal, PipelineStage::Prospect, null, null))->toBeFalse();
});

it('orders same-second rows by id', function () {
    $deal = stageDateDeal();
    stageRow($deal, PipelineStage::HotProspect, '2026-11-07');
    stageRow($deal, PipelineStage::Prospect, '2026-11-07');

    expect(reached($deal, PipelineStage::HotProspect, null, null))->toBeFalse()
        ->and(reached($deal, PipelineStage::Prospect, null, null))->toBeTrue();
});

it('falls back to current stage on created_at for deals without history', function () {
    $deal = stageDateDeal(PipelineStage::Spk, '2026-11-06');

    expect(reached($deal, PipelineStage::Spk, '2026-11-06', '2026-11-07'))->toBeTrue()
        ->and(reached($deal, PipelineStage::Spk, '2026-11-07', '2026-11-08'))->toBeFalse()
        ->and(reached($deal, PipelineStage::Lead, null, null))->toBeFalse();
});

it('honours Jakarta day bounds', function () {
    $before = stageDateDeal();
    stageRow($before, PipelineStage::Lead, 'raw', ['created_at' => CarbonImmutable::parse('2026-11-04 16:59:59', 'UTC')]);
    $after = stageDateDeal();
    stageRow($after, PipelineStage::Lead, 'raw', ['created_at' => CarbonImmutable::parse('2026-11-04 17:00:00', 'UTC')]);

    expect(reached($before, PipelineStage::Lead, '2026-11-04', '2026-11-05'))->toBeTrue()
        ->and(reached($after, PipelineStage::Lead, '2026-11-04', '2026-11-05'))->toBeFalse()
        ->and(reached($after, PipelineStage::Lead, '2026-11-05', '2026-11-06'))->toBeTrue();
});

it('matches any stage when stage is null', function () {
    $deal = stageDateDeal(PipelineStage::Lost);
    stageRow($deal, PipelineStage::Lost, '2026-11-08');

    expect(reached($deal, null, '2026-11-08', '2026-11-09'))->toBeTrue()
        ->and(reached($deal, null, '2026-11-09', '2026-11-10'))->toBeFalse();
});

it('treats a Jakarta-zoned bound the same as its UTC equivalent', function () {
    $deal = stageDateDeal();
    stageRow($deal, PipelineStage::Lead, 'raw', ['created_at' => CarbonImmutable::parse('2026-11-04 17:00:00', 'UTC')]);
    $jakarta = CarbonImmutable::parse('2026-11-05 00:00:00', 'Asia/Jakarta');

    $count = fn ($start) => DealTransaction::query()->whereKey($deal->id)->reachedStage(PipelineStage::Lead, $start, null)->count();

    expect($count($jakarta))->toBe(1)
        ->and($count($jakarta->utc()))->toBe(1)
        ->and($count($jakarta->addSecond()))->toBe(0);
});
