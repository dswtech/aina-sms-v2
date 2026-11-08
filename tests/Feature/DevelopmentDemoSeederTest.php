<?php

use App\Enums\PipelineStage;
use App\Models\CsvImportBatch;
use App\Models\Customer;
use App\Models\DealComment;
use App\Models\DealCommentRevision;
use App\Models\DealTransaction;
use App\Models\FollowUp;
use App\Models\Invitation;
use App\Models\SalesTarget;
use App\Models\StageHistory;
use Database\Seeders\DevelopmentDemoSeeder;
use Illuminate\Support\Facades\DB;

it('seeds complete and idempotent local demo data', function () {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => 'local');

    try {
        $this->seed(DevelopmentDemoSeeder::class);
        $this->seed(DevelopmentDemoSeeder::class);
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }

    expect(Customer::query()->where('notes', 'like', '[demo]%')->count())->toBe(72)
        ->and(DealTransaction::query()->count())->toBe(168)
        ->and(DealTransaction::query()->where('current_stage', PipelineStage::Delivery)->count())->toBe(30)
        ->and(DealTransaction::query()->where('current_stage', PipelineStage::Lost)->count())->toBe(24)
        ->and(FollowUp::query()->count())->toBeGreaterThan(30)
        ->and(DealComment::query()->count())->toBeGreaterThan(70)
        ->and(DealCommentRevision::query()->count())->toBeGreaterThan(0)
        ->and(SalesTarget::query()->count())->toBe(48)
        ->and(CsvImportBatch::query()->count())->toBe(8)
        ->and(Invitation::query()->count())->toBe(4)
        ->and(DB::table('notifications')->count())->toBeGreaterThan(0);

    expect(StageHistory::query()->where('to_stage', PipelineStage::Do)->count())->toBe(44)
        ->and(StageHistory::query()->where('to_stage', PipelineStage::Do)->whereNotNull('area_snapshot')->count())->toBe(44)
        ->and(DealTransaction::query()->whereNotNull('district_code')->count())->toBe(168)
        ->and(StageHistory::query()->where('from_stage', PipelineStage::Spk)->where('to_stage', PipelineStage::Do)
            ->where('po_confirmed', true)->where('dp_confirmed', true)->where('unit_confirmed', true)->count())->toBe(44)
        ->and(StageHistory::query()->where('from_stage', PipelineStage::Do)->where('to_stage', PipelineStage::Delivery)->count())->toBe(30);
});

it('does not seed demo records outside local environment', function () {
    $this->seed(DevelopmentDemoSeeder::class);

    expect(Customer::query()->count())->toBe(0)
        ->and(DealTransaction::query()->count())->toBe(0);
});
