<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stage_histories', function (Blueprint $table): void {
            $table->boolean('po_confirmed')->nullable();
            $table->boolean('dp_confirmed')->nullable();
            $table->boolean('unit_confirmed')->nullable();
            $table->foreignId('reverses_stage_history_id')->nullable()->unique()->constrained('stage_histories');
        });
    }

    public function down(): void
    {
        Schema::table('stage_histories', function (Blueprint $table): void {
            $table->dropForeign(['reverses_stage_history_id']);
            $table->dropUnique(['reverses_stage_history_id']);
            $table->dropColumn(['po_confirmed', 'dp_confirmed', 'unit_confirmed', 'reverses_stage_history_id']);
        });
    }
};
