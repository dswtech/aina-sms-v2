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
use App\Services\TransactionMasters;
use Database\Seeders\AreaMasterSeeder;
use Database\Seeders\DatabaseSeeder;
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
        ->and(DealTransaction::query()->where('current_stage', PipelineStage::Do)->count())->toBe(44)
        ->and(DealTransaction::query()->where('current_stage', PipelineStage::Lost)->count())->toBe(24)
        ->and(FollowUp::query()->count())->toBeGreaterThan(30)
        ->and(DealComment::query()->count())->toBeGreaterThan(70)
        ->and(DealCommentRevision::query()->count())->toBeGreaterThan(0)
        ->and(SalesTarget::query()->count())->toBe(48)
        ->and(CsvImportBatch::query()->count())->toBe(8)
        ->and(Invitation::query()->count())->toBe(4)
        ->and(DB::table('notifications')->count())->toBeGreaterThan(0)
        ->and(DB::table('vehicle_models')->count())->toBe(20)
        ->and(DB::table('vehicle_models')->whereNotIn('name', TransactionMasters::catalogNames())->count())->toBe(0)
        ->and(DealTransaction::query()->whereNotIn('vehicle_model', TransactionMasters::catalogNames())->count())->toBe(0);

    expect(StageHistory::query()->where('to_stage', PipelineStage::Do)->count())->toBe(44)
        ->and(StageHistory::query()->where('to_stage', PipelineStage::Do)->whereNotNull('area_snapshot')->count())->toBe(44)
        ->and(DealTransaction::query()->where(fn ($q) => $q->whereNotNull('district_code')->orWhere('region_code', 'other'))->count())->toBe(168)
        ->and(StageHistory::query()->where('from_stage', PipelineStage::Spk)->where('to_stage', PipelineStage::Do)
            ->where('po_confirmed', true)->where('dp_confirmed', true)->where('unit_confirmed', true)->count())->toBe(44)
        ->and(StageHistory::query()->where('to_stage', 'delivery')->exists())->toBeFalse();
});

it('spreads demo areas and leasing so Mapping Area and financing reports have variety', function () {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => 'local');
    try {
        $this->seed(DevelopmentDemoSeeder::class);
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
    $deals = DealTransaction::query();
    $snapshots = StageHistory::query()->where('to_stage', PipelineStage::Do)->pluck('area_snapshot');

    expect((clone $deals)->where('region_code', '32.17')->distinct()->count('district_code'))->toBeGreaterThan(5)
        ->and((clone $deals)->whereNotNull('district_code')->where('region_code', '!=', '32.17')->count())->toBeGreaterThan(0)
        ->and((clone $deals)->where('region_code', '32.11')->count())->toBeGreaterThan(0)
        ->and((clone $deals)->where('region_code', 'other')->count())->toBeGreaterThan(0)
        ->and(Customer::query()->where('region_code', 'other')->count())->toBeGreaterThan(0)
        ->and(Customer::query()->distinct()->count('district_code'))->toBeGreaterThan(5)
        ->and((clone $deals)->where('financing_type', 'credit')->whereNotNull('leasing_id')->distinct()->count('leasing_id'))->toBeGreaterThan(3)
        ->and((clone $deals)->where('financing_type', 'credit')->whereNull('leasing_id')->whereNotNull('financing_other_name')->count())->toBeGreaterThan(0)
        ->and($snapshots->contains(fn ($s) => $s['is_foa']))->toBeTrue()
        ->and($snapshots->contains(fn ($s) => ! $s['is_foa'] && $s['is_pma']))->toBeTrue()
        ->and($snapshots->contains(fn ($s) => ! $s['is_pma']))->toBeTrue();
});

it('does not seed demo records outside local environment', function () {
    $this->seed(DevelopmentDemoSeeder::class);

    expect(Customer::query()->count())->toBe(0)
        ->and(DealTransaction::query()->count())->toBe(0);
});

it('seeds the official area master idempotently and repairs edited names', function () {
    DB::table('area_districts')->where('code', '32.73.05')->update(['name' => 'Rusak']);
    $this->seed(AreaMasterSeeder::class);
    $this->seed(AreaMasterSeeder::class);

    expect(DB::table('area_regions')->count())->toBe(8)
        ->and(DB::table('area_districts')->count())->toBe(185)
        ->and(DB::table('area_districts')->where('code', '32.73.05')->value('name'))->toBe('Andir');
});

it('gives the demo dealer its default FOA and PMA even when seeding without model events', function () {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => 'local');
    try {
        // `php artisan db:seed` runs DatabaseSeeder, which mutes model events, so Dealer::created never fires there.
        $this->seed(DatabaseSeeder::class);
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
    $dealerId = DB::table('dealers')->where('name', 'AINA Development Dealer')->value('id');
    $snapshots = StageHistory::query()->where('to_stage', PipelineStage::Do)->pluck('area_snapshot');

    expect(DB::table('dealer_foa_districts')->where('dealer_id', $dealerId)->count())->toBe(16)
        ->and(DB::table('dealer_pma_regions')->where('dealer_id', $dealerId)->count())->toBe(7)
        ->and($snapshots->contains(fn ($s) => $s['is_foa']))->toBeTrue()
        ->and($snapshots->contains(fn ($s) => ! $s['is_foa'] && $s['is_pma']))->toBeTrue();
});
