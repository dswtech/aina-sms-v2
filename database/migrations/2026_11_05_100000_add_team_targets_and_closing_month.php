<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->restrictOnDelete();
            $table->date('period');
            $table->unsignedInteger('target_units');
            $table->unsignedBigInteger('target_value')->default(0);
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
            $table->unique(['team_id', 'period']);
        });
        Schema::create('team_target_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_target_id')->constrained()->restrictOnDelete();
            $table->foreignId('changed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('old_target_units')->nullable();
            $table->unsignedBigInteger('old_target_value')->nullable();
            $table->unsignedInteger('new_target_units');
            $table->unsignedBigInteger('new_target_value');
            $table->timestampsTz();
        });
        Schema::table('deal_transactions', function (Blueprint $table) {
            $table->date('expected_closing_month')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('deal_transactions', function (Blueprint $table) {
            $table->dropIndex(['expected_closing_month']);
            $table->dropColumn('expected_closing_month');
        });
        Schema::dropIfExists('team_target_revisions');
        Schema::dropIfExists('team_targets');
    }
};
