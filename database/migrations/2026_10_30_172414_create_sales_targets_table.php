<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('period');
            $table->unsignedInteger('target_units')->default(0);
            $table->unsignedBigInteger('target_value')->default(0);
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->unique(['user_id', 'period']);
            $table->index(['period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_targets');
    }
};
