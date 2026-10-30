<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('deal_transaction_id')->nullable()->constrained('deal_transactions')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('type', 32);
            $table->text('notes');
            $table->timestampTz('occurred_at');
            $table->timestampsTz();

            $table->index(['customer_id', 'occurred_at']);
            $table->index(['deal_transaction_id', 'occurred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_activities');
    }
};
