<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stage_histories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_transaction_id')->constrained()->cascadeOnDelete();
            $table->string('from_stage', 32)->nullable();
            $table->string('to_stage', 32);
            $table->foreignId('actor_id')->constrained('users')->restrictOnDelete();
            $table->text('notes')->nullable();
            $table->timestampTz('created_at');

            $table->index(['deal_transaction_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stage_histories');
    }
};
