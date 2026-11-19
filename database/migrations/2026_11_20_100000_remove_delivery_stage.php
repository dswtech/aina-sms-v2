<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Raw values, not PipelineStage: the Delivery case no longer exists (ADR-010).
return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('stage_histories')
                ->where('to_stage', 'delivery')->orWhere('from_stage', 'delivery')
                ->delete();

            foreach (DB::table('deal_transactions')->where('current_stage', 'delivery')->pluck('id') as $dealId) {
                $doAt = DB::table('stage_histories as h')
                    ->where('h.deal_transaction_id', $dealId)->where('h.to_stage', 'do')
                    ->whereNotExists(fn ($reversals) => $reversals->selectRaw('1')->from('stage_histories as r')
                        ->whereColumn('r.reverses_stage_history_id', 'h.id'))
                    ->orderByDesc('h.created_at')->orderByDesc('h.id')
                    ->value('h.created_at');

                DB::table('deal_transactions')->where('id', $dealId)
                    ->update(['current_stage' => 'do'] + ($doAt === null ? [] : ['progress_at' => $doAt]));
            }

            DB::table('deal_comments')->where('stage_at_creation', 'delivery')->update(['stage_at_creation' => 'do']);

            DB::table('follow_ups')->where('status', 'pending')
                ->whereIn('deal_transaction_id', DB::table('deal_transactions')->select('id')->where('current_stage', 'do'))
                ->update(['status' => 'cancelled', 'cancel_reason' => 'Transaksi DO', 'updated_at' => now()]);
        });
    }

    public function down(): void
    {
        // Deliberately irreversible: removed Delivery confirmations are not restored.
    }
};
