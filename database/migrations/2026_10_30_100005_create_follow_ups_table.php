<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('follow_ups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('deal_transaction_id')->nullable()->constrained('deal_transactions')->nullOnDelete();
            $table->foreignId('assigned_to_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('created_by_id')->constrained('users')->restrictOnDelete();
            $table->timestampTz('scheduled_at');
            $table->text('plan_notes');
            $table->string('status', 32)->default('pending')->index();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampsTz();

            $table->index(['customer_id', 'status', 'scheduled_at']);
            $table->index(['assigned_to_id', 'status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('follow_ups');
    }
};
