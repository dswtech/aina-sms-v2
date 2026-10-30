<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('assigned_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('started_at');
            $table->timestampTz('ended_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['customer_id', 'ended_at']);
            $table->index(['sales_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_assignments');
    }
};
