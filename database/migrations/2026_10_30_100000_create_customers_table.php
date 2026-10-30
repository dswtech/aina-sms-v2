<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('phone', 32);
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->string('contact_channel_preference', 32)->nullable();
            $table->boolean('opt_out')->default(false)->index();
            $table->timestampTz('last_contact_at')->nullable()->index();
            $table->text('notes')->nullable();
            $table->timestampsTz();

            $table->index(['dealer_id', 'phone']);
            $table->index(['dealer_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
