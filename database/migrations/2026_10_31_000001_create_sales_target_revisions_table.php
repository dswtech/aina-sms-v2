<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_target_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_target_id')->constrained()->cascadeOnDelete();
            $table->foreignId('changed_by_id')->constrained('users')->restrictOnDelete();
            $table->unsignedInteger('old_target_units')->nullable();
            $table->unsignedBigInteger('old_target_value')->nullable();
            $table->unsignedInteger('new_target_units');
            $table->unsignedBigInteger('new_target_value');
            $table->timestampsTz();

            $table->index(['sales_target_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_target_revisions');
    }
};
