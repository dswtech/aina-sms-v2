<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deal_transactions', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('team_id')->nullable()->constrained('teams')->nullOnDelete();
            $table->string('vehicle_model');
            $table->unsignedBigInteger('estimated_value')->nullable();
            $table->string('source', 64)->default('walk_in');
            $table->string('current_stage', 32)->default('lead');
            $table->timestampTz('booking_fee_confirmed_at')->nullable();
            $table->string('lost_reason', 64)->nullable();
            $table->text('lost_notes')->nullable();
            $table->timestampTz('last_activity_at')->nullable()->index();
            $table->timestampsTz();

            $table->index(['dealer_id', 'current_stage']);
            $table->index(['sales_id', 'current_stage']);
            $table->index(['customer_id', 'current_stage']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_transactions');
    }
};
