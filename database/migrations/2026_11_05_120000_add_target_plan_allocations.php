<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('team_targets', function (Blueprint $table) {
            $table->decimal('target_units', 14, 4)->change();
            $table->decimal('markup_percent', 8, 4)->default(0);
            $table->decimal('benchmark_units', 14, 4)->nullable();
            $table->unsignedInteger('version')->default(0);
        });
        Schema::table('team_target_revisions', function (Blueprint $table) {
            $table->decimal('old_target_units', 14, 4)->nullable()->change();
            $table->decimal('new_target_units', 14, 4)->change();
            $table->json('old_plan')->nullable();
            $table->json('new_plan')->nullable();
        });
        Schema::create('team_target_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_target_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->decimal('target_units', 14, 4);
            $table->timestampsTz();
            $table->unique(['team_target_id', 'user_id']);
        });
    }

    public function down(): void
    {
        // Keep decimal columns on rollback to avoid truncating an existing target or audit.
        Schema::dropIfExists('team_target_allocations');
        Schema::table('team_target_revisions', fn (Blueprint $table) => $table->dropColumn(['old_plan', 'new_plan']));
        Schema::table('team_targets', fn (Blueprint $table) => $table->dropColumn(['markup_percent', 'benchmark_units', 'version']));
    }
};
