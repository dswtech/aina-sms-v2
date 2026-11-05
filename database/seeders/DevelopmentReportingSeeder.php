<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\DealComment;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamTarget;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use App\Support\TargetUnits;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DevelopmentReportingSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('local')) {
            $this->command?->warn('DevelopmentReportingSeeder dilewati: hanya untuk environment local.');

            return;
        }
        $dealer = Dealer::query()->where('name', 'AINA Development Dealer')->first();
        if ($dealer === null) {
            $this->command?->warn('Jalankan DevelopmentDemoSeeder terlebih dahulu.');

            return;
        }
        $month = now('Asia/Jakarta')->startOfMonth();
        $deals = DealTransaction::query()->where('dealer_id', $dealer->id)
            ->whereHas('customer', fn ($q) => $q->where('notes', '[demo] Pelanggan contoh untuk pengembangan lokal.'))
            ->whereHas('stageHistories', fn ($history) => $history->whereNull('from_stage')->where('to_stage', 'lead')->where('notes', DevelopmentDemoSeeder::INITIAL_STAGE_NOTE))
            ->orderBy('id')->get();
        DB::transaction(function () use ($dealer, $deals, $month): void {
            $active = $deals->filter(fn (DealTransaction $deal): bool => ! $deal->current_stage->isClosed())->values();
            foreach ($active as $index => $deal) {
                if ($deal->expected_closing_month !== null || $index % 5 === 0) {
                    continue;
                }
                // Keep a visible mix of current, next-month and unknown estimates.
                $deal->timestamps = false;
                $deal->updateQuietly(['expected_closing_month' => $month->copy()->addMonths($index % 3 === 0 ? 1 : 0)->toDateString()]);
            }
            $teams = Team::query()->where('dealer_id', $dealer->id)->whereIn('id', $deals->pluck('team_id')->filter()->unique())
                ->whereIn('name', array_map(fn (string $name): string => 'Tim '.$name, DevelopmentUserSeeder::SUPERVISOR_NAMES))->active()->orderBy('id')->get();
            foreach ($teams as $index => $team) {
                $supervisor = $team->activeMemberships()->where('role', UserRole::Supervisor)
                    ->whereHas('user', fn ($q) => $q->where('is_active', true)->where('role', UserRole::Supervisor))->first()?->user;
                if ($supervisor === null) {
                    continue;
                }
                foreach ([$month->copy()->subMonth(), $month, $month->copy()->addMonth()] as $periodIndex => $period) {
                    if (TeamTarget::query()->where('team_id', $team->id)->whereDate('period', $period->toDateString())->exists()) {
                        continue;
                    }
                    $target = TeamTarget::create(['team_id' => $team->id, 'period' => $period->toDateString(),
                        'target_units' => 90 + $index * 10 + $periodIndex * 5, 'target_value' => (90 + $index * 10 + $periodIndex * 5) * 250_000_000,
                        'created_by_id' => $supervisor->id]);
                    $plan = null;
                    if ($periodIndex === 2) {
                        $members = $team->activeMemberships()->where('role', UserRole::Sales)
                            ->whereHas('user', fn ($q) => $q->where('is_active', true)->where('role', UserRole::Sales))->pluck('user_id')->unique();
                        if ($members->isNotEmpty()) {
                            $benchmark = TargetUnits::benchmark(TargetUnits::scaled($target->target_units), 200000);
                            $share = TargetUnits::number((int) ceil($benchmark / $members->count()));
                            $target->update(['markup_percent' => 20, 'benchmark_units' => TargetUnits::number($benchmark), 'version' => 1]);
                            foreach ($members as $id) {
                                $target->allocations()->create(['user_id' => $id, 'target_units' => $share]);
                            }
                            $plan = ['target_units' => $target->target_units, 'markup_percent' => 20,
                                'benchmark_units' => TargetUnits::number($benchmark), 'version' => 1,
                                'allocations' => $members->map(fn ($id) => ['user_id' => $id, 'target_units' => $share])->values()->all()];
                        }
                    }
                    $target->revisions()->create(['changed_by_id' => $supervisor->id,
                        'old_target_units' => null, 'old_target_value' => null,
                        'new_target_units' => $target->target_units, 'new_target_value' => $target->target_value, 'new_plan' => $plan]);
                }
            }
            $comments = DealComment::query()->whereIn('deal_transaction_id', $deals->modelKeys())->whereIn('body', DevelopmentDemoSeeder::COMMENT_BODIES)->with('deal.sales')->orderBy('id')->get();
            foreach ($comments as $comment) {
                $deal = $comment->deal;
                if ($comment->stage_at_creation === null) {
                    // Synthetic demo only: derive the snapshot from its recorded event timeline.
                    $stage = $deal->stageHistories()->reorder()->where('created_at', '<=', $comment->created_at)
                        ->orderByDesc('created_at')->orderByDesc('id')->value('to_stage');
                    if ($stage !== null) {
                        $comment->timestamps = false;
                        $comment->updateQuietly(['stage_at_creation' => $stage]);
                    }
                }
                if ($comment->parent_id !== null || $comment->stage_at_creation === null) {
                    continue;
                }
                $salesTeamIds = $deal->sales?->activeTeamMemberships()->where('role', UserRole::Sales)->pluck('team_id') ?? collect();
                $recipients = User::query()->where('dealer_id', $dealer->id)->where('is_active', true)
                    ->where('id', '!=', $comment->user_id)->where(function (Builder $query) use ($deal, $salesTeamIds): void {
                        $query->where('id', $deal->sales_id)->orWhere(function (Builder $q) use ($salesTeamIds): void {
                            $q->where('role', UserRole::Supervisor)->whereHas('activeTeamMemberships', fn ($membership) => $membership->where('role', UserRole::Supervisor)->whereIn('team_id', $salesTeamIds));
                        });
                    })->get();
                foreach ($recipients as $recipient) {
                    if (! $recipient->can('create', [DealComment::class, $deal]) || $recipient->notifications()
                        ->where('type', DealCommentCreated::class)->whereJsonContains('data', ['comment_id' => $comment->id])->exists()) {
                        continue;
                    }
                    $notification = new DealCommentCreated($deal->id, $deal->public_id, $comment->id, $comment->user_id, $comment->stage_at_creation->value);
                    $recipient->notifications()->create([
                        'id' => (string) Str::uuid(), 'type' => DealCommentCreated::class,
                        'data' => [...$notification->toDatabase($recipient), 'title' => 'Komentar demo belum dibaca', 'email_status' => 'demo'],
                        'read_at' => null,
                    ]);
                }
            }
        });
        $this->command?->info('Data demo laporan dilengkapi: target tim, estimasi closing, snapshot dan notifikasi coaching tanpa pengiriman email.');
    }
}
