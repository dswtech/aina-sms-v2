<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

function runRemoveDeliveryMigration(): void
{
    (require database_path('migrations/2026_11_20_100000_remove_delivery_stage.php'))->up();
}

/** @return array{deal: int, sales: int, customer: int} */
function seedRawDeal(string $stage): array
{
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id]);
    $deal = DealTransaction::create([
        'dealer_id' => $dealer->id, 'sales_id' => $sales->id, 'customer_id' => $customer->id,
        'vehicle_model' => 'Avanza', 'current_stage' => PipelineStage::Spk,
    ]);
    // Raw write: the stage value may no longer exist in the enum.
    DB::table('deal_transactions')->where('id', $deal->id)->update(['current_stage' => $stage, 'progress_at' => '2026-11-10 04:00:00']);

    return ['deal' => $deal->id, 'sales' => $sales->id, 'customer' => $customer->id];
}

function rawHistory(int $deal, int $actor, ?string $from, string $to, string $at, ?int $reverses = null): int
{
    return DB::table('stage_histories')->insertGetId([
        'deal_transaction_id' => $deal, 'from_stage' => $from, 'to_stage' => $to, 'actor_id' => $actor,
        'created_at' => $at, 'reverses_stage_history_id' => $reverses,
        'po_confirmed' => $to === 'do', 'dp_confirmed' => $to === 'do', 'unit_confirmed' => $to === 'do',
    ]);
}

function rawFollowUp(array $ids, string $status, ?string $reason = null): int
{
    return DB::table('follow_ups')->insertGetId([
        'customer_id' => $ids['customer'], 'deal_transaction_id' => $ids['deal'],
        'assigned_to_id' => $ids['sales'], 'created_by_id' => $ids['sales'],
        'scheduled_at' => '2026-11-25 03:00:00', 'plan_notes' => 'Telepon', 'status' => $status,
        'cancel_reason' => $reason, 'created_at' => '2026-11-01 03:00:00', 'updated_at' => '2026-11-01 03:00:00',
    ]);
}

it('folds delivery deals back into DO', function () {
    $ids = seedRawDeal('delivery');
    $reversed = rawHistory($ids['deal'], $ids['sales'], 'spk', 'do', '2026-11-02 03:00:00');
    rawHistory($ids['deal'], $ids['sales'], 'do', 'spk', '2026-11-03 03:00:00', $reversed);
    rawHistory($ids['deal'], $ids['sales'], 'spk', 'do', '2026-11-05 03:00:00');
    rawHistory($ids['deal'], $ids['sales'], 'do', 'delivery', '2026-11-10 04:00:00');
    $comment = DB::table('deal_comments')->insertGetId([
        'deal_transaction_id' => $ids['deal'], 'user_id' => $ids['sales'], 'body' => 'Unit terkirim',
        'stage_at_creation' => 'delivery', 'created_at' => '2026-11-10 05:00:00', 'updated_at' => '2026-11-10 05:00:00',
    ]);

    runRemoveDeliveryMigration();

    $deal = DB::table('deal_transactions')->where('id', $ids['deal'])->first();
    expect($deal->current_stage)->toBe('do')
        ->and(Carbon::parse($deal->progress_at)->equalTo(Carbon::parse('2026-11-05 03:00:00')))->toBeTrue()
        ->and(DB::table('stage_histories')->where('to_stage', 'delivery')->orWhere('from_stage', 'delivery')->exists())->toBeFalse()
        ->and(DB::table('stage_histories')->where('deal_transaction_id', $ids['deal'])->where('to_stage', 'do')->count())->toBe(2)
        ->and(DB::table('deal_comments')->where('id', $comment)->value('stage_at_creation'))->toBe('do')
        ->and(DealTransaction::find($ids['deal'])->currentDoEvent()?->created_at->equalTo(Carbon::parse('2026-11-05 03:00:00')))->toBeTrue();
});

it('cancels only pending follow-ups on DO deals', function () {
    $do = seedRawDeal('do');
    $open = seedRawDeal('spk');
    $pending = rawFollowUp($do, 'pending');
    $completed = rawFollowUp($do, 'completed');
    $oldCancelled = rawFollowUp($do, 'cancelled', 'Pelanggan minta ditunda');
    $openPending = rawFollowUp($open, 'pending');

    runRemoveDeliveryMigration();

    $row = DB::table('follow_ups')->where('id', $pending)->first();
    expect($row->status)->toBe('cancelled')
        ->and($row->cancel_reason)->toBe('Transaksi DO')
        ->and(DB::table('follow_ups')->where('id', $completed)->value('status'))->toBe('completed')
        ->and(DB::table('follow_ups')->where('id', $oldCancelled)->value('cancel_reason'))->toBe('Pelanggan minta ditunda')
        ->and(DB::table('follow_ups')->where('id', $openPending)->value('status'))->toBe('pending');
});
