<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deal_comments', function (Blueprint $table) {
            // Legacy comments have no reliable stage snapshot to backfill.
            $table->string('stage_at_creation', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('deal_comments', fn (Blueprint $table) => $table->dropColumn('stage_at_creation'));
    }
};
