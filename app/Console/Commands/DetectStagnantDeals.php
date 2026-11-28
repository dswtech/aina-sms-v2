<?php

namespace App\Console\Commands;

use App\Models\DealTransaction;
use App\Models\User;
use App\Notifications\DealBecameStagnant;
use App\Notifications\StagnantDealsSummary;
use App\Services\DealAudience;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Notifications\DatabaseNotification;
use Illuminate\Support\Facades\Notification;

class DetectStagnantDeals extends Command
{
    protected $signature = 'notifications:detect-stagnant';

    protected $description = 'Notify sales and supervisors about deals that recently became stagnant';

    public function handle(DealAudience $audience): int
    {
        // A deal turns stagnant at startOfDay(Jakarta, activity) + 4 days, so activity from
        // startOfDay(today) - 7 days on became stagnant inside the 3-day history window.
        $earliestActivity = CarbonImmutable::now('Asia/Jakarta')->startOfDay()->subDays(7)->utc();

        $known = DatabaseNotification::query()->where('type', DealBecameStagnant::class)
            ->where('created_at', '>=', now()->subDays(8))->get()
            ->mapWithKeys(fn (DatabaseNotification $n): array => [($n->data['deal_id'] ?? '').'|'.($n->data['activity_at'] ?? '') => true]);

        /** @var array<int, array{user: User, count: int}> $summaries */
        $summaries = [];

        // Older deals turned stagnant before the window and were notified then; skip them in SQL.
        $recent = fn (Builder $q) => $q->where('last_activity_at', '>=', $earliestActivity)
            ->orWhere(fn (Builder $q) => $q->whereNull('last_activity_at')->where('created_at', '>=', $earliestActivity));

        DealTransaction::query()->stagnant()->where($recent)->with('sales')->each(function (DealTransaction $deal) use ($audience, $known, &$summaries): void {
            $activityAt = $deal->last_activity_at ?? $deal->created_at;
            $sales = $deal->sales;
            if ($sales === null || ! $sales->is_active
                || $known->has($deal->id.'|'.$activityAt->toISOString())) {
                return;
            }

            Notification::sendNow($sales, new DealBecameStagnant($deal->id, $deal->public_id, $activityAt->toISOString()), ['database']);
            foreach ($audience->supervisorsOf($deal) as $supervisor) {
                $summaries[$supervisor->id] = ['user' => $supervisor, 'count' => ($summaries[$supervisor->id]['count'] ?? 0) + 1];
            }
        });

        foreach ($summaries as $summary) {
            Notification::sendNow($summary['user'], new StagnantDealsSummary($summary['count']), ['database']);
        }

        return self::SUCCESS;
    }
}
