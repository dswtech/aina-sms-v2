<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deal_transactions', fn (Blueprint $table) => $table->timestamp('coaching_closed_at')->nullable());

        // Conversations on deals that already ended start as finished, so the new page opens on live coaching only.
        DB::table('deal_transactions')->whereIn('current_stage', ['do', 'lost'])
            ->whereExists(fn ($query) => $query->selectRaw('1')->from('deal_comments')
                ->whereColumn('deal_comments.deal_transaction_id', 'deal_transactions.id'))
            ->update(['coaching_closed_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('deal_transactions', fn (Blueprint $table) => $table->dropColumn('coaching_closed_at'));
    }
};
