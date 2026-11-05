<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\DealComment;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\TeamTarget;
use App\Models\TeamTargetRevision;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use Database\Seeders\DevelopmentDemoSeeder;
use Database\Seeders\DevelopmentReportingSeeder;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

it('adds repeatable local reporting examples without sending email or changing business timestamps', function () {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => 'local');
    Bus::fake();
    Mail::fake();
    try {
        $this->seed(DevelopmentDemoSeeder::class);
        $before = DealTransaction::query()->orderBy('id')->pluck('updated_at', 'id')->all();
        $this->seed(DevelopmentReportingSeeder::class);
        $targets = TeamTarget::query()->count();
        $revisions = TeamTargetRevision::query()->count();
        $notifications = DB::table('notifications')->where('type', DealCommentCreated::class)->count();
        $this->seed(DevelopmentReportingSeeder::class);
        $this->seed(DevelopmentDemoSeeder::class);
        expect(TeamTarget::query()->count())->toBe(Team::query()->count() * 2)->toBe($targets)
            ->and(TeamTargetRevision::query()->count())->toBe($revisions)->toBe($targets)
            ->and(DB::table('notifications')->where('type', DealCommentCreated::class)->count())->toBe($notifications)->toBeGreaterThan(0)
            ->and(DealComment::query()->whereNotNull('stage_at_creation')->count())->toBeGreaterThan(0)
            ->and(DealTransaction::query()->whereNotNull('expected_closing_month')->count())->toBeGreaterThan(0)
            ->and(DealTransaction::query()->whereNotIn('current_stage', ['delivery', 'lost'])->whereNull('expected_closing_month')->count())->toBeGreaterThan(0)
            ->and(DealTransaction::query()->whereDate('expected_closing_month', now('Asia/Jakarta')->startOfMonth()->addMonth()->toDateString())->count())->toBeGreaterThan(0)
            ->and(DealTransaction::query()->orderBy('id')->pluck('updated_at', 'id')->all())->toEqual($before)
            ->and(Customer::query()->count())->toBe(72)->and(DealTransaction::query()->count())->toBe(168);
        foreach (DB::table('notifications')->where('type', DealCommentCreated::class)->get() as $notification) {
            expect(json_decode($notification->data, true)['email_status'])->toBe('demo');
        }
        $this->artisan('coaching:queue-emails')->assertSuccessful();
        Bus::assertNothingDispatched();
        Mail::assertNothingSent();
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
});

it('preserves manual targets and estimates and excludes non-demo customers', function () {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => 'local');
    try {
        $this->seed(DevelopmentDemoSeeder::class);
        $target = TeamTarget::query()->firstOrFail();
        $target->update(['target_units' => 987]);
        $demo = DealTransaction::query()->whereNotIn('current_stage', ['delivery', 'lost'])->firstOrFail();
        $demo->update(['expected_closing_month' => '2030-01-01']);
        $customer = Customer::factory()->create(['dealer_id' => $demo->dealer_id, 'notes' => 'Non-demo, jangan diubah']);
        $untouched = DealTransaction::create(['dealer_id' => $demo->dealer_id, 'team_id' => $demo->team_id,
            'customer_id' => $customer->id, 'sales_id' => $demo->sales_id, 'vehicle_model' => 'Non-demo', 'current_stage' => PipelineStage::Lead]);
        $nonDemoTeam = Team::factory()->create(['dealer_id' => $demo->dealer_id]);
        $nonDemoSupervisor = User::factory()->supervisor()->create(['dealer_id' => $demo->dealer_id]);
        TeamMembership::create(['team_id' => $nonDemoTeam->id, 'user_id' => $nonDemoSupervisor->id, 'role' => 'supervisor', 'started_at' => now()]);
        $manualOnDemoCustomer = DealTransaction::create(['dealer_id' => $demo->dealer_id, 'team_id' => $demo->team_id,
            'customer_id' => $demo->customer_id, 'sales_id' => $demo->sales_id, 'vehicle_model' => 'Transaksi manual pada pelanggan demo']);
        $manualComment = $demo->comments()->create(['user_id' => $demo->sales_id, 'body' => 'Komentar manual yang snapshot lamanya tidak diketahui']);
        $demo->update(['team_id' => $nonDemoTeam->id]);
        $this->seed(DevelopmentReportingSeeder::class);
        expect($target->fresh()->target_units)->toBe(987)
            ->and($demo->fresh()->expected_closing_month->format('Y-m-d'))->toBe('2030-01-01')
            ->and($untouched->fresh()->expected_closing_month)->toBeNull()
            ->and($manualOnDemoCustomer->fresh()->expected_closing_month)->toBeNull()
            ->and($manualComment->fresh()->stage_at_creation)->toBeNull()
            ->and(TeamTarget::query()->where('team_id', $nonDemoTeam->id)->exists())->toBeFalse();
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
});

it('never seeds reporting examples outside local development', function (string $environment) {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => $environment);
    try {
        app(DevelopmentReportingSeeder::class)->run();
        expect(TeamTarget::query()->count())->toBe(0)->and(DealTransaction::query()->count())->toBe(0);
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
})->with(['testing', 'staging', 'production']);

it('derives a synthetic snapshot from the last event before the comment rather than the first event', function () {
    $originalEnvironment = app()->environment();
    app()->detectEnvironment(fn (): string => 'local');
    try {
        $this->seed(DevelopmentDemoSeeder::class);
        $deal = DealTransaction::query()->firstOrFail();
        $comment = $deal->comments()->create(['user_id' => $deal->sales_id, 'body' => 'Baik, akan saya follow-up hari ini.']);
        $deal->stageHistories()->delete();
        foreach ([['2026-11-01 00:00:00', 'lead'], ['2026-11-02 00:00:00', 'prospect'], ['2026-11-04 00:00:00', 'hot_prospect']] as [$at, $stage]) {
            $deal->stageHistories()->create(['from_stage' => $stage === 'lead' ? null : 'lead', 'to_stage' => $stage, 'actor_id' => $deal->sales_id,
                'notes' => $stage === 'lead' ? 'Lead baru masuk dan siap dihubungi.' : 'Progres demo', 'created_at' => $at]);
        }
        $comment->forceFill(['created_at' => '2026-11-03 00:00:00'])->saveQuietly();
        $this->seed(DevelopmentReportingSeeder::class);
        expect($comment->fresh()->stage_at_creation)->toBe(PipelineStage::Prospect);
    } finally {
        app()->detectEnvironment(fn (): string => $originalEnvironment);
    }
});
